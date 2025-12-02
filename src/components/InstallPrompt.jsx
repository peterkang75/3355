import React, { useState, useEffect } from 'react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
    
    setIsIOS(checkIOS);
    setIsStandalone(checkStandalone);

    if (checkStandalone) {
      return;
    }

    const dismissedTime = localStorage.getItem('installPromptDismissedTime');
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const shouldShowAgain = !dismissedTime || (Date.now() - parseInt(dismissedTime)) > SEVEN_DAYS;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (shouldShowAgain) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (checkIOS && shouldShowAgain) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissedTime', Date.now().toString());
  };

  const handleLater = () => {
    setShowPrompt(false);
    const ONE_DAY = 24 * 60 * 60 * 1000;
    localStorage.setItem('installPromptDismissedTime', (Date.now() - (6 * ONE_DAY)).toString());
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {showPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <img 
                src="/app-icon.png" 
                alt="앱 아이콘" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '700',
              color: '#1a1a2e',
              marginBottom: '8px'
            }}>
              3355 골프 앱 설치
            </h2>
            
            <p style={{ 
              fontSize: '14px', 
              color: '#666',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              홈 화면에 추가하면<br/>
              더 빠르고 편리하게 사용할 수 있습니다
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleInstallClick}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #2d5f3f 0%, #3a7d54 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>📲</span>
                {isIOS ? '설치 방법 보기' : '지금 설치하기'}
              </button>
              
              <button
                onClick={handleLater}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                나중에 하기
              </button>
              
              <button
                onClick={handleDismiss}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#999',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                일주일간 보지 않기
              </button>
            </div>
          </div>
        </div>
      )}

      {showIOSGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.3s ease-out',
          overflowY: 'auto'
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            minHeight: 'fit-content'
          }}>
            <h2 style={{ 
              color: 'white', 
              fontSize: '22px', 
              fontWeight: '700',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              iPhone/iPad 앱 설치 방법
            </h2>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '14px',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              아래 단계를 따라 홈 화면에 추가하세요
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxWidth: '320px',
              width: '100%'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: '#007AFF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>1</div>
                <div>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                    공유 버튼 탭하기
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.4' }}>
                    Safari 하단의 공유 버튼을 탭하세요
                  </div>
                  <div style={{
                    marginTop: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3L12 15M12 3L8 7M12 3L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ color: 'white', fontSize: '14px' }}>공유</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: '#007AFF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>2</div>
                <div>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                    "홈 화면에 추가" 선택
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.4' }}>
                    메뉴를 스크롤하여 "홈 화면에 추가"를 찾아 탭하세요
                  </div>
                  <div style={{
                    marginTop: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2"/>
                      <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ color: 'white', fontSize: '14px' }}>홈 화면에 추가</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: '#34C759',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>3</div>
                <div>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                    "추가" 버튼 탭
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.4' }}>
                    우측 상단의 "추가" 버튼을 탭하면 설치 완료!
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '30px',
              padding: '16px 24px',
              background: 'rgba(52, 199, 89, 0.2)',
              borderRadius: '12px',
              border: '1px solid rgba(52, 199, 89, 0.3)'
            }}>
              <div style={{ 
                color: '#34C759', 
                fontSize: '14px', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✓</span>
                설치 후 홈 화면에서 앱처럼 사용할 수 있습니다
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                setShowPrompt(false);
                handleDismiss();
              }}
              style={{
                marginTop: '24px',
                padding: '14px 40px',
                background: 'white',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            transform: scale(0.9);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default InstallPrompt;
