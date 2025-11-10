import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function RoundingManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings } = useApp();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
    }
  }, [bookingId, bookings]);

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'operator' || user?.isAdmin;
  
  if (!hasAdminAccess) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            관리자 또는 운영진만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            라운딩을 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <button 
          onClick={() => navigate('/booking')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 8px'
          }}
        >
          ←
        </button>
        <h1>라운딩 관리</h1>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ 
            background: 'var(--bg-green)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {booking.title && (
              <div style={{ fontSize: '13px', color: '#2d5f3f', fontWeight: '600', marginBottom: '4px' }}>
                {booking.title}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {booking.courseName}
            </h3>
            <div style={{ fontSize: '14px', color: '#666' }}>
              📅 {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '16px',
            color: 'var(--primary-green)'
          }}>
            관리 메뉴
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              onClick={() => navigate(`/participant-management?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: 'var(--bg-green)',
                border: '2px solid var(--primary-green)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px' }}>📋</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  참가자 관리
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  참가자 추가/삭제 및 관리
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/team-formation?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: 'var(--bg-green)',
                border: '2px solid var(--primary-green)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px' }}>👥</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  조편성하기
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  참가자들을 팀으로 편성합니다
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/member-score-entry?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: 'var(--bg-green)',
                border: '2px solid var(--primary-green)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px' }}>📝</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  회원 스코어 입력
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  참가자들의 스코어를 입력합니다
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/grade-settings?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: 'var(--bg-green)',
                border: '2px solid var(--primary-green)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px' }}>📊</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  그레이드 설정
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  이 라운딩의 핸디캡 그레이드 기준 설정
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoundingManagement;
