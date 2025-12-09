import React from 'react';
import theme from '../../styles/theme';

function Badge({
  children,
  variant = 'default',
  size = 'sm',
  style = {},
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          color: '#FFFFFF',
        };
      case 'success':
        return {
          backgroundColor: '#10B981',
          color: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          color: '#FFFFFF',
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.danger,
          color: '#FFFFFF',
        };
      case 'info':
        return {
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
        };
      case 'purple':
        return {
          backgroundColor: '#8B5CF6',
          color: '#FFFFFF',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: `1px solid ${theme.colors.primary}`,
        };
      default:
        return {
          backgroundColor: theme.colors.border,
          color: theme.colors.text_main,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return {
          padding: '2px 6px',
          fontSize: '10px',
        };
      case 'sm':
        return {
          padding: '3px 8px',
          fontSize: '11px',
        };
      case 'md':
        return {
          padding: '4px 10px',
          fontSize: '12px',
        };
      default:
        return {
          padding: '3px 8px',
          fontSize: '11px',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <span
      style={{
        ...variantStyles,
        ...sizeStyles,
        borderRadius: theme.borderRadius.sm,
        fontWeight: theme.typography.fontWeight.semibold,
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
