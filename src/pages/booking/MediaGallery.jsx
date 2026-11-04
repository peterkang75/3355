import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import { compressImageFile } from '../../utils/compressImage';
import { parseParticipants } from '../../utils';
import { getManagePermissions } from './bookingHelpers';
import { computeRoundingRanking, deriveWinners, deriveFoursomeWinners } from '../../utils/roundingRanking';

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

// 라운딩 기록 화면 — 결과·참가자·사진을 한 곳에. 지난 라운딩 카드와 피드에서 연다.
// rememberReturn: 다른 화면에 갔다가 뒤로 오면 라운딩 목록이 이 화면을 다시 연다 (목록에서 열었을 때만)
export default function MediaGallery({ booking, user, onClose, onOpenManage, rememberReturn = false }) {
  const [items, setItems] = useState([]);
  const [archivedAt, setArchivedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [upLabel, setUpLabel] = useState('');
  const [upPct, setUpPct] = useState(0);
  const [upBusy, setUpBusy] = useState(false); // 서버 처리 중(진행률 알 수 없음) = 움직이는 막대
  const [error, setError] = useState('');
  const [viewerIdx, setViewerIdx] = useState(null);
  const [slideDir, setSlideDir] = useState('next'); // 'next' | 'prev' — 확대보기 슬라이드 방향
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const { members, courses } = useApp();
  const [winners, setWinners] = useState(null);
  const participants = parseParticipants(booking.participants);
  const timeStr = booking.time && booking.time !== '23:59' ? String(booking.time).slice(0, 5) : '';
  const labelStyle = { fontSize: '11px', fontWeight: '700', color: '#9A9DA6', letterSpacing: '0.06em' };
  const goTo = (path) => {
    if (rememberReturn) { try { sessionStorage.setItem('reopenGalleryBooking', booking.id); } catch { /* noop */ } }
    navigate(path);
  };
  const [ntpRecords, setNtpRecords] = useState([]);
  const isCompetition = booking.type === '컴페티션';
  const isOver = new Date(booking.date) < new Date(new Date().setHours(0, 0, 0, 0));
  const hasTeams = (() => {
    try {
      const t = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
      return Array.isArray(t) && t.some((x) => x?.members?.some(Boolean));
    } catch { return false; }
  })();
  const canManage = !!onOpenManage && getManagePermissions(booking, user).canManage;
  const share = async () => {
    const url = `${window.location.origin}/booking?id=${booking.id}`;
    try {
      if (navigator.share) await navigator.share({ title: booking.title || booking.courseName, url });
      else { await navigator.clipboard.writeText(url); alert('링크를 복사했습니다'); }
    } catch { /* 공유 취소 */ }
  };

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
        const { processedScores, newPeria, isMixed, foursomePairs, rankByGross } =
          computeRoundingRanking(scores, { booking, members, courses });
        // 내 기록 — 우승자와 같은 명단(스코어 있음·신페리오 완주)에서 줄 순서 = 등수 (리더보드와 동일)
        const played = processedScores.filter((s) => s.totalScore > 0 && !s.netPending);
        const myIdx = played.findIndex((s) => s.phone === user.phone || s.odId === user.phone || s.odId === user.id);
        const me = myIdx >= 0 ? played[myIdx] : null;
        setWinners({
          played: played.length,
          myRecord: me && { rank: myIdx + 1, label: rankByGross ? '타수' : 'NET', score: rankByGross ? me.totalScore : me.netScore },
          ...deriveWinners(processedScores, { isNewPeria: newPeria.isConfigured }),
          isMixed,
          // 조별 지정 라운딩은 개인 시상과 별개로 포썸 우승·준우승 페어를 함께 낸다
          foursomeWinners: isMixed ? deriveFoursomeWinners(foursomePairs, 2) : [],
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [booking, members, courses, user.phone, user.id]);

  // 니어 — 리더보드와 같은 기록, 홀마다 가장 가까운 사람
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ntp/${booking.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (!cancelled && Array.isArray(rows)) setNtpRecords(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [booking.id]);

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
      <style>{`@keyframes mgIndeterminate { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } } @keyframes mgSpin { to { transform: rotate(360deg); } } @keyframes mgSlideInRight { from { transform: translateX(160px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes mgSlideInLeft { from { transform: translateX(-160px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .mg-strip::-webkit-scrollbar { display: none; }`}</style>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: 'max(14px, env(safe-area-inset-top)) 12px 10px', borderBottom: '1px solid #EFEDE7', flexShrink: 0 }}>
        <button onClick={onClose} aria-label="뒤로" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1A1D26', display: 'flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: '16px', fontWeight: '700', color: '#1A1D26' }}>{isOver ? '지난 라운딩' : '라운딩 기록'}</div>
        {canManage && (
          <button onClick={() => onOpenManage(booking)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', fontSize: '14px', fontWeight: '600', color: '#5E6473' }}>관리</button>
        )}
        <button onClick={share} aria-label="공유" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#5E6473', display: 'flex' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 24px', background: '#F7F5F0' }}>
        {/* 제목 */}
        {booking.type === '정기모임' && (
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#9C7A45', marginBottom: '4px' }}>정기라운딩</div>
        )}
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#1A1D26', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
          {booking.title || booking.courseName}
        </div>
        <div style={{ fontSize: '13px', color: '#5E6473', marginTop: '6px', lineHeight: 1.5 }}>
          {fmtDate(booking.date)}{timeStr ? ` ${timeStr}` : ''} · {booking.courseName}{participants.length ? ` · ${participants.length}명` : ''}
          {booking.restaurantName && <><br />회식 · {booking.restaurantName}</>}
        </div>

        {/* 결과 */}
        {winners && (() => {
          // 신페리오는 그레이드 없이 전체 1·2·3등으로 시상한다
          const individualRows = !winners.overall
            ? []
            : winners.podium.length
              ? winners.podium.map((p) => ({ label: `${p.rank}등`, name: p.winner.nickname }))
              : [
                  { label: '우승', name: winners.overall.nickname },
                  ...winners.gradeWinners.map((g) => ({ label: `${g.grade}그레이드`, name: g.winner.nickname })),
                ];
          // 조별 지정 라운딩은 개인 시상과 포썸 시상을 함께 보여준다
          const rows = winners.isMixed
            ? [
                ...individualRows.map((r) => ({ ...r, label: `신페리오 ${r.label}` })),
                ...winners.foursomeWinners.map((w) => ({
                  label: `포썸 ${w.rank}위`,
                  name: `${w.pair.memberNames} (${w.pair.teamNumber}조 ${w.pair.pairLabel}팀)`,
                })),
              ]
            : individualRows;
          // 니어: 홀마다 가장 가까운 사람
          const nearByHole = {};
          for (const r of ntpRecords) {
            if (!nearByHole[r.holeNumber] || r.distance < nearByHole[r.holeNumber].distance) nearByHole[r.holeNumber] = r;
          }
          const nearRows = Object.keys(nearByHole).map(Number).sort((x, y) => x - y)
            .map((h) => ({ label: `니어 ${h}번`, name: nearByHole[h].memberName }));
          const all = [...rows, ...nearRows];
          const labelW = winners.isMixed ? '86px' : '72px';
          return (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginTop: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={labelStyle}>결과</div>
              {all.length === 0 ? (
                <div style={{ fontSize: '14px', color: '#9A9DA6', marginTop: '8px' }}>스코어가 아직 입력되지 않았습니다</div>
              ) : (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {all.map((row) => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                      <span style={{ width: labelW, flexShrink: 0, fontSize: '13px', color: '#9A9DA6' }}>{row.label}</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#1A1D26' }}>{row.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {winners.myRecord && (
                <div style={{ borderTop: '1px solid #EFEDE7', marginTop: '14px', paddingTop: '12px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ width: labelW, flexShrink: 0, fontSize: '13px', color: '#9A9DA6' }}>내 기록</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#14284B' }}>
                    {winners.played}명 중 {winners.myRecord.rank}위
                    <span style={{ fontWeight: '500', color: '#5E6473' }}> · {winners.myRecord.label} {winners.myRecord.score}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* 참가자 */}
        {participants.length > 0 && (
          <div style={{ marginTop: '22px' }}>
            <div style={labelStyle}>참가자 {participants.length}</div>
            <div style={{ fontSize: '14px', color: '#4B5060', lineHeight: 1.6, marginTop: '6px' }}>
              {participants.map((p) => p.nickname || p.name).join(', ')}
            </div>
            {(hasTeams || (isOver && !isCompetition)) && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {hasTeams && (
                  <span onClick={() => goTo(`/team-formation?id=${booking.id}`)} style={{ fontSize: '13px', fontWeight: '600', color: '#5E6473', cursor: 'pointer', padding: '6px 0' }}>조편성 보기 ›</span>
                )}
                {isOver && !isCompetition && (
                  <span onClick={() => goTo(`/play?id=${booking.id}`)} style={{ fontSize: '13px', fontWeight: '600', color: '#5E6473', cursor: 'pointer', padding: '6px 0' }}>스코어 입력 ›</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 사진·영상 섹션 */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '22px', marginBottom: '8px' }}>
          <div style={{ ...labelStyle, flex: 1 }}>
            사진·영상 {readyItems.length > 0 ? readyItems.length : ''}
            {processingCount > 0 && <span style={{ color: '#14284B' }}> · 처리 중 {processingCount}</span>}
          </div>
          {!archivedAt && (
            <span onClick={uploading ? undefined : handlePick} style={{ fontSize: '13px', fontWeight: '600', color: '#14284B', cursor: 'pointer', padding: '6px 0', opacity: uploading ? 0.5 : 1 }}>＋ 올리기</span>
          )}
        </div>

        {uploading && (
          <div style={{ background: '#EEF1F6', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#14284B', marginBottom: '9px', textAlign: 'center' }}>
              {upLabel || '올리는 중...'}
            </div>
            <div style={{ height: '8px', background: '#D3DBE8', borderRadius: '9999px', overflow: 'hidden' }}>
              {upBusy ? (
                <div style={{ height: '100%', width: '40%', background: '#14284B', borderRadius: '9999px', animation: 'mgIndeterminate 1.1s ease-in-out infinite' }} />
              ) : (
                <div style={{ height: '100%', width: `${upPct}%`, background: '#14284B', borderRadius: '9999px', transition: 'width 0.2s ease' }} />
              )}
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: '12px', padding: '12px', fontSize: '13px', marginBottom: '14px' }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#9A9DA6', padding: '60px 0', fontSize: '14px' }}>불러오는 중...</div>
        ) : archivedAt ? (
          <div style={{ textAlign: 'center', padding: '70px 24px', color: '#5E6473' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#4B5060', marginBottom: '4px' }}>이 라운딩의 사진·영상은<br />백업 후 정리되었습니다</div>
            <div style={{ fontSize: '12px', color: '#9A9DA6' }}>({fmtDate(archivedAt)} 정리)</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 24px', color: '#9A9DA6' }}>
            <div style={{ fontSize: '14px' }}>아직 사진·영상이 없습니다</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>＋ 올리기로 추가하세요</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {items.map((m) => {
              const tile = { position: 'relative', aspectRatio: '1', background: '#EFEDE7', borderRadius: '6px', overflow: 'hidden' };

              if (m.status === 'processing') {
                return (
                  <div key={m.id} style={{ ...tile, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#EFEDE7' }}>
                    <div style={{ width: '22px', height: '22px', border: '3px solid #D3DBE8', borderTopColor: '#14284B', borderRadius: '9999px', animation: 'mgSpin 0.8s linear infinite' }} />
                    <div style={{ fontSize: '11px', color: '#5E6473', fontWeight: '600' }}>{m.type === 'video' ? '영상 처리 중' : '처리 중'}</div>
                  </div>
                );
              }
              if (m.status === 'failed') {
                return (
                  <div key={m.id} onClick={() => deleteItem(m)} style={{ ...tile, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#FEF2F2', cursor: 'pointer' }}>
                    <div style={{ fontSize: '11px', color: '#B91C1C', fontWeight: '600' }}>처리 실패<br />(눌러서 삭제)</div>
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
                        <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px' }}>{fmtDur(m.durationSec)}</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 버튼 — 하나만 */}
      <div style={{ padding: '10px 16px max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid #EFEDE7', background: '#fff', flexShrink: 0 }}>
        <button onClick={() => goTo(`/leaderboard?id=${booking.id}`)} style={{ width: '100%', minHeight: 50, border: 'none', borderRadius: '12px', background: '#14284B', color: '#fff', fontSize: '15px', fontWeight: '700', fontFamily: 'inherit', cursor: 'pointer' }}>
          전체 스코어 보기
        </button>
      </div>

      {/* 확대 보기 */}
      {viewerIdx != null && readyItems[viewerIdx] && (
        <Viewer
          item={readyItems[viewerIdx]}
          items={readyItems}
          index={viewerIdx}
          total={readyItems.length}
          slideDir={slideDir}
          canDelete={readyItems[viewerIdx].uploaderPhone === user.phone}
          onPrev={() => { if (viewerIdx > 0) { setSlideDir('prev'); setViewerIdx(viewerIdx - 1); } }}
          onNext={() => { if (viewerIdx < readyItems.length - 1) { setSlideDir('next'); setViewerIdx(viewerIdx + 1); } }}
          onSelect={(i) => { if (i !== viewerIdx) { setSlideDir(i > viewerIdx ? 'next' : 'prev'); setViewerIdx(i); } }}
          onClose={() => setViewerIdx(null)}
          onDownload={() => downloadItem(readyItems[viewerIdx])}
          onDelete={() => deleteItem(readyItems[viewerIdx])}
        />
      )}
    </div>
  );
}

function Viewer({ item, items, index, total, slideDir, canDelete, onPrev, onNext, onSelect, onClose, onDownload, onDelete }) {
  const anim = `${slideDir === 'prev' ? 'mgSlideInLeft' : 'mgSlideInRight'} 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)`;
  const touchStart = useRef(null);
  const stripRef = useRef(null);
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

  // 확대 보기 열릴 때 스와이프 힌트 잠깐 표시 후 사라짐
  const [hint, setHint] = useState(total > 1);
  useEffect(() => {
    if (total <= 1) return undefined;
    setHint(true);
    const t = setTimeout(() => setHint(false), 2200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 현재 썸네일을 필름스트립 가운데로 스크롤
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const TW = 56; // 썸네일 50 + gap 6
    el.scrollTo({ left: Math.max(0, 12 + index * TW + 25 - el.clientWidth / 2), behavior: 'smooth' });
  }, [index]);

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
          <video key={item.id} src={item.url} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%', animation: anim }} />
        ) : (
          <img key={item.id} src={item.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', animation: anim }} />
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

        {/* 스와이프 힌트 — 잠깐 떴다 사라짐 */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '24px', display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: hint ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <div style={{ background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: '13px', fontWeight: '600', padding: '8px 16px', borderRadius: '9999px', letterSpacing: '0.01em' }}>
            ←  스와이프하여 보기  →
          </div>
        </div>
      </div>

      {/* 썸네일 필름스트립 */}
      {total > 1 && (
        <div ref={stripRef} className="mg-strip" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 12px', flexShrink: 0, scrollbarWidth: 'none' }}>
          {items.map((m, i) => (
            <div
              key={m.id}
              onClick={() => onSelect(i)}
              style={{ width: '50px', height: '50px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', position: 'relative', border: i === index ? '2px solid #DC2626' : '2px solid transparent', opacity: i === index ? 1 : 0.5 }}
            >
              <img src={m.thumbnailUrl || m.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {m.type === 'video' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}><polygon points="6 4 20 12 6 20 6 4"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 하단 정보 */}
      <div style={{ textAlign: 'center', color: '#D5D2CA', fontSize: '12px', padding: '10px 16px max(16px, env(safe-area-inset-bottom))', flexShrink: 0 }}>
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
