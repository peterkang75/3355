import React, { useEffect, useState } from 'react';
import apiService from '../services/api';

// 방장·운영진이 라운딩 관리 시트에서 참석 투표를 만들고 관리하는 카드.
//
// 투표를 만들면 회원 홈 최상단에 카톡 모양 투표가 뜨고, 회원이 "참석"을 고르는
// 순간 참가 신청 + 참가비 청구가 함께 일어난다.

const PRIMARY = '#0047AB';

const cardStyle = { background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '10px' };
const labelStyle = { fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '11px 13px', borderRadius: '10px', border: '1px solid #E8ECF0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#FAFBFC', color: '#111827' };

// 라운딩에 등록된 기본 참가비 (금액을 비워두면 이 금액이 청구된다)
const defaultFeeOf = (booking) =>
  (booking?.greenFee || 0) + (booking?.cartFee || 0) + (booking?.membershipFee || 0);

// "2099-10-25" → 그 달 이름으로 기본 제목 만들기
const defaultTitleOf = (booking) => {
  const m = String(booking?.date || '').slice(5, 7);
  return m ? `${parseInt(m, 10)}월 정모 참석` : '참석 투표';
};

// DateTime ↔ <input type="datetime-local"> 변환 (시드니 기준)
const toLocalInput = (iso) => {
  if (!iso) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(iso)).reduce((a, p) => (p.type !== 'literal' && (a[p.type] = p.value), a), {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch { return ''; }
};

function AttendancePollManager({ booking, onChanged }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [attendOptions, setAttendOptions] = useState([{ label: '참석', fee: '' }]);
  const [absentLabel, setAbsentLabel] = useState('불참');
  const [closesAt, setClosesAt] = useState('');

  const load = async () => {
    try {
      setPoll(await apiService.fetchPollByBooking(booking.id));
    } catch {
      setPoll(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [booking.id]);

  const startCreate = () => {
    setTitle(defaultTitleOf(booking));
    setAttendOptions([{ label: '참석', fee: '' }]);
    setAbsentLabel('불참');
    setClosesAt('');
    setEditing(true);
  };

  const startEdit = () => {
    setTitle(poll.title);
    // key를 반드시 들고 다녀야 한다. 새 key로 저장되면 이미 들어온 투표가 어느 선택지
    // 것인지 알 수 없게 되어 집계가 0으로 떨어진다.
    setAttendOptions(poll.options.filter(o => o.kind === 'attend').map(o => ({ key: o.key, label: o.label, fee: o.fee === null ? '' : String(o.fee) })));
    setAbsentLabel(poll.options.find(o => o.kind === 'absent')?.label || '불참');
    setClosesAt(toLocalInput(poll.closesAt));
    setEditing(true);
  };

  const buildPayload = () => ({
    title: title.trim(),
    options: [
      ...attendOptions
        .filter(o => o.label.trim())
        .map(o => ({ ...(o.key ? { key: o.key } : {}), label: o.label.trim(), kind: 'attend', fee: o.fee === '' ? null : Number(o.fee) })),
      { label: absentLabel.trim() || '불참', kind: 'absent' },
    ],
    // datetime-local 값은 기기 시간대로 해석된다. 사장님·회원 모두 시드니라 그대로 쓴다.
    closesAt: closesAt ? new Date(closesAt).toISOString() : null,
  });

  const handleSave = async () => {
    if (!title.trim()) { alert('투표 제목을 입력해주세요.'); return; }
    if (!attendOptions.some(o => o.label.trim())) { alert('참석 선택지를 1개 이상 입력해주세요.'); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      const saved = poll
        ? await apiService.updatePoll(poll.id, payload)
        : await apiService.createPoll({ bookingId: booking.id, ...payload });
      setPoll(saved);
      setEditing(false);
      onChanged?.();
    } catch (e) {
      alert(e.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('투표를 종료할까요?\n\n종료하면 더 이상 참석 신청을 받지 않습니다.')) return;
    try { setPoll(await apiService.closePoll(poll.id)); onChanged?.(); }
    catch (e) { alert(e.message || '종료에 실패했습니다.'); }
  };

  const handleReopen = async () => {
    try { setPoll(await apiService.reopenPoll(poll.id)); onChanged?.(); }
    catch (e) { alert(e.message || '재개에 실패했습니다.'); }
  };

  const handleDelete = async () => {
    if (!confirm('투표를 삭제할까요?\n\n이미 발행된 참가비 청구와 참가자 명단은 그대로 남습니다.\n투표 기록만 사라집니다.')) return;
    try { await apiService.deletePoll(poll.id); setPoll(null); onChanged?.(); }
    catch (e) { alert(e.message || '삭제에 실패했습니다.'); }
  };

  const shareUrl = `${window.location.origin}/vote`;
  const handleShare = () => {
    const text = `${poll?.title || '참석 투표'} — 앱에서 투표해주세요`;
    if (navigator.share) navigator.share({ title: text, url: shareUrl }).catch(() => {});
    else { navigator.clipboard.writeText(shareUrl); alert('투표 링크가 복사되었습니다.\n카톡방에 붙여넣기 해주세요.'); }
  };

  if (loading) return null;

  // ── 만들기 / 수정 폼 ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>{poll ? '참석 투표 수정' : '참석 투표 만들기'}</div>

        {poll?.totalVoted > 0 && (
          <div style={{ fontSize: 11.5, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 11px', marginBottom: 12, lineHeight: 1.55 }}>
            이미 {poll.totalVoted}명이 투표했습니다. <b>금액을 바꿔도 이미 투표한 분들의 청구서는 그대로</b>입니다 — 참가비 화면에서 직접 고쳐주세요. 선택지를 지우면 그 선택지에 투표한 분들의 표가 사라집니다(참가자 명단은 남습니다).
          </div>
        )}

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 10월 정모 참석"
          style={{ ...inputStyle, fontWeight: 700, marginBottom: 12 }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>참석 선택지</div>
        {attendOptions.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input value={o.label}
              onChange={e => setAttendOptions(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
              placeholder="예: 참석 (컴피티션)"
              style={{ ...inputStyle, flex: 1 }} />
            <div style={{ position: 'relative', width: 104, flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>$</span>
              <input value={o.fee} inputMode="decimal"
                onChange={e => setAttendOptions(prev => prev.map((x, j) => j === i ? { ...x, fee: e.target.value.replace(/[^0-9.]/g, '') } : x))}
                placeholder={String(defaultFeeOf(booking))}
                style={{ ...inputStyle, paddingLeft: 24 }} />
            </div>
            {attendOptions.length > 1 && (
              <button onClick={() => setAttendOptions(prev => prev.filter((_, j) => j !== i))}
                style={{ width: 36, flexShrink: 0, borderRadius: 10, border: '1px solid #E8ECF0', background: '#fff', color: '#94A3B8', fontSize: 17, cursor: 'pointer' }}>×</button>
            )}
          </div>
        ))}
        <button onClick={() => setAttendOptions(prev => [...prev, { label: '', fee: '' }])}
          style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed #CBD5E1', background: '#FAFBFC', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}>
          + 참석 선택지 추가
        </button>
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginBottom: 14, lineHeight: 1.5 }}>
          금액을 비워두면 이 라운딩의 기본 참가비 ${defaultFeeOf(booking)}가 청구됩니다. 참가비 면제 회원은 어느 쪽을 골라도 $0입니다.
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>불참 선택지</div>
        <input value={absentLabel} onChange={e => setAbsentLabel(e.target.value)} placeholder="불참"
          style={{ ...inputStyle, marginBottom: 14 }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>투표 마감</div>
        <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)}
          style={{ ...inputStyle, marginBottom: 6 }} />
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginBottom: 14, lineHeight: 1.5 }}>
          이 시간이 참가 신청 마감이기도 합니다. 지나면 투표도 참가 신청도 잠깁니다. 비워두면 마감 없이 계속 열려 있습니다.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing(false)} disabled={saving}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E8ECF0', background: '#fff', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : PRIMARY, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '저장 중…' : (poll ? '수정 저장' : '투표 만들기')}
          </button>
        </div>
      </div>
    );
  }

  // ── 아직 투표가 없을 때 ───────────────────────────────────────────────────
  if (!poll) {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>참석 투표</div>
        <div style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.6, marginBottom: 12 }}>
          카톡 투표 대신 앱에서 참석을 받습니다. 회원이 "참석"을 고르면 그 즉시 참가 신청이 되고 참가비가 청구돼, 바로 입금하고 영수증을 올릴 수 있습니다.
        </div>
        <button onClick={startCreate}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px dashed #CBD5E1', background: '#FAFBFC', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          참석 투표 만들기
        </button>
      </div>
    );
  }

  // ── 투표 현황 ─────────────────────────────────────────────────────────────
  const attendTotal = poll.options.filter(o => o.kind === 'attend').reduce((s, o) => s + o.count, 0);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={labelStyle}>참석 투표</div>
        <span style={{
          fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 7,
          background: poll.isClosed ? '#F1F5F9' : '#E6F0FF',
          color: poll.isClosed ? '#94A3B8' : PRIMARY,
        }}>{poll.isClosed ? '종료됨' : '진행 중'}</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{poll.title}</div>

      {poll.options.map(o => (
        <div key={o.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 600 }}>
            {o.label}
            {o.kind === 'attend' && o.fee !== null && (
              <span style={{ fontSize: 11.5, color: '#94A3B8', marginLeft: 6 }}>${o.fee}</span>
            )}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: o.kind === 'attend' ? PRIMARY : '#94A3B8' }}>{o.count}명</span>
        </div>
      ))}

      <div style={{ fontSize: 11.5, color: '#94A3B8', margin: '10px 0 12px', lineHeight: 1.6 }}>
        {poll.totalVoted}명 투표 · 참석 {attendTotal}명 · 참가자 명단 {poll.participantCount}명
        {poll.notVoted?.length > 0 && <><br />아직 투표 안 한 분 {poll.notVoted.length}명: {poll.notVoted.slice(0, 8).map(m => m.nickname || m.name).join(', ')}{poll.notVoted.length > 8 ? ' 외' : ''}</>}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={handleShare}
          style={{ flex: '1 1 100%', padding: '11px', borderRadius: 10, border: 'none', background: PRIMARY, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          {navigator.share ? '카톡방에 투표 링크 공유' : '투표 링크 복사'}
        </button>
        <button onClick={startEdit}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E8ECF0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>수정</button>
        {poll.isClosed ? (
          <button onClick={handleReopen}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E8ECF0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>다시 열기</button>
        ) : (
          <button onClick={handleClose}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E8ECF0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>종료</button>
        )}
        <button onClick={handleDelete}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #FEE2E2', background: '#fff', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>삭제</button>
      </div>
    </div>
  );
}

export default AttendancePollManager;
