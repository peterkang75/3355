import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { PageHeader } from '../components/common';
import defaultLogoImage from '../assets/logo-new.png';

/* ─── 아이콘 SVG ─── */
const TrophyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
    <path d="M6 9a6 6 0 0 0 12 0"/><path d="M12 15v4"/><path d="M8 19h8"/>
  </svg>
);
const DiceIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/>
    <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
  </svg>
);
const InfoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="8.01" strokeWidth="2.5"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

function Menu() {
  const navigate = useNavigate();
  const { user, featureSettings, members = [], clubLogo, logout } = useApp();
  const logoImage = clubLogo || defaultLogoImage;

  /* ─── 통계 계산 ─── */
  const activeMembers = members.filter(m =>
    m.isActive !== false &&
    m.approvalStatus !== 'pending' &&
    m.approvalStatus !== 'rejected'
  );
  const totalCount = activeMembers.length;

  // GA 우선, 없으면 houseHandy — 핸디캡 있는 사람만 평균
  const handicapValues = activeMembers
    .map(m => {
      const val = m.gaHandy || m.houseHandy;
      if (!val) return null;
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    })
    .filter(v => v !== null);
  const avgHandicap = handicapValues.length > 0
    ? (handicapValues.reduce((a, b) => a + b, 0) / handicapValues.length).toFixed(1)
    : '-';

  /* ─── 메뉴 항목 ─── */
  const allMenuItems = [
    {
      icon: <TrophyIcon />,
      iconBg: '#EFF6FF',
      iconColor: '#0047AB',
      title: '우승자 맞추기',
      description: '라운딩 우승자를 예측하고 투표하세요',
      path: '/games/pick-winner',
      featureKey: 'pickWinnerEnabled',
    },
    {
      icon: <DiceIcon />,
      iconBg: '#EFF6FF',
      iconColor: '#0047AB',
      title: '빙고 게임',
      description: '멤버들과 함께하는 빙고 게임',
      path: '/bingo',
    },
    {
      icon: <InfoIcon />,
      iconBg: '#EFF6FF',
      iconColor: '#0047AB',
      title: 'About',
      description: '앱 정보 및 버전',
      path: '/about',
    },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.featureKey && featureSettings?.[item.featureKey] === false) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <PageHeader title="더보기" user={user} />
    <div style={{ flex: 1, padding: '12px 0 80px' }}>

      {/* ─── 블루 히어로 카드 ─── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0047AB 0%, #1565c0 60%, #0d47a1 100%)',
          borderRadius: 20,
          padding: '20px 20px 20px',
          boxShadow: '0 8px 24px rgba(0,71,171,0.28)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* 로고 + 클럽명 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2.5px solid rgba(255,255,255,0.5)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={logoImage} alt="클럽 로고"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                3355 골프클럽
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: 500 }}>
                Love golf, Love people
              </div>
            </div>
          </div>

          {/* 통계 */}
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
            display: 'flex',
            overflow: 'hidden',
          }}>
            <div style={{ flex: 1, padding: '12px 16px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', marginBottom: 4 }}>
                총 회원수
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {totalCount}
                <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 2, color: 'rgba(255,255,255,0.75)' }}>명</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', marginBottom: 4 }}>
                회원 평균 핸디
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {avgHandicap === '-' ? '-' : avgHandicap}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 메뉴 항목 ─── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => navigate(item.path)}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: item.iconBg,
              color: item.iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>
                {item.description}
              </div>
            </div>
            <div style={{ color: '#CBD5E1', flexShrink: 0 }}>
              <ChevronRight />
            </div>
          </div>
        ))}
      </div>

      {/* ─── 고객 지원 ─── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4 }}>
          CUSTOMER SUPPORT
        </div>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {/* 자주 묻는 질문 → About 페이지 이동 */}
          <div
            onClick={() => navigate('/about')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/>
              </svg>
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#111827' }}>자주 묻는 질문</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          {/* 1:1 문의하기 → 카카오톡 오픈채팅 */}
          <a
            href="https://open.kakao.com/o/g7EaZjRh"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textDecoration: 'none', color: '#111827', WebkitTapHighlightColor: 'transparent' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>1:1 문의하기</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            </svg>
          </a>
        </div>
      </div>

      {/* ─── 로그아웃 ─── */}
      <div style={{ padding: '24px 16px 0', textAlign: 'center' }}>
        <button
          onClick={() => {
            if (window.confirm('로그아웃 하시겠습니까?')) logout();
          }}
          style={{
            background: 'none', border: 'none',
            color: '#EF4444', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', padding: '10px 24px',
          }}
        >
          로그아웃
        </button>
      </div>

    </div>
    </div>
  );
}

export default Menu;
