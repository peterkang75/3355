import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/api';
import { calculateHandicap } from '../utils/handicap';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [scores, setScores] = useState([]);
  const [fees, setFees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      const savedUser = localStorage.getItem('golfUser');
      let savedUserId = null;

      if (savedUser) {
        const userData = JSON.parse(savedUser);
        savedUserId = userData.id;
        setUser(userData);
      }
      
      try {
        console.log('🔄 데이터베이스에서 데이터 로드 중...');
        
        const [membersData, postsData, bookingsData, feesData, coursesData] = await Promise.all([
          apiService.fetchMembers().catch(err => { console.error('Members 로드 실패:', err); return []; }),
          apiService.fetchPosts().catch(err => { console.error('Posts 로드 실패:', err); return []; }),
          apiService.fetchBookings().catch(err => { console.error('Bookings 로드 실패:', err); return []; }),
          apiService.fetchFees().catch(err => { console.error('Fees 로드 실패:', err); return []; }),
          apiService.fetchCourses().catch(err => { console.error('Courses 로드 실패:', err); return []; })
        ]);

        if (membersData) {
          console.log('✅ 회원 데이터 로드:', membersData.length, '명');
          setMembers(membersData);
          localStorage.setItem('golfMembers', JSON.stringify(membersData));
          
          if (savedUserId) {
            const currentUser = membersData.find(m => m.id === savedUserId);
            if (currentUser) {
              console.log('✅ 로그인한 사용자 정보 업데이트:', currentUser.name);
              setUser(currentUser);
              localStorage.setItem('golfUser', JSON.stringify(currentUser));
            }
          }
        }

        if (postsData) {
          console.log('✅ 게시글 데이터 로드:', postsData.length, '개');
          setPosts(postsData);
          localStorage.setItem('golfPosts', JSON.stringify(postsData));
        }

        if (bookingsData) {
          console.log('✅ 예약 데이터 로드:', bookingsData.length, '개');
          setBookings(bookingsData);
          localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
        }

        if (feesData) {
          console.log('✅ 회비 데이터 로드:', feesData.length, '개');
          setFees(feesData);
          localStorage.setItem('golfFees', JSON.stringify(feesData));
        }

        if (coursesData && coursesData.length > 0) {
          console.log('✅ 골프장 데이터 로드:', coursesData.length, '개');
          setCourses(coursesData);
        } else {
          const defaultCourses = [
            { name: 'The Australian Golf Club', address: 'Kensington' },
            { name: 'Concord Golf Club', address: 'Concord' },
            { name: 'St Michael\'s Golf Club', address: 'Little Bay' }
          ];
          
          for (const course of defaultCourses) {
            try {
              await apiService.createCourse(course);
            } catch (err) {
              console.error('코스 생성 실패:', err);
            }
          }
          
          const refreshedCourses = await apiService.fetchCourses();
          setCourses(refreshedCourses);
        }

        if (savedUserId) {
          await loadUserData(savedUserId);
        }

        console.log('✅ 데이터 로드 완료!');
      } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const loadUserData = async (userId) => {
    try {
      const userScores = await apiService.fetchScores(userId);
      setScores(userScores);
      
      if (userScores.length > 0) {
        const handicap = calculateHandicap(userScores.map(s => ({
          ...s,
          holes: JSON.parse(s.holes)
        })));
        updateUser({ handicap });
      }
    } catch (error) {
      console.error('User data load failed:', error);
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
    try {
      const score = await apiService.createScore({
        ...scoreData,
        holes: JSON.stringify(scoreData.holes)
      });
      
      const newScores = [...scores, { ...score, holes: JSON.parse(score.holes) }];
      setScores(newScores);
      
      const handicap = calculateHandicap(newScores);
      updateUser({ handicap });
      
      return score;
    } catch (error) {
      console.error('Score save failed:', error);
      throw error;
    }
  };

  const addPost = async (postData) => {
    try {
      const post = await apiService.createPost(postData);
      setPosts([post, ...posts]);
      return post;
    } catch (error) {
      console.error('Post creation failed:', error);
      throw error;
    }
  };

  const updatePost = async (postId, updates) => {
    try {
      const post = await apiService.updatePost(postId, updates);
      setPosts(posts.map(p => p.id === postId ? post : p));
      return post;
    } catch (error) {
      console.error('Post update failed:', error);
      throw error;
    }
  };

  const addBooking = async (bookingData) => {
    try {
      const booking = await apiService.createBooking(bookingData);
      setBookings([booking, ...bookings]);
      return booking;
    } catch (error) {
      console.error('Booking creation failed:', error);
      throw error;
    }
  };

  const updateBooking = async (bookingId, updates) => {
    try {
      const booking = await apiService.updateBooking(bookingId, updates);
      setBookings(bookings.map(b => b.id === bookingId ? booking : b));
      return booking;
    } catch (error) {
      console.error('Booking update failed:', error);
      throw error;
    }
  };

  const addFee = async (feeData) => {
    try {
      const fee = await apiService.createFee(feeData);
      setFees([fee, ...fees]);
      
      if (user && (fee.appliesTo === 'all' || fee.appliesTo.includes(user.id))) {
        if (fee.type === 'income') {
          updateUser({ balance: (user.balance || 0) - fee.amount });
        }
      }
      
      return fee;
    } catch (error) {
      console.error('Fee creation failed:', error);
      throw error;
    }
  };

  const payFee = (feeId) => {
    const fee = fees.find(f => f.id === feeId);
    if (fee && fee.type === 'income') {
      updateUser({ balance: (user.balance || 0) + fee.amount });
    }
  };

  const addCourse = async (courseData) => {
    try {
      const course = await apiService.createCourse(courseData);
      setCourses([...courses, course]);
      return course;
    } catch (error) {
      console.error('Course creation failed:', error);
      throw error;
    }
  };

  const refreshMembers = async () => {
    try {
      console.log('🔄 회원 데이터 새로고침 중...');
      const membersData = await apiService.fetchMembers();
      if (membersData) {
        console.log('✅ 회원 데이터 업데이트:', membersData.length, '명');
        setMembers(membersData);
        localStorage.setItem('golfMembers', JSON.stringify(membersData));
        
        if (user) {
          const updatedUser = membersData.find(m => m.id === user.id);
          if (updatedUser) {
            console.log('✅ 로그인한 사용자 정보 업데이트:', updatedUser.name);
            setUser(updatedUser);
            localStorage.setItem('golfUser', JSON.stringify(updatedUser));
          }
        }
      }
    } catch (error) {
      console.error('❌ 회원 데이터 새로고침 실패:', error);
    }
  };

  const refreshCourses = async () => {
    try {
      console.log('🔄 골프장 데이터 새로고침 중...');
      const coursesData = await apiService.fetchCourses();
      if (coursesData) {
        console.log('✅ 골프장 데이터 업데이트:', coursesData.length, '개');
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('❌ 골프장 데이터 새로고침 실패:', error);
    }
  };

  const refreshBookings = async () => {
    try {
      console.log('🔄 예약 데이터 새로고침 중...');
      const bookingsData = await apiService.fetchBookings();
      if (bookingsData) {
        console.log('✅ 예약 데이터 업데이트:', bookingsData.length, '개');
        setBookings(bookingsData);
        localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
      }
    } catch (error) {
      console.error('❌ 예약 데이터 새로고침 실패:', error);
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isOperator = () => user?.role === 'operator' || user?.role === 'admin';
  const isMember = () => user?.role === 'member';

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
    addCourse,
    refreshMembers,
    refreshCourses,
    refreshBookings,
    isAdmin,
    isOperator,
    isMember
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
