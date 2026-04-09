/**
 * AppContext — 하위 호환 래퍼
 *
 * 도메인 Context가 분리되어 있습니다:
 *   useAuth()    → AuthContext    (user, members, settings)
 *   useBooking() → BookingContext (bookings, courses)
 *   usePost()    → PostContext    (posts)
 *   useFinance() → FinanceContext (fees, transactions, scores)
 *
 * 기존 useApp() 호출은 모두 그대로 동작합니다.
 * 새 컴포넌트는 도메인별 훅을 직접 사용하세요.
 */
import React, { useCallback } from 'react';
import { SocketProvider } from './SocketContext';
import { AuthProvider, useAuth } from './AuthContext';
import { BookingProvider, useBooking } from './BookingContext';
import { PostProvider, usePost } from './PostContext';
import { FinanceProvider, useFinance } from './FinanceContext';

export function AppProvider({ children }) {
  return (
    <SocketProvider>
      <AuthProvider>
        <BookingProvider>
          <PostProvider>
            <FinanceProvider>
              {children}
            </FinanceProvider>
          </PostProvider>
        </BookingProvider>
      </AuthProvider>
    </SocketProvider>
  );
}

/** 하위 호환: 기존 useApp() 호출이 모두 동작합니다. */
export function useApp() {
  const auth = useAuth();
  const booking = useBooking();
  const post = usePost();
  const finance = useFinance();

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      auth.refreshMembers(),
      booking.refreshBookings(),
      booking.refreshCourses(),
      post.refreshPosts(),
      finance.refreshFees(),
    ]);
  }, [auth, booking, post, finance]);

  return {
    // AuthContext
    user: auth.user,
    members: auth.members,
    loading: auth.loading,
    requiresProfileComplete: auth.requiresProfileComplete,
    clubLogo: auth.clubLogo,
    featurePermissions: auth.featurePermissions,
    featureSettings: auth.featureSettings,
    login: auth.login,
    logout: auth.logout,
    updateUser: auth.updateUser,
    clearRequiresProfileComplete: auth.clearRequiresProfileComplete,
    refreshMembers: auth.refreshMembers,
    updateClubLogo: auth.updateClubLogo,
    isAdmin: auth.isAdmin,
    isOperator: auth.isOperator,
    isMember: auth.isMember,
    hasFeaturePermission: auth.hasFeaturePermission,
    checkRequiredFields: auth.checkRequiredFields,

    // BookingContext
    bookings: booking.bookings,
    courses: booking.courses,
    addBooking: booking.addBooking,
    updateBooking: booking.updateBooking,
    refreshBookings: booking.refreshBookings,
    addCourse: booking.addCourse,
    refreshCourses: booking.refreshCourses,

    // PostContext
    posts: post.posts,
    addPost: post.addPost,
    updatePost: post.updatePost,
    deletePost: post.deletePost,
    refreshPosts: post.refreshPosts,

    // FinanceContext
    fees: finance.fees,
    userTransactions: finance.userTransactions,
    scores: finance.scores,
    addFee: finance.addFee,
    payFee: finance.payFee,
    saveScore: finance.saveScore,
    refreshFees: finance.refreshFees,

    // 전체 새로고침
    refreshAllData,
  };
}

// AppContext 직접 import 지원 (레거시)
export { useAuth, useBooking, usePost, useFinance };
