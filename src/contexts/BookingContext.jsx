import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import apiService from '../services/api';
import { useSocket } from './SocketContext';

const BookingContext = createContext();

export function BookingProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [courses, setCourses] = useState([]);

  const socket = useSocket();
  const debounceRef = useRef(null);

  // 초기 로드 (백그라운드)
  useEffect(() => {
    Promise.all([
      apiService.fetchBookings().catch(() => []),
      apiService.fetchCourses().catch(() => []),
    ]).then(([bookingsData, coursesData]) => {
      if (bookingsData?.length > 0) setBookings(bookingsData);
      if (coursesData?.length > 0) setCourses(coursesData);
    });
  }, []);

  // 소켓: bookings:updated
  useEffect(() => {
    if (!socket) return;

    const handleBookingsUpdated = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await apiService.fetchBookings();
          if (data) setBookings(data);
        } catch (e) {}
      }, 300);
    };

    socket.on('bookings:updated', handleBookingsUpdated);
    return () => socket.off('bookings:updated', handleBookingsUpdated);
  }, [socket]);

  // 앱 복귀 시 갱신
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await apiService.fetchBookings();
        if (data) setBookings(data);
      } catch (e) {}
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const addBooking = useCallback(async (bookingData) => {
    const booking = await apiService.createBooking(bookingData);
    setBookings(prev => [booking, ...prev]);
    return booking;
  }, []);

  const updateBooking = useCallback(async (bookingId, updates) => {
    const booking = await apiService.updateBooking(bookingId, updates);
    setBookings(prev => prev.map(b => b.id === bookingId ? booking : b));
    return booking;
  }, []);

  const refreshBookings = useCallback(async () => {
    try {
      const data = await apiService.fetchBookings();
      if (data) setBookings(data);
    } catch (e) {}
  }, []);

  const addCourse = useCallback(async (courseData) => {
    const course = await apiService.createCourse(courseData);
    setCourses(prev => [...prev, course]);
    return course;
  }, []);

  const refreshCourses = useCallback(async () => {
    try {
      const data = await apiService.fetchCourses();
      if (data) setCourses(data);
    } catch (e) {}
  }, []);

  const value = useMemo(() => ({
    bookings,
    courses,
    addBooking,
    updateBooking,
    refreshBookings,
    addCourse,
    refreshCourses,
  }), [bookings, courses, addBooking, updateBooking, refreshBookings, addCourse, refreshCourses]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
