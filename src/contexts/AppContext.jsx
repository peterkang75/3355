import React, { createContext, useState, useContext, useEffect } from 'react';
import googleSheetsService from '../services/googleSheets';
import { calculateHandicap } from '../utils/handicap';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [scores, setScores] = useState([]);
  const [fees, setFees] = useState([]);
  const [courses, setCourses] = useState([
    { id: 1, name: 'The Australian Golf Club', address: 'Kensington' },
    { id: 2, name: 'Concord Golf Club', address: 'Concord' },
    { id: 3, name: 'St Michael\'s Golf Club', address: 'Little Bay' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      console.log('🔄 구글 시트에서 데이터 로딩 시작...');
      
      try {
        const loadWithTimeout = (promise, timeout = 5000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
        };

        const results = await Promise.allSettled([
          loadWithTimeout(googleSheetsService.getAllMembers()),
          loadWithTimeout(googleSheetsService.getAllPosts()),
          loadWithTimeout(googleSheetsService.getAllBookings()),
          loadWithTimeout(googleSheetsService.getAllFees())
        ]);

        const [membersResult, postsResult, bookingsResult, feesResult] = results;

        if (membersResult.status === 'fulfilled' && membersResult.value && membersResult.value.length > 0) {
          console.log('✅ 회원 데이터 로드:', membersResult.value.length, '명');
          localStorage.setItem('golfMembers', JSON.stringify(membersResult.value));
        } else {
          console.log('⚠️ 회원 데이터 없음 또는 로드 실패');
        }

        if (postsResult.status === 'fulfilled' && postsResult.value && postsResult.value.length > 0) {
          console.log('✅ 게시글 데이터 로드:', postsResult.value.length, '개');
          setPosts(postsResult.value);
          localStorage.setItem('golfPosts', JSON.stringify(postsResult.value));
        }

        if (bookingsResult.status === 'fulfilled' && bookingsResult.value && bookingsResult.value.length > 0) {
          console.log('✅ 예약 데이터 로드:', bookingsResult.value.length, '개');
          setBookings(bookingsResult.value);
          localStorage.setItem('golfBookings', JSON.stringify(bookingsResult.value));
        }

        if (feesResult.status === 'fulfilled' && feesResult.value && feesResult.value.length > 0) {
          console.log('✅ 회비 데이터 로드:', feesResult.value.length, '개');
          setFees(feesResult.value);
          localStorage.setItem('golfFees', JSON.stringify(feesResult.value));
        }

        console.log('✅ 데이터 로드 완료!');
      } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
      }

      const savedUser = localStorage.getItem('golfUser');
      const savedPosts = localStorage.getItem('golfPosts');
      const savedBookings = localStorage.getItem('golfBookings');
      const savedFees = localStorage.getItem('golfFees');
      const savedCourses = localStorage.getItem('golfCourses');

      if (!posts.length && savedPosts) setPosts(JSON.parse(savedPosts));
      if (!bookings.length && savedBookings) setBookings(JSON.parse(savedBookings));
      if (!fees.length && savedFees) setFees(JSON.parse(savedFees));
      if (savedCourses) setCourses(JSON.parse(savedCourses));

      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        loadUserData(userData.id);
      }
      
      setLoading(false);
    };

    loadAllData();
  }, []);

  const loadUserData = async (userId) => {
    const userScores = await googleSheetsService.getScores(userId);
    setScores(userScores);
    
    if (userScores.length > 0) {
      const handicap = calculateHandicap(userScores);
      updateUser({ handicap });
    }
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('golfUser', JSON.stringify(userData));
    loadUserData(userData.id);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('golfUser');
    setScores([]);
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('golfUser', JSON.stringify(updatedUser));
  };

  const saveScore = async (scoreData) => {
    const newScore = {
      ...scoreData,
      userId: user.id,
      id: Date.now().toString(),
      date: new Date().toISOString()
    };

    await googleSheetsService.saveScore(newScore);
    
    const updatedScores = [...scores, newScore];
    setScores(updatedScores);

    const newHandicap = calculateHandicap(updatedScores);
    updateUser({ handicap: newHandicap });

    return newScore;
  };

  const addPost = async (post) => {
    const newPosts = [post, ...posts];
    setPosts(newPosts);
    localStorage.setItem('golfPosts', JSON.stringify(newPosts));
    await googleSheetsService.savePost(post);
  };

  const updatePost = (postId, updates) => {
    const newPosts = posts.map(p => p.id === postId ? { ...p, ...updates } : p);
    setPosts(newPosts);
    localStorage.setItem('golfPosts', JSON.stringify(newPosts));
  };

  const addBooking = async (booking) => {
    const newBookings = [booking, ...bookings];
    setBookings(newBookings);
    localStorage.setItem('golfBookings', JSON.stringify(newBookings));
    await googleSheetsService.saveBooking(booking);
  };

  const updateBooking = (bookingId, updates) => {
    const newBookings = bookings.map(b => b.id === bookingId ? { ...b, ...updates } : b);
    setBookings(newBookings);
    localStorage.setItem('golfBookings', JSON.stringify(newBookings));
  };

  const addFee = async (fee) => {
    const newFees = [...fees, fee];
    setFees(newFees);
    localStorage.setItem('golfFees', JSON.stringify(newFees));
    await googleSheetsService.saveFee(fee);
    
    const userFee = fee.appliesTo === 'all' || fee.appliesTo.includes(user.id);
    if (userFee && fee.type === 'income') {
      updateUser({ balance: (user.balance || 0) - fee.amount });
    }
  };

  const payFee = (feeId) => {
    const newFees = fees.map(f => f.id === feeId ? { ...f, status: 'paid' } : f);
    setFees(newFees);
    localStorage.setItem('golfFees', JSON.stringify(newFees));
    
    const fee = fees.find(f => f.id === feeId);
    if (fee && fee.type === 'income') {
      updateUser({ balance: (user.balance || 0) + fee.amount });
    }
  };

  const addCourse = (course) => {
    const newCourses = [...courses, course];
    setCourses(newCourses);
    localStorage.setItem('golfCourses', JSON.stringify(newCourses));
  };

  const value = {
    user,
    members,
    posts,
    bookings,
    scores,
    fees,
    courses,
    loading,
    login,
    logout,
    updateUser,
    saveScore,
    addPost,
    updatePost,
    addBooking,
    updateBooking,
    addFee,
    payFee,
    addCourse
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
