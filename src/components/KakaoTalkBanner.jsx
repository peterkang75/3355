import React, { useState, useEffect } from 'react';

function KakaoTalkBanner() {
  const [visible, setVisible] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isKakao = /KAKAOTALK/i.test(ua);
    if (!isKakao) return;

    const lastDismissed = localStorage.getItem('kakaoBannerDismissed');
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < ONE_DAY) return;

    setIsAndroid(/android/i.test(ua));
    setVisible(true);
  }, []);

  const handleOpenExternal = () => {
    const url = window.location.href;
    if (isAndroid) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`;
    } else {
      try {
        navigator.clipboard.writeText(url).then(() => {
          alert('주소가 복사되었습니다.\nSafari를 열고 붙여넣기 해주세요.');
        });
      } catch {
        alert(`아래 주소를 Safari에 복사하여 열어주세요:\n${url}`);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('kakaoBannerDismissed', Date.now().toString());
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '12px',
      right: '12px',
      background: '#1B1B1B',
      color: 'white',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1098,
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{ fontSize: '22px', flexShrink: 0 }}>🌐</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
          카카오톡 브라우저 사용 중
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
          로그인 유지를 위해 외부 브라우저에서 열어주세요
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleOpenExternal}
          style={{
            padding: '8px 14px',
            background: '#0F766E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isAndroid ? 'Chrome으로 열기' : '주소 복사'}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default KakaoTalkBanner;
