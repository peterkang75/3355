import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileBadge from './ProfileBadge';

const ROOT_PATHS = ['/', '/booking', '/fees', '/mypage', '/admin', '/board', '/menu'];

const ChevronLeftIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

// 루트 페이지에서 사용하는 대시보드형 헤더
function RootHeader({ title, user, rightContent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px 10px',
      paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
      background: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      boxShadow: '0 1px 0 rgba(0,71,171,0.07)',
    }}>
      <span style={{
        fontSize: 17,
        fontWeight: 800,
        color: 'var(--on-background)',
        letterSpacing: '-0.03em',
      }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightContent}
        {user && (
          <>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--on-background)',
              letterSpacing: '-0.02em',
            }}>
              {user.nickname || user.name}
            </span>
            <ProfileBadge user={user} size={34} />
          </>
        )}
      </div>
    </div>
  );
}

// 서브 페이지에서 사용하는 뒤로가기 헤더
function SubHeader({ title, rightContent, onBack, user }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px 0 4px',
      paddingTop: 'env(safe-area-inset-top)',
      background: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      height: 'calc(56px + env(safe-area-inset-top))',
      boxShadow: '0 1px 0 rgba(0,71,171,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: 6 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 6px', display: 'flex', alignItems: 'center',
            color: 'var(--on-background)', minWidth: 36, minHeight: 44, flexShrink: 0,
          }}
        >
          <ChevronLeftIcon />
        </button>
        {user && <ProfileBadge user={user} size={30} />}
        <span style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--on-background)',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </span>
      </div>
      {rightContent && (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}

function PageHeader({
  title,
  rightContent = null,
  leftContent = null,
  onBack = null,
  showBackButton = null,
  variant = 'default',
  user = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isRootPath = ROOT_PATHS.includes(location.pathname);
  const shouldShowBack = showBackButton !== null ? showBackButton : !isRootPath;

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  // club variant (대시보드 다크헤더)
  if (variant === 'club') {
    return (
      <div className="header header-club" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 12, gap: 8 }}>
        {leftContent && <div style={{ display: 'flex', alignItems: 'center' }}>{leftContent}</div>}
        <h1 style={{ flex: 1, fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>{title}</h1>
        {rightContent && <div style={{ display: 'flex', alignItems: 'center' }}>{rightContent}</div>}
      </div>
    );
  }

  // 루트 페이지: 대시보드형 헤더
  if (!shouldShowBack) {
    return <RootHeader title={title} user={user} rightContent={rightContent} />;
  }

  // 서브 페이지: 뒤로가기 헤더
  return <SubHeader title={title} rightContent={rightContent} onBack={handleBack} user={user} />;
}

export default PageHeader;
