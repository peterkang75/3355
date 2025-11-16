import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import backArrow from '../assets/back-arrow.png';

function GradeSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, refreshData } = useApp();
  const [booking, setBooking] = useState(null);
  const [gradeSettings, setGradeSettings] = useState({
    gradeA: { type: 'below', value: 10 },
    gradeB: { min: 11, max: 22 },
    gradeC: { type: 'above', value: 23 }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking?.gradeSettings) {
        try {
          const parsedSettings = typeof foundBooking.gradeSettings === 'string' 
            ? JSON.parse(foundBooking.gradeSettings)
            : foundBooking.gradeSettings;
          setGradeSettings(parsedSettings);
        } catch (e) {
          console.error('그레이드 설정 파싱 실패:', e);
        }
      }
    }
  }, [bookingId, bookings]);

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;

  const handleSave = async () => {
    if (!booking) return;
    
    setIsSaving(true);
    try {
      await apiService.updateBookingGradeSettings(bookingId, gradeSettings);
      alert('그레이드 설정이 저장되었습니다!');
      await refreshData();
      navigate(`/rounding-management?id=${bookingId}`);
    } catch (error) {
      console.error('그레이드 설정 저장 실패:', error);
      alert('그레이드 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
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
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
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
          onClick={() => navigate(`/rounding-management?id=${bookingId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <img src={backArrow} alt="뒤로가기" style={{ height: '20px' }} />
        </button>
        <h1>그레이드 설정</h1>
      </div>

      <div className="page-content">
        <div className="card">
          <div style={{ 
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {booking.title && (
              <div style={{ fontSize: '13px', color: 'var(--primary-green)', fontWeight: '600', marginBottom: '4px' }}>
                {booking.title}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {booking.courseName}
            </h3>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              ◆ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
            </div>
          </div>

          <div style={{
            padding: '12px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '13px',
            opacity: 0.7
          }}>
            ※ 이 라운딩에 적용할 핸디캡 그레이드 기준을 설정하세요
          </div>

          {/* Grade A */}
          <div style={{
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: 'var(--primary-green)'
            }}>
              ▲ 그레이드 A
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="number"
                value={gradeSettings.gradeA.value}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeA: { ...gradeSettings.gradeA, value: parseInt(e.target.value) || 0 }
                })}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '80px'
                }}
              />
              <select
                value={gradeSettings.gradeA.type}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeA: { ...gradeSettings.gradeA, type: e.target.value }
                })}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '80px'
                }}
              >
                <option value="below">이하</option>
                <option value="above">이상</option>
              </select>
            </div>
          </div>

          {/* Grade B */}
          <div style={{
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: 'var(--primary-green)'
            }}>
              ▲ 그레이드 B
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', opacity: 0.7 }}>핸디</span>
                <input
                  type="number"
                  value={gradeSettings.gradeB.min}
                  onChange={(e) => setGradeSettings({
                    ...gradeSettings,
                    gradeB: { ...gradeSettings.gradeB, min: parseInt(e.target.value) || 0 }
                  })}
                  style={{
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '80px'
                  }}
                />
                <span style={{ fontSize: '14px', opacity: 0.7 }}>부터</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={gradeSettings.gradeB.max}
                  onChange={(e) => setGradeSettings({
                    ...gradeSettings,
                    gradeB: { ...gradeSettings.gradeB, max: parseInt(e.target.value) || 0 }
                  })}
                  style={{
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '80px'
                  }}
                />
                <span style={{ fontSize: '14px', opacity: 0.7 }}>까지</span>
              </div>
            </div>
          </div>

          {/* Grade C */}
          <div style={{
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: 'var(--primary-green)'
            }}>
              ▲ 그레이드 C
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="number"
                value={gradeSettings.gradeC.value}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeC: { ...gradeSettings.gradeC, value: parseInt(e.target.value) || 0 }
                })}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '80px'
                }}
              />
              <select
                value={gradeSettings.gradeC.type}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeC: { ...gradeSettings.gradeC, type: e.target.value }
                })}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '80px'
                }}
              >
                <option value="below">이하</option>
                <option value="above">이상</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {isSaving ? '저장 중...' : '■ 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GradeSettings;
