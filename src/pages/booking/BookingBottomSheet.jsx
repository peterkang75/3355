import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { parseParticipants } from '../../utils';
import { formatDate, getStatusBadge, getBookingStatusFlags, getManagePermissions } from './bookingHelpers';

// 회원이 라운딩을 눌렀을 때 보는 시트.
// 시기(모집 → 당일 → 끝남)마다 지금 할 일 하나만 큰 버튼으로, 나머지는 아래 글씨 링크로 둔다.

const INK = '#1E293B';
const COLLAPSED_COUNT = 8;

const card = { background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', marginBottom: '10px' };
const cardTitle = { fontSize: '13px', fontWeight: '700', color: INK, marginBottom: '10px' };

const bigBtn = (primary, disabled) => ({
  width: '100%', minHeight: 50, padding: '0 16px', borderRadius: '12px', fontFamily: 'inherit',
  border: primary ? 'none' : '1px solid #E2E8F0',
  background: disabled ? '#F1F5F9' : primary ? '#0047AB' : '#FFFFFF',
  color: disabled ? '#94A3B8' : primary ? '#FFFFFF' : '#475569',
  fontSize: '15px', fontWeight: '700', letterSpacing: '-0.01em', cursor: disabled ? 'default' : 'pointer',
});

const findMyTeam = (raw, phone) => {
  try {
    const teams = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(teams) ? teams.find(t => t?.members?.some(m => m?.phone === phone)) : null;
  } catch { return null; }
};

export default function BookingBottomSheet({
  selectedBooking,
  bookings,
  user,
  isJoining,
  isRentalLoading,
  onJoinLeave,
  onToggleRental,
  onOpenHostManage,
  onOpenGallery,
  onClose,
  sheetRef,
  getMemberName,
}) {
  const navigate = useNavigate();
  const { members } = useApp();
  const [showAll, setShowAll] = useState(false);

  if (!selectedBooking) return null;
  const booking = bookings.find(b => b.id === selectedBooking.id) || selectedBooking;
  const participants = parseParticipants(booking.participants);
  // 번호대여 회원 (참가자 목록에 없는 phone들만 별도 칩으로 추가 표시)
  const participantPhonesSet = new Set(participants.map(p => p.phone).filter(Boolean));
  const rentalMembers = (booking.numberRentals || [])
    .filter(ph => !participantPhonesSet.has(ph))
    .map(ph => {
      const m = (members || []).find(mm => mm.phone === ph);
      return m ? { name: m.name, nickname: m.nickname, phone: m.phone, isRental: true } : { phone: ph, isRental: true, name: '번호대여' };
    });
  // 내 이름을 맨 앞에 — 26명 사이에서 찾지 않아도 되게
  const allChips = [...participants, ...rentalMembers].sort((a, b) => (b.phone === user.phone) - (a.phone === user.phone));
  const isJoined = participants.some(p => p.phone === user.phone);
  const { canManage } = getManagePermissions(booking, user);
  const max = booking.maxMembers || 4;
  const extraRentals = rentalMembers.length;
  const totalCountAll = participants.length + extraRentals;
  const isFull = totalCountAll >= max;

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

  const { isPastRoundingDate, isRoundingDay, isRegistrationClosed } = getBookingStatusFlags(booking);
  const isRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
  const isCompetition = booking.type === '컴페티션';
  const hasExplicitDeadline = !!booking.registrationDeadline;
  const effectiveClosed = isCompetition
    ? isRegistrationClosed
    : (isPastRoundingDate || (hasExplicitDeadline && isRegistrationClosed));
  const showTeamFormation = totalCountAll > 4 && (!isCompetition || effectiveClosed || isPastRoundingDate);

  // 시기 판정: 끝남 / 스코어 입력 가능(당일이거나 운영진이 미리 열어 둠) / 모집
  const isOver = isPastRoundingDate;
  const canPlay = !isOver && (booking.playEnabled || (isRoundingDay && !isCompetition));
  const canJoin = !isOver && !effectiveClosed && !isJoined && !isRoundingDay;
  const canCancel = !isOver && !effectiveClosed && isJoined;
  const joinBlocked = isCompetition ? effectiveClosed : isFull;

  const myTeam = isJoined ? findMyTeam(booking.teams, user.phone) : null;
  const myStatus = isJoined
    ? [isOver ? '참가' : '참가 확정', myTeam?.teamNumber && `${myTeam.teamNumber}조`, myTeam?.teeTime].filter(Boolean).join(' · ')
    : isRenting ? '번호 대여 중' : null;

  const go = (path) => (e) => { e.stopPropagation(); navigate(path); };
  const joinLeave = (e) => { e.stopPropagation(); onJoinLeave(booking); };

  // 큰 버튼은 하나만
  let primary = null;
  if (isOver) {
    primary = <button onClick={go(`/leaderboard?id=${booking.id}`)} style={bigBtn(true)}>리더보드</button>;
  } else if (canJoin) {
    primary = (
      <button onClick={joinLeave} disabled={isJoining || joinBlocked || isRenting}
        style={{ ...bigBtn(true, joinBlocked), opacity: isJoining || isRenting ? 0.6 : 1 }}>
        {isJoining ? '처리중...' : joinBlocked ? '마감됨' : '참가하기'}
      </button>
    );
  } else if (canPlay) {
    primary = <button onClick={go(`/play?id=${booking.id}`)} style={bigBtn(true)}>플레이하기</button>;
  } else if (canCancel) {
    primary = (
      <button onClick={joinLeave} disabled={isJoining} style={{ ...bigBtn(false), opacity: isJoining ? 0.6 : 1 }}>
        {isJoining ? '처리중...' : '참가 취소'}
      </button>
    );
  } else if (!isJoined && effectiveClosed) {
    primary = <button disabled style={bigBtn(true, true)}>모집 마감</button>;
  }

  // 나머지는 글씨 링크로
  const links = [];
  if (showTeamFormation) links.push({ label: '조편성 보기', onClick: go(`/team-formation?id=${booking.id}`) });
  if (canPlay) links.push({ label: '리더보드', onClick: go(`/leaderboard?id=${booking.id}`) });
  if (isOver && !isCompetition) links.push({ label: '스코어 입력', onClick: go(`/play?id=${booking.id}`) });
  if (onOpenGallery && (isOver || canPlay || booking._count?.media)) {
    links.push({ label: `사진·영상${booking._count?.media ? ` ${booking._count.media}` : ''}`, onClick: (e) => { e.stopPropagation(); onOpenGallery(booking); } });
  }
  if (isCompetition && !isOver && !effectiveClosed && !isJoined) {
    links.push({
      label: isRentalLoading ? '처리중...' : isRenting ? '번호 대여 취소' : '번호 대여',
      onClick: (e) => { e.stopPropagation(); if (!isRentalLoading) onToggleRental(booking.id); },
    });
  }
  if (canCancel && canPlay) links.push({ label: isJoining ? '처리중...' : '참가 취소', onClick: joinLeave });

  const visibleChips = showAll ? allChips : allChips.slice(0, COLLAPSED_COUNT);

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
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: INK, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
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
                aria-label="공유"
                style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #E8ECF0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '12px', color: '#64748B' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '4px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
              <span style={{ padding: '6px 0' }}>
                <span style={{ fontWeight: '600', color: INK }}>{getMemberName(booking.organizerId)}</span>
                <span style={{ marginLeft: '4px', color: '#94A3B8' }}>호스트</span>
              </span>
              {canManage && (
                <button onClick={(e) => { e.stopPropagation(); onOpenHostManage(booking); }}
                  style={{ minHeight: 40, padding: '0 0 0 12px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '700', color: INK }}>
                  관리 ›
                </button>
              )}
            </div>
            {myStatus && (
              <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '14px', fontWeight: '700', color: INK }}>
                {myStatus}
              </div>
            )}
          </div>

          {/* ── 참가자 카드 ── */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: INK }}>참가자</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: INK }}>
                {totalCountAll}{isCompetition && '명'}
                {extraRentals > 0 && <span style={{ color: '#94A3B8', fontWeight: '500', fontSize: '11px' }}> ({participants.length}+번호대여{extraRentals})</span>}
                {!isCompetition && <span style={{ color: '#94A3B8', fontWeight: '500' }}>/{max}</span>}
              </span>
            </div>
            {allChips.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>아직 참가자가 없습니다</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {visibleChips.map((p, i) => {
                    const isHost = p.memberId === booking.organizerId;
                    const isMe = p.phone === user.phone;
                    const isGuest = p.isGuest;
                    const isRental = p.isRental;
                    let bg = '#F1F5F9', color = '#475569', border = 'transparent', weight = '500';
                    if (isMe) { bg = '#FFFFFF'; color = INK; border = INK; weight = '700'; }
                    else if (isHost) { bg = '#F8FAFC'; color = INK; border = '#E2E8F0'; weight = '600'; }
                    if (isGuest) { bg = '#FFFFFF'; color = '#94A3B8'; border = '#E2E8F0'; }
                    if (isRental) { bg = '#FFF7ED'; color = '#C2410C'; border = '#FED7AA'; weight = '600'; }
                    const tag = isHost ? '호스트' : isRental ? '대여' : null;
                    return (
                      <span key={`${p.phone || 'r'}-${i}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', padding: '5px 12px', borderRadius: '9999px', background: bg, color, fontWeight: weight, fontSize: '13px', border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                        {p.nickname || p.name}
                        {tag && <span style={{ fontSize: '10.5px', fontWeight: '500', color: '#94A3B8' }}>{tag}</span>}
                      </span>
                    );
                  })}
                </div>
                {allChips.length > COLLAPSED_COUNT && (
                  <button onClick={(e) => { e.stopPropagation(); setShowAll(v => !v); }}
                    style={{ marginTop: '6px', minHeight: 40, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: INK, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    {showAll ? '접기' : `전체 보기 (${allChips.length})`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── 비용 카드 ── */}
          {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
            <div style={card}>
              <div style={cardTitle}>비용</div>
              {[
                { label: '그린피', value: booking.greenFee },
                { label: '카트비', value: booking.cartFee },
                { label: '참가비', value: booking.membershipFee },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>{r.label}</span>
                  <span style={{ fontWeight: '600', color: INK }}>${r.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── 회식 카드 (관리 화면 비용·회식 탭에서 입력) ── */}
          {(booking.restaurantName || booking.restaurantAddress) && (
            <div style={card}>
              <div style={cardTitle}>회식</div>
              {booking.restaurantName && <div style={{ fontSize: '15px', fontWeight: '600', color: INK }}>{booking.restaurantName}</div>}
              {booking.restaurantAddress && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(booking.restaurantAddress)}`} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-block', marginTop: '4px', fontSize: '13.5px', color: '#64748B', textDecoration: 'underline', textUnderlineOffset: 3, lineHeight: 1.5 }}>
                  {booking.restaurantAddress}
                </a>
              )}
            </div>
          )}

          {/* ── 메모 카드 ── */}
          {booking.notes && (
            <div style={card}>
              <div style={{ ...cardTitle, marginBottom: '8px' }}>메모</div>
              <div style={{ fontSize: '14px', color: '#64748B', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{booking.notes}</div>
            </div>
          )}
        </div>

        {/* ── 액션: 큰 버튼 하나 + 글씨 링크 ── */}
        <div style={{ padding: '12px 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', flexShrink: 0 }}>
          {primary}
          {links.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop: primary ? '4px' : 0 }}>
              {links.map((l, i) => (
                <React.Fragment key={l.label}>
                  {i > 0 && <span aria-hidden style={{ alignSelf: 'center', width: 1, height: 12, background: '#E2E8F0' }} />}
                  <button onClick={l.onClick}
                    style={{ minHeight: 44, padding: '0 14px', border: 'none', borderRadius: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: INK }}>
                    {l.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
