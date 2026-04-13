import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsOperator } from '../utils';

/* ─── 아이콘 SVG (dual-tone: inactive=outline / active=filled) ─── */

const HomeIcon = ({ active }) => {
  const c = active ? 'var(--primary)' : '#94A3B8';
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10L12 3L21 10V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10Z"
        fill={active ? 'var(--primary)' : 'none'}
        stroke={c}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const GolfIcon = ({ active }) => {
  const c = active ? 'var(--primary)' : '#94A3B8';
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      {/* 깃대 */}
      <line x1="8" y1="3" x2="8" y2="21" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      {/* 깃발 (삼각형 — active 시 채워짐) */}
      <path
        d="M8 4L19 8.5L8 13Z"
        fill={active ? 'var(--primary)' : 'none'}
        stroke={c}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* 땅 */}
      <path d="M5 21H11" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

const FeesIcon = ({ active }) => {
  const c = active ? 'var(--primary)' : '#94A3B8';
  const inner = active ? 'white' : c;
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5"
        fill={active ? 'var(--primary)' : 'none'}
        stroke={c}
        strokeWidth="2.2"
      />
      {/* $ 기호 */}
      <line x1="12" y1="6.5" x2="12" y2="7.8" stroke={inner} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="16.2" x2="12" y2="17.5" stroke={inner} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10 10C10 9.17 10.67 8.5 11.5 8.5H12.5C13.33 8.5 14 9.17 14 10C14 10.83 13.33 11.5 12.5 11.5H11.5C10.67 11.5 10 12.17 10 13C10 13.83 10.67 14.5 11.5 14.5H12.5C13.33 14.5 14 13.83 14 13"
        stroke={inner}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

const GearIcon = ({ active }) => {
  const c = active ? 'var(--primary)' : '#94A3B8';
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.33 4.32c.43-1.77 2.91-1.77 3.34 0a1.72 1.72 0 0 0 2.57 1.07c1.54-.94 3.31.83 2.37 2.37a1.72 1.72 0 0 0 1.07 2.57c1.77.43 1.77 2.91 0 3.34a1.72 1.72 0 0 0-1.07 2.57c.94 1.54-.83 3.31-2.37 2.37a1.72 1.72 0 0 0-2.57 1.07c-.43 1.77-2.91 1.77-3.34 0a1.72 1.72 0 0 0-2.57-1.07c-1.54.94-3.31-.83-2.37-2.37a1.72 1.72 0 0 0-1.07-2.57c-1.77-.43-1.77-2.91 0-3.34a1.72 1.72 0 0 0 1.07-2.57c-.94-1.54.83-3.31 2.37-2.37a1.72 1.72 0 0 0 2.57-1.07z"
        fill={active ? 'var(--primary)' : 'none'}
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12" cy="12" r="3"
        fill={active ? 'white' : 'none'}
        stroke={active ? 'transparent' : c}
        strokeWidth="2.2"
      />
    </svg>
  );
};

const GridIcon = ({ active }) => {
  const c = active ? 'var(--primary)' : '#94A3B8';
  const f = active ? 'var(--primary)' : 'none';
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={f} stroke={c} strokeWidth="2.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={f} stroke={c} strokeWidth="2.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={f} stroke={c} strokeWidth="2.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill={f} stroke={c} strokeWidth="2.2" />
    </svg>
  );
};

/* ─── NavItem ─── */

function NavItem({ href, label, active, onClick, children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 4px 5px',
        textDecoration: 'none',
        color: active ? 'var(--primary)' : '#94A3B8',
        fontWeight: active ? 700 : 500,
        fontSize: 10,
        gap: 4,
        minHeight: 52,
        WebkitTapHighlightColor: 'transparent',
        transition: 'color 0.18s',
      }}
    >
      {children}
      <span style={{ letterSpacing: '-0.01em', lineHeight: 1 }}>{label}</span>
    </a>
  );
}

/* ─── Navigation ─── */

function Navigation({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (e, path) => {
    e.preventDefault();
    if (location.pathname === path) {
      navigate(path, { replace: true, state: { reset: true } });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path, { state: { reset: true } });
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 100);
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isMenuActive = isActive('/menu') || isActive('/games') || isActive('/about');

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      maxWidth: 'var(--layout-max)',
      margin: '0 auto',
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      display: 'flex',
      justifyContent: 'space-around',
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 20px rgba(0,71,171,0.06)',
      zIndex: 1000,
    }}>
      <NavItem href="/" label="홈" active={isActive('/')} onClick={(e) => handleNavClick(e, '/')}>
        <HomeIcon active={isActive('/')} />
      </NavItem>

      <NavItem href="/booking" label="라운딩" active={isActive('/booking')} onClick={(e) => handleNavClick(e, '/booking')}>
        <GolfIcon active={isActive('/booking')} />
      </NavItem>

      <NavItem href="/fees" label="참가비" active={isActive('/fees')} onClick={(e) => handleNavClick(e, '/fees')}>
        <FeesIcon active={isActive('/fees')} />
      </NavItem>

      {checkIsOperator(user) && (
        <NavItem href="/admin" label="관리" active={isActive('/admin')} onClick={(e) => handleNavClick(e, '/admin')}>
          <GearIcon active={isActive('/admin')} />
        </NavItem>
      )}

      <NavItem href="/menu" label="더보기" active={isMenuActive} onClick={(e) => handleNavClick(e, '/menu')}>
        <GridIcon active={isMenuActive} />
      </NavItem>
    </nav>
  );
}

export default Navigation;
