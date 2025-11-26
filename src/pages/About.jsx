import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import logoImage from '../assets/logo.jpeg';

function About() {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const handleContact = () => {
    window.open('https://open.kakao.com/o/sBvflSoh', '_blank');
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="header">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>About</h1>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
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
              <span>{(user.nickname || user.name).charAt(0)}</span>
            )}
          </div>
        </div>
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
            Build {__BUILD_NUMBER__}
          </div>
        </div>

        <div style={{ 
          height: '2px', 
          background: 'linear-gradient(to right, transparent, var(--primary-green), transparent)',
          margin: '20px 0'
        }} />

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            주요 기능
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '20px' }}>
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

          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            marginTop: '24px',
            color: 'var(--primary-green)'
          }}>
            예정된 업데이트
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '24px' }}>
            • 회비관리<br/>
            • 실시간 스코어 입력 (Miscore 와 동일 UI)
          </div>

          <button
            onClick={handleContact}
            className="btn-primary"
            style={{ 
              width: '100%',
              marginBottom: '24px',
              background: 'var(--primary-green)',
              borderBottom: '3px solid var(--primary-dark)'
            }}
          >
            💬 피드백, 버그신고, 동백님 찬양하기
          </button>

          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            개발자 정보
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '24px' }}>
            멋짐, 매력, 잘생김 뿜뿜 동백님
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.7, paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>개인정보 처리방침</strong><br/>
              그딴거 없음
            </div>
            <div>
              <strong>이용약관</strong><br/>
              그런것도 없음
            </div>
          </div>

          <div style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            opacity: 0.5,
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0,0,0,0.05)'
          }}>
            Made with ❤️ by 동백
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <button
            onClick={() => navigate('/bingo')}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(255, 165, 0, 0.4)',
              transition: 'transform 0.2s ease'
            }}
          >
            🎯 빙고 게임하기
          </button>
          <div style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center', marginTop: '8px' }}>
            회원 대화명으로 빙고 게임을 즐겨보세요!
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
