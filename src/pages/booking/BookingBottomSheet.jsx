import React from 'react';
import { useNavigate } from 'react-router-dom';
import { parseParticipants, checkIsOperator } from '../../utils';
import { formatDate, getStatusBadge, getBookingStatusFlags } from './bookingHelpers';

export default function BookingBottomSheet({
  selectedBooking,
  bookings,
  user,
  isJoining,
  isRentalLoading,
  onJoinLeave,
  onToggleRental,
  onOpenHostManage,
  onClose,
  sheetRef,
  getMemberName,
}) {
  const navigate = useNavigate();

  if (!selectedBooking) return null;
  const booking = bookings.find(b => b.id === selectedBooking.id) || selectedBooking;
  const participants = parseParticipants(booking.participants);
  const isJoined = participants.some(p => p.phone === user.phone);
  const isOrganizer = user.id === booking.organizerId;
  const isOperator = checkIsOperator(user);
  const isRegularMeeting = booking.type === '정기모임';
  const userClub = (user.club || '').trim().toLowerCase();
  const bookingCourse = (booking.courseName || '').trim().toLowerCase();
  const clubMatches = userClub && bookingCourse && (
    userClub === bookingCourse ||
    bookingCourse.includes(userClub.split(' ')[0]) ||
    userClub.includes(bookingCourse.split(' ')[0])
  );
  const canManageAsClubMember = !isRegularMeeting && !!clubMatches;
  const canManage = isOrganizer || isOperator || canManageAsClubMember;
  const isClubMemberOnly = canManage && !isOrganizer && !isOperator;
  const max = booking.maxMembers || 4;
  const isFull = participants.length >= max;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/booking?id=${booking.id}`;
    const shareText = `${booking.courseName} ${formatDate(booking.date)} 라운딩에 참가하세요!\n${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '라운딩 초대', text: shareText });
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          alert('링크가 복사되었습니다!');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('링크가 복사되었습니다!');
      } catch {
        prompt('아래 링크를 복사하세요:', shareUrl);
      }
    }
  };

  const statusFlags = getBookingStatusFlags(booking);
  const { isPastRoundingDate, isRegistrationClosed } = statusFlags;
  const hasResults = booking.dailyHandicaps || isPastRoundingDate;
  const isRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
  const isCompetition = booking.type === '컴페티션';
  const hasExplicitDeadline = !!booking.registrationDeadline;
  const effectiveClosed = isCompetition
    ? isRegistrationClosed
    : (isPastRoundingDate || (hasExplicitDeadline && isRegistrationClosed));
  const showTeamFormation = participants.length > 4;

  // ── 버튼 스타일 헬퍼 ──────────────────────────────────────────────────────
  const btn = (bg, color, border) => ({
    flex: 1, padding: '14px', borderRadius: '12px',
    border: border || 'none', background: bg, color,
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
    letterSpacing: '-0.01em',
  });

  const renderActionButtons = () => {
    if (hasResults) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canManage && (
              <button onClick={() => onOpenHostManage(booking, isClubMemberOnly)} style={btn('#F1F5F9', '#475569', '1px solid #E8ECF0')}>관리</button>
            )}
            {showTeamFormation && (
              <button onClick={() => navigate(`/team-formation?id=${booking.id}`)} style={btn('#F1F5F9', '#475569', '1px solid #E8ECF0')}>조편성</button>
            )}
            <button onClick={() => navigate(`/leaderboard?id=${booking.id}`)} style={btn('#0047AB', '#FFFFFF')}>결과보기</button>
          </div>
          {!isCompetition && (
            <button onClick={() => navigate(`/play?id=${booking.id}`)} style={{ ...btn('#0047AB', '#FFFFFF'), width: '100%' }}>플레이하기</button>
          )}
        </div>
      );
    }

    if (effectiveClosed) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canManage && (
              <button onClick={() => onOpenHostManage(booking, isClubMemberOnly)} style={btn('#F1F5F9', '#475569', '1px solid #E8ECF0')}>관리</button>
            )}
            {showTeamFormation && (
              <button onClick={() => navigate(`/team-formation?id=${booking.id}`)} style={btn('#F1F5F9', '#475569', '1px solid #E8ECF0')}>조편성 보기</button>
            )}
          </div>
          {booking.playEnabled && (
            <button onClick={() => navigate(`/play?id=${booking.id}`)} style={{ ...btn('#0047AB', '#FFFFFF'), width: '100%' }}>플레이하기</button>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canManage && (
            <button onClick={() => onOpenHostManage(booking, isClubMemberOnly)} style={btn('#F1F5F9', '#475569', '1px solid #E8ECF0')}>관리</button>
          )}
          {isJoined ? (
            <button onClick={(e) => { e.stopPropagation(); onJoinLeave(booking); }} disabled={isJoining}
              style={{ ...btn('#F1F5F9', '#64748B', '1px solid #E8ECF0'), opacity: isJoining ? 0.6 : 1 }}>
              {isJoining ? '처리중...' : '참가 취소'}
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onJoinLeave(booking); }}
              disabled={isJoining || (isCompetition ? effectiveClosed : isFull) || isRenting}
              style={{ ...btn((isCompetition ? effectiveClosed : isFull) ? '#F1F5F9' : '#0047AB', (isCompetition ? effectiveClosed : isFull) ? '#94A3B8' : '#FFFFFF'), opacity: (isJoining || isRenting) ? 0.6 : 1 }}>
              {isJoining ? '처리중...' : (isCompetition ? effectiveClosed : isFull) ? '마감됨' : '참가하기'}
            </button>
          )}
          {isCompetition && (
            isRenting ? (
              <button onClick={(e) => { e.stopPropagation(); onToggleRental(booking.id); }} disabled={isRentalLoading}
                style={{ ...btn('#FEF3C7', '#92400E', '1px solid #FDE68A'), opacity: isRentalLoading ? 0.6 : 1 }}>
                {isRentalLoading ? '처리중...' : '대여 취소'}
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onToggleRental(booking.id); }} disabled={isRentalLoading || isJoined}
                style={{ ...btn('#F1F5F9', '#92400E', '1px solid #E8ECF0'), opacity: (isRentalLoading || isJoined) ? 0.5 : 1 }}>
                {isRentalLoading ? '처리중...' : '번호 대여'}
              </button>
            )
          )}
          {showTeamFormation && !isCompetition && (
            <button onClick={() => navigate(`/team-formation?id=${booking.id}`)} style={btn('#F1F5F9', '#475569', '1px solid #E8ECF0')}>조편성</button>
          )}
        </div>
        {!isCompetition && (
          <button onClick={() => navigate(`/play?id=${booking.id}`)} style={{ ...btn('#0047AB', '#FFFFFF'), width: '100%' }}>플레이하기</button>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(3px)' }} onClick={onClose} />
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#F8FAFC',
          borderRadius: '24px 24px 0 0',
          zIndex: 1000,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.25s ease-out',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* 핸들 */}
        <div style={{ textAlign: 'center', padding: '14px 0 8px', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
        </div>

        {/* 스크롤 영역 */}
        <div style={{ padding: '4px 20px 16px', overflowY: 'auto', flex: 1 }}>

          {/* ── 헤더 카드 ── */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {booking.courseName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>
                    {formatDate(booking.date)} · {booking.time}
                  </span>
                  {getStatusBadge(booking)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #E8ECF0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '12px', color: '#64748B' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '13px', color: '#64748B' }}>
              <span style={{ fontWeight: '600', color: '#1E293B' }}>{getMemberName(booking.organizerId)}</span>
              <span style={{ marginLeft: '4px', color: '#94A3B8' }}>호스트</span>
            </div>
          </div>

          {/* ── 참가자 카드 ── */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>참가자</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0047AB' }}>{participants.length}<span style={{ color: '#94A3B8', fontWeight: '500' }}>/{max}</span></span>
            </div>
            {participants.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>아직 참가자가 없습니다</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {participants.map((p, i) => {
                  const isHost = p.memberId === booking.organizerId;
                  const isMe = p.phone === user.phone;
                  const isGuest = p.isGuest;
                  let bg = '#F1F5F9', color = '#475569', border = 'transparent', weight = '500';
                  if (isMe) { bg = '#EBF2FF'; color = '#0047AB'; border = '#BFDBFE'; weight = '700'; }
                  else if (isHost) { bg = '#F8FAFC'; color = '#1E293B'; border = '#E2E8F0'; weight = '600'; }
                  if (isGuest) { bg = '#FFFFFF'; color = '#94A3B8'; border = '#E2E8F0'; }
                  return (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '5px 12px', borderRadius: '9999px', background: bg, color, fontWeight: weight, fontSize: '13px', border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                      {isHost && <span style={{ fontSize: '10px' }}>👑</span>}{p.nickname || p.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 비용 카드 ── */}
          {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '10px' }}>비용</div>
              {[
                { label: '그린피', value: booking.greenFee },
                { label: '카트비', value: booking.cartFee },
                { label: '참가비', value: booking.membershipFee },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>{r.label}</span>
                  <span style={{ fontWeight: '600', color: '#1E293B' }}>${r.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── 메모 카드 ── */}
          {booking.notes && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>메모</div>
              <div style={{ fontSize: '14px', color: '#64748B', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{booking.notes}</div>
            </div>
          )}
        </div>

        {/* ── 액션 버튼 ── */}
        <div style={{ padding: '12px 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', flexShrink: 0 }}>
          {renderActionButtons()}
        </div>
      </div>
    </>
  );
}
