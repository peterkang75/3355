import React, { createContext, useState, useContext, useEffect } from 'react';
import googleSheetsService from '../services/googleSheets';
import { calculateHandicap } from '../utils/handicap';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [scores, setScores] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('golfUser');
    const savedPosts = localStorage.getItem('golfPosts');
    const savedBookings = localStorage.getItem('golfBookings');
    const savedFees = localStorage.getItem('golfFees');

    if (savedPosts) setPosts(JSON.parse(savedPosts));
    if (savedBookings) setBookings(JSON.parse(savedBookings));
    if (savedFees) setFees(JSON.parse(savedFees));

    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      loadUserData(userData.id);
    }
    setLoading(false);
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

  const addPost = (post) => {
    const newPosts = [post, ...posts];
    setPosts(newPosts);
    localStorage.setItem('golfPosts', JSON.stringify(newPosts));
  };

  const updatePost = (postId, updates) => {
    const newPosts = posts.map(p => p.id === postId ? { ...p, ...updates } : p);
    setPosts(newPosts);
    localStorage.setItem('golfPosts', JSON.stringify(newPosts));
  };

  const addBooking = (booking) => {
    const newBookings = [booking, ...bookings];
    setBookings(newBookings);
    localStorage.setItem('golfBookings', JSON.stringify(newBookings));
  };

  const updateBooking = (bookingId, updates) => {
    const newBookings = bookings.map(b => b.id === bookingId ? { ...b, ...updates } : b);
    setBookings(newBookings);
    localStorage.setItem('golfBookings', JSON.stringify(newBookings));
  };

  const addFee = (fee) => {
    const newFees = [...fees, fee];
    setFees(newFees);
    localStorage.setItem('golfFees', JSON.stringify(newFees));
    
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

  const value = {
    user,
    members,
    posts,
    bookings,
    scores,
    fees,
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
    payFee
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
