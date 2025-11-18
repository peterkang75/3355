import React from 'react';
import adminIcon from '../assets/role-admin.png';
import bangjangIcon from '../assets/role-bangjang.png';
import staffIcon from '../assets/role-staff.png';
import clubStaffIcon from '../assets/role-club-staff.png';

function CrownIcon({ role, size = 18 }) {
  const getIcon = () => {
    switch(role) {
      case '관리자':
        return adminIcon;
      case '방장':
        return bangjangIcon;
      case '운영진':
        return staffIcon;
      case '클럽운영진':
        return clubStaffIcon;
      default:
        return null;
    }
  };

  const icon = getIcon();

  if (!icon) return null;

  return (
    <img 
      src={icon} 
      alt={role}
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-block', 
        verticalAlign: 'middle',
        borderRadius: '50%'
      }} 
    />
  );
}

export default CrownIcon;
