import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

function Booking() {
  const { user, members, bookings, courses, scores, addBooking, updateBooking, refreshBookings } = useApp();
  const navigate = useNavigate();
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [bookingType, setBookingType] = useState('정기모임');
  const [isRentalLoading, setIsRentalLoading] = useState(null);
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

    const booking = {
      ...newBooking,
      title: finalTitle,
      type: bookingType,
      organizerId: user.id,
      greenFee: parseInt(newBooking.greenFee) || null,
      cartFee: parseInt(newBooking.cartFee) || null,
      membershipFee: parseInt(newBooking.membershipFee) || null,
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
    setShowNewBooking(false);
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking.id);
    setOpenMenuId(null);
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
    if (!editBookingData.courseName || !editBookingData.date || !editBookingData.time) {
      alert('골프장, 날짜, 시간을 입력해주세요.');
      return;
    }

    try {
      const updatedData = {
        ...editBookingData,
        greenFee: parseInt(editBookingData.greenFee) || null,
        cartFee: parseInt(editBookingData.cartFee) || null,
        membershipFee: parseInt(editBookingData.membershipFee) || null
      };

      await updateBooking(editingBooking, updatedData);
      alert('라운딩 정보가 수정되었습니다.');
      setEditingBooking(null);
      setEditBookingData(null);
    } catch (error) {
      console.error('라운딩 수정 실패:', error);
      alert('라운딩 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!confirm('정말로 이 라운딩을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await apiService.deleteBooking(bookingId);
      window.location.reload();
    } catch (error) {
      console.error('라운딩 삭제 실패:', error);
      alert('라운딩 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleAnnounce = async (bookingId) => {
    try {
      await apiService.toggleBookingAnnounce(bookingId);
      window.location.reload();
    } catch (error) {
      console.error('공지 상태 변경 실패:', error);
      alert('공지 상태 변경 중 오류가 발생했습니다.');
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

  const handleJoinBooking = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    const participants = parseParticipants(booking.participants);
    const alreadyJoined = participants.some(p => p.phone === user.phone);
    
    if (alreadyJoined) {
      const updatedParticipants = participants
        .filter(p => p.phone !== user.phone)
        .map(p => JSON.stringify(p));
      
      updateBooking(bookingId, {
        participants: updatedParticipants
      });
    } else {
      const updatedParticipants = [
        ...participants,
        { name: user.name, nickname: user.nickname, phone: user.phone }
      ].map(p => JSON.stringify(p));
      
      updateBooking(bookingId, {
        participants: updatedParticipants
      });
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

  const isRegistrationClosed = (booking) => {
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

  const canViewBooking = (booking) => {
    if (booking.type === '컴페티션') {
      return user.club === booking.courseName;
    }
    return true;
  };

  const activeBookings = bookings.filter(b => isBookingActive(b) && canViewBooking(b)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const completedBookings = bookings.filter(b => !isBookingActive(b) && canViewBooking(b)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderBookingForm = (data, setData, onSubmit, submitText, isNewBooking = false, showCancelButton = true) => {
    const isStrikeCom = isNewBooking && bookingType === '스트라컴';
    
    return (
      <>
        {isNewBooking && (
          <>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              라운딩 종류 *
            </label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
              style={{ marginBottom: '16px' }}
            >
              <option value="정기모임">정기모임</option>
              <option value="컴페티션">컴페티션</option>
            </select>
          </>
        )}

        {isNewBooking && bookingType === '컴페티션' && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: 'var(--bg-green)', 
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--text-gray)'
          }}>
            {data.courseName && data.date ? (
              <>
                라운딩 이름: <strong>클럽 컴페티션 [{(new Date(data.date).getMonth() + 1).toString().padStart(2, '0')}월 {new Date(data.date).getDate().toString().padStart(2, '0')}일]</strong>
              </>
            ) : (
              '골프장과 날짜를 선택하면 라운딩 이름이 자동 생성됩니다.'
            )}
          </div>
        )}

        {bookingType === '컴페티션' ? (
          <>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              골프장 * (컴페티션)
            </label>
            <select
              value={data.courseName}
              onChange={(e) => setData({ ...data, courseName: e.target.value })}
              style={{ marginBottom: '12px' }}
            >
              <option value="">골프장 선택</option>
              {courses.map(course => (
                <option key={course.id} value={course.name}>
                  {course.name}
                </option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              라운딩 날짜 *
            </label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => setData({ ...data, date: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
          </>
        ) : (
          <>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              라운딩 이름
            </label>
            <input
              type="text"
              placeholder="라운딩 이름 (예: 1월 정기 라운딩)"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              골프장 *
            </label>
            <select
              value={data.courseName}
              onChange={(e) => setData({ ...data, courseName: e.target.value })}
              style={{ marginBottom: '12px' }}
            >
              <option value="">골프장 선택</option>
              {courses.map(course => (
                <option key={course.id} value={course.name}>
                  {course.name}
                </option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              라운딩 날짜 *
            </label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => setData({ ...data, date: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              라운딩 시간 *
            </label>
            <input
              type="time"
              value={data.time}
              onChange={(e) => setData({ ...data, time: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              집결시간
            </label>
            <input
              type="time"
              placeholder="집결시간"
              value={data.gatheringTime}
              onChange={(e) => setData({ ...data, gatheringTime: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              그린피
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="그린피 금액 ($)"
              value={data.greenFee}
              onChange={(e) => setData({ ...data, greenFee: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              카트비
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="카트비 금액 ($)"
              value={data.cartFee}
              onChange={(e) => setData({ ...data, cartFee: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              회비
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="회비 금액 ($)"
              value={data.membershipFee}
              onChange={(e) => setData({ ...data, membershipFee: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
          </>
        )}

        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
          접수 마감날짜
        </label>
        <input
          type="datetime-local"
          value={data.registrationDeadline}
          onChange={(e) => setData({ ...data, registrationDeadline: e.target.value })}
          style={{ marginBottom: '12px' }}
        />

        {!(isNewBooking && bookingType === '컴페티션') && (
          <>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              회식장소
            </label>
            <input
              type="text"
              placeholder="회식장소 이름"
              value={data.restaurantName}
              onChange={(e) => setData({ ...data, restaurantName: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              회식 주소
            </label>
            <input
              type="text"
              placeholder="회식장소 주소"
              value={data.restaurantAddress}
              onChange={(e) => setData({ ...data, restaurantAddress: e.target.value })}
              style={{ marginBottom: '16px' }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={isNewBooking ? () => setShowNewBooking(false) : () => {
              setEditingBooking(null);
              setEditBookingData(null);
            }}
            style={{
              flex: 1,
              padding: '14px',
              background: '#BD5B43',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            취소하기
          </button>
          <button onClick={onSubmit} className="btn-primary" style={{ flex: 1 }}>
            {submitText}
          </button>
        </div>
      </>
    );
  };

  const renderBookingListItem = (booking, isActive) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const totalFee = (parseInt(booking.greenFee) || 0) + (parseInt(booking.cartFee) || 0) + (parseInt(booking.membershipFee) || 0);
    
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
    
    const totalParticipants = allParticipants.length;
    const isRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);

    if (isActive) {
      return (
        <div key={booking.id} className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              {booking.title && (
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  color: booking.type === '컴페티션' ? 'white' : 'white', 
                  background: booking.type === '컴페티션' ? '#2d5355' : '#BF4D34',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'inline-block'
                }}>
                  {booking.title}
                </h3>
              )}
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                ⛳ {booking.courseName}
              </div>
            </div>
            {user.isAdmin && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === booking.id ? null : booking.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    opacity: 0.7
                  }}
                >
                  ⋮
                </button>
                {openMenuId === booking.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    zIndex: 10,
                    minWidth: '140px'
                  }}>
                    <button
                      onClick={() => handleToggleAnnounce(booking.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      {booking.isAnnounced ? '★ 공지 내리기' : '★ 공지 활성화'}
                    </button>
                    <button
                      onClick={() => handleEditBooking(booking)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      ✎ 수정
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteBooking(booking.id);
                        setOpenMenuId(null);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        color: 'var(--alert-red)'
                      }}
                    >
                      × 삭제
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gap: '12px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>◷ 라운딩 날짜:</span>
              <span>{new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}</span>
            </div>

            {booking.gatheringTime && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>⏲ 집결시간:</span>
                <span>{booking.gatheringTime}</span>
              </div>
            )}

            {booking.registrationDeadline && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>◔ 접수 마감:</span>
                <span>{new Date(booking.registrationDeadline).toLocaleDateString('ko-KR')}</span>
              </div>
            )}
          </div>

          {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
            <div style={{
              background: 'var(--bg-green)',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-green)' }}>$ 비용 안내</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {booking.greenFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>그린피</span>
                    <span>{formatCurrency(booking.greenFee)}</span>
                  </div>
                )}
                {booking.cartFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>카트비</span>
                    <span>{formatCurrency(booking.cartFee)}</span>
                  </div>
                )}
                {booking.membershipFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>회비</span>
                    <span>{formatCurrency(booking.membershipFee)}</span>
                  </div>
                )}
                {totalFee > 0 && (
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid var(--primary-green)',
                    fontWeight: '700',
                    color: 'var(--primary-green)'
                  }}>
                    <span>총 금액</span>
                    <span>{formatCurrency(totalFee)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(booking.restaurantName || booking.restaurantAddress) && (
            <div style={{
              background: '#FFD449',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#8B6914' }}>⚑ 회식 정보</div>
              {booking.restaurantName && <div>{booking.restaurantName}</div>}
              {booking.restaurantAddress && <div style={{ opacity: 0.7, fontSize: '13px' }}>{booking.restaurantAddress}</div>}
            </div>
          )}

          <div style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ 
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--primary-green)'
            }}>
              ⚲ 참가자 ({totalParticipants}명)
            </div>
            <div style={{ 
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {allParticipants.map((participant, idx) => {
                const isRenting = booking.numberRentals && booking.numberRentals.includes(participant.phone);
                const isParticipating = participants.some(p => p.phone === participant.phone);
                return (
                  <span key={idx}>
                    <span style={{ 
                      background: isRenting && !isParticipating ? '#E6AA68' : 'transparent',
                      color: isRenting && !isParticipating ? '#fff' : 'inherit',
                      padding: isRenting && !isParticipating ? '2px 6px' : '0',
                      borderRadius: isRenting && !isParticipating ? '4px' : '0'
                    }}>
                      {getParticipantDisplayName(participant)}
                    </span>
                    {idx < allParticipants.length - 1 && ', '}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isPastRoundingDate(booking) && (booking.dailyHandicaps || hasUserScore(booking)) ? (
              <>
                <button
                  onClick={() => {
                    if (booking.dailyHandicaps) {
                      navigate(`/member-score-entry?id=${booking.id}`);
                    } else if (hasUserScore(booking)) {
                      const userScore = getUserScore(booking);
                      navigate('/score', { state: { scoreId: userScore.id, readonly: true } });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--primary-green)',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {booking.dailyHandicaps ? '▲ 결과보기' : '📊 스코어보기'}
                </button>
                {user.isAdmin && (
                  <button
                    onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ◉ 라운딩 관리
                  </button>
                )}
              </>
            ) : isRegistrationClosed(booking) && !isPastRoundingDate(booking) ? (
              <>
                <button
                  onClick={() => navigate(`/team-formation?id=${booking.id}`)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--primary-green)',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  📋 조편성 보기
                </button>
                {user.isAdmin && (
                  <button
                    onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ◉ 라운딩 관리
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={(isJoined || isRenting) ? null : () => handleJoinBooking(booking.id)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: (isJoined || isRenting) ? '#e0e0e0' : 'var(--primary-green)',
                    color: (isJoined || isRenting) ? '#999' : 'var(--text-light)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: (isJoined || isRenting) ? 'default' : 'pointer',
                    opacity: (isJoined || isRenting) ? 0.6 : 1
                  }}
                >
                  {isJoined ? '참가중' : '참가하기'}
                </button>
                <button
                  onClick={(isJoined && !isRenting) ? () => handleJoinBooking(booking.id) : null}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: (isJoined && !isRenting) ? 'var(--alert-red)' : '#e0e0e0',
                    color: (isJoined && !isRenting) ? 'var(--text-light)' : '#999',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: (isJoined && !isRenting) ? 'pointer' : 'default',
                    opacity: (isJoined && !isRenting) ? 1 : 0.6
                  }}
                >
                  취소하기
                </button>
                {booking.type === '컴페티션' && (
                  <button
                    onClick={() => handleToggleNumberRental(booking.id)}
                    disabled={isRentalLoading === booking.id}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: isRentalLoading === booking.id ? '#ccc' : '#E6AA68',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: isRentalLoading === booking.id ? 'wait' : 'pointer',
                      opacity: isRentalLoading === booking.id ? 0.7 : 1
                    }}
                  >
                    {isRentalLoading === booking.id ? '처리중...' : (isRenting ? '✓ 번호대여중' : '번호대여')}
                  </button>
                )}
                {user.isAdmin && (
                  <button
                    onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ◉ 라운딩 관리
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={booking.id} style={{
        background: 'var(--bg-card)',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '12px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          {booking.title && (
            <div style={{ fontSize: '13px', color: 'var(--primary-green)', fontWeight: '600', marginBottom: '2px' }}>
              {booking.title}
            </div>
          )}
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
            {booking.courseName}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>
            ◷ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => booking.dailyHandicaps 
              ? navigate(`/member-score-entry?id=${booking.id}`) 
              : navigate('/score')}
            style={{
              padding: '8px 16px',
              background: 'var(--primary-green)',
              color: 'var(--text-light)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {booking.dailyHandicaps ? '▲ 결과보기' : '⛳ 플레이하기'}
          </button>
          {user.isAdmin && (
            <button
              onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
              style={{
                padding: '8px 16px',
                background: 'var(--primary-green)',
                color: 'var(--text-light)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ◉ 라운딩 관리
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="header">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginLeft: '12px' }}>
          <h1>라운딩</h1>
        </div>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            border: '2px solid var(--border-color)'
          }}>
            {user.photo ? (
              <img 
                src={user.photo} 
                alt="프로필" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span>{(user.nickname || user.name).charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {showNewBooking && user.isAdmin && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
              새 라운딩 만들기
            </h3>
            {renderBookingForm(newBooking, setNewBooking, handleCreateBooking, '라운딩 생성', true)}
          </div>
        )}

        {editingBooking && editBookingData && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
              ✎ 라운딩 정보 수정
            </h3>
            {renderBookingForm(editBookingData, setEditBookingData, handleSaveBooking, '수정 완료', false)}
          </div>
        )}

        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          marginLeft: '16px',
          marginRight: '16px'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700',
            color: 'var(--primary-green)',
            margin: 0
          }}>
            ⛳ 현재 활성중인 라운딩
          </h3>
          {user.isAdmin && (
            <button 
              onClick={() => setShowNewBooking(!showNewBooking)}
              style={{
                background: 'var(--primary-green)',
                color: 'var(--text-light)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {showNewBooking ? '취소' : '+ 라운딩 생성하기'}
            </button>
          )}
        </div>
        {activeBookings.length === 0 ? (
          <div className="card" style={{ 
            padding: '40px',
            textAlign: 'center',
            opacity: 0.7
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛳</div>
            <p>예정된 라운딩이 없습니다</p>
          </div>
        ) : (
          activeBookings.map(booking => renderBookingListItem(booking, true))
        )}

        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '700',
          marginBottom: '16px',
          marginLeft: '16px',
          marginTop: '24px',
          opacity: 0.7
        }}>
          ✓ 완료된 라운딩
        </h3>
        {completedBookings.length === 0 ? (
          <div className="card" style={{ 
            padding: '40px',
            textAlign: 'center',
            opacity: 0.7
          }}>
            <p>완료된 라운딩이 없습니다</p>
          </div>
        ) : (
          completedBookings.map(booking => renderBookingListItem(booking, false))
        )}
      </div>
    </div>
  );
}

export default Booking;
