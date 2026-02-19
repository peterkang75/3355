import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [createMode, setCreateMode] = useState('social');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRounding, setNewRounding] = useState({
    date: '',
    time: '',
    courseName: '',
    maxMembers: 4,
    notes: '',
    roundingType: '',
    timeMode: 'recruit',
    timeSlot: 'Morning',
  });
  const [officialForm, setOfficialForm] = useState({
    title: '',
    courseName: '',
    date: '',
    time: '',
    greenFee: '',
    cartFee: '',
    membershipFee: '',
    registrationDeadline: '',
    maxMembers: 28,
    notes: '',
    meetingTime: '',
  });
  const isAdmin = user.role === '관리자';
  const sheetRef = useRef(null);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && bookings.length > 0) {
      const found = bookings.find(b => b.id === idParam);
      if (found) {
        setSelectedBooking(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, bookings]);

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

  const isStrathfield = newRounding.courseName.toLowerCase().includes('strathfield');

  const timeSlotMap = {
    'Morning': { label: '오전', value: '08:00' },
    'Afternoon': { label: '오후', value: '13:00' },
    'Evening': { label: '저녁', value: '17:00' },
    'TBD': { label: '시간미정', value: '23:59' },
    'Exact': { label: '직접 입력', value: '' },
  };

  const handleCreateRounding = async () => {
    if (isCreating) return;
    if (!newRounding.courseName) {
      alert('골프장을 선택해주세요.');
      return;
    }

    let finalDate = newRounding.date;
    let finalTime = newRounding.time;
    let playEnabled = false;

    if (newRounding.timeMode === 'now') {
      const now = new Date();
      finalDate = now.toISOString().split('T')[0];
      finalTime = now.toTimeString().slice(0, 5);
      playEnabled = true;
    } else {
      if (!finalDate) {
        alert('날짜를 선택해주세요.');
        return;
      }
      if (newRounding.timeSlot === 'Exact' && !finalTime) {
        alert('시간을 입력해주세요.');
        return;
      }
      if (newRounding.timeSlot !== 'Exact') {
        finalTime = timeSlotMap[newRounding.timeSlot].value;
      }
    }

    let title = '소셜 라운딩';
    let type = '소셜';
    if (newRounding.roundingType === 'competition') {
      title = '클럽 컴페티션';
      type = '컴페티션';
    } else if (newRounding.roundingType === 'greenfee') {
      title = '그린피';
      type = '그린피';
    } else {
      title = '소셜 라운딩';
      type = '소셜';
    }

    setIsCreating(true);
    try {
      const bookingData = {
        title,
        type,
        isSocial: true,
        courseName: newRounding.courseName,
        date: finalDate,
        time: finalTime,
        maxMembers: parseInt(newRounding.maxMembers) || 4,
        notes: newRounding.notes || '',
        organizerId: user.id,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true,
        playEnabled,
      };
      await addBooking(bookingData);
      setShowCreateModal(false);
      setNewRounding({ date: '', time: '', courseName: '', maxMembers: 4, notes: '', roundingType: '', timeMode: 'recruit', timeSlot: 'Morning' });
    } catch (err) {
      alert('라운딩 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateOfficial = async () => {
    if (isCreating) return;
    if (!officialForm.courseName || !officialForm.date || !officialForm.time) {
      alert('골프장, 날짜, 시간은 필수 입력입니다.');
      return;
    }
    setIsCreating(true);
    try {
      const bookingData = {
        title: officialForm.title || '정기 라운딩',
        type: '정기모임',
        isSocial: false,
        courseName: officialForm.courseName,
        date: officialForm.date,
        time: officialForm.time,
        meetingTime: officialForm.meetingTime || '',
        greenFee: officialForm.greenFee || '',
        cartFee: officialForm.cartFee || '',
        membershipFee: officialForm.membershipFee || '',
        registrationDeadline: officialForm.registrationDeadline || '',
        maxMembers: parseInt(officialForm.maxMembers) || 28,
        notes: officialForm.notes || '',
        organizerId: user.id,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true,
      };
      await addBooking(bookingData);
      setShowCreateModal(false);
      setOfficialForm({ title: '', courseName: '', date: '', time: '', greenFee: '', cartFee: '', membershipFee: '', registrationDeadline: '', maxMembers: 28, notes: '', meetingTime: '' });
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
            공식
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.text_main }}>
                {booking.courseName}
              </span>
              {(() => {
                const typeLabel = booking.title || booking.type || '소셜 라운딩';
                const isCompetition = typeLabel.includes('컴페티션');
                const isGreenfee = typeLabel.includes('그린피');
                let badgeBg = '#F0FDF4';
                let badgeColor = '#065F46';
                if (isCompetition) { badgeBg = '#FEF3C7'; badgeColor = '#92400E'; }
                else if (isGreenfee) { badgeBg = '#DBEAFE'; badgeColor = '#1E40AF'; }
                return (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: badgeBg,
                    color: badgeColor,
                  }}>
                    {typeLabel}
                  </span>
                );
              })()}
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text_sub, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: '500' }}>주최: {getMemberName(booking.organizerId)}</span>
              <span style={{ margin: '0 4px', color: '#D1D5DB' }}>|</span>
              <span style={{ color: '#9CA3AF' }}>{formatDate(booking.date)}</span>
            </div>
          </div>
          {getStatusBadge(booking)}
        </div>

        <div style={{ fontSize: '13px', color: theme.colors.text_sub }}>
          {renderParticipantsSummary(booking)}
        </div>
      </div>
    );
  };

  const handleShare = async (booking) => {
    const shareUrl = `${window.location.origin}/v2/roundings?id=${booking.id}`;
    const shareText = `${booking.courseName} ${formatDate(booking.date)} 라운딩에 참가하세요!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '라운딩 초대',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          alert('링크가 복사되었습니다!');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('링크가 복사되었습니다!');
      } catch {
        prompt('아래 링크를 복사하세요:', shareUrl);
      }
    }
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(booking); }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                  title="공유"
                >
                  📤
                </button>
                {getStatusBadge(booking)}
              </div>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {participants.map((p, i) => {
                    const isHost = p.memberId === booking.organizerId;
                    const isMe = p.phone === user.phone;
                    const isGuest = p.isGuest;
                    let chipBg = '#F3F4F6';
                    let chipColor = theme.colors.text_main;
                    let chipBorder = 'transparent';
                    let chipWeight = '500';
                    if (isHost) {
                      chipBg = '#FEF3C7';
                      chipColor = '#92400E';
                    }
                    if (isMe) {
                      chipBg = '#D1FAE5';
                      chipColor = '#065F46';
                      chipWeight = '700';
                    }
                    if (isGuest) {
                      chipBg = '#FFFFFF';
                      chipBorder = '#D1D5DB';
                      chipColor = '#6B7280';
                    }
                    return (
                      <span key={i} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: chipBg,
                        color: chipColor,
                        fontWeight: chipWeight,
                        fontSize: '13px',
                        border: `1px solid ${chipBorder}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {isHost && '👑 '}{p.nickname || p.name}
                      </span>
                    );
                  })}
                </div>
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

  const renderTypeSelector = () => {
    if (!showTypeSelector) return null;
    return (
      <>
        <div
          onClick={() => setShowTypeSelector(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
        />
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          zIndex: 1000,
          animation: 'slideUp 0.25s ease-out',
        }}>
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: theme.colors.primary, textAlign: 'center', padding: '8px 20px 12px', marginBottom: 0 }}>
            라운딩 유형 선택
          </h3>
          <div style={{ padding: '0 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
            <button
              onClick={() => {
                setShowTypeSelector(false);
                setCreateMode('official');
                setShowCreateModal(true);
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: '2px solid #B45309',
                background: '#FFFBEB',
                cursor: 'pointer',
                marginBottom: '10px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#92400E', marginBottom: '4px' }}>
                👑 정기 라운딩 만들기
              </div>
              <div style={{ fontSize: '12px', color: '#B45309' }}>
                비용, 마감일 등 상세 설정 · 관리자 전용
              </div>
            </button>
            <button
              onClick={() => {
                setShowTypeSelector(false);
                setCreateMode('social');
                setShowCreateModal(true);
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: `2px solid ${theme.colors.primary}`,
                background: '#F0FDF4',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '700', color: theme.colors.primary, marginBottom: '4px' }}>
                ⚡ 소셜/번개 라운딩 만들기
              </div>
              <div style={{ fontSize: '12px', color: '#3a7d54' }}>
                간편하게 라운딩 모집
              </div>
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    const isOfficial = createMode === 'official';

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
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: isOfficial ? '#92400E' : theme.colors.primary,
            marginBottom: '0',
            textAlign: 'center',
            padding: '8px 20px 16px',
          }}>
            {isOfficial ? '👑 정기 라운딩 만들기' : '라운딩 만들기'}
          </h3>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>

          {isOfficial ? (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>라운딩 이름</label>
                <input
                  type="text"
                  value={officialForm.title}
                  onChange={(e) => setOfficialForm({ ...officialForm, title: e.target.value })}
                  placeholder="예: 3월 정기라운딩"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>골프장</label>
                <select
                  value={officialForm.courseName}
                  onChange={(e) => setOfficialForm({ ...officialForm, courseName: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">골프장 선택</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>날짜</label>
                  <input type="date" value={officialForm.date} onChange={(e) => setOfficialForm({ ...officialForm, date: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>티오프 시간</label>
                  <input type="time" value={officialForm.time} onChange={(e) => setOfficialForm({ ...officialForm, time: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>집결 시간</label>
                <input type="time" value={officialForm.meetingTime} onChange={(e) => setOfficialForm({ ...officialForm, meetingTime: e.target.value })} style={inputStyle} />
              </div>

              <div style={{
                padding: '14px',
                background: '#FFFBEB',
                borderRadius: '12px',
                border: '1px solid #FDE68A',
                marginBottom: '14px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', marginBottom: '10px' }}>💰 비용 안내</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>그린피</label>
                    <input type="number" value={officialForm.greenFee} onChange={(e) => setOfficialForm({ ...officialForm, greenFee: e.target.value })} placeholder="$0" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>카트비</label>
                    <input type="number" value={officialForm.cartFee} onChange={(e) => setOfficialForm({ ...officialForm, cartFee: e.target.value })} placeholder="$0" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>참가비</label>
                  <input type="number" value={officialForm.membershipFee} onChange={(e) => setOfficialForm({ ...officialForm, membershipFee: e.target.value })} placeholder="$0" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>접수 마감일</label>
                  <input type="date" value={officialForm.registrationDeadline} onChange={(e) => setOfficialForm({ ...officialForm, registrationDeadline: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>최대 인원</label>
                  <input type="number" value={officialForm.maxMembers} onChange={(e) => setOfficialForm({ ...officialForm, maxMembers: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>메모 (선택)</label>
                <textarea
                  value={officialForm.notes}
                  onChange={(e) => setOfficialForm({ ...officialForm, notes: e.target.value })}
                  placeholder="추가 안내사항을 입력하세요"
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Step 1: Course Selection */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>골프장</label>
                <select
                  value={newRounding.courseName}
                  onChange={(e) => setNewRounding({ ...newRounding, courseName: e.target.value, roundingType: '' })}
                  style={inputStyle}
                >
                  <option value="">골프장 선택</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Rounding Type */}
              {newRounding.courseName && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>라운딩 타입</label>
                  <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    {[
                      { key: 'competition', label: '🏆 컴페티션' },
                      { key: 'greenfee', label: '💵 그린피' },
                      { key: 'social', label: '☕ 소셜' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setNewRounding({ ...newRounding, roundingType: opt.key })}
                        style={{
                          flex: 1,
                          padding: '11px 0',
                          border: 'none',
                          background: newRounding.roundingType === opt.key ? theme.colors.primary : '#FFFFFF',
                          color: newRounding.roundingType === opt.key ? '#FFFFFF' : theme.colors.text_sub,
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Time Mode */}
              {newRounding.courseName && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>시간 설정</label>
                    <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                      {[
                        { key: 'now', label: '⚡ 바로 시작' },
                        { key: 'recruit', label: '📅 멤버 모집' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setNewRounding({ ...newRounding, timeMode: opt.key, date: '', time: '', timeSlot: 'Morning' })}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            border: 'none',
                            background: newRounding.timeMode === opt.key ? theme.colors.primary : '#FFFFFF',
                            color: newRounding.timeMode === opt.key ? '#FFFFFF' : theme.colors.text_sub,
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newRounding.timeMode === 'now' ? (
                    <div style={{
                      marginBottom: '14px',
                      padding: '14px',
                      background: '#F0FDF4',
                      borderRadius: '10px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#065F46',
                      fontWeight: '500',
                    }}>
                      ⚡ 바로 시작합니다 — 현재 시간으로 자동 설정됩니다
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>날짜</label>
                        <input
                          type="date"
                          value={newRounding.date}
                          onChange={(e) => setNewRounding({ ...newRounding, date: e.target.value })}
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>시간대</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {Object.entries(timeSlotMap).map(([key, { label }]) => (
                            <button
                              key={key}
                              onClick={() => setNewRounding({ ...newRounding, timeSlot: key, time: '' })}
                              style={{
                                padding: '9px 16px',
                                borderRadius: '10px',
                                border: newRounding.timeSlot === key ? `2px solid ${theme.colors.primary}` : '1px solid #E5E7EB',
                                background: newRounding.timeSlot === key ? '#EBF5F0' : 'white',
                                color: newRounding.timeSlot === key ? theme.colors.primary : theme.colors.text_sub,
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {newRounding.timeSlot === 'Exact' && (
                        <div style={{ marginBottom: '14px' }}>
                          <label style={labelStyle}>정확한 시간</label>
                          <input
                            type="time"
                            value={newRounding.time}
                            onChange={(e) => setNewRounding({ ...newRounding, time: e.target.value })}
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Max Members */}
              {newRounding.courseName && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>최대 인원</label>
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
              )}

              {/* Notes */}
              {newRounding.courseName && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>메모 (선택)</label>
                  <textarea
                    value={newRounding.notes}
                    onChange={(e) => setNewRounding({ ...newRounding, notes: e.target.value })}
                    placeholder="추가 정보를 입력하세요"
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
              )}
            </>
          )}

          </div>

          <div style={{ padding: '12px 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
            <button
              onClick={isOfficial ? handleCreateOfficial : handleCreateRounding}
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: isOfficial ? '#92400E' : theme.colors.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.6 : 1,
              }}
            >
              {isCreating ? '생성중...' : isOfficial ? '정기 라운딩 만들기' : '라운딩 만들기'}
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
          라운딩
        </h1>
        <ProfileBadge user={user} showGreeting={false} />
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {officialRoundings.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              정기모임
            </div>
            {officialRoundings.map(renderOfficialCard)}
          </div>
        )}

        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_sub, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            소셜 라운딩
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
        onClick={() => {
          if (isAdmin) {
            setShowTypeSelector(true);
          } else {
            setCreateMode('social');
            setShowCreateModal(true);
          }
        }}
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
      {renderTypeSelector()}
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

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#6B7280',
  display: 'block',
  marginBottom: '6px',
};

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
