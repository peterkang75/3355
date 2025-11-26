import React from 'react';

export default function LoadingButton({ 
  onClick, 
  loading = false, 
  disabled = false,
  children, 
  className = '',
  style = {},
  type = 'button',
  loadingText = '처리중...'
}) {
  const handleClick = async (e) => {
    if (loading || disabled) return;
    if (onClick) {
      await onClick(e);
    }
  };

  const baseStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: (loading || disabled) ? 0.7 : 1,
    cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
    ...style
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={loading || disabled}
      className={className}
      style={baseStyle}
    >
      {loading && (
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid transparent',
          borderTop: '2px solid currentColor',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      )}
      <span>{loading ? loadingText : children}</span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

export function LoadingOverlay({ show, message = '처리중...' }) {
  if (!show) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px 32px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e0e0e0',
          borderTop: '3px solid #2d5f3f',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: '#333', fontSize: '16px' }}>{message}</span>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
