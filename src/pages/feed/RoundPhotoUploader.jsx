import { useEffect, useState } from 'react';
import apiService from '../../services/api';
import { parseParticipants } from '../../utils';
import { compressImageFile } from '../../utils/compressImage';

function sydneyToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

export default function RoundPhotoUploader({ currentUser, onClose, onUploaded }) {
  const [rounds, setRounds] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    apiService.fetchBookings().then((bs) => {
      const today = sydneyToday();
      const myPhone = currentUser?.phone;
      const mine = (bs || [])
        .filter((b) => b.date < today) // 지난 라운딩
        .filter((b) => parseParticipants(b.participants).some((p) => p.phone === myPhone)) // 내가 참가
        .sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신순
      setRounds(mine);
    }).catch(() => setRounds([]));
  }, [currentUser]);

  const pickAndUpload = (booking) => {
    if (busyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;
      setBusyId(booking.id);
      try {
        const prepared = await Promise.all(files.map((f) =>
          f.type.startsWith('image/') ? compressImageFile(f) : f));
        await apiService.uploadBookingMedia(booking.id, prepared);
        onUploaded?.();
        onClose();
      } catch {
        alert('업로드 실패. 다시 시도해주세요.');
      } finally {
        setBusyId(null);
      }
    };
    input.click();
  };

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
            <button key={b.id} onClick={() => pickAndUpload(b)} disabled={!!busyId}
              style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10, padding: '14px 8px', border: 'none', borderBottom: '1px solid #F1F5F9', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A' }}>{b.title || '정기모임'}</div>
                <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>{d.getFullYear()}. {d.getMonth() + 1}. {d.getDate()} · {b.courseName}</div>
              </div>
              {busyId === b.id
                ? <span style={{ fontSize: 12.5, color: '#0047AB', fontWeight: 600 }}>업로드중…</span>
                : <span style={{ fontSize: 12.5, color: '#94A3B8' }}>사진 {count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
