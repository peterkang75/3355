import React from 'react';
import theme from '../../styles/theme';

function Card({ 
  children, 
  padding = theme.spacing.cardPadding,
  style = {},
  onClick,
  className = ''
}) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        backgroundColor: theme.colors.bg_card,
        borderRadius: theme.borderRadius.xl,
        boxShadow: theme.shadows.md,
        padding: padding,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export default Card;
