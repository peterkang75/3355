import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const STORAGE_KEY = 'guestSession';

function GuestJoin() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('loading'); // 'loading'|'select'|'form'|'submitting'
  const [selectedGuest, setSelectedGuest] = useState(null); // { name, handicap }
  const [guestName, setGuestName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // 이미 이 토큰으로 세션이 있으면 바로 이동
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.token === token && saved?.guestMemberId && saved?.bookingId) {
        navigate(`/play?id=${saved.bookingId}`, { replace: true });
        return;
      }
    } catch {}

    apiService.fetchInviteInfo(token)
      .then(({ booking }) => {
        setBooking(booking);
        const guests = booking.preAddedGuests || [];
        if (guests.length === 1) {
          // 사전 등록 게스트가 1명이면 자동 선택 후 바로 등록
          autoRegister(guests[0]);
        } else if (guests.length > 1) {
          setStep('select');
        } else {
          setStep('form');
        }
      })
      .catch((err) => {
        setLoadError(err.message || '유효하지 않거나 만료된 초대링크입니다.');
        setStep('error');
      });
  }, [token]);

  const autoRegister = async (guest) => {
    setStep('submitting');
    setSelectedGuest(guest);
    try {
      const result = await apiService.registerGuest(token, guest.name, guest.handicap);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        guestMemberId: result.guestMemberId,
        bookingId: result.bookingId,
        guestName: result.guestName,
        phone: result.phone,
        handicap: result.handicap,
      }));
      navigate(`/play?id=${result.bookingId}`, { replace: true });
    } catch (err) {
      setSubmitError(err.message || '등록에 실패했습니다.');
      setStep('form');
    }
  };

  const handleSelectGuest = (guest) => {
    autoRegister(guest);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) { setSubmitError('이름을 입력해주세요.'); return; }
    setStep('submitting');
    setSubmitError('');
    try {
      const result = await apiService.registerGuest(token, name, parseFloat(handicap) || 36);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        guestMemberId: result.guestMemberId,
        bookingId: result.bookingId,
        guestName: result.guestName,
        phone: result.phone,
        handicap: result.handicap,
      }));
      navigate(`/play?id=${result.bookingId}`, { replace: true });
    } catch (err) {
      setSubmitError(err.message || '등록에 실패했습니다.');
      setStep('form');
    }
  };

  // ── 공통 헤더 ──────────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (!booking) return null;
    const formattedDate = booking.date
      ? new Date(booking.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
      : '';
    return (
      <div style={{ background: '#0047AB', padding: '20px 20px 28px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>
          3355 골프 클럽 초대
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.02em' }}>
          {booking.title || booking.courseName}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {formattedDate}{booking.time ? ` · ${booking.time}` : ''}
        </div>
      </div>
    );
  };

  // ── 에러 ───────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>링크가 유효하지 않습니다</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>{loadError}</div>
        </div>
      </div>
    );
  }

  // ── 로딩 / 자동 등록 중 ───────────────────────────────────────────────────
  if (step === 'loading' || step === 'submitting') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#0047AB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        {step === 'submitting' && selectedGuest && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{selectedGuest.name}님 확인 중</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>스코어 화면으로 이동합니다…</div>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── 사전 등록 게스트 선택 (2명 이상) ─────────────────────────────────────
  if (step === 'select') {
    const guests = booking?.preAddedGuests || [];
    return (
      <div style={{ minHeight: '100dvh', background: '#f8fafc', paddingTop: 'env(safe-area-inset-top)' }}>
        {renderHeader()}
        <div style={{ padding: '28px 20px', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6, letterSpacing: '-0.02em' }}>본인을 선택하세요</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
            이름을 누르면 바로 스코어 입력 화면으로 이동합니다.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {guests.map((g, i) => (
              <button
                key={i}
                onClick={() => handleSelectGuest(g)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 18px', borderRadius: 14, border: '1.5px solid #E8ECF0',
                  background: '#fff', cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>HC {g.handicap}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>

          {/* 목록에 없는 경우 직접 입력 */}
          <button
            onClick={() => setStep('form')}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px dashed #CBD5E1', background: 'transparent', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            목록에 없는 경우 직접 입력
          </button>

          {submitError && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#fef2f2', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              {submitError}
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── 직접 입력 폼 (사전 등록 없거나 목록에 없는 경우) ─────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc', paddingTop: 'env(safe-area-inset-top)' }}>
      {renderHeader()}
      <div style={{ padding: '28px 20px', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>게스트로 참가하기</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>
          이름과 핸디캡을 입력하면 스코어 입력 화면으로 이동합니다.
        </div>

        {/* 사전 등록 목록으로 돌아가기 */}
        {(booking?.preAddedGuests || []).length > 1 && (
          <button
            onClick={() => setStep('select')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none', border: 'none', color: '#0047AB', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            목록으로 돌아가기
          </button>
        )}

        <form onSubmit={handleManualSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.04em' }}>
              이름 *
            </label>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="이름을 입력하세요"
              autoFocus
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, outline: 'none', background: '#fff', boxSizing: 'border-box', fontWeight: 500 }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.04em' }}>
              핸디캡
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={handicap}
              onChange={e => setHandicap(e.target.value)}
              placeholder="36"
              min="0"
              max="54"
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, outline: 'none', background: '#fff', boxSizing: 'border-box', fontWeight: 500 }}
            />
          </div>

          {submitError && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fef2f2', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              {submitError}
            </div>
          )}

          <button
            type="submit"
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: '#0047AB', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            스코어 입력 시작
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default GuestJoin;
