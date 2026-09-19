import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import { useApp } from '../contexts/AppContext';
import { useSocket } from '../contexts/SocketContext';

// 정모 참석 투표 카드 — 카카오톡 투표와 같은 흐름으로 보이되 색은 앱 파란색.
//
// 투표 = 참가 신청이다. "참석"을 고르면 그 즉시 참가자 명단에 들어가고
// 참가비가 청구되어, 바로 입금하고 참가비 화면에서 영수증을 올릴 수 있다.

const PRIMARY = '#0047AB';
const MUTED_BAR = '#94a3b8';

const formatMoney = (n) => `$${Number(n || 0).toLocaleString()}`;

// 2026-10-05T09:00:00Z → "10월 5일 오후 9:00" (사장님·회원 모두 시드니 기준)
const formatCloseTime = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Australia/Sydney',
      month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).formatToParts(d);
    const get = (t) => parts.find(p => p.type === t)?.value || '';
    return `${get('month')} ${get('day')}일 ${get('dayPeriod')} ${get('hour')}:${get('minute')}`;
  } catch {
    return null;
  }
};

function Avatar({ person, size = 26 }) {
  const label = (person.nickname || person.name || '?').charAt(0);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'rgba(0,71,171,0.1)', color: PRIMARY,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.42), fontWeight: 700,
    }}>
      {person.photo
        ? <img src={person.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{label}</span>}
    </div>
  );
}

