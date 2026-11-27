import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import { C, Group, Row, Sheet, textFieldStyle, primaryButtonStyle } from '../pages/manage/manageUi';

// 게스트 → 기존 회원 전환 창 (정산 청구 내역 창, 라운딩 관리 모집 탭에서 사용)
// guest: { id, name } — 게스트 Member id
export default function ConvertGuestSheet({ guest, onClose, onDone }) {
  const [members, setMembers] = useState(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/members?includeInactive=true')
      .then(r => r.json())
      .then(list => setMembers(list
        .filter(m => m.approvalStatus === 'approved') // 게스트는 approvalStatus가 'guest'라 여기서 빠진다
        // 비활성 회원 먼저 (다시 돌아온 회원이 대부분), 그다음 이름순
        .sort((a, b) => (a.isActive - b.isActive) || (a.nickname || a.name).localeCompare(b.nickname || b.name, 'ko'))))
      .catch(() => setMembers([]));
  }, []);

  const term = q.trim().toLowerCase();
  const list = (members || []).filter(m => !term || [m.nickname, m.name].some(s => (s || '').toLowerCase().includes(term)));
  const label = (m) => m.nickname && m.nickname !== m.name ? `${m.nickname} (${m.name})` : (m.nickname || m.name);

  const submit = async () => {
    const amount = parseFloat(extra) || 0;
    const msg = `게스트 "${guest.name}"을(를) 회원 "${label(picked)}"(으)로 전환할까요?\n\n`
      + '· 라운딩 명단·조편성의 게스트 이름이 회원으로 바뀝니다\n'
      + '· 게스트 청구·납부 기록이 회원 장부로 옮겨집니다\n'
      + (picked.isActive ? '' : '· 비활성 회원이 다시 활성화됩니다\n')
      + (amount > 0 ? `· 연회비 $${amount}이 새로 청구됩니다\n` : '')
      + '\n게스트 기록은 삭제되며 되돌릴 수 없습니다.';
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await apiService.convertGuestToMember(guest.id, picked.id, amount);
      alert(`${label(picked)}님으로 전환되었습니다.`);
      onDone?.();
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={`${guest.name} → 회원으로 전환`} onClose={onClose}>
      {!picked ? (
        <>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>이 게스트가 어느 회원인지 고르세요.</div>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="이름으로 찾기" style={{ ...textFieldStyle, marginBottom: 12 }} />
          <Group>
            {members === null && <div style={{ padding: 16, fontSize: 14, color: C.muted }}>불러오는 중…</div>}
            {members && list.length === 0 && <div style={{ padding: 16, fontSize: 14, color: C.muted }}>찾는 회원이 없습니다.</div>}
            {list.map(m => (
              <Row key={m.id} label={label(m)} value={m.isActive ? undefined : '비활성'} onClick={() => setPicked(m)} />
            ))}
          </Group>
        </>
      ) : (
        <>
          <Group style={{ marginBottom: 16 }}>
            <Row label={label(picked)} hint={picked.isActive ? '활성 회원' : '비활성 회원 — 전환하면 다시 활성화됩니다'} value="바꾸기" onClick={() => setPicked(null)} />
          </Group>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, margin: '0 4px 6px' }}>연회비 추가 청구 (필요할 때만)</div>
          <input value={extra} onChange={e => setExtra(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="비워 두면 청구하지 않음" style={{ ...textFieldStyle, marginBottom: 16 }} />
          <button type="button" onClick={submit} disabled={busy} style={{ ...primaryButtonStyle(busy), width: '100%' }}>
            {busy ? '전환 중…' : '회원으로 전환'}
          </button>
        </>
      )}
    </Sheet>
  );
}
