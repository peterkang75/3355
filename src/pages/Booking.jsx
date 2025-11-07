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
    if (!newBooking.courseName || !newBooking.date || !newBooking.time) {
      alert('골프장, 날짜, 시간을 입력해주세요.');
      return;
    }

    const booking = {
      ...newBooking,
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

  const activeBookings = bookings.filter(b => isBookingActive(b)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const completedBookings = bookings.filter(b => !isBookingActive(b)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderBookingForm = (data, setData, onSubmit, submitText) => (
    <>
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        라운딩 이름
      </label>
      <input
        type="text"
        placeholder="라운딩 이름 (예: 1월 정기 라운딩)"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
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

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        라운딩 날짜 *
      </label>
      <input
        type="date"
        value={data.date}
        onChange={(e) => setData({ ...data, date: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        라운딩 시간 *
      </label>
      <input
        type="time"
        value={data.time}
        onChange={(e) => setData({ ...data, time: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        집결시간
      </label>
      <input
        type="time"
        placeholder="집결시간"
        value={data.gatheringTime}
        onChange={(e) => setData({ ...data, gatheringTime: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
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

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
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

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
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

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        접수 마감날짜
      </label>
      <input
        type="date"
        value={data.registrationDeadline}
        onChange={(e) => setData({ ...data, registrationDeadline: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        회식장소
      </label>
      <input
        type="text"
        placeholder="회식장소 이름"
        value={data.restaurantName}
        onChange={(e) => setData({ ...data, restaurantName: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
        회식 주소
      </label>
      <input
        type="text"
        placeholder="회식장소 주소"
        value={data.restaurantAddress}
        onChange={(e) => setData({ ...data, restaurantAddress: e.target.value })}
        style={{ marginBottom: '16px' }}
      />

      <button onClick={onSubmit} className="btn-primary">
        {submitText}
      </button>
    </>
  );

  const renderBookingListItem = (booking, isActive) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const totalFee = (parseInt(booking.greenFee) || 0) + (parseInt(booking.cartFee) || 0) + (parseInt(booking.membershipFee) || 0);

    if (isActive) {
      return (
        <div key={booking.id} style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              {booking.title && (
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2d5f3f', marginBottom: '8px' }}>
                  {booking.title}
                </h3>
              )}
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                🏌️ {booking.courseName}
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
                    color: '#666'
                  }}
                >
                  ⋮
                </button>
                {openMenuId === booking.id && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                        background: 'white',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      {booking.isAnnounced ? '📌 공지 내리기' : '📌 공지 활성화'}
                    </button>
                    <button
                      onClick={() => handleEditBooking(booking)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'white',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      ✏️ 수정
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
                        background: 'white',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        color: '#e53e3e'
                      }}
                    >
                      🗑️ 삭제
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
              gap: '8px'
            }}>
              <span style={{ fontWeight: '600', color: '#2d5f3f' }}>📅 라운딩 날짜:</span>
              <span>{new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}</span>
            </div>

            {booking.gatheringTime && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontWeight: '600', color: '#2d5f3f' }}>⏰ 집결시간:</span>
                <span>{booking.gatheringTime}</span>
              </div>
            )}

            {booking.registrationDeadline && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontWeight: '600', color: '#2d5f3f' }}>🔔 접수 마감:</span>
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
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2d5f3f' }}>💰 비용 안내</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {booking.greenFee && <div>그린피: {formatCurrency(booking.greenFee)}</div>}
                {booking.cartFee && <div>카트비: {formatCurrency(booking.cartFee)}</div>}
                {booking.membershipFee && <div>회비: {formatCurrency(booking.membershipFee)}</div>}
                {totalFee > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    paddingTop: '8px', 
                    borderTop: '2px solid #2d5f3f',
                    fontWeight: '700',
                    color: '#2d5f3f'
                  }}>
                    총 금액: {formatCurrency(totalFee)}
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
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e65100' }}>🍽️ 회식 정보</div>
              {booking.restaurantName && <div>{booking.restaurantName}</div>}
              {booking.restaurantAddress && <div style={{ color: '#666', fontSize: '13px' }}>{booking.restaurantAddress}</div>}
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
              color: '#2d5f3f'
            }}>
              👥 참가자 ({participants.length}명)
            </div>
            <div style={{ display: 'grid', gap: '4px' }}>
              {participants.map((participant, idx) => (
                <div key={idx} style={{ 
                  padding: '8px',
                  background: 'white',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  {getParticipantDisplayName(participant)}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleJoinBooking(booking.id)}
            style={{
              width: '100%',
              padding: '12px',
              background: isJoined ? 'white' : 'var(--primary-green)',
              color: isJoined ? 'var(--primary-green)' : 'white',
              border: isJoined ? '2px solid var(--primary-green)' : 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {isJoined ? '참가 취소' : '참가하기'}
          </button>
        </div>
      );
    }

    return (
      <div key={booking.id} style={{
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '12px',
        border: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          {booking.title && (
            <div style={{ fontSize: '13px', color: '#2d5f3f', fontWeight: '600', marginBottom: '2px' }}>
              {booking.title}
            </div>
          )}
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
            {booking.courseName}
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            📅 {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <>
            <button
              onClick={() => navigate('/score')}
              style={{
                padding: '8px 16px',
                background: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🏌️ 플레이하기
            </button>
            {user.isAdmin && (
              <button
                onClick={() => navigate('/score')}
                style={{
                  padding: '8px 16px',
                  background: '#3a7d54',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                📝 회원 스코어 기록
              </button>
            )}
          </>
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
              background: 'white',
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
            {renderBookingForm(newBooking, setNewBooking, handleCreateBooking, '라운딩 생성')}
          </div>
        )}

        {editingBooking && editBookingData && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
              ✏️ 라운딩 정보 수정
            </h3>
            {renderBookingForm(editBookingData, setEditBookingData, handleSaveBooking, '수정 완료')}
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

        <div className="card">
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700',
            marginBottom: '16px',
            color: 'var(--primary-green)'
          }}>
            ⛳ 현재 활성중인 라운딩
          </h3>
          {activeBookings.length === 0 ? (
            <div style={{ 
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              background: 'var(--bg-green)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏌️</div>
              <p>예정된 라운딩이 없습니다</p>
            </div>
          ) : (
            activeBookings.map(booking => renderBookingListItem(booking, true))
          )}
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700',
            marginBottom: '16px',
            color: '#666'
          }}>
            ✅ 완료된 라운딩
          </h3>
          {completedBookings.length === 0 ? (
            <div style={{ 
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              background: 'var(--bg-green)',
              borderRadius: '8px'
            }}>
              <p>완료된 라운딩이 없습니다</p>
            </div>
          ) : (
            completedBookings.map(booking => renderBookingListItem(booking, false))
          )}
        </div>
      </div>
    </div>
  );
}

export default Booking;
