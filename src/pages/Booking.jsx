import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import CrownIcon from '../components/CrownIcon';
import BookingForm from '../components/booking/BookingForm';
import BookingListCard from '../components/booking/BookingListCard';
import { Card, Button, Badge, PageHeader, ProfileBadge } from '../components/common';
import theme from '../styles/theme';

function Booking() {
  const { user, members, bookings, courses, scores, addBooking, updateBooking, refreshBookings } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const canManageBooking = user.isAdmin || user.role === '관리자' || user.role === '방장' || user.role === '운영진' || user.role === '클럽운영진';
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [bookingType, setBookingType] = useState('정기모임');
  const [gameMode, setGameMode] = useState('stroke');
  const [isRentalLoading, setIsRentalLoading] = useState(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isTogglingAnnounce, setIsTogglingAnnounce] = useState(null);
  const [isJoining, setIsJoining] = useState(null);
  const [newBooking, setNewBooking] = useState({
    title: '',
    courseName: '',
    date: '',
    time: '',
    gatheringTime: '',
    greenFee: '',
    cartFee: '',
    membershipFee: '',
    registrationDeadline: '',
    restaurantName: '',
    restaurantAddress: ''
  });
  const [editBookingData, setEditBookingData] = useState(null);

  useEffect(() => {
    if (location.state?.reset) {
      setShowNewBooking(false);
      setEditingBooking(null);
      setOpenMenuId(null);
      setBookingType('정기모임');
      setGameMode('stroke');
      setNewBooking({
        title: '',
        courseName: '',
        date: '',
        time: '',
        gatheringTime: '',
        greenFee: '',
        cartFee: '',
        membershipFee: '',
        registrationDeadline: '',
        restaurantName: '',
        restaurantAddress: ''
      });
      setEditBookingData(null);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 컴페티션 라운딩 접수 마감일 자동 설정 (라운딩 날짜 8일 전 18:30)
  useEffect(() => {
    if (bookingType === '컴페티션' && newBooking.date) {
      const roundingDate = new Date(newBooking.date);
      const deadlineDate = new Date(roundingDate);
      deadlineDate.setDate(deadlineDate.getDate() - 8);
      deadlineDate.setHours(18, 30, 0, 0);
      
      const year = deadlineDate.getFullYear();
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
      const day = String(deadlineDate.getDate()).padStart(2, '0');
      const hours = String(deadlineDate.getHours()).padStart(2, '0');
      const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
      
      const formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
      setNewBooking(prev => ({ ...prev, registrationDeadline: formattedDeadline }));
    }
  }, [bookingType, newBooking.date]);

  // 점 세 개 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

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

  const handleCreateBooking = () => {
    if (bookingType === '정기모임') {
      if (!newBooking.courseName || !newBooking.date || !newBooking.time) {
        alert('골프장, 날짜, 시간을 입력해주세요.');
        return;
      }
    } else if (bookingType === '컴페티션') {
      if (!newBooking.courseName || !newBooking.date) {
        alert('골프장과 날짜를 입력해주세요.');
        return;
      }
    }

    let finalTitle = newBooking.title;
    
    if (bookingType === '컴페티션') {
      const dateObj = new Date(newBooking.date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      finalTitle = `클럽 컴페티션 [${month}월 ${day}일]`;
    }

    const gradeSettingsToSave = {
      mode: gameMode
    };

    const booking = {
      ...newBooking,
      title: finalTitle,
      type: bookingType,
      organizerId: user.id,
      greenFee: parseInt(newBooking.greenFee) || null,
      cartFee: parseInt(newBooking.cartFee) || null,
      membershipFee: parseInt(newBooking.membershipFee) || null,
      gradeSettings: JSON.stringify(gradeSettingsToSave),
      participants: []
    };

    addBooking(booking);
    setNewBooking({
      title: '',
      courseName: '',
      date: '',
      time: '',
      gatheringTime: '',
      greenFee: '',
      cartFee: '',
      membershipFee: '',
      registrationDeadline: '',
      restaurantName: '',
      restaurantAddress: ''
    });
    setBookingType('정기모임');
    setGameMode('stroke');
    setShowNewBooking(false);
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking.id);
    setOpenMenuId(null);
    setBookingType(booking.type || '정기모임');
    
    let savedGameMode = 'stroke';
    if (booking.gradeSettings) {
      try {
        const parsed = typeof booking.gradeSettings === 'string' 
          ? JSON.parse(booking.gradeSettings) 
          : booking.gradeSettings;
        if (parsed.mode) {
          savedGameMode = parsed.mode;
        }
      } catch (e) {
        console.error('gradeSettings 파싱 오류:', e);
      }
    }
    setGameMode(savedGameMode);
    
    setEditBookingData({
      title: booking.title || '',
      courseName: booking.courseName,
      date: booking.date,
      time: booking.time,
      gatheringTime: booking.gatheringTime || '',
      greenFee: booking.greenFee || '',
      cartFee: booking.cartFee || '',
      membershipFee: booking.membershipFee || '',
      registrationDeadline: booking.registrationDeadline || '',
      restaurantName: booking.restaurantName || '',
      restaurantAddress: booking.restaurantAddress || ''
    });
  };

  const handleSaveBooking = async () => {
    if (isSavingBooking) return;
    if (!editBookingData.courseName || !editBookingData.date || !editBookingData.time) {
      alert('골프장, 날짜, 시간을 입력해주세요.');
      return;
    }

    setIsSavingBooking(true);
    try {
      const currentBooking = bookings.find(b => b.id === editingBooking);
      let existingGradeSettings = {};
      if (currentBooking?.gradeSettings) {
        try {
          existingGradeSettings = typeof currentBooking.gradeSettings === 'string'
            ? JSON.parse(currentBooking.gradeSettings)
            : currentBooking.gradeSettings;
        } catch (e) {
          existingGradeSettings = {};
        }
      }
      
      const gradeSettingsToSave = {
        ...existingGradeSettings,
        mode: gameMode
      };

      const updatedData = {
        ...editBookingData,
        greenFee: parseInt(editBookingData.greenFee) || null,
        cartFee: parseInt(editBookingData.cartFee) || null,
        membershipFee: parseInt(editBookingData.membershipFee) || null,
        gradeSettings: JSON.stringify(gradeSettingsToSave)
      };

      await updateBooking(editingBooking, updatedData);
      alert('라운딩 정보가 수정되었습니다.');
      setEditingBooking(null);
      setEditBookingData(null);
      setGameMode('stroke');
    } catch (error) {
      alert('라운딩 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSavingBooking(false);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (isDeleting === bookingId) return;
    if (!confirm('정말로 이 라운딩을 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(bookingId);
    try {
      await apiService.deleteBooking(bookingId);
      await refreshBookings();
    } catch (error) {
      alert('라운딩 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleAnnounce = async (bookingId) => {
    if (isTogglingAnnounce === bookingId) return;
    setIsTogglingAnnounce(bookingId);
    try {
      await apiService.toggleBookingAnnounce(bookingId);
      await refreshBookings();
    } catch (error) {
      alert('공지 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsTogglingAnnounce(null);
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
      
      if (!isCurrentlyRenting) {
        alert(`${user.nickname}님, 번호 대여 감사합니다!`);
      }
    } catch (error) {
      console.error('번호대여 상태 변경 실패:', error);
      setIsRentalLoading(null);
      alert('번호대여 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleJoinBooking = async (bookingId) => {
    if (isJoining === bookingId) return;
    
    setIsJoining(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      const participants = parseParticipants(booking.participants);
      const alreadyJoined = participants.some(p => p.phone === user.phone);
      
      if (alreadyJoined) {
        const updatedParticipants = participants
          .filter(p => p.phone !== user.phone)
          .map(p => JSON.stringify(p));
        
        await updateBooking(bookingId, {
          participants: updatedParticipants
        });
      } else {
        const updatedParticipants = [
          ...participants,
          { name: user.name, nickname: user.nickname, phone: user.phone }
        ].map(p => JSON.stringify(p));
        
        await updateBooking(bookingId, {
          participants: updatedParticipants
        });
      }
    } finally {
      setIsJoining(null);
    }
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

  const isBookingActive = (booking) => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
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

  const isUserGuest = user.isClubMember !== 'yes';
  
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
    if (isUserGuest && !booking.isGuestAllowed) {
      return false;
    }
    return true;
  };

  const activeBookings = bookings.filter(b => isBookingActive(b) && canViewBooking(b)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const completedBookings = bookings.filter(b => !isBookingActive(b) && canViewBooking(b)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderBookingForm = (data, setData, onSubmit, submitText, isNewBooking = false) => {
    const currentBooking = !isNewBooking && editingBooking ? bookings.find(b => b.id === editingBooking) : null;
    const currentType = isNewBooking ? bookingType : (currentBooking?.type || '정기모임');
    
    return (
      <BookingForm
        data={data}
        onChange={setData}
        onSubmit={onSubmit}
        submitLabel={submitText}
        isNew={isNewBooking}
        bookingType={bookingType}
        onBookingTypeChange={setBookingType}
        gameMode={gameMode}
        onGameModeChange={setGameMode}
        onCancel={isNewBooking ? () => setShowNewBooking(false) : () => {
          setEditingBooking(null);
          setEditBookingData(null);
        }}
        isSaving={isSavingBooking}
        courses={courses}
        currentType={currentType}
      />
    );
  };

  const renderBookingListItem = (booking, isActive) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const totalFee = user.isFeeExempt
      ? (parseInt(booking.greenFee) || 0) + (parseInt(booking.cartFee) || 0)
      : (parseInt(booking.greenFee) || 0) + (parseInt(booking.cartFee) || 0) + (parseInt(booking.membershipFee) || 0);
    
    // 포썸 모드 체크
    let isFoursome = false;
    try {
      const settings = typeof booking.gradeSettings === 'string' 
        ? JSON.parse(booking.gradeSettings) 
        : booking.gradeSettings;
      if (settings && settings.mode === 'foursome') {
        isFoursome = true;
      }
    } catch (e) {}
    
    // 번호대여자 정보 가져오기
    const rentalMembers = (booking.numberRentals || []).map(phone => {
      const member = members.find(m => m.phone === phone);
      return member ? {
        name: member.name,
        nickname: member.nickname,
        phone: member.phone
      } : null;
    }).filter(m => m !== null);
    
    // 참가자 + 번호대여자 합치기 (중복 제거)
    const allParticipants = [...participants];
    rentalMembers.forEach(rental => {
      if (!allParticipants.some(p => p.phone === rental.phone)) {
        allParticipants.push(rental);
      }
    });
    
    const isRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);

    return (
      <BookingListCard
        key={booking.id}
        booking={booking}
        isActive={isActive}
        canManage={canManageBooking}
        userPhone={user.phone}
        participants={participants}
        allParticipants={allParticipants}
        clubMembers={members}
        totalFee={totalFee}
        isFoursome={isFoursome}
        isJoined={isJoined}
        isRenting={isRenting}
        isFeeExempt={user.isFeeExempt}
        isMenuOpen={openMenuId === booking.id}
        loadingStates={{
          isDeleting: isDeleting === booking.id,
          isTogglingAnnounce: isTogglingAnnounce === booking.id,
          isJoining: isJoining === booking.id,
          isRentalLoading: isRentalLoading === booking.id
        }}
        statusFlags={{
          isPastRoundingDate: isPastRoundingDate(booking),
          isRoundingDay: isRoundingDay(booking),
          isRegistrationClosed: isRegistrationClosed(booking),
          hasUserScore: hasUserScore(booking)
        }}
        isGuest={user.club !== booking.courseName}
        formatCurrency={formatCurrency}
        getParticipantDisplayName={getParticipantDisplayName}
        onMenuToggle={(id) => setOpenMenuId(id === null ? null : (openMenuId === id ? null : id))}
        onNavigate={navigate}
        onToggleAnnounce={handleToggleAnnounce}
        onEdit={handleEditBooking}
        onDelete={handleDeleteBooking}
        onJoin={handleJoinBooking}
        onToggleRental={handleToggleNumberRental}
      />
    );
  };


  return (
    <div>
      <PageHeader 
        title="라운딩" 
        rightContent={<ProfileBadge user={user} showGreeting={true} />}
      />

      <div className="page-content" style={{ background: theme.colors.bg_app }}>
        {showNewBooking && canManageBooking && (
          <Card style={{ marginBottom: theme.spacing.cardGap }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: theme.colors.text_main }}>
              새 라운딩 만들기
            </h3>
            {renderBookingForm(newBooking, setNewBooking, handleCreateBooking, '라운딩 생성', true)}
          </Card>
        )}

        {editingBooking && editBookingData && (
          <Card style={{ marginBottom: theme.spacing.cardGap }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: theme.colors.primary }}>
              ✎ 라운딩 정보 수정
            </h3>
            {renderBookingForm(editBookingData, setEditBookingData, handleSaveBooking, '수정 완료', false)}
          </Card>
        )}

        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.cardGap,
          marginLeft: theme.spacing.lg,
          marginRight: theme.spacing.lg
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary,
            margin: 0
          }}>
            ⛳ 현재 활성중인 라운딩
          </h3>
          {canManageBooking && (
            <Button 
              variant={showNewBooking ? 'outline' : 'primary'}
              size="sm"
              onClick={() => setShowNewBooking(!showNewBooking)}
            >
              {showNewBooking ? '취소' : '+ 라운딩 생성하기'}
            </Button>
          )}
        </div>
        {activeBookings.length === 0 ? (
          <Card style={{ 
            padding: '40px',
            textAlign: 'center',
            color: theme.colors.text_sub
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛳</div>
            <p>예정된 라운딩이 없습니다</p>
          </Card>
        ) : (
          activeBookings.map(booking => renderBookingListItem(booking, true))
        )}

        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing.cardGap,
          marginLeft: theme.spacing.lg,
          marginTop: theme.spacing.xxl,
          color: theme.colors.text_sub
        }}>
          ✓ 완료된 라운딩
        </h3>
        {completedBookings.length === 0 ? (
          <Card style={{ 
            padding: '40px',
            textAlign: 'center',
            color: theme.colors.text_sub
          }}>
            <p>완료된 라운딩이 없습니다</p>
          </Card>
        ) : (
          completedBookings.map(booking => renderBookingListItem(booking, false))
        )}
      </div>
    </div>
  );
}

export default memo(Booking);
