import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function Booking() {
  const { user, bookings, courses, addBooking, updateBooking } = useApp();
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    courseName: '',
    date: '',
    time: '',
    greenFee: '',
    cartFee: '',
    membershipFee: '',
    registrationDeadline: '',
    restaurantName: '',
    restaurantAddress: ''
  });

  const handleCreateBooking = () => {
    if (!newBooking.courseName || !newBooking.date || !newBooking.time) {
      alert('골프장, 날짜, 시간을 입력해주세요.');
      return;
    }

    const booking = {
      id: Date.now(),
      ...newBooking,
      greenFee: parseInt(newBooking.greenFee) || 0,
      cartFee: parseInt(newBooking.cartFee) || 0,
      membershipFee: parseInt(newBooking.membershipFee) || 0,
      participants: [{ name: user.name, phone: user.phone }],
      createdBy: user.name
    };

    addBooking(booking);
    setNewBooking({
      courseName: '',
      date: '',
      time: '',
      greenFee: '',
      cartFee: '',
      membershipFee: '',
      registrationDeadline: '',
      restaurantName: '',
      restaurantAddress: ''
    });
    setShowNewBooking(false);
  };

  const handleJoinBooking = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    const alreadyJoined = booking.participants.some(p => p.phone === user.phone);
    
    if (alreadyJoined) {
      updateBooking(bookingId, {
        participants: booking.participants.filter(p => p.phone !== user.phone)
      });
    } else {
      updateBooking(bookingId, {
        participants: [...booking.participants, { name: user.name, phone: user.phone }]
      });
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0원';
    return `${parseInt(amount).toLocaleString()}원`;
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
            
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              골프장 *
            </label>
            <select
              value={newBooking.courseName}
              onChange={(e) => setNewBooking({ ...newBooking, courseName: e.target.value })}
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
              value={newBooking.date}
              onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              라운딩 시간 *
            </label>
            <input
              type="time"
              value={newBooking.time}
              onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              그린피
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="그린피 금액 (원)"
              value={newBooking.greenFee}
              onChange={(e) => setNewBooking({ ...newBooking, greenFee: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              카트비
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="카트비 금액 (원)"
              value={newBooking.cartFee}
              onChange={(e) => setNewBooking({ ...newBooking, cartFee: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              회비
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="회비 금액 (원)"
              value={newBooking.membershipFee}
              onChange={(e) => setNewBooking({ ...newBooking, membershipFee: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              접수 마감날짜
            </label>
            <input
              type="date"
              value={newBooking.registrationDeadline}
              onChange={(e) => setNewBooking({ ...newBooking, registrationDeadline: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              회식장소
            </label>
            <input
              type="text"
              placeholder="회식장소 이름"
              value={newBooking.restaurantName}
              onChange={(e) => setNewBooking({ ...newBooking, restaurantName: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#2d5f3f' }}>
              회식 주소
            </label>
            <input
              type="text"
              placeholder="회식장소 주소"
              value={newBooking.restaurantAddress}
              onChange={(e) => setNewBooking({ ...newBooking, restaurantAddress: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <button onClick={handleCreateBooking} className="btn-primary">
              라운딩 생성
            </button>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏌️</div>
            <p>예정된 라운딩이 없습니다</p>
            {user.isAdmin && (
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                상단의 라운딩 생성 버튼을 눌러 첫 라운딩을 만드세요
              </p>
            )}
          </div>
        ) : (
          bookings.map(booking => {
            const isJoined = booking.participants.some(p => p.phone === user.phone);

            return (
              <div key={booking.id} className="card">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                    {booking.courseName}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    📅 {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
                  </div>
                  {booking.registrationDeadline && (
                    <div style={{ fontSize: '13px', color: '#e67e22', fontWeight: '600' }}>
                      ⏰ 접수마감: {new Date(booking.registrationDeadline).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>

                {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
                  <div style={{
                    background: 'var(--bg-green)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#2d5f3f' }}>
                      💰 비용 안내
                    </div>
                    <div style={{ fontSize: '14px', display: 'grid', gap: '4px' }}>
                      {booking.greenFee && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>그린피</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(booking.greenFee)}</span>
                        </div>
                      )}
                      {booking.cartFee && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>카트비</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(booking.cartFee)}</span>
                        </div>
                      )}
                      {booking.membershipFee && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>회비</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(booking.membershipFee)}</span>
                        </div>
                      )}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        borderTop: '1px solid #d0d0d0',
                        paddingTop: '4px',
                        marginTop: '4px',
                        fontWeight: '700',
                        color: '#2d5f3f'
                      }}>
                        <span>총 금액</span>
                        <span>{formatCurrency((booking.greenFee || 0) + (booking.cartFee || 0) + (booking.membershipFee || 0))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {(booking.restaurantName || booking.restaurantAddress) && (
                  <div style={{
                    background: '#fff5e6',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid #f0d9b5'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#d68910' }}>
                      🍽️ 회식 정보
                    </div>
                    {booking.restaurantName && (
                      <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                        <strong>장소:</strong> {booking.restaurantName}
                      </div>
                    )}
                    {booking.restaurantAddress && (
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        📍 {booking.restaurantAddress}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ 
                  background: 'var(--bg-green)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    <span>참가자 ({booking.participants.length}명)</span>
                  </div>
                  {booking.participants.map((participant, idx) => (
                    <div key={idx} style={{ 
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '14px'
                    }}>
                      {participant.name}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleJoinBooking(booking.id)}
                  className={isJoined ? 'btn-outline' : 'btn-primary'}
                >
                  {isJoined ? '참가 취소' : '참가하기'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Booking;
