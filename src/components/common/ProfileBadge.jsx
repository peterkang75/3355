import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CrownIcon from '../CrownIcon';
import { useApp } from '../../contexts/AppContext';

function ProfileBadge({ user, showGreeting = false, size = 36 }) {
  const navigate = useNavigate();
  const { members, login } = useApp();
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  
  if (!user) return null;

  const isAdmin = user.isAdmin || user.role === '관리자';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
        setSearchTerm('');
      }
    };

    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMemberDropdown]);

  const handleMemberSelect = (member) => {
    try {
      login(member);
      setShowMemberDropdown(false);
      setSearchTerm('');
      window.location.reload();
    } catch (error) {
      console.error('로그인 전환 실패:', error);
      alert('로그인 전환에 실패했습니다.');
    }
  };

  const filteredMembers = members?.filter(m => 
    (m.nickname || m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  ) || [];

  const handleNameClick = (e) => {
    if (isAdmin) {
      e.stopPropagation();
      setShowMemberDropdown(!showMemberDropdown);
    } else {
      navigate('/mypage');
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        position: 'relative'
      }}
    >
      {showGreeting && (
        <div 
          style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: 'var(--text-light)',
            cursor: isAdmin ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={handleNameClick}
        >
          환영합니다 <span style={{ 
            textDecoration: isAdmin ? 'underline' : 'none',
            textDecorationStyle: 'dotted'
          }}>{user.nickname || user.name}</span>님
          {isAdmin && (
            <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
          )}
        </div>
      )}
      
      <div 
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => navigate('/mypage')}
      >
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

      {isAdmin && showMemberDropdown && (
        <div 
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            width: '280px',
            maxHeight: '400px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ 
              fontSize: '12px', 
              color: '#6B7280', 
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              🔧 개발자 모드: 회원 전환
            </div>
            <input
              type="text"
              placeholder="이름 또는 전화번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
              autoFocus
            />
          </div>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            padding: '8px'
          }}>
            {filteredMembers.length === 0 ? (
              <div style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#9CA3AF',
                fontSize: '14px'
              }}>
                검색 결과가 없습니다
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: member.id === user.id ? '#D1FAE5' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (member.id !== user.id) {
                      e.currentTarget.style.background = '#F3F4F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (member.id !== user.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--primary-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '12px',
                    flexShrink: 0
                  }}>
                    {member.photo ? (
                      <img 
                        src={member.photo} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span>{(member.nickname || member.name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {member.nickname || member.name}
                      {member.id === user.id && (
                        <span style={{ 
                          fontSize: '10px', 
                          background: 'var(--primary-green)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>현재</span>
                      )}
                      {member.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(member.role) && (
                        <CrownIcon role={member.role} size={14} />
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#9CA3AF',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {member.phone.slice(-4)} · {member.role || '회원'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileBadge;
