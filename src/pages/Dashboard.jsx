import React from 'react';
import { useApp } from '../contexts/AppContext';

function Dashboard() {
  const { user, scores, bookings } = useApp();
  return (
    <div>
      <div className="header">
        <h1>대시보드</h1>
        <div style={{ fontSize: '14px' }}>{user.name}님</div>
      </div>

      <div className="page-content">
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #2d5f3f 0%, #3a7d54 100%)',
          color: 'white',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>환영합니다!</h2>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            {user.name}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            전화번호: ***{user.phone}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              현재 핸디캡
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              color: 'var(--primary-green)'
            }}>
              {user.handicap || 0}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              회비 잔액
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              color: user.balance < 0 ? '#e53e3e' : 'var(--primary-green)'
            }}>
              {user.balance?.toLocaleString() || 0}원
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            다가오는 부킹
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            예정된 부킹이 없습니다
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            최근 스코어
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            기록된 스코어가 없습니다
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            회비 납부 내역
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            납부 내역이 없습니다
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
