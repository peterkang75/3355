import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import theme from '../styles/theme';
import { ProfileBadge } from '../components/common';

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

const isBookingActive = (booking) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

function RoundingListV2() {
  const { user, bookings, members, courses, addBooking, updateBooking } = useApp();
  const navigate = useNavigate();

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRounding, setNewRounding] = useState({
    date: '',
    time: '',
    courseName: '',
    maxMembers: 4,
    notes: ''
  });
  const sheetRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectedBooking && sheetRef.current && !sheetRef.current.contains(e.target)) {
        setSelectedBooking(null);
      }
    };
    if (selectedBooking) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBooking]);

  const officialRoundings = useMemo(() => {
    return bookings
      .filter(b => !b.isSocial && isBookingActive(b))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings]);

  const socialRoundings = useMemo(() => {
    return bookings
      .filter(b => b.isSocial && isBookingActive(b))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings]);

  const getMemberName = useCallback((id) => {
    const member = members.find(m => m.id === id);
    return member?.nickname || member?.name || '알 수 없음';
  }, [members]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = days[d.getDay()];
    return `${month}/${date} (${day})`;
  };

  const handleJoinLeave = async (booking) => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      const latest = bookings.find(b => b.id === booking.id) || booking;
      const participants = parseParticipants(latest.participants);
      const alreadyJoined = participants.some(p => p.phone === user.phone);

      if (alreadyJoined) {
        const updatedParticipants = participants
          .filter(p => p.phone !== user.phone)
          .map(p => JSON.stringify(p));
        await updateBooking(booking.id, { participants: updatedParticipants });
      } else {
        const max = latest.maxMembers || 4;
        if (participants.length >= max) {
          alert('이미 정원이 마감되었습니다.');
          return;
        }
        const updatedParticipants = [
          ...participants,
          { name: user.name, nickname: user.nickname, phone: user.phone }
        ].map(p => JSON.stringify(p));
        await updateBooking(booking.id, { participants: updatedParticipants });
      }
      setSelectedBooking(null);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateRounding = async () => {
    if (isCreating) return;
    if (!newRounding.date || !newRounding.time || !newRounding.courseName) {
      alert('날짜, 시간, 골프장은 필수 입력입니다.');
      return;
    }
    setIsCreating(true);
    try {
      const bookingData = {
        title: 'Social Rounding',
        type: '정기모임',
        isSocial: true,
        courseName: newRounding.courseName,
        date: newRounding.date,
        time: newRounding.time,
        maxMembers: parseInt(newRounding.maxMembers) || 4,
        notes: newRounding.notes || '',
        organizerId: user.id,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true,
      };
      await addBooking(bookingData);
      setShowCreateModal(false);
      setNewRounding({ date: '', time: '', courseName: '', maxMembers: 4, notes: '' });
    } catch (err) {
      alert('라운딩 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderParticipantsSummary = (booking) => {
    const participants = parseParticipants(booking.participants);
    if (participants.length === 0) return <span style={{ color: theme.colors.success, fontStyle: 'italic' }}>모집중...</span>;
    const names = participants.map(p => p.nickname || p.name);
    const maxShow = 3;
    if (names.length <= maxShow) {
      return <span>{names.join(', ')}</span>;
    }
    return <span>{names.slice(0, maxShow).join(', ')} +{names.length - maxShow}명</span>;
  };

  const getStatusBadge = (booking) => {
    const participants = parseParticipants(booking.participants);
    const max = booking.maxMembers || 4;
    const isFull = participants.length >= max;
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        background: isFull ? '#FEE2E2' : '#D1FAE5',
        color: isFull ? '#DC2626' : '#059669',
      }}>
        {isFull ? '마감' : `모집중 ${participants.length}/${max}`}
      </span>
    );
  };

  const renderOfficialCard = (booking) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    return (
      <div
        key={booking.id}
        onClick={() => setSelectedBooking(booking)}
        style={{
          background: 'linear-gradient(135deg, #1A3D2F 0%, #2D5A45 100%)',
          borderRadius: '14px',
          padding: '18px',
          marginBottom: '12px',
          cursor: 'pointer',
          border: '1px solid #D4AF37',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '12px', right: '14px' }}>
          <span style={{
            background: '#D4AF37',
            color: '#1A3D2F',
            padding: '3px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.5px',
          }}>
            OFFICIAL
          </span>
        </div>
        <div style={{ color: '#D4AF37', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
          {formatDate(booking.date)}
        </div>
        <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
          {booking.courseName}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{booking.time}</span>
          <span>·</span>
          <span>{participants.length}명 참가</span>
          {isJoined && (
            <>
              <span>·</span>
              <span style={{ color: '#D4AF37' }}>참가중</span>
            </>
          )}
        </div>
        {booking.title && (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '6px' }}>
            {booking.title}
          </div>
        )}
      </div>
    );
  };

  const renderSocialCard = (booking) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    return (
      <div
        key={booking.id}
        onClick={() => setSelectedBooking(booking)}
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '10px',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: isJoined ? '2px solid #10B981' : '1px solid #E5E7EB',
          transition: 'transform 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '22px', fontWeight: '700', color: theme.colors.primary, lineHeight: 1 }}>
              {booking.time}
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.text_main }}>
              {booking.courseName}
            </span>
          </div>
          {getStatusBadge(booking)}
        </div>

        <div style={{ fontSize: '13px', color: theme.colors.text_sub, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '14px' }}>👑</span>
          <span style={{ fontWeight: '500' }}>{getMemberName(booking.organizerId)}</span>
          <span style={{ margin: '0 4px', color: '#D1D5DB' }}>|</span>
          <span style={{ color: '#9CA3AF' }}>{formatDate(booking.date)}</span>
        </div>

        <div style={{ fontSize: '13px', color: theme.colors.text_sub, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#9CA3AF' }}>⛳</span>
          {renderParticipantsSummary(booking)}
        </div>
      </div>
    );
  };

  const renderBottomSheet = () => {
    if (!selectedBooking) return null;
    const booking = bookings.find(b => b.id === selectedBooking.id) || selectedBooking;
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const canManage = user.id === booking.organizerId || user.isAdmin;
    const max = booking.maxMembers || 4;
    const isFull = participants.length >= max;

    return (
      <>
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        }} />
        <div
          ref={sheetRef}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#FFFFFF',
            borderRadius: '20px 20px 0 0',
            zIndex: 1000,
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.25s ease-out',
          }}
        >
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>

          <div style={{ padding: '8px 20px 16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary }}>
                  {booking.courseName}
                </div>
                <div style={{ fontSize: '14px', color: theme.colors.text_sub, marginTop: '2px' }}>
                  {formatDate(booking.date)} · {booking.time}
                </div>
              </div>
              {getStatusBadge(booking)}
            </div>

            <div style={{ fontSize: '13px', color: theme.colors.text_sub, marginBottom: '14px' }}>
              👑 호스트: <strong>{getMemberName(booking.organizerId)}</strong>
            </div>

            <div style={{
              background: '#F9FAFB',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '14px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_main, marginBottom: '10px' }}>
                참가자 ({participants.length}/{max})
              </div>
              {participants.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>아직 참가자가 없습니다</div>
              ) : (
                participants.map((p, i) => (
                  <div key={i} style={{
                    padding: '8px 0',
                    borderBottom: i < participants.length - 1 ? '1px solid #E5E7EB' : 'none',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: p.phone === user.phone ? '#D1FAE5' : '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: p.phone === user.phone ? '#059669' : '#6B7280',
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: p.phone === user.phone ? '600' : '400', color: theme.colors.text_main }}>
                      {p.nickname || p.name}
                    </span>
                    {p.phone === user.phone && (
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: '500' }}>나</span>
                    )}
                  </div>
                ))
              )}
            </div>

            {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
              <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_main, marginBottom: '8px' }}>비용</div>
                {booking.greenFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: theme.colors.text_sub }}>그린피</span>
                    <span>${booking.greenFee}</span>
                  </div>
                )}
                {booking.cartFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: theme.colors.text_sub }}>카트비</span>
                    <span>${booking.cartFee}</span>
                  </div>
                )}
                {booking.membershipFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: theme.colors.text_sub }}>참가비</span>
                    <span>${booking.membershipFee}</span>
                  </div>
                )}
              </div>
            )}

            {booking.notes && (
              <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_main, marginBottom: '6px' }}>메모</div>
                <div style={{ fontSize: '13px', color: theme.colors.text_sub, whiteSpace: 'pre-wrap' }}>{booking.notes}</div>
              </div>
            )}
          </div>

          <div style={{
            padding: '12px 20px',
            paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: '10px',
          }}>
            {canManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBooking(null);
                  navigate(`/rounding-management?id=${booking.id}`);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${theme.colors.primary}`,
                  background: 'white',
                  color: theme.colors.primary,
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                관리
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleJoinLeave(booking);
              }}
              disabled={isJoining || (!isJoined && isFull)}
              style={{
                flex: 2,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: isJoined ? '#FEE2E2' : (isFull ? '#E5E7EB' : theme.colors.primary),
                color: isJoined ? '#DC2626' : (isFull ? '#9CA3AF' : 'white'),
                fontSize: '15px',
                fontWeight: '600',
                cursor: (isJoining || (!isJoined && isFull)) ? 'not-allowed' : 'pointer',
                opacity: isJoining ? 0.6 : 1,
              }}
            >
              {isJoining ? '처리중...' : isJoined ? '참가 취소' : isFull ? '마감됨' : '참가하기'}
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;
    return (
      <>
        <div
          onClick={() => setShowCreateModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
          }}
        />
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          zIndex: 1000,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.25s ease-out',
        }}>
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: theme.colors.primary, marginBottom: '0', textAlign: 'center', padding: '8px 20px 16px' }}>
            소셜 라운딩 만들기
          </h3>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, display: 'block', marginBottom: '6px' }}>날짜</label>
            <input
              type="date"
              value={newRounding.date}
              onChange={(e) => setNewRounding({ ...newRounding, date: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, display: 'block', marginBottom: '6px' }}>시간</label>
            <input
              type="time"
              value={newRounding.time}
              onChange={(e) => setNewRounding({ ...newRounding, time: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, display: 'block', marginBottom: '6px' }}>골프장</label>
            <select
              value={newRounding.courseName}
              onChange={(e) => setNewRounding({ ...newRounding, courseName: e.target.value })}
              style={inputStyle}
            >
              <option value="">골프장 선택</option>
              {courses.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, display: 'block', marginBottom: '6px' }}>최대 인원</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 3, 4, 5, 6, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setNewRounding({ ...newRounding, maxMembers: n })}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '10px',
                    border: newRounding.maxMembers === n ? `2px solid ${theme.colors.primary}` : '1px solid #E5E7EB',
                    background: newRounding.maxMembers === n ? '#EBF5F0' : 'white',
                    color: newRounding.maxMembers === n ? theme.colors.primary : theme.colors.text_sub,
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {n}명
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, display: 'block', marginBottom: '6px' }}>메모 (선택)</label>
            <textarea
              value={newRounding.notes}
              onChange={(e) => setNewRounding({ ...newRounding, notes: e.target.value })}
              placeholder="추가 정보를 입력하세요"
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          </div>

          <div style={{ padding: '12px 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
            <button
              onClick={handleCreateRounding}
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: theme.colors.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.6 : 1,
              }}
            >
              {isCreating ? '생성중...' : '라운딩 만들기'}
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ background: theme.colors.bg_app, minHeight: '100vh' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, margin: 0 }}>
          Rounding Lounge
        </h1>
        <ProfileBadge user={user} showGreeting={false} />
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {officialRoundings.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Official Roundings
            </div>
            {officialRoundings.map(renderOfficialCard)}
          </div>
        )}

        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Social Roundings
          </div>
          {socialRoundings.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#9CA3AF',
              fontSize: '14px',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⛳</div>
              <div>아직 소셜 라운딩이 없습니다</div>
              <div style={{ marginTop: '4px', fontSize: '13px' }}>+ 버튼을 눌러 라운딩을 만들어보세요</div>
            </div>
          ) : (
            socialRoundings.map(renderSocialCard)
          )}
        </div>
      </div>

      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: theme.colors.primary,
          color: 'white',
          fontSize: '28px',
          fontWeight: '300',
          boxShadow: '0 4px 12px rgba(26, 61, 47, 0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          lineHeight: 1,
        }}
      >
        +
      </button>

      {renderBottomSheet()}
      {renderCreateModal()}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default RoundingListV2;
