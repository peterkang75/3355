import React from 'react';
import logoImage from '../assets/logo.jpeg';

function About() {
  const handleFeedback = () => {
    window.open('https://open.kakao.com/o/sBvflSoh', '_blank');
  };

  const handleBugReport = () => {
    window.open('https://open.kakao.com/o/sBvflSoh', '_blank');
  };

  const handlePraiseDeveloper = () => {
    alert('개발자가 매우 기뻐합니다! 🎉\n감사합니다!');
    window.open('https://open.kakao.com/o/sBvflSoh', '_blank');
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="header">
        <h1>About</h1>
      </div>

      <div className="content">
        <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
          <img 
            src={logoImage} 
            alt="3355 골프 클럽 로고" 
            style={{ 
              width: '100px', 
              height: '100px', 
              marginBottom: '16px',
              objectFit: 'cover',
              borderRadius: '50%'
            }} 
          />
          <h2 style={{ 
            fontSize: '22px', 
            color: 'var(--primary-green)',
            marginBottom: '8px',
            fontWeight: '700'
          }}>
            3355 골프모임
          </h2>
          <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
            Version 1.0.0
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Build 20251116
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            주요 기능
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9 }}>
            • 회원관리<br/>
            • 라운딩 관리<br/>
            <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
              - 라운딩 생성 (정기모임, 스트라컴)<br/>
              - 참가신청, 번호대여(스트라컴)<br/>
              - 조편성<br/>
              - 스코어 입력, 리더보드<br/>
              - 순위집계<br/>
              - 하우스 핸디 자동 생성
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-green)' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            예정된 업데이트
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9 }}>
            • 회비관리<br/>
            • 실시간 스코어 입력 (Miscore 와 동일 UI)
          </div>
        </div>

        <div className="card">
          <button
            onClick={handleFeedback}
            className="btn-primary"
            style={{ marginBottom: '12px', width: '100%' }}
          >
            📝 피드백 보내기
          </button>
          <button
            onClick={handleBugReport}
            className="btn-primary"
            style={{ 
              marginBottom: '12px', 
              width: '100%',
              background: '#FF9800',
              borderBottom: '3px solid #F57C00'
            }}
          >
            🐛 버그 신고
          </button>
          <button
            onClick={handlePraiseDeveloper}
            className="btn-primary"
            style={{ 
              width: '100%',
              background: 'var(--primary-green)',
              borderBottom: '3px solid var(--primary-dark)'
            }}
          >
            👏 개발자 찬양하기
          </button>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            개발자 정보
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '12px' }}>
            동백
          </div>
          <a 
            href="https://open.kakao.com/o/sBvflSoh" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#FEE500',
              color: '#000',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            💬 카카오톡으로 문의하기
          </a>
        </div>

        <div className="card" style={{ background: 'var(--bg-green)' }}>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.7 }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>개인정보 처리방침</strong><br/>
              그딴거 없음
            </div>
            <div>
              <strong>이용약관</strong><br/>
              그런것도 없음
            </div>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          fontSize: '12px', 
          opacity: 0.5,
          marginTop: '20px',
          padding: '20px'
        }}>
          Made with ❤️ by 동백
        </div>
      </div>
    </div>
  );
}

export default About;
