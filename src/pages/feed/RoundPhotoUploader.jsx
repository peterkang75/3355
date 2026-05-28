import { useEffect, useState } from 'react';
import apiService from '../../services/api';
import { parseParticipants } from '../../utils';
import { compressImageFile } from '../../utils/compressImage';

function sydneyToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

// 네트워크 에러일 때만 1회 자동 재시도 (모바일 셀룰러 끊김 보호)
async function uploadOnceWithRetry(bookingId, file, onProgress) {
  try {
    return await apiService.uploadBookingMedia(bookingId, [file], onProgress);
  } catch (e) {
    if (/네트워크|업로드 실패/.test(e.message || '')) {
      return await apiService.uploadBookingMedia(bookingId, [file], onProgress);
    }
    throw e;
  }
}

export default function RoundPhotoUploader({ currentUser, onClose, onUploaded }) {
  const [rounds, setRounds] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(null); // { label, pct }

  useEffect(() => {
    apiService.fetchBookings().then((bs) => {
      const today = sydneyToday();
      const myPhone = currentUser?.phone;
      const mine = (bs || [])
        .filter((b) => b.type === '정기모임') // 정기모임만 (컴페티션 제외)
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
      setStatus({ label: '준비 중', pct: 0 });
      const errors = [];
      try {
        // 1) 압축 (HEIC 안전 폴백)
        const prepared = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setStatus({ label: files.length > 1 ? `압축 중 ${i + 1}/${files.length}` : '압축 중', pct: 0 });
          if ((f.type || '').startsWith('image/')) {
            try { prepared.push(await compressImageFile(f)); }
            catch (e) { console.warn('compress failed, using original:', f.name, e); prepared.push(f); }
          } else {
            prepared.push(f);
          }
        }
        // 2) 1장씩 업로드 (모바일 회선 보호 + 1회 재시도)
        for (let i = 0; i < prepared.length; i++) {
          const f = prepared[i];
          const base = prepared.length > 1 ? `올리는 중 ${i + 1}/${prepared.length}` : '올리는 중';
          try {
            await uploadOnceWithRetry(booking.id, f, (frac) =>
              setStatus({ label: base, pct: Math.round((frac || 0) * 100) }));
          } catch (e) {
            console.error('upload fail (file', i + 1, ')', e);
            errors.push(`${i + 1}/${prepared.length}: ${e.message || '오류'}`);
          }
        }
        if (errors.length === prepared.length) {
          throw new Error(errors.join('\n'));
        }
        onUploaded?.();
        if (errors.length > 0) {
          alert(`일부 실패(${errors.length}/${prepared.length})\n${errors.join('\n')}`);
        }
        onClose();
      } catch (e) {
        console.error('round photo upload error:', e);
        alert(`업로드 실패: ${e.message || '알 수 없는 오류'}\n다시 시도해주세요.`);
      } finally {
        setBusyId(null);
        setStatus(null);
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
          const isBusy = busyId === b.id;
          return (
            <button key={b.id} onClick={() => pickAndUpload(b)} disabled={!!busyId}
              style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10, padding: '14px 8px', border: 'none', borderBottom: '1px solid #F1F5F9', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A' }}>{b.title || '정기모임'}</div>
                <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>{d.getFullYear()}. {d.getMonth() + 1}. {d.getDate()} · {b.courseName}</div>
                {isBusy && status && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${status.pct || 0}%`, background: '#0047AB', transition: 'width 0.2s ease' }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: '#0047AB', fontWeight: 600, marginTop: 4 }}>{status.label} {status.pct ? `${status.pct}%` : ''}</div>
                  </div>
                )}
              </div>
              {!isBusy && <span style={{ fontSize: 12.5, color: '#94A3B8' }}>사진 {count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
