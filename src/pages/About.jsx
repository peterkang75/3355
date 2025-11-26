import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import logoImage from '../assets/logo.jpeg';

function About() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [clubIntroText, setClubIntroText] = useState('');
  const [clubRulesText, setClubRulesText] = useState('');
  const [appDescriptionText, setAppDescriptionText] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiService.fetchSettings();
        const introSetting = settings.find(s => s.feature === 'clubIntroText');
        if (introSetting && introSetting.value) {
          setClubIntroText(introSetting.value);
        }
        const rulesSetting = settings.find(s => s.feature === 'clubRulesText');
        if (rulesSetting && rulesSetting.value) {
          setClubRulesText(rulesSetting.value);
        }
        const appDescSetting = settings.find(s => s.feature === 'appDescriptionText');
        if (appDescSetting && appDescSetting.value) {
          setAppDescriptionText(appDescSetting.value);
        }
      } catch (error) {
        console.error('설정 로드 실패:', error);
      }
    };
    loadSettings();
  }, []);
  
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
          {clubIntroText && (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px',
              background: 'var(--bg-green)',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.8',
              textAlign: 'left',
              whiteSpace: 'pre-wrap'
            }}>
              {clubIntroText}
            </div>
          )}
          {clubRulesText && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => setShowRulesModal(true)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary-green)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📋 모임 회칙보기
              </button>
            </div>
          )}
        </div>

        <div style={{ 
          height: '2px', 
          background: 'linear-gradient(to right, transparent, var(--primary-green), transparent)',
          margin: '20px 0'
        }} />

        <div className="card">
          {appDescriptionText && (
            <>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                marginBottom: '12px',
                color: 'var(--primary-green)'
              }}>
                앱 소개
              </h3>
              <div style={{ 
                fontSize: '14px', 
                lineHeight: '1.8', 
                opacity: 0.9, 
                marginBottom: '24px',
                whiteSpace: 'pre-wrap'
              }}>
                {appDescriptionText}
              </div>
            </>
          )}

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

          <button
            onClick={handleContact}
            className="btn-primary"
            style={{ 
              width: '100%',
              marginTop: '20px',
              background: 'var(--primary-green)',
              borderBottom: '3px solid var(--primary-dark)'
            }}
          >
            💬 피드백, 버그신고, 동백님 찬양하기
          </button>
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

      {showRulesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--primary-green)'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-light)' }}>
                📋 3355 골프모임 회칙
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'var(--text-light)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              fontSize: '14px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}>
              {clubRulesText}
            </div>
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <button
                onClick={() => setShowRulesModal(false)}
                style={{
                  padding: '12px 40px',
                  background: 'var(--primary-green)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default About;
