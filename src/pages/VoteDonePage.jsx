import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { formatCurrency } from '../utils';

// 참석 투표 직후 보여주는 안내 화면.
// 참석: 지금 납부할 금액(실제 장부 잔액) + 앱설정의 "개인 회비 납부안내 문구"
// 불참: 아쉬움 인사
// 둘 다: 투표 현황 보기 + 카카오톡 단톡방 바로가기(앱설정 링크, 비어 있으면 숨김) + 홈으로 가기

const PRIMARY = '#0047AB';

function fmtBookingDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일(${wd})`;
}

function VoteDonePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useApp();

  const [guideText, setGuideText] = useState('');
  const [kakaoUrl, setKakaoUrl] = useState('');
  const [balance, setBalance] = useState(null); // null = 불러오는 중

  const isAttend = state?.kind === 'attend';

  useEffect(() => {
    apiService.fetchSettings().then(settings => {
      const guide = settings.find(s => s.feature === 'paymentGuideText');
      const kakao = settings.find(s => s.feature === 'kakaoOpenChatUrl');
      if (guide?.value) setGuideText(guide.value);
      if (kakao?.value) setKakaoUrl(kakao.value.trim());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAttend || !user?.id) return;
    apiService.fetchMember(user.id)
      .then(m => setBalance(typeof m?.balance === 'number' ? m.balance : 0))
      .catch(() => setBalance(undefined));
  }, [isAttend, user?.id]);

  // 투표를 거치지 않고 주소로 바로 들어온 경우
  if (!state?.kind) return <Navigate to="/" replace />;

  const booking = state.booking;
  const owed = typeof balance === 'number' && balance < 0 ? -balance : 0;

  const card = { background: '#fff', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14 };

  return (
    <div style={{ background: 'var(--background)', minHeight: '100dvh', padding: '0 20px', paddingTop: 'calc(env(safe-area-inset-top) + 40px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 110px)', boxSizing: 'border-box' }}>
      {/* 머리말 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {isAttend ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-background)', letterSpacing: '-0.02em' }}>참석 신청 완료</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-background)', letterSpacing: '-0.02em', marginBottom: 8 }}>아쉽네요</div>
            <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>다음번엔 꼭 만나뵙길 기대합니다.</div>
          </>
        )}
        {(state.title || booking) && (
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
            {[state.title, booking?.date && fmtBookingDate(booking.date), booking?.courseName].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {isAttend && (
        <>
          {/* 지금 납부할 금액 — 실제 장부 잔액 기준 */}
          {balance !== undefined && (
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>지금 납부할 금액</span>
              {balance === null ? (
                <span style={{ fontSize: 14, color: '#94a3b8' }}>불러오는 중…</span>
              ) : owed > 0 ? (
                <span style={{ fontSize: 22, fontWeight: 900, color: PRIMARY, letterSpacing: '-0.02em' }}>{formatCurrency(owed)}</span>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', textAlign: 'right' }}>추가로 내실 금액이 없습니다</span>
              )}
            </div>
          )}
          {balance !== null && balance !== undefined && owed === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', margin: '-6px 4px 14px' }}>미리 내신 크레딧으로 처리되었습니다.</div>
          )}

          {/* 납부 안내 — 앱설정 문구 그대로 */}
          {guideText && (
            <div style={{ ...card, background: '#EBF2FF', boxShadow: 'none', border: '1px solid rgba(0,71,171,0.12)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PRIMARY, marginBottom: 8 }}>납부 안내</div>
              <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{guideText}</div>
            </div>
          )}
        </>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        <button onClick={() => navigate('/vote', { replace: true })}
          style={{ minHeight: 52, borderRadius: 14, border: 'none', background: PRIMARY, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          투표 현황 보기
        </button>
        {kakaoUrl && (
          <a href={kakaoUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 14, background: '#FEE500', color: '#191919', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.84 5.31 4.6 6.73-.2.73-.73 2.65-.84 3.06-.13.51.19.5.39.37.16-.11 2.55-1.73 3.58-2.43.74.11 1.5.17 2.27.17 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오톡 단톡방 바로가기
          </a>
        )}
        <button onClick={() => navigate('/', { replace: true })}
          style={{ minHeight: 48, borderRadius: 14, border: 'none', background: 'none', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          홈으로 가기
        </button>
      </div>
    </div>
  );
}

export default VoteDonePage;
