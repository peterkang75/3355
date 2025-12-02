import React, { useState, useEffect } from 'react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [browser, setBrowser] = useState('other');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    
    let detectedBrowser = 'other';
    if (/crios/.test(ua)) {
      detectedBrowser = 'chrome-ios';
    } else if (/fxios/.test(ua)) {
      detectedBrowser = 'firefox-ios';
    } else if (/edgios/.test(ua)) {
      detectedBrowser = 'edge-ios';
    } else if (/opios|opr/.test(ua)) {
      detectedBrowser = 'opera-ios';
    } else if (/samsungbrowser/.test(ua)) {
      detectedBrowser = 'samsung';
    } else if (/chrome/.test(ua) && !/edg/.test(ua)) {
      detectedBrowser = 'chrome';
    } else if (/edg/.test(ua)) {
      detectedBrowser = 'edge';
    } else if (/firefox/.test(ua)) {
      detectedBrowser = 'firefox';
    } else if (/safari/.test(ua) && /iphone|ipad|ipod/.test(ua)) {
      detectedBrowser = 'safari-ios';
    } else if (/safari/.test(ua)) {
      detectedBrowser = 'safari-mac';
    }
    
    setBrowser(detectedBrowser);
    
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    if (checkStandalone) {
      return;
    }

    const dismissedTime = localStorage.getItem('installPromptDismissedTime');
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const shouldShowAgain = !dismissedTime || (Date.now() - parseInt(dismissedTime)) > SEVEN_DAYS;

    let promptShown = false;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (shouldShowAgain && !promptShown) {
        promptShown = true;
        setTimeout(() => setShowPrompt(true), 1000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    const needsManualInstall = ['safari-ios', 'safari-mac', 'chrome-ios', 'firefox-ios', 'edge-ios', 'opera-ios'].includes(detectedBrowser);
    
    if (needsManualInstall && shouldShowAgain && !promptShown) {
      promptShown = true;
      setTimeout(() => setShowPrompt(true), 1000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    const needsManualInstall = ['safari-ios', 'safari-mac', 'chrome-ios', 'firefox-ios', 'edge-ios', 'opera-ios'].includes(browser);
    
    if (needsManualInstall) {
      setShowBrowserGuide(true);
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

  const getBrowserGuide = () => {
    switch (browser) {
      case 'safari-ios':
        return {
          title: 'Safari에서 앱 설치',
          steps: [
            { icon: 'share', text: '하단의 공유 버튼(□↑)을 탭하세요' },
            { icon: 'add', text: '"홈 화면에 추가"를 선택하세요' },
            { icon: 'confirm', text: '우측 상단 "추가"를 탭하세요' }
          ]
        };
      case 'chrome-ios':
        return {
          title: 'Chrome에서 앱 설치',
          steps: [
            { icon: 'menu', text: '우측 상단 ⋯ 메뉴를 탭하세요' },
            { icon: 'add', text: '"홈 화면에 추가"를 선택하세요' },
            { icon: 'confirm', text: '"추가"를 탭하면 완료!' }
          ]
        };
      case 'firefox-ios':
        return {
          title: 'Firefox에서 앱 설치',
          steps: [
            { icon: 'menu', text: '하단의 ≡ 메뉴를 탭하세요' },
            { icon: 'share', text: '"공유" 버튼을 탭하세요' },
            { icon: 'add', text: '"홈 화면에 추가"를 선택하세요' }
          ]
        };
      case 'edge-ios':
        return {
          title: 'Edge에서 앱 설치',
          steps: [
            { icon: 'menu', text: '하단의 ⋯ 메뉴를 탭하세요' },
            { icon: 'share', text: '"공유"를 탭하세요' },
            { icon: 'add', text: '"홈 화면에 추가"를 선택하세요' }
          ]
        };
      case 'safari-mac':
        return {
          title: 'Safari에서 앱 설치',
          steps: [
            { icon: 'menu', text: '파일 → 독에 추가를 선택하세요' },
            { icon: 'confirm', text: '"추가"를 클릭하면 완료!' }
          ]
        };
      default:
        return {
          title: '앱 설치 방법',
          steps: [
            { icon: 'menu', text: '브라우저 메뉴를 열어주세요' },
            { icon: 'add', text: '"홈 화면에 추가" 또는 "앱 설치"를 찾아주세요' },
            { icon: 'confirm', text: '확인을 누르면 설치 완료!' }
          ]
        };
    }
  };

  const getIconSvg = (type) => {
    switch (type) {
      case 'share':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L12 15M12 3L8 7M12 3L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'menu':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="2" fill="white"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
            <circle cx="12" cy="19" r="2" fill="white"/>
          </svg>
        );
      case 'add':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2"/>
            <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'confirm':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9 17L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  if (isStandalone) {
    return null;
  }

  const guide = getBrowserGuide();

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
                {deferredPrompt ? '지금 설치하기' : '설치 방법 보기'}
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

      {showBrowserGuide && (
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
              {guide.title}
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
              gap: '16px',
              maxWidth: '320px',
              width: '100%'
            }}>
              {guide.steps.map((step, index) => (
                <div key={index} style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: index === guide.steps.length - 1 ? '#34C759' : '#007AFF',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getIconSvg(step.icon)}
                  </div>
                  <div>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '12px',
                      marginBottom: '4px'
                    }}>
                      STEP {index + 1}
                    </div>
                    <div style={{ 
                      color: 'white', 
                      fontSize: '15px', 
                      fontWeight: '500',
                      lineHeight: '1.4'
                    }}>
                      {step.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '14px 20px',
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
                설치 후 앱처럼 사용할 수 있습니다
              </div>
            </div>

            <button
              onClick={() => {
                setShowBrowserGuide(false);
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
