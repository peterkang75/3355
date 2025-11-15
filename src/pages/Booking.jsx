import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

function Booking() {
  const { user, members, bookings, courses, addBooking, updateBooking } = useApp();
  const navigate = useNavigate();
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [bookingType, setBookingType] = useState('정기모임');
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

  const handleCreateBooking = () => {
    if (bookingType === '정기모임') {
      if (!newBooking.courseName || !newBooking.date || !newBooking.time) {
        alert('골프장, 날짜, 시간을 입력해주세요.');
        return;
      }
    } else {
      if (!newBooking.date) {
        alert('날짜를 입력해주세요.');
        return;
      }
    }

    const finalTitle = bookingType === '스트라컴' 
      ? `스트라컴[${newBooking.date}]`
      : newBooking.title;
    
    const finalCourseName = bookingType === '스트라컴' 
      ? '스트라스필드 골프클럽' 
      : newBooking.courseName;

    const booking = {
      ...newBooking,
      title: finalTitle,
      courseName: finalCourseName,
      organizerId: user.id,
      greenFee: parseInt(newBooking.greenFee) || null,
      cartFee: parseInt(newBooking.cartFee) || null,
      membershipFee: parseInt(newBooking.membershipFee) || null,
      participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })]
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

  const activeBookings = bookings.filter(b => isBookingActive(b)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const completedBookings = bookings.filter(b => !isBookingActive(b)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderBookingForm = (data, setData, onSubmit, submitText, isNewBooking = false) => {
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
              <option value="스트라컴">스트라컴</option>
            </select>
          </>
        )}

        {isStrikeCom && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: 'var(--bg-green)', 
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--text-gray)'
          }}>
            라운딩 이름: <strong>스트라컴[{data.date || '날짜 선택'}]</strong>
          </div>
        )}

        {isStrikeCom && (
          <>
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
        )}

        {!isStrikeCom && (
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

        {!isStrikeCom && (
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

        <button onClick={onSubmit} className="btn-primary">
          {submitText}
        </button>
      </>
    );
  };

  const renderBookingListItem = (booking, isActive) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const totalFee = (parseInt(booking.greenFee) || 0) + (parseInt(booking.cartFee) || 0) + (parseInt(booking.membershipFee) || 0);

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
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)', marginBottom: '8px' }}>
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
                  onClick={() => setOpenMenuId(openMenuId === booking.id ? null : booking.id)}
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
                  <div style={{
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
              background: '#fff3e0',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e65100' }}>⚑ 회식 정보</div>
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
              ⚲ 참가자 ({participants.length}명)
            </div>
            <div style={{ 
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {participants.map((participant, idx) => (
                <span key={idx}>
                  {getParticipantDisplayName(participant)}
                  {idx < participants.length - 1 && ', '}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isRegistrationClosed(booking) ? (
              <>
                <button
                  onClick={() => booking.dailyHandicaps 
                    ? navigate(`/member-score-entry?id=${booking.id}`) 
                    : navigate('/score')}
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
                  {booking.dailyHandicaps ? '▲ 결과보기' : '⛳ 플레이하기'}
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
            ) : booking.courseName === '스트라스필드 골프클럽' && (user.isAdmin || user.role === '운영진') ? (
              <>
                <button
                  onClick={() => handleJoinBooking(booking.id)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: isJoined ? 'var(--bg-card)' : 'var(--primary-green)',
                    color: isJoined ? 'var(--primary-green)' : 'var(--text-light)',
                    border: 'none',
                    borderBottom: isJoined ? '2px solid var(--primary-green)' : 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {isJoined ? '참가 취소' : '참가하기'}
                </button>
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
              </>
            ) : (
              <button
                onClick={() => handleJoinBooking(booking.id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isJoined ? 'var(--bg-card)' : 'var(--primary-green)',
                  color: isJoined ? 'var(--primary-green)' : 'var(--text-light)',
                  border: 'none',
                  borderBottom: isJoined ? '2px solid var(--primary-green)' : 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {isJoined ? '참가 취소' : '참가하기'}
              </button>
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
        <h1>라운딩</h1>
        {user.isAdmin && (
          <button 
            onClick={() => setShowNewBooking(!showNewBooking)}
            style={{
              background: 'var(--text-light)',
              color: 'var(--primary-green)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {showNewBooking ? '취소' : '라운딩 생성'}
          </button>
        )}
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
            <button 
              onClick={() => {
                setEditingBooking(null);
                setEditBookingData(null);
              }}
              className="btn-outline"
              style={{ marginTop: '8px' }}
            >
              취소
            </button>
          </div>
        )}

        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '700',
          marginBottom: '16px',
          marginLeft: '16px',
          color: 'var(--primary-green)'
        }}>
          ⛳ 현재 활성중인 라운딩
        </h3>
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
