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
        backgroundColor: '#FFFFFF',
        borderRadius: theme.borderRadius.xl,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 8px 16px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
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
