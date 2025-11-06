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
        const [membersData, postsData, bookingsData, feesData] = await Promise.all([
          googleSheetsService.getAllMembers(),
          googleSheetsService.getAllPosts(),
          googleSheetsService.getAllBookings(),
          googleSheetsService.getAllFees()
        ]);

        if (membersData && membersData.length > 0) {
          console.log('✅ 회원 데이터 로드:', membersData.length, '명');
          localStorage.setItem('golfMembers', JSON.stringify(membersData));
        }

        if (postsData && postsData.length > 0) {
          console.log('✅ 게시글 데이터 로드:', postsData.length, '개');
          setPosts(postsData);
          localStorage.setItem('golfPosts', JSON.stringify(postsData));
        }

        if (bookingsData && bookingsData.length > 0) {
          console.log('✅ 예약 데이터 로드:', bookingsData.length, '개');
          setBookings(bookingsData);
          localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
        }

        if (feesData && feesData.length > 0) {
          console.log('✅ 회비 데이터 로드:', feesData.length, '개');
          setFees(feesData);
          localStorage.setItem('golfFees', JSON.stringify(feesData));
        }

        console.log('✅ 모든 데이터 로드 완료!');
      } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        
        const savedPosts = localStorage.getItem('golfPosts');
        const savedBookings = localStorage.getItem('golfBookings');
        const savedFees = localStorage.getItem('golfFees');

        if (savedPosts) setPosts(JSON.parse(savedPosts));
        if (savedBookings) setBookings(JSON.parse(savedBookings));
        if (savedFees) setFees(JSON.parse(savedFees));
      }

      const savedUser = localStorage.getItem('golfUser');
      const savedCourses = localStorage.getItem('golfCourses');

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
