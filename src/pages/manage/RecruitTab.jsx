import React, { useState } from 'react';
import apiService from '../../services/api';
import { parseParticipants } from '../../utils';
import { generateListPdf } from '../../utils/pdfList';
import { getBookingStatusFlags } from '../booking/bookingHelpers';
import AttendancePollManager, { toLocalInput } from '../../components/AttendancePollManager';
import {
  PRIMARY, C, Section, Group, Row, InlineInput, Switch, Segmented, Sheet,
  textFieldStyle, primaryButtonStyle, secondaryButtonStyle,
} from './manageUi';

// 조편성 화면과 같은 이름표 색 (DESIGN.md 3-1)
const CHIP = {
  male: { bg: '#E1EBF9', color: '#0047AB', border: '#BFDBFE' },
  female: { bg: '#FEE2E2', color: '#BE185D', border: '#FECACA' },
  guest: { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
  rental: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};
// shortcut: 접힌 상태는 "2줄"을 재지 않고 앞 8명만 보여준다. 이름 길이에 따라 1~3줄이 될 수 있음 — 거슬리면 높이 측정으로 교체.
const COLLAPSED_COUNT = 8;

function Chip({ label, kind, onClick }) {
  const c = CHIP[kind];
  return (
    <button type="button" onClick={onClick}
      style={{ minHeight: 36, padding: '0 12px', borderRadius: 18, border: `1px solid ${c.border}`, background: c.bg, color: c.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  );
}

function AddMemberSheet({ booking, members, participants, onAdd, onClose }) {
  const [q, setQ] = useState('');
  const taken = new Set(participants.map(p => p.phone));
  const term = q.trim().toLowerCase();
  const list = members
    .filter(m => m.isActive && m.approvalStatus === 'approved' && !taken.has(m.phone))
    .filter(m => !term || (m.nickname || m.name || '').toLowerCase().includes(term));
  return (
    <Sheet title="회원 추가" onClose={onClose}>
      <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="이름으로 찾기" style={{ ...textFieldStyle, marginBottom: 12 }} />
      <Group>
        {list.length === 0 && <div style={{ padding: 16, fontSize: 14, color: C.muted }}>{term ? '찾는 회원이 없습니다.' : '추가할 수 있는 회원이 없습니다.'}</div>}
        {list.map(m => (
          <Row key={m.id} label={m.nickname || m.name}
            hint={booking.type === '컴페티션' && !m.golflinkNumber?.trim() ? '골프링크 번호 없음' : undefined}
            onClick={() => onAdd(m)} />
        ))}
      </Group>
    </Sheet>
  );
}

function AddGuestSheet({ onAdd, onClose, saving }) {
  const [name, setName] = useState('');
  const [hc, setHc] = useState('');
  const submit = () => name.trim() && onAdd(name.trim(), hc);
  return (
    <Sheet title="게스트 추가" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="이름" style={{ ...textFieldStyle, flex: 2 }}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <input value={hc} onChange={e => setHc(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="핸디" style={{ ...textFieldStyle, flex: 1, minWidth: 0 }}
          onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>핸디를 비우면 36으로 들어갑니다.</div>
      <button type="button" onClick={submit} disabled={saving || !name.trim()} style={{ ...primaryButtonStyle(saving || !name.trim()), width: '100%' }}>
        게스트 추가
      </button>
    </Sheet>
  );
}

export default function RecruitTab({ booking, members, perms, save, saving, reload }) {
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState(null); // 'member' | 'guest' | null
  const [busy, setBusy] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);

  const participants = parseParticipants(booking.participants);
  const phones = new Set(participants.map(p => p.phone).filter(Boolean));
  const rentals = (booking.numberRentals || []).filter(ph => !phones.has(ph)).map(ph => {
    const m = members.find(mm => mm.phone === ph);
    return { phone: ph, name: m ? (m.nickname || m.name) : '번호대여', isRental: true };
  });
  const total = participants.length + rentals.length;
  const max = booking.maxMembers || 4;
  const showMax = booking.type !== '컴페티션';

  const kindOf = (p) => {
    if (p.isRental) return 'rental';
    if (p.isGuest || p.phone?.startsWith('guest_')) return 'guest';
    const m = members.find(mm => mm.phone === p.phone || mm.id === p.memberId);
    return m?.gender === '여' ? 'female' : 'male';
  };
  const rows = [...participants, ...rentals];
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);
  const hasGuest = rows.some(p => kindOf(p) === 'guest');
  const hasRental = rentals.length > 0;

  const saveParticipants = (list) => save({ participants: list.map(p => JSON.stringify(p)) });

  const removeChip = async (p) => {
    const name = p.nickname || p.name;
    if (p.isRental) {
      if (!window.confirm(`${name}님의 번호대여를 취소할까요?`)) return;
      try { await apiService.toggleNumberRental(booking.id, p.phone); await reload(); }
      catch { alert('번호대여 취소에 실패했습니다.'); }
      return;
    }
    if (!window.confirm(`${name}님을 명단에서 뺄까요?`)) return;
    // 게스트를 빼면 이 라운딩에 붙은 게스트 청구도 함께 지운다
    if (p.isGuest && p.id) {
      try { await apiService.deleteChargeTransaction(p.id, booking.id); } catch { /* 청구가 없으면 무시 */ }
    }
    await saveParticipants(participants.filter(x => x.phone !== p.phone));
  };

  const addMember = async (m) => {
    if (booking.type === '컴페티션' && !m.golflinkNumber?.trim()) {
      alert(`${m.nickname || m.name}님은 골프링크 번호가 없어 컴페티션에 추가할 수 없습니다.`);
      return;
    }
    setSheet(null);
    await saveParticipants([...participants, { name: m.name, nickname: m.nickname, phone: m.phone, memberId: m.id }]);
  };

  const addGuest = async (name, hcText) => {
    const hc = parseFloat(hcText);
    setBusy(true);
    try {
      await apiService.addGuestToBooking(booking.id, name, isNaN(hc) ? 36 : hc);
      await reload();
      setSheet(null);
    } catch { alert('게스트 추가 중 오류가 발생했습니다.'); }
    finally { setBusy(false); }
  };

  const inviteUrl = booking.inviteToken ? `${window.location.origin}/invite/${booking.inviteToken}` : '';
  const makeInvite = async () => {
    setBusy(true);
    try { await apiService.generateInviteLink(booking.id); await reload(); }
    catch { alert('초대링크를 만들지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const shareInvite = () => {
    if (navigator.share) navigator.share({ title: '라운딩 초대', url: inviteUrl }).catch(() => {});
    else { navigator.clipboard.writeText(inviteUrl); alert('링크를 복사했습니다.'); }
  };
  const deleteInvite = async () => {
    if (!window.confirm('초대링크를 지우면 이미 보낸 링크로는 들어올 수 없습니다.')) return;
    setBusy(true);
    try { await apiService.deleteInviteLink(booking.id); await reload(); }
    catch { alert('초대링크를 지우지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const downloadGaList = () => {
    const date = booking.date || '';
    const list = participants.map(p => {
      const m = members.find(mm => mm.phone === p.phone || mm.id === p.memberId);
      return { name: m?.gaRegisteredName || '-', golflink: m?.golflinkNumber || '-' };
    }).sort((a, b) => a.name.localeCompare(b.name));
    generateListPdf({
      title: '3355 GOLF CLUB',
      subtitle: date,
      columns: [
        { key: 'name', header: 'GA Registered Name', x: 14 },
        { key: 'golflink', header: 'Golflink Number', x: 110 },
      ],
      rows: list,
      totalLabel: `Total: ${list.length} players`,
      fileName: `3355_GA_List_${date}.pdf`,
    });
  };

  const { isRegistrationClosed } = getBookingStatusFlags(booking);
  const closeHint = booking.status === 'closed' ? '직접 마감함'
    : booking.status === 'open' ? '직접 열어 둠 (마감일이 지나도 접수)'
    : isRegistrationClosed ? '마감일이 지나 자동 마감됨' : '마감일까지 자동 접수';

  return (
    <>
      {/* 핵심: 몇 명 모였나 */}
      <Group style={{ padding: '18px 16px 16px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>명 참가</span>
          {showMax && <span style={{ fontSize: 14, color: C.muted, marginLeft: 'auto' }}>최대 {max}명</span>}
        </div>
        {showMax && (
          <div style={{ height: 4, borderRadius: 2, background: '#EEF1F5', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (total / max) * 100)}%`, background: total >= max ? '#16A34A' : PRIMARY, borderRadius: 2 }} />
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ fontSize: 14, color: C.muted, marginTop: 16 }}>아직 참가자가 없습니다. 아래에서 회원이나 게스트를 추가하세요.</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
              {visible.map((p, i) => (
                <Chip key={p.phone || i} label={p.nickname || p.name} kind={kindOf(p)} onClick={() => removeChip(p)} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, minHeight: 28 }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                이름을 누르면 뺄 수 있습니다
                {hasGuest && <><span style={{ color: CHIP.guest.color, marginLeft: 8 }}>●</span> 게스트</>}
                {hasRental && <><span style={{ color: CHIP.rental.color, marginLeft: 8 }}>●</span> 번호대여</>}
              </span>
              {rows.length > COLLAPSED_COUNT && (
                <button type="button" onClick={() => setExpanded(v => !v)}
                  style={{ border: 'none', background: 'none', color: PRIMARY, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
                  {expanded ? '접기' : `전체 보기 (${rows.length})`}
                </button>
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={() => setSheet('member')} disabled={saving} style={secondaryButtonStyle}>회원 추가</button>
          <button type="button" onClick={() => setSheet('guest')} disabled={saving} style={secondaryButtonStyle}>게스트 추가</button>
        </div>
      </Group>

      {perms.canAdvanced && (
        <Section title="모집 설정">
          <Group>
            <Row label="모집 방식">
              <div style={{ width: 180 }}>
                <Segmented value={!!booking.isRecruiting} disabled={saving}
                  options={[{ value: true, label: '멤버 모집' }, { value: false, label: '즉시 플레이' }]}
                  onChange={v => save({ isRecruiting: v })} />
              </div>
            </Row>
            {showMax && (
              <Row label="최대 인원">
                <InlineInput type="number" inputMode="numeric" width={60} value={booking.maxMembers ?? ''}
                  onSave={v => save({ maxMembers: parseInt(v) || 4 })} />
                <span style={{ fontSize: 15, color: C.sub }}>명</span>
              </Row>
            )}
            <Row label="접수 마감일">
              {/* 투표는 표준시(…Z)로, 예전 화면은 현지 글자로 저장해 왔다 → 보여줄 땐 시드니 시각, 저장은 표준시로 통일 */}
              <InlineInput type="datetime-local" width={190} value={toLocalInput(booking.registrationDeadline)}
                onSave={v => save({ registrationDeadline: v ? new Date(v).toISOString() : null })} />
            </Row>
            <Row label="접수 마감" hint={closeHint}>
              <Switch on={isRegistrationClosed} tone={C.danger} disabled={saving}
                onChange={() => save({ status: isRegistrationClosed ? 'open' : 'closed' })} />
            </Row>
          </Group>
        </Section>
      )}

      <Section title="참석 받기">
        {/* 투표 카드는 공지문까지 통째로 보여줘 길어서, 눌렀을 때만 펼친다 */}
        <Group>
          <Row label="참석 투표" hint="회원이 앱에서 참석을 누르면 바로 참가 신청 + 청구" value={pollOpen ? '접기' : '열기'} onClick={() => setPollOpen(v => !v)} />
        </Group>
        {pollOpen && <div style={{ marginTop: 10 }}><AttendancePollManager booking={booking} onChanged={reload} /></div>}
        {!perms.isClubMemberOnly && (
          <Group style={{ marginTop: 10 }}>
            {inviteUrl ? (
              <Row label="게스트 초대링크" hint="링크를 받은 사람은 회원이 아니어도 참가할 수 있습니다">
                <button type="button" onClick={deleteInvite} disabled={busy}
                  style={{ border: 'none', background: 'none', color: C.muted, fontSize: 13, fontWeight: 600, minHeight: 44, padding: '0 6px', cursor: 'pointer', fontFamily: 'inherit' }}>지우기</button>
                <button type="button" onClick={shareInvite}
                  style={{ border: 'none', background: '#EBF2FF', color: PRIMARY, fontSize: 13, fontWeight: 700, minHeight: 36, padding: '0 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {navigator.share ? '공유' : '복사'}
                </button>
              </Row>
            ) : (
              <Row label="게스트 초대링크" hint="회원이 아닌 사람도 링크로 참가 신청" value={busy ? '만드는 중…' : '만들기'} onClick={makeInvite} disabled={busy} />
            )}
          </Group>
        )}
      </Section>

      {participants.length > 0 && (
        <Section title="명단 내보내기">
          <Group>
            <Row label="GA 명단 PDF" hint="골프장 제출용 (GA 등록 이름 · 골프링크 번호)" value="받기" onClick={downloadGaList} />
          </Group>
        </Section>
      )}

      {sheet === 'member' && (
        <AddMemberSheet booking={booking} members={members} participants={participants} onAdd={addMember} onClose={() => setSheet(null)} />
      )}
      {sheet === 'guest' && <AddGuestSheet onAdd={addGuest} onClose={() => setSheet(null)} saving={busy} />}
    </>
  );
}
