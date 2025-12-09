import React from 'react';
import theme from '../../styles/theme';

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
        return {
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          color: '#FFFFFF',
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: `1px solid ${theme.colors.primary}`,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.danger,
          color: '#FFFFFF',
          border: 'none',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.text_sub,
          border: 'none',
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
          border: 'none',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '8px 12px',
          fontSize: theme.typography.fontSize.sm,
          minHeight: '32px',
        };
      case 'md':
        return {
          padding: '10px 16px',
          fontSize: theme.typography.fontSize.md,
          minHeight: '44px',
        };
      case 'lg':
        return {
          padding: '14px 24px',
          fontSize: theme.typography.fontSize.lg,
          minHeight: '52px',
        };
      default:
        return {
          padding: '10px 16px',
          fontSize: theme.typography.fontSize.md,
          minHeight: '44px',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variantStyles,
        ...sizeStyles,
        width: fullWidth ? '100%' : 'auto',
        borderRadius: theme.borderRadius.md,
        fontWeight: theme.typography.fontWeight.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        fontFamily: theme.typography.fontFamily,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
