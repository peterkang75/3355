import React, { useState } from 'react';

function Login({ onLogin }) {
  const [phoneLastSix, setPhoneLastSix] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (phoneLastSix.length !== 6 || !/^\d+$/.test(phoneLastSix)) {
      setError('전화번호 끝 6자리를 정확히 입력해주세요.');
      return;
    }

    const mockMembers = [
      { id: '123456', name: '관리자', phone: '0100123456', isAdmin: true, handicap: 18, balance: 0 },
      { id: '111111', name: '회원1', phone: '0100111111', isAdmin: false, handicap: 20, balance: -50000 },
      { id: '222222', name: '회원2', phone: '0100222222', isAdmin: false, handicap: 15, balance: 0 }
    ];

    const foundMember = mockMembers.find(m => m.id === phoneLastSix);

    const mockUser = foundMember || {
      id: phoneLastSix,
      phone: '0100' + phoneLastSix,
      name: '회원',
      isAdmin: false,
      handicap: 18,
      balance: 0
    };

    onLogin(mockUser);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #2d5f3f 0%, #3a7d54 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px 30px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛳</div>
          <h1 style={{ 
            fontSize: '24px', 
            color: 'var(--primary-green)',
            marginBottom: '8px',
            fontWeight: '700'
          }}>
            골프 모임 관리
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            전화번호 끝 6자리로 로그인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-dark)'
            }}>
              전화번호 끝 6자리
            </label>
            <input
              type="text"
              value={phoneLastSix}
              onChange={(e) => setPhoneLastSix(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="예: 123456"
              maxLength={6}
              style={{
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '2px'
              }}
            />
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary">
            로그인
          </button>
        </form>

        <div style={{ 
          marginTop: '24px', 
          padding: '16px',
          background: 'var(--bg-green)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#666'
        }}>
          <p style={{ marginBottom: '8px' }}>💡 테스트 계정:</p>
          <p>관리자: <strong>123456</strong></p>
          <p>일반회원: <strong>아무 6자리 숫자</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
