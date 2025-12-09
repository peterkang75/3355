import React from 'react';
import { useNavigate } from 'react-router-dom';
import CrownIcon from '../CrownIcon';

function ProfileBadge({ user, showGreeting = false, size = 36 }) {
  const navigate = useNavigate();
  
  if (!user) return null;

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        cursor: 'pointer'
      }}
      onClick={() => navigate('/mypage')}
    >
      {showGreeting && (
        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
          환영합니다 {user.nickname || user.name}님
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--primary-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          fontSize: `${Math.round(size * 0.39)}px`,
          border: '2px solid var(--border-color)'
        }}>
          {user.photo ? (
            <img 
              src={user.photo} 
              alt="프로필" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }} 
            />
          ) : (
            <span>{(user.nickname || user.name || '?').charAt(0)}</span>
          )}
        </div>
        {user.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            zIndex: 10
          }}>
            <CrownIcon role={user.role} size={Math.round(size * 0.44)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileBadge;
