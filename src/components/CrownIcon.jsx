import React from 'react';

function CrownIcon({ role, size = 18 }) {
  const getColor = () => {
    switch(role) {
      case '관리자':
        return '#1F2937';
      case '방장':
        return '#3B82F6';
      case '운영진':
        return '#EC4899';
      case '클럽운영진':
        return '#8B5CF6';
      default:
        return 'transparent';
    }
  };

  const color = getColor();

  if (color === 'transparent') return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path
        d="M12 2L15 8L21 9L16.5 13.5L17.5 19.5L12 16.5L6.5 19.5L7.5 13.5L3 9L9 8L12 2Z"
        fill={color}
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2L14 6L18 7L15 10L15.8 14L12 12L8.2 14L9 10L6 7L10 6L12 2Z"
        fill={color}
        opacity="0.8"
      />
      <circle cx="12" cy="8" r="1.5" fill="white" opacity="0.9" />
      <circle cx="9" cy="10" r="1" fill="white" opacity="0.7" />
      <circle cx="15" cy="10" r="1" fill="white" opacity="0.7" />
    </svg>
  );
}

export default CrownIcon;
