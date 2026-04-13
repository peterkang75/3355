import React from 'react';

function Badge({
  children,
  variant = 'default',
  size = 'sm',
  style = {},
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--primary)', color: '#FFFFFF' };
      case 'secondary':
        return { backgroundColor: 'var(--secondary)', color: '#FFFFFF' };
      case 'success':
        return { backgroundColor: '#10B981', color: '#FFFFFF' };
      case 'warning':
        return { backgroundColor: '#F59E0B', color: '#FFFFFF' };
      case 'danger':
        return { backgroundColor: 'var(--error)', color: '#FFFFFF' };
      case 'info':
        return { backgroundColor: '#3B82F6', color: '#FFFFFF' };
      case 'purple':
        return { backgroundColor: '#8B5CF6', color: '#FFFFFF' };
      case 'outline':
        return { backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' };
      default:
        return { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-background)' };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return { padding: '2px 6px', fontSize: '10px' };
      case 'md':
        return { padding: '4px 10px', fontSize: '12px' };
      default:
        return { padding: '3px 8px', fontSize: '11px' };
    }
  };

  return (
    <span
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        borderRadius: 'var(--radius-sm)',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
