import React, { useState, useEffect } from 'react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS에서 이미 standalone 모드인지 확인
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone;
    
    if (isStandalone) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOS 사용자를 위한 안내
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('iOS에서 설치하려면:\n1. 공유 버튼(📤)을 탭하세요\n2. "홈 화면에 추가"를 선택하세요');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // 사용자가 이전에 닫았는지 확인
  const wasDismissed = localStorage.getItem('installPromptDismissed');
  
  if (!showPrompt || wasDismissed) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '568px',
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <img 
        src="/app-icon.png" 
        alt="앱 아이콘" 
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#193C40',
          marginBottom: '4px'
        }}>
          3355 골프 클럽 앱 설치
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#666'
        }}>
          홈 화면에 추가하여 더 편리하게 사용하세요
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        style={{
          background: '#193C40',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        설치
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: '20px',
          color: '#999',
          cursor: 'pointer',
          padding: '4px',
          flexShrink: 0
        }}
      >
        ✕
      </button>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default InstallPrompt;
