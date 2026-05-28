import { useEffect, useState } from 'react';
import apiService from '../../services/api';
import { parseParticipants } from '../../utils';

function sydneyToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

// 정기모임 선택 시트. 선택하면 onPickRound(booking)으로 라운딩 상세(MediaGallery)로 이동.
export default function RoundPhotoUploader({ currentUser, onClose, onPickRound }) {
  const [rounds, setRounds] = useState(null);

  useEffect(() => {
    apiService.fetchBookings().then((bs) => {
      const today = sydneyToday();
      const myPhone = currentUser?.phone;
      const mine = (bs || [])
        .filter((b) => b.type === '정기모임')        // 정기모임만
        .filter((b) => b.date < today)               // 지난 라운딩
        .filter((b) => parseParticipants(b.participants).some((p) => p.phone === myPhone)) // 참가
        .sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신순
      setRounds(mine);
    }).catch(() => setRounds([]));
  }, [currentUser]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', width: '100%', maxHeight: '72vh', overflowY: 'auto', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 15 }}>취소</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>어느 라운딩 사진인가요?</div>
          <span style={{ width: 40 }} />
        </div>
        {rounds === null ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8' }}>불러오는 중…</div>
        ) : rounds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 14 }}>참가한 지난 라운딩이 없습니다.</div>
        ) : rounds.map((b) => {
          const d = new Date(b.date);
          const count = b._count?.media || 0;
          return (
            <button key={b.id} onClick={() => onPickRound?.(b)}
              style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10, padding: '14px 8px', border: 'none', borderBottom: '1px solid #F1F5F9', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A' }}>{b.title || '정기모임'}</div>
                <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>{d.getFullYear()}. {d.getMonth() + 1}. {d.getDate()} · {b.courseName}</div>
              </div>
              <span style={{ fontSize: 12.5, color: '#94A3B8' }}>사진 {count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
