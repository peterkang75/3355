import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import defaultLogoImage from '../assets/logo-new.png';
import LoadingButton from '../components/LoadingButton';

function Login({ onLogin }) {
  const { members, clubLogo } = useApp();
  const logoImage = clubLogo || defaultLogoImage;
  const navigate = useNavigate();
  const [phoneLastSix, setPhoneLastSix] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setError('');

    if (phoneLastSix.length !== 6 || !/^\d+$/.test(phoneLastSix)) {
      setError('전화번호 끝 6자리를 정확히 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);

    const foundMember = members.find(m => {
      const memberLastSix = String(m.phone).slice(-6);
      return memberLastSix === phoneLastSix;
    });

    if (!foundMember) {
      setError('등록되지 않은 전화번호입니다. 회원가입을 먼저 진행해주세요.');
      setIsLoggingIn(false);
      return;
    }

    if (foundMember.isActive === false) {
      setError('비활성화된 계정입니다. 관리자에게 문의하세요.');
      setIsLoggingIn(false);
      return;
    }

    if (foundMember.approvalStatus === 'pending') {
      setError('회원가입 승인 대기 중입니다. 운영진의 승인을 기다려주세요.');
      setIsLoggingIn(false);
      return;
    }

    if (foundMember.approvalStatus === 'rejected') {
      setError('회원가입이 거부되었습니다. 관리자에게 문의하세요.');
      setIsLoggingIn(false);
      return;
    }

    onLogin(foundMember);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(160deg, #0047AB 0%, #1565c0 50%, #0d47a1 100%)',
      padding: '24px 20px',
      paddingTop: 'max(24px, env(safe-area-inset-top))',
      paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '36px 28px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src={logoImage}
            alt="3355 골프 클럽 로고"
            style={{ width: 88, height: 88, marginBottom: 16, objectFit: 'cover', borderRadius: '50%', border: '3px solid #eff6ff' }}
          />
          <h1 style={{ fontSize: 22, color: 'var(--on-background)', marginBottom: 6, fontWeight: 800, letterSpacing: '-0.03em' }}>
            3355 골프모임
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            Love golf, Love people
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              전화번호 끝 6자리
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={phoneLastSix}
              onChange={(e) => setPhoneLastSix(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="예: 123456"
              maxLength={6}
              style={{
                fontSize: 22,
                textAlign: 'center',
                letterSpacing: 4,
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px',
                fontWeight: 700,
              }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={isLoggingIn}
            loadingText="로그인 중..."
            style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >
            로그인
          </LoadingButton>
        </form>

        <button
          onClick={() => navigate('/join')}
          style={{ width: '100%', marginTop: 12, padding: '14px', background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          처음이신가요? 회원가입 →
        </button>
      </div>
    </div>
  );
}

export default Login;
