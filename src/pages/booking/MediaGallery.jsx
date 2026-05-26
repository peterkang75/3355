import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import { compressImageFile } from '../../utils/compressImage';
import { parseParticipants } from '../../utils';
import { computeRoundingRanking, deriveWinners } from '../../utils/roundingRanking';

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
  const [upLabel, setUpLabel] = useState('');
  const [upPct, setUpPct] = useState(0);
  const [upBusy, setUpBusy] = useState(false); // 서버 처리 중(진행률 알 수 없음) = 움직이는 막대
  const [error, setError] = useState('');
  const [viewerIdx, setViewerIdx] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const { members, courses } = useApp();
  const [winners, setWinners] = useState(null);
  const participants = parseParticipants(booking.participants);
  const timeStr = booking.time && booking.time !== '23:59' ? String(booking.time).slice(0, 5) : '';
  const feeChips = [
    booking.greenFee ? `그린피 $${booking.greenFee}` : null,
    booking.cartFee ? `카트비 $${booking.cartFee}` : null,
    booking.membershipFee ? `회비 $${booking.membershipFee}` : null,
  ].filter(Boolean);
  const labelStyle = { fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.06em' };

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

  // 처리 중인 항목이 있으면 자동 갱신(폴링) — 최대 3분
  const pollCount = useRef(0);
  useEffect(() => {
    if (!items.some((m) => m.status === 'processing')) { pollCount.current = 0; return undefined; }
    if (pollCount.current >= 60) return undefined;
    const t = setTimeout(() => { pollCount.current += 1; load(); }, 3000);
    return () => clearTimeout(t);
  }, [items, load]);

  // 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // 우승자 — 리더보드와 동일한 순위 계산으로 맨 위 이름 추출
  useEffect(() => {
    if (!booking.title) return undefined;
    let cancelled = false;
    apiService.fetchRoundingScores(booking.title, booking.date)
      .then((scores) => {
        if (cancelled) return;
        const { processedScores } = computeRoundingRanking(scores, { booking, members, courses });
        setWinners(deriveWinners(processedScores));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [booking, members, courses]);

  const handlePick = () => fileRef.current && fileRef.current.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    setUpPct(0);
    setUpBusy(false);
    try {
      // 1) 사진은 브라우저에서 미리 압축(1600px). 영상은 서버에서 압축.
      const prepared = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if ((f.type || '').startsWith('image/')) {
          setUpBusy(true);
          setUpLabel(`사진 압축 중... (${i + 1}/${files.length})`);
          try { prepared.push(await compressImageFile(f)); }
          catch { prepared.push(f); } // 압축 실패 시 원본 업로드
        } else {
          prepared.push(f);
        }
      }

      // 2) 업로드 (8개씩 배치, 실제 진행률 표시)
      const batches = [];
      for (let i = 0; i < prepared.length; i += 8) batches.push(prepared.slice(i, i + 8));
      let done = 0;
      for (const batch of batches) {
        const prefix = batches.length > 1 ? `(${done + 1}~${done + batch.length}/${prepared.length}) ` : '';
        // eslint-disable-next-line no-loop-func
        await apiService.uploadBookingMedia(booking.id, batch, (frac) => {
          if (frac < 1) {
            setUpBusy(false);
            setUpPct(Math.round(frac * 100));
            setUpLabel(`${prefix}올리는 중... ${Math.round(frac * 100)}%`);
          } else {
            setUpBusy(true);
            setUpPct(100);
            setUpLabel(`${prefix}처리 중... (서버에서 정리 중)`);
          }
        });
        done += batch.length;
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUpLabel('');
      setUpPct(0);
      setUpBusy(false);
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

  const readyItems = items.filter((m) => m.status === 'ready');
  const processingCount = items.filter((m) => m.status === 'processing').length;
  const overlay = { position: 'fixed', inset: 0, zIndex: 2000, background: '#fff', display: 'flex', flexDirection: 'column' };

  return (
    <div style={overlay}>
      <style>{`@keyframes mgIndeterminate { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } } @keyframes mgSpin { to { transform: rotate(360deg); } }`}</style>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', borderBottom: '1px solid #EEF2F7', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1E293B', display: 'flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {booking.title || booking.courseName}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            라운딩 상세
          </div>
        </div>
        {!archivedAt && (
          <button onClick={handlePick} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#0047AB', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: uploading ? 0.6 : 1, flexShrink: 0 }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>＋</span> 올리기
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 40px' }}>
        {/* 라운딩 정보 · 참가자 · 시상 — 정돈된 카드 */}
        <div style={{ background: '#fff', border: '1px solid #EEF2F7', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.01em' }}>
            {fmtDate(booking.date)}{timeStr ? ` · ${timeStr}` : ''}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748B', marginTop: '2px' }}>{booking.courseName}</div>
          {booking.restaurantName && (
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#94A3B8', marginTop: '2px' }}>회식 · {booking.restaurantName}</div>
          )}
          {feeChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {feeChips.map((f) => (
                <span key={f} style={{ fontSize: '12px', fontWeight: '600', color: '#475569', background: '#F1F5F9', borderRadius: '9999px', padding: '4px 10px' }}>{f}</span>
              ))}
            </div>
          )}

          {participants.length > 0 && (
            <div style={{ borderTop: '1px solid #EEF2F7', marginTop: '12px', paddingTop: '10px' }}>
              <div style={labelStyle}>참가자 {participants.length}</div>
              <div style={{ fontSize: '13.5px', fontWeight: '500', color: '#475569', lineHeight: 1.55, marginTop: '5px' }}>
                {participants.map((p) => p.nickname || p.name).join(', ')}
              </div>
            </div>
          )}

          {winners?.overall && (
            <div style={{ borderTop: '1px solid #EEF2F7', marginTop: '12px', paddingTop: '10px' }}>
              <div style={{ ...labelStyle, color: '#B45309' }}>시상</div>
              <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[{ label: '전체', name: winners.overall.nickname }, ...winners.gradeWinners.map((g) => ({ label: g.grade, name: g.winner.nickname }))].map((row) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <span style={{ width: '30px', flexShrink: 0, fontSize: '12px', fontWeight: '600', color: '#94A3B8' }}>{row.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{row.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 스코어 / 결과 보기 — 작고 덜 도드라지게 */}
        <button
          onClick={() => navigate(`/leaderboard?id=${booking.id}`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 13px', borderRadius: '9px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', marginBottom: '20px' }}
        >
          스코어 / 결과 보기 ›
        </button>

        {/* 사진·영상 섹션 */}
        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '10px' }}>
          사진·영상 {readyItems.length > 0 ? readyItems.length : ''}
          {processingCount > 0 && <span style={{ color: '#0047AB', fontWeight: '600' }}> · 처리 중 {processingCount}</span>}
        </div>

        {uploading && (
          <div style={{ background: '#EBF2FF', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0047AB', marginBottom: '9px', textAlign: 'center' }}>
              {upLabel || '올리는 중...'}
            </div>
            <div style={{ height: '8px', background: '#C7DBFF', borderRadius: '9999px', overflow: 'hidden' }}>
              {upBusy ? (
                <div style={{ height: '100%', width: '40%', background: '#0047AB', borderRadius: '9999px', animation: 'mgIndeterminate 1.1s ease-in-out infinite' }} />
              ) : (
                <div style={{ height: '100%', width: `${upPct}%`, background: '#0047AB', borderRadius: '9999px', transition: 'width 0.2s ease' }} />
              )}
            </div>
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
            {items.map((m) => {
              const tile = { position: 'relative', aspectRatio: '1', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' };

              if (m.status === 'processing') {
                return (
                  <div key={m.id} style={{ ...tile, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#F1F5F9' }}>
                    <div style={{ width: '22px', height: '22px', border: '3px solid #C7DBFF', borderTopColor: '#0047AB', borderRadius: '9999px', animation: 'mgSpin 0.8s linear infinite' }} />
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>{m.type === 'video' ? '영상 처리 중' : '처리 중'}</div>
                  </div>
                );
              }
              if (m.status === 'failed') {
                return (
                  <div key={m.id} onClick={() => deleteItem(m)} style={{ ...tile, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#FEF2F2', cursor: 'pointer' }}>
                    <div style={{ fontSize: '18px' }}>⚠️</div>
                    <div style={{ fontSize: '10px', color: '#B91C1C', fontWeight: '600' }}>처리 실패<br />(눌러서 삭제)</div>
                  </div>
                );
              }

              const ri = readyItems.findIndex((x) => x.id === m.id);
              return (
                <div key={m.id} onClick={() => setViewerIdx(ri)} style={{ ...tile, cursor: 'pointer' }}>
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
              );
            })}
          </div>
        )}
      </div>

      {/* 확대 보기 */}
      {viewerIdx != null && readyItems[viewerIdx] && (
        <Viewer
          item={readyItems[viewerIdx]}
          index={viewerIdx}
          total={readyItems.length}
          canDelete={readyItems[viewerIdx].uploaderPhone === user.phone}
          onPrev={() => setViewerIdx((i) => (i > 0 ? i - 1 : i))}
          onNext={() => setViewerIdx((i) => (i < readyItems.length - 1 ? i + 1 : i))}
          onClose={() => setViewerIdx(null)}
          onDownload={() => downloadItem(readyItems[viewerIdx])}
          onDelete={() => deleteItem(readyItems[viewerIdx])}
        />
      )}
    </div>
  );
}

function Viewer({ item, index, total, canDelete, onPrev, onNext, onClose, onDownload, onDelete }) {
  const touchStart = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    // 확실히 가로로 민 경우에만 (영상 컨트롤과 충돌 방지)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) onNext(); else onPrev();
    }
  };
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
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
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
