import React from 'react';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  style = {},
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--primary)', color: '#FFFFFF', border: 'none' };
      case 'secondary':
        return { backgroundColor: 'var(--secondary)', color: '#FFFFFF', border: 'none' };
      case 'outline':
        return { backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' };
      case 'danger':
        return { backgroundColor: 'var(--error)', color: '#FFFFFF', border: 'none' };
      case 'outline-danger':
        return { backgroundColor: '#FFFFFF', color: '#DC2626', border: '1px solid #DC2626' };
      case 'outline-secondary':
        return { backgroundColor: '#FFFFFF', color: '#B8860B', border: '1px solid #B8860B' };
      case 'ghost':
        return { backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none' };
      default:
        return { backgroundColor: 'var(--primary)', color: '#FFFFFF', border: 'none' };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '8px 12px', fontSize: '12px', minHeight: '32px' };
      case 'lg':
        return { padding: '14px 24px', fontSize: '16px', minHeight: '52px' };
      default:
        return { padding: '10px 16px', fontSize: '14px', minHeight: '44px' };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        width: fullWidth ? '100%' : 'auto',
        borderRadius: 'var(--radius-md)',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