function AttendancePollCard() {
  const { user } = useApp();
  const socket = useSocket();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [revoting, setRevoting] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [showNotVoted, setShowNotVoted] = useState(false);

  const isOperator = ['관리자', '방장', '운영진', '클럽운영진'].includes(user?.role) || user?.isAdmin;

  const load = async () => {
    try {
      const data = await apiService.fetchActivePoll();
      setPoll(data || null);
    } catch {
      setPoll(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('polls:updated', refresh);
    return () => { socket.off('polls:updated', refresh); };
  }, [socket]);

  const totalCount = useMemo(
    () => (poll?.options || []).reduce((s, o) => s + o.count, 0),
    [poll]
  );

  if (loading || !poll) return null;

  // 투표를 이미 했고 "다시 투표하기"를 누르지 않았으면 결과를 본다
  const showResult = (!!poll.myVote && !revoting) || poll.isClosed;

  const handleVote = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const updated = await apiService.votePoll(poll.id, selected);
      setPoll(updated);
      setRevoting(false);
      setSelected('');
    } catch (e) {
      alert(e.message || '투표에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('투표를 종료할까요?\n\n종료하면 더 이상 참석 신청을 받지 않습니다.')) return;
    try {
      setPoll(await apiService.closePoll(poll.id));
    } catch (e) {
      alert(e.message || '투표 종료에 실패했습니다.');
    }
  };

  const closeText = formatCloseTime(poll.closesAt);
  const myOption = (poll.options || []).find(o => o.key === poll.myVote);

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        border: '1px solid #EEF2F7',
      }}>
        {/* ── 상단 안내 바 (카톡과 같은 자리) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '11px 16px',
          background: '#F5F7FA',
          fontSize: 12.5,
          color: poll.isClosed ? '#94a3b8' : '#64748b',
          fontWeight: 600,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
          {poll.isClosed
            ? '투표가 종료되었습니다.'
            : closeText ? `투표가 ${closeText}에 종료됩니다.` : '참석 여부를 알려주세요.'}
        </div>

        <div style={{ padding: '16px 16px 14px' }}>
          {/* ── 제목 ── */}
          <div style={{
            fontSize: 16, fontWeight: 800, color: 'var(--on-background)',
            letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            {poll.title}
          </div>
          {poll.booking && (
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 14 }}>
              {poll.booking.courseName}
              {poll.booking.date ? ` · ${poll.booking.date.slice(5).replace('-', '월 ')}일` : ''}
            </div>
          )}

          {showResult ? (
            /* ── 결과 보기 ── */
            <>
              {(poll.options || []).map(o => {
                const pct = totalCount > 0 ? Math.round((o.count / totalCount) * 100) : 0;
                const mine = poll.myVote === o.key;
                const open = expandedKey === o.key;
                return (
                  <div key={o.key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        {mine && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        <span style={{
                          fontSize: 14.5,
                          fontWeight: mine ? 800 : 600,
                          color: mine ? PRIMARY : 'var(--on-background)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{o.label}</span>
                        {o.kind === 'attend' && o.fee !== null && (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{formatMoney(o.fee)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedKey(open ? null : o.key)}
                        disabled={o.count === 0}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                          background: 'none', border: 'none', padding: '2px 0',
                          fontSize: 13.5, fontWeight: 700, color: o.count === 0 ? '#cbd5e1' : '#64748b',
                          cursor: o.count === 0 ? 'default' : 'pointer',
                        }}
                      >
                        {o.count}명
                        {o.count > 0 && (
                          <span style={{ fontSize: 9, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▼</span>
                        )}
                      </button>
                    </div>

                    <div style={{ height: 6, borderRadius: 3, background: '#EEF2F7', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: o.kind === 'attend' ? PRIMARY : MUTED_BAR,
                        transition: 'width .25s',
                      }} />
                    </div>

                    {open && o.voters.length > 0 && (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 8,
                        marginTop: 10, padding: '10px 12px',
                        background: '#F8FAFC', borderRadius: 12,
                      }}>
                        {o.voters.map(v => (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Avatar person={v} size={22} />
                            <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>{v.nickname || v.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── 버튼 줄 ── */}
              {!poll.isClosed && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {isOperator && (
                    <button onClick={handleClose} style={{
                      flex: 1, padding: '11px 0', borderRadius: 12,
                      border: '1.5px solid #E2E8F0', background: '#fff',
                      fontSize: 13.5, fontWeight: 700, color: '#64748b', cursor: 'pointer',
                    }}>투표 종료</button>
                  )}
                  <button onClick={() => { setSelected(poll.myVote || ''); setRevoting(true); }} style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    border: `1.5px solid ${PRIMARY}`, background: '#fff',
                    fontSize: 13.5, fontWeight: 700, color: PRIMARY, cursor: 'pointer',
                  }}>다시 투표하기</button>
                </div>
              )}

              <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 12 }}>
                {poll.totalVoted}명 참여
                {poll.addedByHost > 0 && ` · 방장이 직접 넣은 참가자 ${poll.addedByHost}명`}
              </div>

              {/* ── 운영진 전용: 아직 투표 안 한 사람 ── */}
              {isOperator && poll.notVoted?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <button onClick={() => setShowNotVoted(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 12.5, fontWeight: 700, color: '#ea580c', cursor: 'pointer',
                  }}>
                    아직 투표 안 한 분 {poll.notVoted.length}명
                    <span style={{ fontSize: 9, transform: showNotVoted ? 'rotate(180deg)' : 'none' }}>▼</span>
                  </button>
                  {showNotVoted && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: '#64748b', lineHeight: 1.7 }}>
                      {poll.notVoted.map(m => m.nickname || m.name).join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── 투표하기 ── */
            <>
              {(poll.options || []).map(o => {
                const active = selected === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => setSelected(o.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 12px', marginBottom: 8,
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${active ? PRIMARY : '#E9EEF5'}`,
                      background: active ? 'rgba(0,71,171,0.04)' : '#fff',
                      transition: 'all .12s',
                    }}
                  >
                    <span style={{
                      width: 19, height: 19, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${active ? PRIMARY : '#CBD5E1'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRIMARY }} />}
                    </span>
                    <span style={{
                      flex: 1, fontSize: 14.5, fontWeight: active ? 700 : 600,
                      color: active ? PRIMARY : 'var(--on-background)',
                    }}>{o.label}</span>
                    {o.kind === 'attend' && o.fee !== null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: active ? PRIMARY : '#94a3b8' }}>
                        {formatMoney(o.fee)}
                      </span>
                    )}
                  </button>
                );
              })}

              <div style={{ fontSize: 12, color: '#94a3b8', margin: '8px 2px 12px', lineHeight: 1.5 }}>
                참석을 고르면 참가 신청이 함께 되고 참가비가 청구됩니다.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {revoting && (
                  <button onClick={() => { setRevoting(false); setSelected(''); }} style={{
                    flex: 1, padding: '13px 0', borderRadius: 12,
                    border: '1.5px solid #E2E8F0', background: '#fff',
                    fontSize: 14, fontWeight: 700, color: '#64748b', cursor: 'pointer',
                  }}>취소</button>
                )}
                <button
                  onClick={handleVote}
                  disabled={!selected || submitting}
                  style={{
                    flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
                    background: (!selected || submitting) ? '#E2E8F0' : PRIMARY,
                    color: (!selected || submitting) ? '#94a3b8' : '#fff',
                    fontSize: 14.5, fontWeight: 800,
                    cursor: (!selected || submitting) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? '처리 중…' : (myOption ? '투표 바꾸기' : '투표하기')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendancePollCard;
