import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import apiService from '../services/api';
import { calculateHandicap } from '../utils/handicap';

export const AppContext = createContext();

const checkRequiredFields = (member) => {
  if (!member) return false;
  const requiredFields = ['name', 'nickname', 'photo', 'gender', 'birthYear', 'region'];
  return requiredFields.every(field => member[field] && String(member[field]).trim() !== '');
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [scores, setScores] = useState([]);
  const [fees, setFees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requiresProfileComplete, setRequiresProfileComplete] = useState(false);
  
  // 소켓 이벤트 핸들러에서 최신 user 값을 참조하기 위한 ref
  const userRef = useRef(null);
  
  // user 변경 시 ref 동기화
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const initApp = async () => {
      try {
        localStorage.removeItem('golfMembers');
        localStorage.removeItem('golfPosts');
        localStorage.removeItem('golfBookings');
        localStorage.removeItem('golfFees');
      } catch (e) {}

      const savedUser = localStorage.getItem('golfUser');
      let savedUserId = null;

      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          savedUserId = userData.id;
          setUser(userData);
        } catch (e) {
          localStorage.removeItem('golfUser');
        }
      }
      
      try {
        const [membersData, postsData, bookingsData, feesData, coursesData] = await Promise.all([
          apiService.fetchMembers().catch(() => []),
          apiService.fetchPosts().catch(() => []),
          apiService.fetchBookings().catch(() => []),
          apiService.fetchFees().catch(() => []),
          apiService.fetchCourses().catch(() => [])
        ]);

        if (membersData?.length > 0) {
          setMembers(membersData);
          
          if (savedUserId) {
            let currentUser = membersData.find(m => m.id === savedUserId);
            
            // ID로 찾지 못한 경우 전화번호로 다시 찾기 (ID 불일치 해결)
            if (!currentUser && savedUser) {
              try {
                const savedUserData = JSON.parse(savedUser);
                if (savedUserData.phone) {
                  currentUser = membersData.find(m => m.phone === savedUserData.phone);
                  if (currentUser) {
                    console.log('회원 ID 동기화: 전화번호로 매칭됨', currentUser.id);
                  }
                }
              } catch (e) {}
            }
            
            if (currentUser) {
              setUser(currentUser);
              try {
                localStorage.setItem('golfUser', JSON.stringify(currentUser));
              } catch (e) {}
            }
          }
        }

        if (postsData?.length > 0) setPosts(postsData);
        if (bookingsData?.length > 0) setBookings(bookingsData);
        if (feesData?.length > 0) setFees(feesData);
        if (coursesData?.length > 0) setCourses(coursesData);

        if (savedUserId) {
          await loadUserData(savedUserId);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;
    
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('members:updated', async () => {
      try {
        const membersData = await apiService.fetchMembers();
        if (membersData) {
          setMembers(membersData);
          const savedUser = localStorage.getItem('golfUser');
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              const updatedUser = membersData.find(m => m.id === userData.id);
              if (updatedUser) {
                setUser(updatedUser);
                localStorage.setItem('golfUser', JSON.stringify(updatedUser));
              }
            } catch (e) {}
          }
        }
      } catch (error) {}
    });

    socket.on('posts:updated', async () => {
      try {
        const postsData = await apiService.fetchPosts();
        if (postsData) setPosts(postsData);
      } catch (error) {}
    });

    socket.on('bookings:updated', async () => {
      try {
        const bookingsData = await apiService.fetchBookings();
        if (bookingsData) setBookings(bookingsData);
      } catch (error) {}
    });

    socket.on('transactions:updated', async () => {
      const currentUser = userRef.current;
      if (currentUser?.id) {
        try {
          const transactionsData = await apiService.fetchMemberTransactions(currentUser.id);
          if (transactionsData) setUserTransactions(transactionsData);
        } catch (error) {}
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const [membersData, postsData, bookingsData] = await Promise.all([
            apiService.fetchMembers(),
            apiService.fetchPosts(),
            apiService.fetchBookings()
          ]);
          
          if (membersData) {
            setMembers(membersData);
            const savedUser = localStorage.getItem('golfUser');
            if (savedUser) {
              try {
                const userData = JSON.parse(savedUser);
                const updatedUser = membersData.find(m => m.id === userData.id);
                if (updatedUser) {
                  setUser(updatedUser);
                  localStorage.setItem('golfUser', JSON.stringify(updatedUser));
                }
              } catch (e) {}
            }
          }
          if (postsData) setPosts(postsData);
          if (bookingsData) setBookings(bookingsData);
        } catch (error) {}
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const loadUserTransactions = async () => {
      if (user?.id) {
        try {
          const transactionsData = await apiService.fetchMemberTransactions(user.id);
          setUserTransactions(transactionsData || []);
        } catch (error) {
          setUserTransactions([]);
        }
      } else {
        setUserTransactions([]);
      }
    };
    loadUserTransactions();
  }, [user?.id]);

  const loadUserData = async (userId) => {
    try {
      const userScores = await apiService.fetchScores(userId);
      setScores(userScores);
      
      setUser(prevUser => {
        if (!prevUser) return null;
        
        if (userScores.length > 0) {
          const handicapData = calculateHandicap(prevUser, userScores.map(s => ({
            ...s,
            holes: s.holes ? JSON.parse(s.holes) : []
          })));
          
          const updatedUser = { 
            ...prevUser, 
            calculatedHandicap: handicapData.value,
            handicapType: handicapData.type,
            handicapExplanation: handicapData.explanation
          };
          localStorage.setItem('golfUser', JSON.stringify(updatedUser));
          return updatedUser;
        }
        
        return prevUser;
      });
    } catch (error) {}
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('golfUser', JSON.stringify(userData));
    loadUserData(userData.id);
    
    if (!checkRequiredFields(userData)) {
      setRequiresProfileComplete(true);
    } else {
      setRequiresProfileComplete(false);
    }
  };
  
  const clearRequiresProfileComplete = () => {
    setRequiresProfileComplete(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('golfUser');
    setScores([]);
  };

  const updateUser = (updates) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, ...updates };
      localStorage.setItem('golfUser', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const saveScore = async (scoreData) => {
    try {
      const score = await apiService.createScore({
        ...scoreData,
        holes: JSON.stringify(scoreData.holes)
      });
      
      const newScores = [...scores, { ...score, holes: JSON.parse(score.holes) }];
      setScores(newScores);
      
      setUser(prevUser => {
        if (!prevUser) return null;
        
        const handicapData = calculateHandicap(prevUser, newScores);
        const updatedUser = { 
          ...prevUser, 
          calculatedHandicap: handicapData.value,
          handicapType: handicapData.type,
          handicapExplanation: handicapData.explanation
        };
        localStorage.setItem('golfUser', JSON.stringify(updatedUser));
        return updatedUser;
      });
      
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

  const deletePost = async (postId) => {
    try {
      await apiService.deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Post deletion failed:', error);
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
      const membersData = await apiService.fetchMembers();
      if (membersData) {
        setMembers(membersData);
        if (user) {
          const updatedUser = membersData.find(m => m.id === user.id);
          if (updatedUser) {
            setUser(updatedUser);
            try { localStorage.setItem('golfUser', JSON.stringify(updatedUser)); } catch (e) {}
          }
        }
      }
    } catch (error) {}
  };

  const refreshCourses = async () => {
    try {
      const coursesData = await apiService.fetchCourses();
      if (coursesData) setCourses(coursesData);
    } catch (error) {}
  };

  const refreshBookings = async () => {
    try {
      const bookingsData = await apiService.fetchBookings();
      if (bookingsData) setBookings(bookingsData);
    } catch (error) {}
  };

  const refreshAllData = async () => {
    setLoading(true);
    
    try {
      const [membersData, postsData, bookingsData, feesData, coursesData] = await Promise.all([
        apiService.fetchMembers().catch(() => []),
        apiService.fetchPosts().catch(() => []),
        apiService.fetchBookings().catch(() => []),
        apiService.fetchFees().catch(() => []),
        apiService.fetchCourses().catch(() => [])
      ]);
      
      if (Array.isArray(membersData)) {
        setMembers(membersData);
        if (user) {
          const updatedUser = membersData.find(m => m.id === user.id);
          if (updatedUser) {
            setUser(updatedUser);
            try { localStorage.setItem('golfUser', JSON.stringify(updatedUser)); } catch (e) {}
          }
        }
      }

      if (Array.isArray(postsData)) setPosts(postsData);
      if (Array.isArray(bookingsData)) setBookings(bookingsData);
      if (Array.isArray(feesData)) setFees(feesData);
      if (Array.isArray(coursesData)) setCourses(coursesData);

      if (user) {
        try { await loadUserData(user.id); } catch (err) {}
      }

      setLoading(false);
      return true;
    } catch (error) {
      setLoading(false);
      return false;
    }
  };

  const isAdmin = () => user?.role === '관리자';
  const isOperator = () => user?.role === '운영진' || user?.role === '관리자' || user?.role === '방장' || user?.role === '클럽운영진';
  const isMember = () => user?.role === '회원';

  const value = {
    user,
    members,
    posts,
    bookings,
    scores,
    fees,
    courses,
    userTransactions,
    loading,
    login,
    logout,
    updateUser,
    saveScore,
    addPost,
    updatePost,
    deletePost,
    addBooking,
    updateBooking,
    addFee,
    payFee,
    addCourse,
    refreshMembers,
    refreshCourses,
    refreshBookings,
    refreshAllData,
    isAdmin,
    isOperator,
    isMember,
    requiresProfileComplete,
    clearRequiresProfileComplete,
    checkRequiredFields
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
