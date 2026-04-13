import React, { useState, useEffect, memo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProfileBadge } from '../components/common';
import { parseParticipants } from '../utils';
import { isBookingActive } from './booking/bookingHelpers';
import golfBg from '../assets/golf-bg.jpeg';

// ─── 아이콘 ───────────────────────────────────────────────────────────────────

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
// ─── 0. 대시보드 메인 배너 ────────────────────────────────────────────────────

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

function FeaturedBanner({ post, onClick }) {
  const subtitle = post.content?.length > 60
    ? post.content.slice(0, 60) + '…'
    : post.content;

  return (
    <div
      onClick={onClick}
      style={{
        margin: '0 20px 28px',
        borderRadius: 22,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
      }}
    >
      {/* 배경 이미지 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${golfBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 60%',
      }} />
      {/* 다크 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(145deg, rgba(8,24,58,0.85) 0%, rgba(0,40,110,0.72) 100%)',
      }} />

      {/* 컨텐츠 */}
      <div style={{ position: 'relative', padding: '22px 22px 20px' }}>
        {/* 배지 */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.02em',
          marginBottom: 12,
        }}>
          공지사항
        </div>

        {/* 제목 */}
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.3,
          letterSpacing: '-0.02em',
          marginBottom: 8,
          fontFamily: 'var(--font-sans)',
        }}>
          {post.title}
        </div>

        {/* 부제목 */}
        {subtitle && (
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.6,
            marginBottom: 16,
          }}>
            {subtitle}
          </div>
        )}

        {/* 더보기 버튼 */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 700,
          color: '#fff',
        }}>
          자세히 보기 <ArrowRightIcon />
        </div>
      </div>
    </div>
  );
}

// ─── 1. 라운딩 카드 ─────────────────────────────────────────────────────────

function BookingCard({ booking, user, onClick }) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const d = new Date(booking.date);
  const day = d.getDate();
  const dow = days[d.getDay()];
  const timeStr = booking.time && booking.time !== '23:59' ? booking.time.slice(0, 5) : '오전';
  const participants = parseParticipants(booking.participants);
  const isJoined = participants.some(p => p.phone === user?.phone);
  const names = participants.slice(0, 3).map(p => p.nickname || p.name).join(', ');
  const extra = participants.length > 3 ? ` 외 ${participants.length - 3}명` : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E8ECF0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        marginBottom: 8,
        cursor: 'pointer',
        gap: 0,
      }}
    >
      {/* 날짜 */}
      <div style={{ minWidth: 40, textAlign: 'center', marginRight: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{day}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>{dow}</div>
      </div>

      {/* 세로 구분선 */}
      <div style={{ width: 1, height: 36, background: '#E8ECF0', marginRight: 14, flexShrink: 0 }} />

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-background)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {booking.title || booking.courseName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {booking.type && (
            <span style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>
              {booking.type}
            </span>
          )}
          <span>{timeStr}</span>
          {names && <span>· {names}{extra}</span>}
        </div>
      </div>

      {/* 참가 상태 + 쉐브론 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, flexShrink: 0 }}>
        {isJoined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>참가 확정</span>
        )}
        <ChevronRight />
      </div>
    </div>
  );
}

// ─── 2. 공지 아이템 ─────────────────────────────────────────────────────────

function NoticeItem({ post, onClick }) {
  const d = new Date(post.createdAt);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
  const preview = post.content?.length > 40 ? post.content.slice(0, 40) + '…' : post.content;

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', cursor: 'pointer' }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-background)', lineHeight: 1.35 }}>
          {post.title}
        </div>
        <div style={{ fontSize: 13, color: '#7b8fc4', marginTop: 3, lineHeight: 1.4 }}>
          {preview || `${dateStr} · ${post.author?.nickname || post.author?.name || '운영진'}`}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard (메인) ─────────────────────────────────────────────────────────

function Dashboard() {
  const { user, bookings, posts } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.reset) window.history.replaceState({}, document.title);
  }, [location]);

  // 예정 라운딩
  const upcomingBookings = (bookings || [])
    .filter(b => {
      if (!isBookingActive(b)) return false;
      const participants = parseParticipants(b.participants);
      return participants.some(p => p.phone === user?.phone);
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  // 메인 배너 공지
  const featuredPost = (posts || []).find(p => p.isFeatured && p.isActive !== false) || null;

  // 공지사항 (배너에 뜬 글 제외)
  const activeNotices = (posts || [])
    .filter(p => p.isActive !== false && !p.isFeatured)
    .slice(0, 3);

  const displayName = user?.nickname || user?.name || '골퍼';

  return (
    <div style={{
      background: 'var(--background)',
      minHeight: '100dvh',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* ── 헤더 ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProfileBadge user={user} size={34} />
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--on-background)',
            letterSpacing: '-0.01em',
          }}>
            3355 골프클럽
          </span>
        </div>
        <button
          style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--on-background)', opacity: 0.65 }}
          aria-label="알림"
        >
          <BellIcon />
        </button>
      </div>

      {/* ── 환영 헤드라인 ── */}
      <div style={{ padding: '8px 20px 16px' }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(22px, 6vw, 28px)',
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          color: 'var(--on-background)',
          margin: 0,
        }}>
          환영합니다, {displayName}님
        </h1>
      </div>

      {/* ── 메인 배너 공지 ── */}
      {featuredPost && (
        <FeaturedBanner
          post={featuredPost}
          onClick={() => navigate('/board')}
        />
      )}

      {/* ── 나의 라운딩 ── */}
      <div style={{ padding: '0 20px 28px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--on-background)',
            margin: 0,
          }}>
            나의 라운딩
          </h2>
          <button
            onClick={() => navigate('/booking')}
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
          >
            전체보기 →
          </button>
        </div>

        {upcomingBookings.length === 0 ? (
          <div
            onClick={() => navigate('/booking')}
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 16,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>⛳</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>예정된 라운딩이 없습니다</div>
            <div style={{
              display: 'inline-block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--primary)',
              borderBottom: '1px solid var(--primary)',
              paddingBottom: 1,
            }}>
              라운딩 예약하기 →
            </div>
          </div>
        ) : (
          upcomingBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              user={user}
              onClick={() => navigate('/booking')}
            />
          ))
        )}
      </div>

      {/* ── 공지사항 ── */}
      {activeNotices.length > 0 && (
        <div style={{ padding: '0 20px 28px' }}>
          <div style={{
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E8ECF0',
            padding: '20px 20px 12px',
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                공지사항
              </h2>
              <button
                onClick={() => navigate('/board')}
                style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
              >
                전체보기 →
              </button>
            </div>

            {/* 아이템 목록 */}
            {activeNotices.map(post => (
              <NoticeItem
                key={post.id}
                post={post}
                onClick={() => navigate('/board', { state: { openPostId: post.id } })}
              />
            ))}
          </div>
        </div>
      )}

      {/* 하단 네비게이션 여백 */}
      <div style={{ height: 'max(80px, calc(70px + env(safe-area-inset-bottom)))' }} />
    </div>
  );
}

export default memo(Dashboard);
