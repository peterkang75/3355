import React from 'react';
import { useNavigate } from 'react-router-dom';
import AttendancePollCard from '../components/AttendancePollCard';

// 카톡방에 올리는 투표 링크(/vote)가 도착하는 화면.
// 로그인이 안 되어 있으면 앱이 먼저 로그인 화면을 보여주고, 로그인하면 이 주소로 이어진다.

function VotePage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--background)', minHeight: '100dvh' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px 12px',
        paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,71,171,0.07)',
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--on-background)', display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--on-background)' }}>참석 투표</span>
      </div>

      <div style={{ paddingTop: 20 }}>
        <AttendancePollCard
          emptyFallback={
            <div style={{ padding: '60px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                지금 진행 중인 투표가 없습니다
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                투표가 이미 마감되었거나 아직 열리지 않았습니다.
              </div>
              <button onClick={() => navigate('/')} style={{
                marginTop: 20, padding: '11px 22px', borderRadius: 12, border: 'none',
                background: '#0047AB', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>홈으로</button>
            </div>
          }
        />
      </div>
    </div>
  );
}

export default VotePage;
