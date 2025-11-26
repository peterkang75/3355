import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
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
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 소켓 이벤트 핸들러에서 최신 user 값을 참조하기 위한 ref
  const userRef = useRef(null);
  
  // user 변경 시 ref 동기화
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
        const cachedMembers = localStorage.getItem('golfMembers');
        const cachedPosts = localStorage.getItem('golfPosts');
        const cachedBookings = localStorage.getItem('golfBookings');
        const cachedFees = localStorage.getItem('golfFees');
        
        if (cachedMembers) {
          const membersData = JSON.parse(cachedMembers);
          console.log('💾 캐시된 회원 데이터 로드:', membersData.length, '명');
          setMembers(membersData);
        }
        
        if (cachedPosts) {
          const postsData = JSON.parse(cachedPosts);
          console.log('💾 캐시된 게시글 데이터 로드:', postsData.length, '개');
          setPosts(postsData);
        }
        
        if (cachedBookings) {
          const bookingsData = JSON.parse(cachedBookings);
          console.log('💾 캐시된 라운딩 데이터 로드:', bookingsData.length, '개');
          setBookings(bookingsData);
        }
        
        if (cachedFees) {
          const feesData = JSON.parse(cachedFees);
          console.log('💾 캐시된 회비 데이터 로드:', feesData.length, '개');
          setFees(feesData);
        }
        
        console.log('🔄 서버에서 최신 데이터 가져오는 중...');
        
        const [membersData, postsData, bookingsData, feesData, coursesData] = await Promise.all([
          apiService.fetchMembers().catch(err => { console.error('Members 로드 실패:', err); return []; }),
          apiService.fetchPosts().catch(err => { console.error('Posts 로드 실패:', err); return []; }),
          apiService.fetchBookings().catch(err => { console.error('Bookings 로드 실패:', err); return []; }),
          apiService.fetchFees().catch(err => { console.error('Fees 로드 실패:', err); return []; }),
          apiService.fetchCourses().catch(err => { console.error('Courses 로드 실패:', err); return []; })
        ]);

        if (membersData && membersData.length > 0) {
          console.log('✅ 서버 회원 데이터 로드:', membersData.length, '명');
          setMembers(membersData);
          try {
            localStorage.setItem('golfMembers', JSON.stringify(membersData));
          } catch (e) {
            console.warn('⚠️ 회원 데이터 저장 실패:', e.message);
          }
          
          if (savedUserId) {
            const currentUser = membersData.find(m => m.id === savedUserId);
            if (currentUser) {
              console.log('✅ 로그인한 사용자 정보 업데이트:', currentUser.name);
              setUser(currentUser);
              try {
                localStorage.setItem('golfUser', JSON.stringify(currentUser));
              } catch (e) {
                console.warn('⚠️ 사용자 데이터 저장 실패:', e.message);
              }
            }
          }
        }

        if (postsData && postsData.length > 0) {
          console.log('✅ 서버 게시글 데이터 로드:', postsData.length, '개');
          setPosts(postsData);
          try {
            localStorage.setItem('golfPosts', JSON.stringify(postsData));
          } catch (e) {
            console.warn('⚠️ 게시글 데이터 저장 실패:', e.message);
          }
        }

        if (bookingsData && bookingsData.length > 0) {
          console.log('✅ 서버 라운딩 데이터 로드:', bookingsData.length, '개');
          setBookings(bookingsData);
          try {
            localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
          } catch (e) {
            console.warn('⚠️ 라운딩 데이터 저장 실패:', e.message);
          }
        }

        if (feesData && feesData.length > 0) {
          console.log('✅ 서버 회비 데이터 로드:', feesData.length, '개');
          setFees(feesData);
          try {
            localStorage.setItem('golfFees', JSON.stringify(feesData));
          } catch (e) {
            console.warn('⚠️ 회비 데이터 저장 실패:', e.message);
          }
        }

        if (coursesData && coursesData.length > 0) {
          console.log('✅ 골프장 데이터 로드:', coursesData.length, '개');
          setCourses(coursesData);
        } else {
          console.log('⚠️ 골프장 데이터 없음 - 기본 코스 생성 시도');
          try {
            const defaultCourses = [
              { name: 'The Australian Golf Club', address: 'Kensington' },
              { name: 'Concord Golf Club', address: 'Concord' },
              { name: 'St Michael\'s Golf Club', address: 'Little Bay' }
            ];
            
            for (const course of defaultCourses) {
              try {
                await apiService.createCourse(course);
                console.log('✅ 코스 생성:', course.name);
              } catch (err) {
                console.log('ℹ️ 코스 이미 존재:', course.name);
              }
            }
            
            const refreshedCourses = await apiService.fetchCourses();
            if (refreshedCourses && refreshedCourses.length > 0) {
              setCourses(refreshedCourses);
              console.log('✅ 골프장 데이터 로드:', refreshedCourses.length, '개');
            }
          } catch (err) {
            console.log('⚠️ 기본 코스 생성 중 오류 발생 (계속 진행)');
          }
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

  useEffect(() => {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;
    
    console.log('🔌 Socket.IO 연결 시도:', socketUrl);
    console.log('📱 현재 기기:', /mobile/i.test(navigator.userAgent) ? '모바일' : 'PC');
    
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO 연결 성공 - Socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO 연결 끊김');
    });
    
    socket.on('reconnect', () => {
      console.log('♻️ Socket.IO 재연결 성공');
    });

    socket.on('members:updated', async () => {
      console.log('📢 회원 데이터 업데이트 이벤트 수신');
      try {
        const membersData = await apiService.fetchMembers();
        if (membersData) {
          setMembers(membersData);
          try {
            localStorage.setItem('golfMembers', JSON.stringify(membersData));
          } catch (e) {
            console.warn('⚠️ 회원 데이터 저장 실패 (quota):', e.message);
          }
          
          const savedUser = localStorage.getItem('golfUser');
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            const updatedUser = membersData.find(m => m.id === userData.id);
            if (updatedUser) {
              setUser(updatedUser);
              try {
                localStorage.setItem('golfUser', JSON.stringify(updatedUser));
              } catch (e) {
                console.warn('⚠️ 사용자 데이터 저장 실패:', e.message);
              }
            }
          }
        }
      } catch (error) {
        console.error('회원 새로고침 실패:', error);
      }
    });

    socket.on('posts:updated', async () => {
      console.log('📢 게시글 데이터 업데이트 이벤트 수신');
      try {
        const postsData = await apiService.fetchPosts();
        if (postsData) {
          setPosts(postsData);
          try {
            localStorage.setItem('golfPosts', JSON.stringify(postsData));
          } catch (e) {
            console.warn('⚠️ 게시글 데이터 저장 실패 (quota):', e.message);
          }
        }
      } catch (error) {
        console.error('게시글 새로고침 실패:', error);
      }
    });

    socket.on('bookings:updated', async () => {
      console.log('📢 라운딩 데이터 업데이트 이벤트 수신');
      try {
        const bookingsData = await apiService.fetchBookings();
        if (bookingsData) {
          setBookings(bookingsData);
          try {
            localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
          } catch (e) {
            console.warn('⚠️ 라운딩 데이터 저장 실패 (quota):', e.message);
          }
        }
      } catch (error) {
        console.error('라운딩 새로고침 실패:', error);
      }
    });

    socket.on('transactions:updated', async () => {
      console.log('📢 거래 데이터 업데이트 이벤트 수신');
      // user 거래 내역 갱신 (userRef를 사용하여 최신 user 값 참조)
      const currentUser = userRef.current;
      if (currentUser?.id) {
        try {
          console.log('🔄 거래 내역 갱신 시작:', currentUser.id);
          const transactionsData = await apiService.fetchMemberTransactions(currentUser.id);
          if (transactionsData) {
            console.log('✅ 거래 내역 갱신 완료:', transactionsData.length, '건');
            setUserTransactions(transactionsData);
          }
        } catch (error) {
          console.error('거래 내역 갱신 실패:', error);
        }
      } else {
        console.log('⚠️ 거래 내역 갱신 건너뜀: 사용자 미로그인');
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 앱이 포어그라운드로 돌아옴 - 데이터 새로고침');
        try {
          const [membersData, postsData, bookingsData] = await Promise.all([
            apiService.fetchMembers(),
            apiService.fetchPosts(),
            apiService.fetchBookings()
          ]);
          
          if (membersData) {
            setMembers(membersData);
            localStorage.setItem('golfMembers', JSON.stringify(membersData));
            
            const savedUser = localStorage.getItem('golfUser');
            if (savedUser) {
              const userData = JSON.parse(savedUser);
              const updatedUser = membersData.find(m => m.id === userData.id);
              if (updatedUser) {
                setUser(updatedUser);
                localStorage.setItem('golfUser', JSON.stringify(updatedUser));
              }
            }
          }
          
          if (postsData) {
            setPosts(postsData);
            localStorage.setItem('golfPosts', JSON.stringify(postsData));
          }
          
          if (bookingsData) {
            setBookings(bookingsData);
            localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
          }
        } catch (error) {
          console.error('포어그라운드 새로고침 실패:', error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
    };
  }, []);

  // user 거래 내역 로드
  useEffect(() => {
    const loadUserTransactions = async () => {
      if (user?.id) {
        try {
          const transactionsData = await apiService.fetchMemberTransactions(user.id);
          setUserTransactions(transactionsData || []);
        } catch (error) {
          console.error('거래 내역 로드 실패:', error);
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
      console.log('🔄 사용자 스코어 로딩 시작...', userId);
      const userScores = await apiService.fetchScores(userId);
      setScores(userScores);
      console.log('✅ 스코어 데이터 로드:', userScores.length, '개');
      
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
    } catch (error) {
      console.error('❌ 사용자 데이터 로드 실패:', error);
    }
  };

  const login = (userData) => {
    console.log('🔑 Login 함수 - userData:', userData);
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

  const refreshAllData = async () => {
    console.log('🔄 모든 데이터 새로고침 시작...');
    setLoading(true);
    
    try {
      try {
        localStorage.removeItem('golfPosts');
        localStorage.removeItem('golfBookings');
        localStorage.removeItem('golfFees');
        console.log('✅ 로컬 캐시 삭제 완료');
      } catch (storageError) {
        console.warn('⚠️ 로컬 캐시 삭제 실패 (계속 진행):', storageError);
      }
      
      console.log('📡 서버에서 데이터 가져오는 중...');
      const [membersData, postsData, bookingsData, feesData, coursesData] = await Promise.all([
        apiService.fetchMembers().catch(err => { 
          console.error('⚠️ 회원 데이터 로드 실패:', err); 
          return []; 
        }),
        apiService.fetchPosts().catch(err => { 
          console.error('⚠️ 게시글 데이터 로드 실패:', err); 
          return []; 
        }),
        apiService.fetchBookings().catch(err => { 
          console.error('⚠️ 예약 데이터 로드 실패:', err); 
          return []; 
        }),
        apiService.fetchFees().catch(err => { 
          console.error('⚠️ 회비 데이터 로드 실패:', err); 
          return []; 
        }),
        apiService.fetchCourses().catch(err => { 
          console.error('⚠️ 골프장 데이터 로드 실패:', err); 
          return []; 
        })
      ]);

      console.log('📦 데이터 저장 중...');
      
      if (Array.isArray(membersData)) {
        console.log('✅ 회원 데이터 업데이트:', membersData.length, '명');
        setMembers(membersData);
        try {
          localStorage.setItem('golfMembers', JSON.stringify(membersData));
        } catch (e) {
          console.error('⚠️ 회원 데이터 localStorage 저장 실패:', e);
        }
        
        if (user) {
          const updatedUser = membersData.find(m => m.id === user.id);
          if (updatedUser) {
            setUser(updatedUser);
            try {
              localStorage.setItem('golfUser', JSON.stringify(updatedUser));
            } catch (e) {
              console.error('⚠️ 사용자 데이터 localStorage 저장 실패:', e);
            }
          }
        }
      }

      if (Array.isArray(postsData)) {
        console.log('✅ 게시글 데이터 업데이트:', postsData.length, '개');
        setPosts(postsData);
        try {
          localStorage.setItem('golfPosts', JSON.stringify(postsData));
        } catch (e) {
          console.error('⚠️ 게시글 데이터 localStorage 저장 실패:', e);
        }
      }

      if (Array.isArray(bookingsData)) {
        console.log('✅ 예약 데이터 업데이트:', bookingsData.length, '개');
        setBookings(bookingsData);
        try {
          localStorage.setItem('golfBookings', JSON.stringify(bookingsData));
        } catch (e) {
          console.error('⚠️ 예약 데이터 localStorage 저장 실패:', e);
        }
      }

      if (Array.isArray(feesData)) {
        console.log('✅ 회비 데이터 업데이트:', feesData.length, '개');
        setFees(feesData);
        try {
          localStorage.setItem('golfFees', JSON.stringify(feesData));
        } catch (e) {
          console.error('⚠️ 회비 데이터 localStorage 저장 실패:', e);
        }
      }

      if (Array.isArray(coursesData)) {
        console.log('✅ 골프장 데이터 업데이트:', coursesData.length, '개');
        setCourses(coursesData);
      }

      if (user) {
        try {
          console.log('👤 사용자 스코어 데이터 로드 중...');
          await loadUserData(user.id);
          console.log('✅ 사용자 스코어 데이터 로드 완료');
        } catch (err) {
          console.error('⚠️ 사용자 데이터 로드 실패:', err);
        }
      }

      console.log('✅ 모든 데이터 새로고침 완료!');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('❌ 데이터 새로고침 실패:', error);
      console.error('에러 상세:', error.message, error.stack);
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
