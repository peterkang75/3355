import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../../services/api';

const fmtDur = (sec) => {
  if (!sec && sec !== 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || '';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} (${days[d.getDay()]})`;
};

export default function MediaGallery({ booking, user, onClose }) {
  const [items, setItems] = useState([]);
  const [archivedAt, setArchivedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [error, setError] = useState('');
  const [viewerIdx, setViewerIdx] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiService.fetchBookingMedia(booking.id);
      setItems(data.items || []);
      setArchivedAt(data.archivedAt || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => { load(); }, [load]);

  // 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handlePick = () => fileRef.current && fileRef.current.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const batches = [];
      for (let i = 0; i < files.length; i += 8) batches.push(files.slice(i, i + 8));
      let done = 0;
      for (const batch of batches) {
        setUploadMsg(`올리는 중... (${done}/${files.length}) 영상은 압축에 시간이 걸려요`);
        await apiService.uploadBookingMedia(booking.id, batch);
        done += batch.length;
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadMsg('');
    }
  };

  const downloadItem = async (item) => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${booking.courseName || 'rounding'}-${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.url, '_blank');
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm('이 사진·영상을 삭제할까요? 되돌릴 수 없습니다.')) return;
    try {
      await apiService.deleteMedia(item.id);
      setViewerIdx(null);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const overlay = { position: 'fixed', inset: 0, zIndex: 2000, background: '#fff', display: 'flex', flexDirection: 'column' };

  return (
    <div style={overlay}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', borderBottom: '1px solid #EEF2F7', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1E293B', display: 'flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {booking.title || booking.courseName}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{fmtDate(booking.date)} · 사진·영상 {items.length}</div>
        </div>
        {!archivedAt && (
          <button onClick={handlePick} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#0047AB', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: uploading ? 0.6 : 1, flexShrink: 0 }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>＋</span> 올리기
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 40px' }}>
        {uploading && (
          <div style={{ background: '#EBF2FF', color: '#0047AB', borderRadius: '12px', padding: '14px', fontSize: '13px', fontWeight: '600', textAlign: 'center', marginBottom: '14px' }}>
            {uploadMsg || '올리는 중...'}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: '12px', padding: '12px', fontSize: '13px', marginBottom: '14px' }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 0', fontSize: '14px' }}>불러오는 중...</div>
        ) : archivedAt ? (
          <div style={{ textAlign: 'center', padding: '70px 24px', color: '#64748B' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>🗄️</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>이 라운딩의 사진·영상은<br />백업 후 정리되었습니다</div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>({fmtDate(archivedAt)} 정리)</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 24px', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
            <div style={{ fontSize: '14px' }}>아직 사진·영상이 없습니다</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>위 ＋올리기 로 추가하세요</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {items.map((m, idx) => (
              <div key={m.id} onClick={() => setViewerIdx(idx)} style={{ position: 'relative', aspectRatio: '1', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }}>
                <img src={m.thumbnailUrl || m.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {m.type === 'video' && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}><polygon points="6 4 20 12 6 20 6 4"/></svg>
                    </div>
                    {m.durationSec != null && (
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px' }}>{fmtDur(m.durationSec)}</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 확대 보기 */}
      {viewerIdx != null && items[viewerIdx] && (
        <Viewer
          item={items[viewerIdx]}
          index={viewerIdx}
          total={items.length}
          canDelete={items[viewerIdx].uploaderPhone === user.phone}
          onPrev={() => setViewerIdx((i) => (i > 0 ? i - 1 : i))}
          onNext={() => setViewerIdx((i) => (i < items.length - 1 ? i + 1 : i))}
          onClose={() => setViewerIdx(null)}
          onDownload={() => downloadItem(items[viewerIdx])}
          onDelete={() => deleteItem(items[viewerIdx])}
        />
      )}
    </div>
  );
}

function Viewer({ item, index, total, canDelete, onPrev, onNext, onClose, onDownload, onDelete }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onDownload} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '10px', padding: '8px 10px', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          {canDelete && (
            <button onClick={onDelete} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FCA5A5', cursor: 'pointer', borderRadius: '10px', padding: '8px 10px', display: 'flex' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* 미디어 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {item.type === 'video' ? (
          <video key={item.id} src={item.url} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%' }} />
        ) : (
          <img key={item.id} src={item.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}

        {index > 0 && (
          <button onClick={onPrev} style={navBtn('left')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        {index < total - 1 && (
          <button onClick={onNext} style={navBtn('right')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>

      {/* 하단 정보 */}
      <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '12px', padding: '12px 16px max(16px, env(safe-area-inset-bottom))', flexShrink: 0 }}>
        {index + 1} / {total}{item.uploaderName ? ` · 올린이: ${item.uploaderName}` : ''}
      </div>
    </div>
  );
}

const navBtn = (side) => ({
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: '8px',
  width: '40px', height: '40px', borderRadius: '9999px', border: 'none',
  background: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
});
