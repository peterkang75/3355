import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function Booking() {
  const { user, bookings, addBooking, updateBooking } = useApp();
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    courseName: '',
    date: '',
    time: '',
    maxPlayers: 4
  });

  const handleCreateBooking = () => {
    if (!newBooking.courseName || !newBooking.date || !newBooking.time) {
      alert('모든 정보를 입력해주세요.');
      return;
    }

    const booking = {
      id: Date.now(),
      ...newBooking,
      participants: [{ name: user.name, phone: user.phone }],
      createdBy: user.name
    };

    addBooking(booking);
    setNewBooking({ courseName: '', date: '', time: '', maxPlayers: 4 });
    setShowNewBooking(false);
  };

  const handleJoinBooking = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    const alreadyJoined = booking.participants.some(p => p.phone === user.phone);
    
    if (alreadyJoined) {
      updateBooking(bookingId, {
        participants: booking.participants.filter(p => p.phone !== user.phone)
      });
    } else if (booking.participants.length < booking.maxPlayers) {
      updateBooking(bookingId, {
        participants: [...booking.participants, { name: user.name, phone: user.phone }]
      });
    } else {
      alert('인원이 가득 찼습니다.');
    }
  };

  return (
    <div>
      <div className="header">
        <h1>골프장 부킹</h1>
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
            {showNewBooking ? '취소' : '부킹 생성'}
          </button>
        )}
      </div>

      <div className="page-content">
        {showNewBooking && user.isAdmin && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
              새 부킹 만들기
            </h3>
            <input
              type="text"
              placeholder="골프장 이름"
              value={newBooking.courseName}
              onChange={(e) => setNewBooking({ ...newBooking, courseName: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="date"
              value={newBooking.date}
              onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="time"
              value={newBooking.time}
              onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                최대 인원: {newBooking.maxPlayers}명
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={newBooking.maxPlayers}
                onChange={(e) => setNewBooking({ ...newBooking, maxPlayers: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            <button onClick={handleCreateBooking} className="btn-primary">
              부킹 생성
            </button>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏌️</div>
            <p>예정된 부킹이 없습니다</p>
            {user.isAdmin && (
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                상단의 부킹 생성 버튼을 눌러 첫 부킹을 만드세요
              </p>
            )}
          </div>
        ) : (
          bookings.map(booking => {
            const isJoined = booking.participants.some(p => p.phone === user.phone);
            const isFull = booking.participants.length >= booking.maxPlayers;

            return (
              <div key={booking.id} className="card">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                    {booking.courseName}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    📅 {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
                  </div>
                </div>

                <div style={{ 
                  background: 'var(--bg-green)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>참가자 ({booking.participants.length}/{booking.maxPlayers})</span>
                    {isFull && (
                      <span style={{ color: '#e53e3e' }}>마감</span>
                    )}
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
                  disabled={!isJoined && isFull}
                  style={!isJoined && isFull ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {isJoined ? '참가 취소' : isFull ? '인원 마감' : '참가하기'}
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
