import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import PageHeader from '../components/common/PageHeader';

function GradeSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, refreshBookings: refreshData } = useApp();
  const [booking, setBooking] = useState(null);
  const [gradeSettings, setGradeSettings] = useState({
    gradeA: { type: 'below', value: '' },
    gradeB: { min: '', max: '' },
    gradeC: { min: '', max: '' },
    gradeD: { type: 'above', value: '' }
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
          
          // 기본 구조와 병합하여 누락된 필드 방지
          setGradeSettings({
            gradeA: { type: 'below', value: '', ...parsedSettings?.gradeA },
            gradeB: { min: '', max: '', ...parsedSettings?.gradeB },
            gradeC: { min: '', max: '', ...parsedSettings?.gradeC },
            gradeD: { type: 'above', value: '', ...parsedSettings?.gradeD }
          });
        } catch (e) {
          console.error('그레이드 설정 파싱 실패:', e);
        }
      }
    }
  }, [bookingId, bookings]);

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;

  const round1 = (n) => Math.round(n * 10) / 10;
  const toNum = (v) => (v === '' || v === null || v === undefined || isNaN(parseFloat(v))) ? '' : parseFloat(v);

  // "까지"만 입력받고, 다음 등급 "부터"는 앞 등급 까지 + 0.1 로 자동 채워 틈을 없앤다.
  // shortcut: 핸디캡 소수점 1자리 가정(GA 공식 핸디 기준). 2자리 이상이면 +0.1 경계에 틈 발생 가능.
  // 기존 분류 로직(PickWinner·Leaderboard·roundingRanking)은 min/max·value/type를 그대로 읽으므로 데이터 모양을 유지한다.
  const deriveGrades = (gs) => {
    const aMax = toNum(gs.gradeA.value);
    // 상위 "까지"가 비면 하위도 무효 — 틈·유령 등급 방지
    const bMax = aMax === '' ? '' : toNum(gs.gradeB.max);
    const cMax = bMax === '' ? '' : toNum(gs.gradeC.max);
    return {
      gradeA: { type: 'below', value: aMax },
      gradeB: { min: aMax === '' ? '' : round1(aMax + 0.1), max: bMax },
      gradeC: { min: bMax === '' ? '' : round1(bMax + 0.1), max: cMax },
      gradeD: { type: 'above', value: cMax === '' ? '' : round1(cMax + 0.1) },
    };
  };

  const handleSave = async () => {
    if (!booking) return;

    setIsSaving(true);
    try {
      // 서버가 기존 값과 병합하므로 그레이드만 보내도 경기방식·신페리오 설정은 보존된다.
      await apiService.updateBookingGradeSettings(bookingId, deriveGrades(gradeSettings));
      
      try {
        await refreshData();
      } catch (e) {
        console.log('데이터 새로고침 중 오류 (무시됨):', e);
      }
      
      alert('그레이드 설정이 저장되었습니다!');
      const fromId = location.state?.fromBookingId || bookingId;
      navigate('/booking', { state: { reopenManage: fromId } });
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

  const d = deriveGrades(gradeSettings);
  const inputStyle = { padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '14px', width: '90px' };
  const fromStyle = { fontSize: '14px', fontWeight: '700', color: '#0047AB', background: '#EBF2FF', padding: '8px 12px', borderRadius: '8px' };
  const hintStyle = { marginTop: '8px', fontSize: '12px', color: '#0047AB', fontWeight: '500' };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <PageHeader title="그레이드 설정" onBack={() => {
        const fromId = location.state?.fromBookingId || bookingId;
        navigate('/booking', { state: { reopenManage: fromId } });
      }} />

      <div style={{ padding: '16px 16px 100px' }}>
        {/* 라운딩 정보 카드 */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '12px' }}>
          {booking.title && (
            <div style={{ fontSize: '12px', color: '#0047AB', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.02em' }}>
              {booking.title}
            </div>
          )}
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            {booking.courseName}
          </div>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            ◆ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', paddingLeft: '4px', lineHeight: 1.5 }}>
          ※ 각 등급의 <b>"까지"</b> 값만 넣으면 다음 등급 "부터"는 자동으로 이어집니다.<br />
          "까지"를 비우면 그 뒤 핸디는 모두 그 등급입니다.
        </div>

          {/* Grade A — 최상위, "까지"만 입력 */}
          <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', marginBottom: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#0047AB' }}>
              ▲ 그레이드 A
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>핸디</span>
              <input
                type="number" step="0.1" inputMode="decimal"
                value={gradeSettings.gradeA.value}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeA: { ...gradeSettings.gradeA, value: e.target.value === '' ? '' : parseFloat(e.target.value) }
                })}
                style={inputStyle}
              />
              <span style={{ fontSize: '14px', opacity: 0.7 }}>까지</span>
            </div>
          </div>

          {/* Grade B — "부터"는 A까지+0.1 자동, "까지"만 입력 */}
          <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', marginBottom: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#0047AB' }}>
              ▲ 그레이드 B
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={fromStyle}>{d.gradeB.min === '' ? '—' : d.gradeB.min}</span>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>부터</span>
              <input
                type="number" step="0.1" inputMode="decimal"
                value={gradeSettings.gradeB.max}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeB: { ...gradeSettings.gradeB, max: e.target.value === '' ? '' : parseFloat(e.target.value) }
                })}
                style={inputStyle}
              />
              <span style={{ fontSize: '14px', opacity: 0.7 }}>까지</span>
            </div>
            {d.gradeB.max === '' && d.gradeB.min !== '' && (
              <div style={hintStyle}>* "까지"를 비우면 {d.gradeB.min} 이상은 모두 B (C·D 없음)</div>
            )}
          </div>

          {/* Grade C — "부터"는 B까지+0.1 자동, "까지"만 입력 */}
          <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', marginBottom: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#0047AB' }}>
              ▲ 그레이드 C
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={fromStyle}>{d.gradeC.min === '' ? '—' : d.gradeC.min}</span>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>부터</span>
              <input
                type="number" step="0.1" inputMode="decimal"
                value={gradeSettings.gradeC.max}
                disabled={d.gradeB.max === ''}
                onChange={(e) => setGradeSettings({
                  ...gradeSettings,
                  gradeC: { ...gradeSettings.gradeC, max: e.target.value === '' ? '' : parseFloat(e.target.value) }
                })}
                style={{ ...inputStyle, background: d.gradeB.max === '' ? '#F1F5F9' : '#fff' }}
              />
              <span style={{ fontSize: '14px', opacity: 0.7 }}>까지</span>
            </div>
            {d.gradeC.min !== '' && d.gradeC.max === '' && (
              <div style={hintStyle}>* "까지"를 비우면 {d.gradeC.min} 이상은 모두 C (D 없음)</div>
            )}
          </div>

          {/* Grade D — C까지 뒤 나머지 전부(입력칸 없음), C까지가 있을 때만 */}
          {d.gradeD.value !== '' && (
            <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', marginBottom: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#0047AB' }}>
                ▲ 그레이드 D
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={fromStyle}>{d.gradeD.value}</span>
                <span style={{ fontSize: '14px', opacity: 0.7 }}>이상은 모두 D</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: isSaving ? '#94A3B8' : '#0047AB', color: '#FFFFFF',
              border: 'none', fontSize: '16px', fontWeight: '700',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em', marginTop: '4px',
            }}
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
      </div>
    </div>
  );
}

export default GradeSettings;
