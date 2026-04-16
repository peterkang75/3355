import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const STORAGE_KEY = 'guestSession';

// 라운딩 날짜가 오늘(Sydney 기준)인지 확인
function isRoundToday(dateStr) {
  if (!dateStr) return true;
  const tz = 'Australia/Sydney';
  const fmt = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return fmt(new Date(dateStr)) === fmt(new Date());
}

function GuestJoin() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('loading'); // 'loading'|'select'|'form'|'submitting'|'registered'
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [registeredName, setRegisteredName] = useState('');

  useEffect(() => {
    // 이미 등록된 세션이 있으면 바로 /play로
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
        if (guests.length >= 1) {
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

  // 등록 후 라운딩 날짜에 따라 /play 이동 or 확인 화면
  const afterRegister = (result, bookingData) => {
    const bk = bookingData || booking;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      token,
      guestMemberId: result.guestMemberId,
      bookingId: result.bookingId,
      guestName: result.guestName,
      phone: result.phone,
      handicap: result.handicap,
    }));

    if (isRoundToday(bk?.date)) {
      navigate(`/play?id=${result.bookingId}`, { replace: true });
    } else {
      setRegisteredName(result.guestName);
      setStep('registered');
    }
  };

  const autoRegister = async (guest, bookingData) => {
    setStep('submitting');
    setSelectedGuest(guest);
    try {
      const result = await apiService.registerGuest(token, guest.name, guest.handicap);
      afterRegister(result, bookingData);
    } catch (err) {
      setSubmitError(err.message || '등록에 실패했습니다.');
      setStep('form');
    }
  };

  const handleSelectGuest = (guest) => {
    autoRegister(guest, booking);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) { setSubmitError('이름을 입력해주세요.'); return; }
    setStep('submitting');
    setSubmitError('');
    try {
      const result = await apiService.registerGuest(token, name, parseFloat(handicap) || 36);
      afterRegister(result, booking);
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
            <div style={{ fontSize: 13, color: '#64748b' }}>잠시만 기다려주세요…</div>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── 등록 완료 (라운딩 전) ─────────────────────────────────────────────────
  if (step === 'registered') {
    const formattedDate = booking?.date
      ? new Date(booking.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
      : '';
    return (
      <div style={{ minHeight: '100dvh', background: '#f8fafc', paddingTop: 'env(safe-area-inset-top)' }}>
        {renderHeader()}
        <div style={{ padding: '36px 24px', maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
          {/* 체크 아이콘 */}
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 8, letterSpacing: '-0.02em' }}>
            참가 등록 완료!
          </div>
          <div style={{ fontSize: 15, color: '#64748b', marginBottom: 28 }}>
            <strong style={{ color: '#1e293b' }}>{registeredName}</strong>님으로 등록됐습니다.
          </div>

          {/* 라운딩 정보 카드 */}
          <div style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0047AB"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>라운딩 일정</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                  {formattedDate}{booking?.time ? ` · ${booking.time}` : ''}
                </div>
              </div>
            </div>
            {booking?.courseName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>골프장</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{booking.courseName}</div>
                </div>
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          <div style={{ background: '#FFF7ED', borderRadius: 14, padding: '14px 16px', marginBottom: 28, textAlign: 'left', border: '1px solid #FED7AA' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 4 }}>라운딩 당일 안내</div>
            <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
              이 링크를 저장해두세요.<br/>
              라운딩 당일에 다시 열면 바로 스코어 입력 화면으로 이동합니다.
            </div>
          </div>

          {/* 링크 저장 버튼 */}
          <button
            onClick={() => {
              const url = window.location.href;
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({ title: '라운딩 링크', url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).then(() => alert('링크가 복사됐습니다.'));
              }
            }}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: '#0047AB', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            이 링크 저장하기
          </button>
        </div>
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
            이름을 누르면 참가 등록이 완료됩니다.
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

  // ── 직접 입력 폼 ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc', paddingTop: 'env(safe-area-inset-top)' }}>
      {renderHeader()}
      <div style={{ padding: '28px 20px', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>게스트로 참가하기</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>
          이름과 핸디캡을 입력해 참가를 등록하세요.
        </div>

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
            참가 등록하기
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default GuestJoin;
