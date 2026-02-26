import React, { useState, useEffect, memo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import CrownIcon from '../components/CrownIcon';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import { Badge, Card, Button, PageHeader, ProfileBadge } from '../components/common';
import BookingListCard from '../components/booking/BookingListCard';

function Dashboard() {
  const { user, members, scores, bookings, posts, fees, userTransactions, addPost, updatePost, deletePost, updateBooking, refreshBookings, refreshAllData, refreshMembers, hasFeaturePermission } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const canCreatePost = user && (user.isAdmin || user.role === '관리자' || user.role === '방장' || user.role === '운영진' || user.role === '클럽운영진');
  const [showNewPost, setShowNewPost] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [expandedPost, setExpandedPost] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isRentalLoading, setIsRentalLoading] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [joiningBookingId, setJoiningBookingId] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(true);

  useEffect(() => {
    if (location.state?.reset) {
      setShowNewPost(false);
      setNewPost({ title: '', content: '' });
      setExpandedPost(null);
      setNewComment('');
      setOpenMenuPostId(null);
      setEditingPost(null);
      setOpenMenuCommentId(null);
      setEditingComment(null);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 날짜 포맷 함수 (MM/DD HH:mm)
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  const getRelativeTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    return formatDateTime(dateString);
  };

  // 개인 잔액 계산 (참가비 페이지와 동일한 방식)
  const totalCharges = userTransactions
    .filter((t) => t.type === "charge")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = userTransactions
    .filter((t) => t.type === "payment" && t.category !== "크레딧 자동 납부" && t.category !== "크레딧 자동 차감")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = userTransactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = userTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCreditDonations = userTransactions
    .filter((t) => t.type === "creditDonation")
    .reduce((sum, t) => sum + t.amount, 0);
  const calculatedBalance =
    totalPayments +
    totalCredits -
    totalCharges -
    totalExpenses -
    totalCreditDonations;

  // 거래내역 로드 - user가 업데이트될 때마다 자동 새로고침
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id) return;
      try {
        const transactionsData = await apiService.fetchMemberTransactions(user.id);
        setRecentTransactions(transactionsData.slice(0, 3));
      } catch (error) {
        console.error('거래내역 로드 실패:', error);
        setRecentTransactions([]);
      }
    };

    loadTransactions();
  }, [user]); // user 객체가 변경될 때마다 새로고침 (AppContext의 Socket.IO가 user 업데이트)

  // 점 세 개 메뉴 외부 클릭 시 닫기 (게시글)
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuPostId !== null) {
        setOpenMenuPostId(null);
      }
    };

    if (openMenuPostId !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuPostId]);

  // 점 세 개 메뉴 외부 클릭 시 닫기 (댓글)
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuCommentId !== null) {
        setOpenMenuCommentId(null);
      }
    };

    if (openMenuCommentId !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuCommentId]);

  const handleCreatePost = async () => {
    if (isCreatingPost) return;
    if (!newPost.title || !newPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    setIsCreatingPost(true);
    try {
      const post = {
        title: newPost.title,
        content: newPost.content,
        authorId: user.id
      };

      await addPost(post);
      setNewPost({ title: '', content: '' });
      setShowNewPost(false);
    } catch (error) {
      alert('게시글 작성에 실패했습니다.');
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleAddComment = async (postId) => {
    if (isAddingComment === postId) return;
    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    setIsAddingComment(postId);
    try {
      const post = posts.find(p => p.id === postId);
      const updatedComments = [...(post.comments || []), {
        id: Date.now(),
        content: newComment,
        author: user.nickname || user.name,
        authorId: user.id,
        authorPhoto: user.photo,
        date: new Date().toISOString(),
        likes: []
      }];

      await updatePost(postId, { comments: updatedComments });
      setNewComment('');
    } catch (error) {
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setIsAddingComment(null);
    }
  };

  const handleLikeComment = (postId, commentId) => {
    const post = posts.find(p => p.id === postId);
    const updatedComments = post.comments.map(comment => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        const hasLiked = likes.includes(user.id);
        return {
          ...comment,
          likes: hasLiked 
            ? likes.filter(id => id !== user.id)
            : [...likes, user.id]
        };
      }
      return comment;
    });

    updatePost(postId, { comments: updatedComments });
  };

  const handleLikePost = (postId) => {
    const post = posts.find(p => p.id === postId);
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.id);
    
    updatePost(postId, {
      likes: hasLiked 
        ? likes.filter(id => id !== user.id)
        : [...likes, user.id]
    });
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('이 게시글을 삭제하시겠습니까?')) {
      try {
        await deletePost(postId);
        setOpenMenuPostId(null);
        setExpandedPost(null);
      } catch (error) {
        alert('게시글 삭제에 실패했습니다.');
      }
    }
  };

  const handleEditPost = (post) => {
    setEditingPost({ id: post.id, title: post.title, content: post.content });
    setOpenMenuPostId(null);
  };

  const handleTogglePostActive = async (postId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/toggle-active`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to toggle');
      setOpenMenuPostId(null);
      await refreshAllData();
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost.title || !editingPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      await updatePost(editingPost.id, {
        title: editingPost.title,
        content: editingPost.content
      });
      setEditingPost(null);
    } catch (error) {
      alert('게시글 수정에 실패했습니다.');
    }
  };

  const handleEditComment = (postId, comment) => {
    setEditingComment({ postId, commentId: comment.id, content: comment.content });
    setOpenMenuCommentId(null);
  };

  const handleUpdateComment = async () => {
    if (!editingComment.content.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const post = posts.find(p => p.id === editingComment.postId);
      const updatedComments = post.comments.map(c => 
        c.id === editingComment.commentId 
          ? { ...c, content: editingComment.content }
          : c
      );
      
      await updatePost(editingComment.postId, { comments: updatedComments });
      setEditingComment(null);
    } catch (error) {
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (window.confirm('이 댓글을 삭제하시겠습니까?')) {
      try {
        const post = posts.find(p => p.id === postId);
        const updatedComments = post.comments.filter(c => c.id !== commentId);
        
        await updatePost(postId, { comments: updatedComments });
        setOpenMenuCommentId(null);
      } catch (error) {
        alert('댓글 삭제에 실패했습니다.');
      }
    }
  };

  const parseParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) return [];
    return participants.map(p => {
      try {
        return typeof p === 'string' ? JSON.parse(p) : p;
      } catch {
        return p;
      }
    });
  };

  const hasTeams = (booking) => {
    if (!booking.teams) return false;
    try {
      const teams = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
      return teams && teams.length > 0;
    } catch {
      return false;
    }
  };

  const handleJoinBooking = async (bookingId) => {
    if (joiningBookingId === bookingId) return;
    
    setJoiningBookingId(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      const participants = parseParticipants(booking.participants);
      const alreadyJoined = participants.some(p => p.phone === user.phone);
      
      const participationFee = (booking.greenFee || 0) + (booking.cartFee || 0) + (booking.membershipFee || 0);
      
      if (alreadyJoined) {
        const updatedParticipants = participants
          .filter(p => p.phone !== user.phone)
          .map(p => JSON.stringify(p));
        
        await updateBooking(bookingId, {
          participants: updatedParticipants
        });
        
        if (participationFee > 0) {
          await apiService.deleteChargeTransaction(user.id, bookingId);
        }
      } else {
        const updatedParticipants = [
          ...participants,
          { name: user.name, nickname: user.nickname, phone: user.phone }
        ].map(p => JSON.stringify(p));
        
        await updateBooking(bookingId, {
          participants: updatedParticipants
        });
        
        if (participationFee > 0) {
          const transactionData = {
            type: 'charge',
            amount: participationFee,
            description: `회비 청구`,
            date: new Date().toISOString().split('T')[0],
            memberId: user.id,
            bookingId: bookingId,
            createdBy: user.id
          };
          await apiService.createTransaction(transactionData);
        }
      }
      
      await refreshBookings();
    } catch (error) {
      alert('참가/참가 취소 처리에 실패했습니다.');
    } finally {
      setJoiningBookingId(null);
    }
  };

  const handleToggleNumberRental = async (bookingId) => {
    if (isRentalLoading === bookingId) return;
    
    try {
      setIsRentalLoading(bookingId);
      const booking = bookings.find(b => b.id === bookingId);
      const isCurrentlyRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
      
      await apiService.toggleNumberRental(bookingId, user.phone);
      await refreshBookings();
      
      setIsRentalLoading(null);
    } catch (error) {
      console.error('번호 대여 상태 변경 실패:', error);
      alert('번호 대여 상태 변경에 실패했습니다.');
      setIsRentalLoading(null);
    }
  };

  const hasUserScore = (booking) => {
    if (!scores || scores.length === 0) return false;
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    return scores.some(score => {
      const scoreDate = new Date(score.date).toISOString().split('T')[0];
      return scoreDate === bookingDate && score.courseName === booking.courseName;
    });
  };

  const getUserScore = (booking) => {
    if (!scores || scores.length === 0) return null;
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    return scores.find(score => {
      const scoreDate = new Date(score.date).toISOString().split('T')[0];
      return scoreDate === bookingDate && score.courseName === booking.courseName;
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return `$${parseInt(amount).toLocaleString()}`;
  };

  const getParticipantDisplayName = (participant) => {
    if (participant.nickname) return participant.nickname;
    
    const member = members.find(m => m.phone === participant.phone);
    if (member && member.nickname) return member.nickname;
    
    return participant.name;
  };

  const getDaysUntilDeadline = (deadlineDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCompetitionDeadline = (roundingDateStr) => {
    const roundingDate = new Date(roundingDateStr);
    
    // Get the start of the rounding week (Monday-based week)
    const roundingDayOfWeek = roundingDate.getDay();
    const daysFromMonday = roundingDayOfWeek === 0 ? 6 : roundingDayOfWeek - 1;
    const startOfRoundingWeek = new Date(roundingDate);
    startOfRoundingWeek.setDate(roundingDate.getDate() - daysFromMonday);
    
    // Go back one week
    const oneWeekBefore = new Date(startOfRoundingWeek);
    oneWeekBefore.setDate(startOfRoundingWeek.getDate() - 7);
    
    // Get the Saturday of that week (5 days after Monday)
    const deadline = new Date(oneWeekBefore);
    deadline.setDate(oneWeekBefore.getDate() + 5);
    deadline.setHours(18, 0, 0, 0); // 6 PM
    
    return deadline;
  };

  const isRegistrationClosed = (booking) => {
    // For competition rounds, use automatic deadline: Saturday 6 PM, one week before
    if (booking.type === '컴페티션') {
      const deadline = getCompetitionDeadline(booking.date);
      return new Date() > deadline;
    }
    
    // For regular rounds, use manual registrationDeadline if set
    if (!booking.registrationDeadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(booking.registrationDeadline);
    deadline.setHours(0, 0, 0, 0);
    return today > deadline;
  };

  const isPastRoundingDate = (booking) => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    bookingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today > bookingDate;
  };

  const isRoundingDay = (booking) => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    bookingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today.getTime() === bookingDate.getTime();
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshAllData();
      if (success) {
        alert('✅ 데이터를 최신 상태로 업데이트했습니다!');
      } else {
        alert('❌ 데이터 새로고침에 실패했습니다.\n\n브라우저 개발자 도구(F12)의 Console 탭에서 에러를 확인하세요.');
      }
    } catch (error) {
      console.error('새로고침 에러:', error);
      alert('❌ 새로고침 중 오류가 발생했습니다.\n\n에러: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const canViewBooking = (booking) => {
    if (booking.type === '정기모임') {
      return true;
    }
    if (booking.type === '컴페티션') {
      if (booking.isGuestAllowed) {
        return true;
      }
      if (user.club === booking.courseName) {
        return true;
      }
      const participants = parseParticipants(booking.participants);
      const isParticipant = participants.some(p => p.phone === user.phone);
      if (isParticipant) {
        return true;
      }
      return false;
    }
    return true;
  };
  
  const announcedBookings = bookings
    .filter(b => {
      if (!b.isAnnounced) return false;
      if (!canViewBooking(b)) return false;
      const bookingDate = new Date(b.date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const myBookings = bookings
    .filter(b => {
      const parts = parseParticipants(b.participants);
      return parts.some(p => p.phone === user.phone);
    })
    .filter(b => {
      const bDate = new Date(b.date);
      bDate.setHours(0, 0, 0, 0);
      return bDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <PageHeader 
        title="대시보드" 
        rightContent={<ProfileBadge user={user} showGreeting={true} />}
      />

      <div className="page-content">

        {/* 나의 라운딩 */}
        <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '0 16px', marginBottom: '16px' }}>
          <div onClick={() => setIsMyBookingsOpen(!isMyBookingsOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937' }}>나의 라운딩</span>
              {myBookings.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#1D4ED8', background: '#EFF6FF', padding: '2px 8px', borderRadius: '9999px' }}>
                  {myBookings.length}
                </span>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isMyBookingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {isMyBookingsOpen && (
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #F3F4F6', overflow: 'hidden', marginBottom: '12px' }}>
              {myBookings.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>예정된 라운딩이 없습니다</div>
              ) : (
                myBookings.map((b, idx) => {
                  const parts = parseParticipants(b.participants);
                  const names = parts.map(p => p.nickname || p.name);
                  const summary = names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`;
                  const d = new Date(b.date);
                  const days = ['일', '월', '화', '수', '목', '금', '토'];
                  const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
                  const timeStr = b.time && b.time !== '23:59' ? ` ${b.time.slice(0, 5)}` : '';
                  return (
                    <div key={b.id} onClick={() => navigate('/booking')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', borderBottom: idx < myBookings.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>{dateStr}{timeStr}</div>
                        <div style={{ fontSize: '13px', color: '#374151', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.courseName} <span style={{ color: '#9CA3AF' }}>({b.type || '소셜'})</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{summary}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '8px' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 핸디캡 & 잔액 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <Card padding="16px 12px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              핸디캡
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>
              {user?.handicap ?? user?.calculatedHandicap ?? 18}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: user?.handicapExplanation ? '4px' : '0' }}>
              추천: {user?.calculatedHandicap ?? user?.handicap ?? 18}
            </div>
            {user?.handicapExplanation && (
              <div style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic', lineHeight: '1.3', marginTop: '4px' }}>{user.handicapExplanation}</div>
            )}
          </Card>
          <Card padding="16px 12px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              참가비 잔액
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: calculatedBalance < 0 ? '#DC2626' : '#111827' }}>
              ${calculatedBalance.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* 게시판 */}
        <Card>
          <div onClick={() => setIsBoardOpen(!isBoardOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isBoardOpen ? '13px' : '0', cursor: 'pointer' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>게시판</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isBoardOpen && canCreatePost && (
                <Button onClick={(e) => { e.stopPropagation(); setShowNewPost(!showNewPost); }} variant={showNewPost ? 'outline' : 'primary'} size="sm">
                  {showNewPost ? '취소' : '작성'}
                </Button>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isBoardOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          {isBoardOpen && (
          <div>
          {showNewPost && canCreatePost && (
            <div style={{ 
              background: 'var(--bg-green)', 
              padding: '13px', 
              borderRadius: '8px',
              marginBottom: '13px'
            }}>
              <h4 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: '700' }}>
                새 공지사항
              </h4>
              <input
                type="text"
                placeholder="제목"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                style={{ marginBottom: '10px', width: '100%' }}
              />
              <textarea
                placeholder="내용"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                rows={6}
                style={{ marginBottom: '10px', resize: 'vertical', width: '100%' }}
              />
              <LoadingButton 
                onClick={handleCreatePost} 
                className="btn-primary"
                loading={isCreatingPost}
                loadingText="게시중..."
              >
                게시하기
              </LoadingButton>
            </div>
          )}

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', background: '#F9FAFB', borderRadius: '12px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '14px' }}>아직 공지사항이 없습니다</p>
              {canCreatePost && (
                <p style={{ fontSize: '14px', marginTop: '6px' }}>
                  상단의 작성 버튼을 눌러 첫 공지를 작성하세요
                </p>
              )}
            </div>
          ) : (
            <div>
              {editingPost && (
                <div style={{
                  background: 'var(--bg-green)',
                  padding: '13px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>게시글 수정</h3>
                  <input
                    type="text"
                    placeholder="제목"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    style={{ marginBottom: '10px', width: '100%' }}
                  />
                  <textarea
                    placeholder="내용"
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    rows={6}
                    style={{ marginBottom: '10px', resize: 'vertical', width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleUpdatePost} className="btn-primary">
                      수정 완료
                    </button>
                    <button onClick={() => setEditingPost(null)} style={{
                      background: '#ccc',
                      color: '#333',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}>
                      취소
                    </button>
                  </div>
                </div>
              )}
              {posts
                .filter(p => p.isActive !== false || user.isAdmin || hasFeaturePermission('manage_board'))
                .slice(0, 5)
                .map((post, index, arr) => {
                const isLast = index === arr.length - 1;
                const isInactive = post.isActive === false;
                return (
                <div 
                  key={post.id}
                  style={{
                    backgroundColor: isInactive ? '#f5f5f5' : 'transparent',
                    borderBottom: isLast ? 'none' : '1px solid #E5E7EB',
                    padding: '16px 0',
                    margin: 0,
                    borderRadius: 0,
                    boxShadow: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    opacity: isInactive ? 0.6 : 1
                  }}
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                >
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      opacity: 0.5,
                      marginTop: '2px'
                    }}>
                      •
                    </span>
                    <div style={{ flex: 1, paddingRight: '30px' }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: '600',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {post.title}
                        {isInactive && (
                          <span style={{
                            fontSize: '10px',
                            background: '#999',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            비활성
                          </span>
                        )}
                      </h4>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        opacity: 0.6,
                        flexWrap: 'wrap'
                      }}>
                        <span>
                          {formatDateTime(post.createdAt)}
                        </span>
                        <span>•</span>
                        <span>
                          by {post.author?.nickname || post.author?.name || '알 수 없음'}
                        </span>
                        {post.comments && post.comments.length > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#6B7280', fontWeight: '600' }}>댓글 {post.comments.length}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {(user.isAdmin || post.authorId === user.id || hasFeaturePermission('manage_board')) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          lineHeight: '1',
                          userSelect: 'none'
                        }}
                      >
                        ⋮
                        {openMenuPostId === post.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              marginTop: '4px',
                              minWidth: '100px',
                              zIndex: 10,
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPost(post);
                              }}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: 'white',
                                borderBottom: '1px solid #eee',
                                fontSize: '14px',
                                color: '#333'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                              수정
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePostActive(post.id);
                              }}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: 'white',
                                borderBottom: '1px solid #eee',
                                fontSize: '14px',
                                color: post.isActive === false ? '#5cb85c' : '#f0ad4e'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                              {post.isActive === false ? '활성화' : '비활성화'}
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePost(post.id);
                              }}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: 'white',
                                fontSize: '14px',
                                color: '#d9534f'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                              삭제
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {expandedPost === post.id && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0, 0, 0, 0.15)' }}>
                      <p style={{ 
                        opacity: 0.7,
                        marginBottom: '10px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px'
                      }}>
                        {post.content}
                      </p>

                      {/* 게시글 좋아요 */}
                      <div style={{
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginBottom: '10px'
                      }}>
                        {(post.likes || []).length > 0 && (
                          <span style={{
                            fontSize: '11px',
                            color: '#555',
                            lineHeight: '16px'
                          }}>
                            {(post.likes || []).map(likeUserId => {
                              const likedMember = members.find(m => m.id === likeUserId);
                              return likedMember?.nickname || likedMember?.name || '알 수 없음';
                            }).join(', ')}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(post.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: '#999',
                            lineHeight: '16px'
                          }}
                        >
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill={(post.likes || []).includes(user.id) ? '#1877F2' : '#999'}
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                          </svg>
                          {(post.likes || []).length > 0 && (
                            <span style={{ fontWeight: '600', color: '#333' }}>{(post.likes || []).length}</span>
                          )}
                        </button>
                      </div>

                      {post.comments?.length > 0 && (
                        <div style={{ 
                          marginTop: '8px',
                          marginLeft: '8px',
                          paddingLeft: '10px',
                          borderLeft: '2px solid var(--primary-green)'
                        }}>
                          {post.comments.map((comment, cIdx) => {
                            const commentAuthor = typeof comment.author === 'string' ? comment.author : (comment.author?.nickname || comment.author?.name);
                            const isCommentOwner = user.isAdmin || commentAuthor === (user.nickname || user.name);
                            const isEditingThisComment = editingComment?.commentId === comment.id;
                            const isFirstComment = cIdx === 0;

                            if (isEditingThisComment) {
                              return (
                                <div 
                                  key={comment.id}
                                  style={{
                                    background: 'transparent',
                                    padding: '6px 0',
                                    margin: 0
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    marginBottom: '4px',
                                    color: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <span>{commentAuthor || '알 수 없음'}</span>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '400',
                                      color: '#9CA3AF'
                                    }}>
                                      {getRelativeTime(comment.date || comment.createdAt || new Date())}
                                    </span>
                                  </div>
                                  <textarea
                                    value={editingComment.content}
                                    onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                    style={{ 
                                      width: '100%', 
                                      minHeight: '40px',
                                      marginBottom: '6px',
                                      resize: 'vertical',
                                      padding: '8px 12px',
                                      borderRadius: '12px',
                                      border: 'none',
                                      fontSize: '13px',
                                      background: '#F3F4F6'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={handleUpdateComment}
                                      style={{
                                        background: 'var(--primary-green)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 12px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      수정
                                    </button>
                                    <button
                                      onClick={() => setEditingComment(null)}
                                      style={{
                                        background: '#E5E7EB',
                                        color: '#6B7280',
                                        border: 'none',
                                        padding: '5px 12px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={comment.id}
                                style={{
                                  background: 'transparent',
                                  padding: '6px 0',
                                  margin: 0,
                                  position: 'relative'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  gap: '6px',
                                  marginBottom: '1px'
                                }}>
                                  <span style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151'
                                  }}>{commentAuthor || '알 수 없음'}</span>
                                  <span style={{
                                    fontSize: '10px',
                                    color: '#9CA3AF'
                                  }}>
                                    {getRelativeTime(comment.date || comment.createdAt || new Date())}
                                  </span>
                                </div>
                                <div style={{ 
                                  fontSize: '13px',
                                  lineHeight: '1.4',
                                  color: '#4B5563'
                                }}>
                                  {comment.content}
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: '8px'
                                }}>
                                  {(comment.likes || []).length > 0 && (
                                    <span style={{
                                      fontSize: '11px',
                                      color: '#555',
                                      lineHeight: '16px'
                                    }}>
                                      {(comment.likes || []).map(likeUserId => {
                                        const likedMember = members.find(m => m.id === likeUserId);
                                        return likedMember?.nickname || likedMember?.name || '알 수 없음';
                                      }).join(', ')}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLikeComment(post.id, comment.id);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px',
                                      color: '#999',
                                      lineHeight: '16px'
                                    }}
                                  >
                                    <svg 
                                      width="16" 
                                      height="16" 
                                      viewBox="0 0 24 24" 
                                      fill={(comment.likes || []).includes(user.id) ? '#1877F2' : '#999'}
                                      style={{ flexShrink: 0 }}
                                    >
                                      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                                    </svg>
                                    {(comment.likes || []).length > 0 && (
                                      <span style={{ fontWeight: '600', color: '#333' }}>{(comment.likes || []).length}</span>
                                    )}
                                  </button>
                                </div>
                                {isCommentOwner && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuCommentId(openMenuCommentId === comment.id ? null : comment.id);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      cursor: 'pointer',
                                      padding: '4px 6px',
                                      fontSize: '16px',
                                      fontWeight: 'bold',
                                      lineHeight: '1',
                                      userSelect: 'none'
                                    }}
                                  >
                                    ⋮
                                    {openMenuCommentId === comment.id && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          position: 'absolute',
                                          top: '100%',
                                          right: 0,
                                          background: 'white',
                                          border: '1px solid #ddd',
                                          borderRadius: '8px',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                          marginTop: '4px',
                                          minWidth: '80px',
                                          zIndex: 10,
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditComment(post.id, comment);
                                          }}
                                          style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            background: 'white',
                                            borderBottom: '1px solid #eee',
                                            fontSize: '13px',
                                            color: '#333'
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                          onMouseLeave={(e) => e.target.style.background = 'white'}
                                        >
                                          수정
                                        </div>
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteComment(post.id, comment.id);
                                          }}
                                          style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            background: 'white',
                                            fontSize: '13px',
                                            color: '#d9534f'
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                          onMouseLeave={(e) => e.target.style.background = 'white'}
                                        >
                                          삭제
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ 
                        display: 'flex', 
                        gap: '6px',
                        marginTop: '10px',
                        padding: '8px 0 0 0',
                        borderTop: '1px solid #F3F4F6',
                        alignItems: 'center'
                      }}>
                        <input
                          type="text"
                          placeholder="댓글 작성..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              handleAddComment(post.id);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            flex: 1, 
                            marginBottom: 0,
                            background: '#F3F4F6',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddComment(post.id);
                          }}
                          style={{
                            background: 'var(--primary-green)',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            fontSize: '14px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          ➤
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
          </div>
          )}
        </Card>


        {false && <Card style={{
          borderLeft: '3px solid var(--accent-olive)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: 'var(--accent-olive)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>🏌️</span>
              공지된 라운딩
            </h3>
            <button 
              onClick={() => navigate('/booking')}
              style={{
                background: 'transparent',
                color: 'var(--accent-olive)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              전체 보기
            </button>
          </div>
          {announcedBookings.length === 0 ? (
            <div style={{ 
              padding: '16px',
              background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(76, 89, 29, 0.05) 100%)',
              borderRadius: '8px',
              textAlign: 'center',
              opacity: 0.7
            }}>
              공지된 라운딩이 없습니다
            </div>
          ) : (
            announcedBookings.map(booking => {
              const participants = parseParticipants(booking.participants);
              const isJoined = participants.some(p => p.phone === user.phone);
              
              let isFoursome = false;
              try {
                const gradeSettings = typeof booking.gradeSettings === 'string' 
                  ? JSON.parse(booking.gradeSettings) 
                  : booking.gradeSettings;
                isFoursome = gradeSettings?.mode === 'foursome';
              } catch (e) {}
              
              const rentalMembers = (booking.numberRentals || []).map(phone => {
                const member = members.find(m => m.phone === phone);
                return member ? { name: member.name, nickname: member.nickname, phone: member.phone } : null;
              }).filter(m => m !== null);
              
              const allParticipants = [...participants];
              rentalMembers.forEach(rental => {
                if (!allParticipants.some(p => p.phone === rental.phone)) {
                  allParticipants.push(rental);
                }
              });
              
              const isRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
              const totalFee = user.isFeeExempt
                ? (booking.greenFee || 0) + (booking.cartFee || 0) + (booking.caddyFee || 0)
                : (booking.greenFee || 0) + (booking.cartFee || 0) + (booking.caddyFee || 0) + (booking.membershipFee || 0);

              return (
                <BookingListCard
                  key={booking.id}
                  booking={booking}
                  isActive={true}
                  isDashboard={true}
                  canManage={false}
                  userPhone={user.phone}
                  participants={participants}
                  allParticipants={allParticipants}
                  totalFee={totalFee}
                  isFoursome={isFoursome}
                  isJoined={isJoined}
                  isRenting={isRenting}
                  isFeeExempt={user.isFeeExempt}
                  isMenuOpen={false}
                  loadingStates={{
                    isDeleting: false,
                    isTogglingAnnounce: false,
                    isJoining: joiningBookingId === booking.id,
                    isRentalLoading: isRentalLoading === booking.id
                  }}
                  statusFlags={{
                    isPastRoundingDate: isPastRoundingDate(booking),
                    isRoundingDay: isRoundingDay(booking),
                    isRegistrationClosed: isRegistrationClosed(booking),
                    hasUserScore: hasUserScore(booking)
                  }}
                  formatCurrency={formatCurrency}
                  getParticipantDisplayName={getParticipantDisplayName}
                  onMenuToggle={() => {}}
                  onNavigate={navigate}
                  onToggleAnnounce={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onJoin={handleJoinBooking}
                  onToggleRental={handleToggleNumberRental}
                />
              );
            })
          )}
        </Card>}

        <Card>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '14px'
          }}>
            <h3 style={{ 
              fontSize: '17px', 
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              최근 스코어
            </h3>
            <button
              onClick={() => navigate('/mypage')}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: 0
              }}
            >
              전체보기 →
            </button>
          </div>
          {(() => {
            const userScores = scores
              .filter(score => score.userId === user.id && score.totalScore >= 1)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 3);

            if (userScores.length === 0) {
              return (
                <div style={{ 
                  padding: '20px',
                  background: '#F9FAFB',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: '14px'
                }}>
                  기록된 스코어가 없습니다
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {userScores.map((score, index) => {
                  const overPar = score.totalScore - score.coursePar;
                  const displayScore = overPar > 0 ? `+${overPar}` : overPar === 0 ? 'E' : `${overPar}`;
                  const scoreColor = overPar > 0 ? '#6B7280' : overPar === 0 ? '#374151' : '#0F766E';
                  
                  const matchingBooking = bookings.find(b => b.title === score.roundingName);
                  const handleScoreClick = () => {
                    if (matchingBooking) {
                      navigate(`/leaderboard?id=${matchingBooking.id}&userId=${user.id}&openScorecard=true`);
                    }
                  };
                  
                  return (
                    <div 
                      key={score.id}
                      onClick={handleScoreClick}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < userScores.length - 1 ? '1px solid #F3F4F6' : 'none',
                        cursor: matchingBooking ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginBottom: '3px'
                        }}>
                          {score.roundingName || '개인 라운딩'}
                          {matchingBooking && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>→</span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          {score.courseName} · {formatDateTime(score.date).split(' ')[0]}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: scoreColor
                        }}>
                          {displayScore}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          {score.totalScore} ({score.coursePar})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        <Card>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '14px'
          }}>
            <h3 style={{ 
              fontSize: '17px', 
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              참가비 납부 내역
            </h3>
            <button
              onClick={() => navigate('/fees')}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: 0
              }}
            >
              전체보기 →
            </button>
          </div>
          {(() => {
            if (recentTransactions.length === 0) {
              return (
                <div style={{ 
                  padding: '20px',
                  background: '#F9FAFB',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: '14px'
                }}>
                  거래 내역이 없습니다
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentTransactions.map((transaction, index) => {
                  const isCharge = transaction.type === 'charge';
                  const label = transaction.type === 'charge' 
                    ? (transaction.bookingId ? '라운딩 참가비' : '참가비 발생')
                    : transaction.type === 'payment' ? '납부'
                    : transaction.type === 'credit' ? '크레딧'
                    : transaction.description || transaction.type;
                  
                  return (
                    <div 
                      key={transaction.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < recentTransactions.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '3px'
                        }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          {transaction.date || (transaction.createdAt ? formatDateTime(transaction.createdAt).split(' ')[0] : '')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: isCharge ? '#DC2626' : '#0F766E'
                        }}>
                          {isCharge ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          잔액: {formatCurrency(transaction.balanceAfter)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: '24px 0 32px 0',
          marginTop: '8px'
        }}>
          <Button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            variant="outline"
            size="lg"
            style={{
              minWidth: '160px',
              borderRadius: '12px',
              color: '#374151',
              border: '1px solid #D1D5DB'
            }}
          >
            {isRefreshing ? '새로고침 중...' : '데이터 새로고침'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(Dashboard);
