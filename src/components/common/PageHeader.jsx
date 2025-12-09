import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROOT_PATHS = ['/', '/booking', '/fees', '/mypage', '/admin'];

const ChevronLeftIcon = () => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

function PageHeader({ 
  title, 
  rightContent = null,
  onBack = null,
  showBackButton = null,
  variant = 'dark'
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isRootPath = ROOT_PATHS.includes(location.pathname);
  const shouldShowBack = showBackButton !== null ? showBackButton : !isRootPath;
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const isDark = variant === 'dark';
  
  return (
    <div 
      className={isDark ? 'header' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        padding: isDark ? undefined : '0 16px',
        background: isDark ? undefined : 'transparent',
        gap: '8px'
      }}
    >
      {shouldShowBack && (
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? 'var(--text-light)' : '#1A3D2F',
            minWidth: '32px'
          }}
        >
          <ChevronLeftIcon />
        </button>
      )}
      
      <h1 style={{ 
        flex: 1, 
        fontSize: '20px', 
        fontWeight: '800',
        color: isDark ? 'var(--text-light)' : '#1A3D2F',
        margin: 0,
        marginLeft: shouldShowBack ? '4px' : '0'
      }}>
        {title}
      </h1>
      
      {rightContent && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
