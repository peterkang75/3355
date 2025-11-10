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
      <div className="page-content" style={{ background: '#F2F2EB' }}>
        <div className="card" style={{ background: '#98A68A' }}>
          <p style={{ textAlign: 'center', color: '#010D00' }}>
            관리자 또는 운영진만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-content" style={{ background: '#F2F2EB' }}>
        <div className="card" style={{ background: '#98A68A' }}>
          <p style={{ textAlign: 'center', color: '#010D00' }}>
            라운딩을 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header" style={{ background: '#254011' }}>
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

      <div className="page-content" style={{ background: '#F2F2EB' }}>
        <div className="card" style={{ marginBottom: '16px', background: '#98A68A' }}>
          <div style={{ 
            background: '#F2F2EB',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {booking.title && (
              <div style={{ fontSize: '13px', color: '#254011', fontWeight: '600', marginBottom: '4px' }}>
                {booking.title}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#010D00' }}>
              {booking.courseName}
            </h3>
            <div style={{ fontSize: '14px', color: '#010D00' }}>
              {new Date(booking.date).toLocaleDateString('ko-KR')} • {booking.time}
            </div>
          </div>
        </div>

        <div className="card" style={{ background: '#98A68A' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '16px',
            color: '#254011'
          }}>
            관리 메뉴
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              onClick={() => navigate(`/participant-management?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: '#F2F2EB',
                border: 'none',
                borderBottom: '1px solid rgba(1, 13, 0, 0.1)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#254011',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: '#254011' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#010D00' }}>
                  참가자 관리
                </div>
                <div style={{ fontSize: '13px', color: '#010D00', opacity: 0.7 }}>
                  참가자 추가/삭제 및 관리
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/team-formation?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: '#F2F2EB',
                border: 'none',
                borderBottom: '1px solid rgba(1, 13, 0, 0.1)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#254011',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: '#254011' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#010D00' }}>
                  조편성하기
                </div>
                <div style={{ fontSize: '13px', color: '#010D00', opacity: 0.7 }}>
                  참가자들을 팀으로 편성합니다
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/member-score-entry?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: '#F2F2EB',
                border: 'none',
                borderBottom: '1px solid rgba(1, 13, 0, 0.1)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#254011',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: '#254011' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#010D00' }}>
                  {booking.dailyHandicaps ? '결과보기' : '회원 스코어 입력'}
                </div>
                <div style={{ fontSize: '13px', color: '#010D00', opacity: 0.7 }}>
                  {booking.dailyHandicaps 
                    ? '라운딩 결과 및 순위를 확인합니다' 
                    : '참가자들의 스코어를 입력합니다'}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/grade-settings?id=${bookingId}`)}
              style={{
                padding: '20px',
                background: '#F2F2EB',
                border: 'none',
                borderBottom: '1px solid rgba(1, 13, 0, 0.1)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#254011',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: '#254011' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#010D00' }}>
                  그레이드 설정
                </div>
                <div style={{ fontSize: '13px', color: '#010D00', opacity: 0.7 }}>
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
