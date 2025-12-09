import React from 'react';

const Card = ({ children, style, padding = '20px', onClick, className = '', ...props }) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      border: '1px solid rgba(0,0,0,0.05)',
      padding: padding,
      marginBottom: '16px',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
    {...props}
  >
    {children}
  </div>
);

export default Card;
