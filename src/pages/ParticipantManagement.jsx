import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function ParticipantManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, members, refreshBookings } = useApp();
  const [booking, setBooking] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking?.participants) {
        try {
          const parsed = foundBooking.participants.map(p => 
            typeof p === 'string' ? JSON.parse(p) : p
          );
          setParticipants(parsed);
        } catch (e) {
          console.error('참가자 데이터 파싱 오류:', e);
          setParticipants([]);
        }
      }
    }
  }, [bookingId, bookings]);

  useEffect(() => {
    if (members.length > 0 && booking) {
      if (booking.type === '컴페티션') {
        const clubMembers = members.filter(m => m.club === booking.courseName);
        const nonClubMembers = members.filter(m => m.club !== booking.courseName);
        setAvailableMembers([...clubMembers, ...nonClubMembers]);
      } else {
        setAvailableMembers(members);
      }
    }
  }, [members, booking]);

  const isParticipant = (memberPhone) => {
    return participants.some(p => p.phone === memberPhone);
  };

  const handleAddParticipant = async (member) => {
    if (isParticipant(member.phone)) {
      return;
    }

    try {
      const newParticipant = {
        name: member.name,
        nickname: member.nickname,
        phone: member.phone
      };

      const updatedParticipants = [...participants, newParticipant];
      
      console.log('🔵 참가자 추가 시도:', {
        bookingId,
        newParticipant,
        updatedParticipants
      });
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: updatedParticipants.map(p => JSON.stringify(p))
        })
      });

      console.log('📡 응답 상태:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 참가자 추가 성공:', result);
        await refreshBookings();
      } else {
        const errorData = await response.text();
        console.error('❌ 서버 오류:', errorData);
        alert(`참가자 추가에 실패했습니다: ${errorData}`);
      }
    } catch (error) {
      console.error('❌ 참가자 추가 오류:', error.message, error);
      alert(`참가자 추가 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const handleRemoveParticipant = async (phoneToRemove) => {
    if (!confirm('이 참가자를 삭제하시겠습니까?')) return;

    try {
      const updatedParticipants = participants.filter(p => p.phone !== phoneToRemove);
      
      console.log('🔵 참가자 삭제 시도:', {
        bookingId,
        phoneToRemove,
        updatedParticipants
      });
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: updatedParticipants.map(p => JSON.stringify(p))
        })
      });

      console.log('📡 응답 상태:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 참가자 삭제 성공:', result);
        await refreshBookings();
      } else {
        const errorData = await response.text();
        console.error('❌ 서버 오류:', errorData);
        alert(`참가자 삭제에 실패했습니다: ${errorData}`);
      }
    } catch (error) {
      console.error('❌ 참가자 삭제 오류:', error.message, error);
      alert(`참가자 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'operator' || user?.isAdmin;
  
  if (!hasAdminAccess) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
            관리자 또는 운영진만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
            라운딩을 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <button 
          onClick={() => navigate(`/rounding-management?id=${bookingId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-light)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 8px'
          }}
        >
          ←
        </button>
        <h1>참가자 관리</h1>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ 
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {booking.title && (
              <div style={{ fontSize: '13px', color: 'var(--primary-green)', fontWeight: '600', marginBottom: '4px' }}>
                {booking.title}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {booking.courseName}
            </h3>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              {new Date(booking.date).toLocaleDateString('ko-KR')} • {booking.time}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px' 
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-green)' }}>
              참가자 목록 ({participants.length}명)
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '8px 16px',
                background: 'var(--primary-green)',
                color: 'var(--text-light)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + 참가자 추가
            </button>
          </div>

          {participants.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.7, padding: '32px 0' }}>
              참가자가 없습니다. 참가자를 추가해주세요.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {participants.map((participant, index) => {
                const memberInfo = members.find(m => m.phone === participant.phone);
                const handicapText = booking?.type === '컴페티션' && memberInfo ? 
                  (memberInfo.gaHandy ? ` (GA: ${memberInfo.gaHandy})` : 
                   memberInfo.houseHandy ? ` (HH: ${memberInfo.houseHandy})` : '') : '';
                
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {participant.nickname}{handicapText}
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        {participant.name}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(participant.phone)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--alert-red)',
                        color: 'var(--text-light)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px' 
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>참가자 추가</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  opacity: 0.7
                }}
              >
                ×
              </button>
            </div>

            {availableMembers.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.7, padding: '32px 0' }}>
                회원이 없습니다.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {booking?.type === '컴페티션' && (
                  <>
                    {members.filter(m => m.club === booking.courseName).length > 0 && (
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--primary-green)',
                        padding: '8px 0 4px 0',
                        borderBottom: '2px solid var(--primary-green)'
                      }}>
                        {booking.courseName} 회원
                      </div>
                    )}
                  </>
                )}
                {availableMembers.map((member, index) => {
                  const alreadyAdded = isParticipant(member.phone);
                  const isClubMember = booking?.type === '컴페티션' && member.club === booking.courseName;
                  const prevMember = index > 0 ? availableMembers[index - 1] : null;
                  const showDivider = booking?.type === '컴페티션' && 
                    prevMember && 
                    prevMember.club === booking.courseName && 
                    member.club !== booking.courseName;
                  
                  return (
                    <React.Fragment key={member.id}>
                      {showDivider && (
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-dark)',
                          opacity: 0.7,
                          padding: '12px 0 4px 0',
                          marginTop: '8px',
                          borderBottom: '1px solid var(--border-color)'
                        }}>
                          비회원
                        </div>
                      )}
                      <button
                        onClick={() => handleAddParticipant(member)}
                        disabled={alreadyAdded}
                        style={{
                          padding: '16px',
                          background: 'var(--bg-card)',
                          border: '2px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          opacity: alreadyAdded ? 0.6 : 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            marginBottom: '4px', 
                            color: alreadyAdded ? 'var(--text-dark)' : 'var(--primary-green)' 
                          }}>
                            {member.nickname}
                          </div>
                          <div style={{ fontSize: '13px', opacity: 0.7 }}>
                            {member.name}
                          </div>
                        </div>
                        {alreadyAdded && (
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            opacity: 0.7,
                            background: 'var(--border-color)',
                            padding: '4px 12px',
                            borderRadius: '12px'
                          }}>
                            추가됨
                          </span>
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ParticipantManagement;
