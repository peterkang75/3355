import React, { useEffect, useRef, useState } from 'react';
import { C, Section, Group, Row, InlineInput, Switch, textFieldStyle } from './manageUi';

const FEES = [
  { field: 'greenFee', waive: 'waiveGreenFeeForClubMembers', label: '그린피' },
  { field: 'cartFee', waive: 'waiveCartFeeForClubMembers', label: '카트비' },
  { field: 'membershipFee', waive: 'waiveMembershipFeeForClubMembers', label: '참가비' },
];

// 면제를 켰을 때 실제로 누가 면제되는지 바로 보여준다 (회원 정보의 소속 클럽 = 골프장 이름)
function WaivePreview({ members, courseName }) {
  const base = { margin: '10px 4px 0', fontSize: 12.5, lineHeight: 1.6 };
  if (!courseName) return <p style={{ ...base, color: '#92400E' }}>골프장이 비어 있어 면제 대상을 알 수 없습니다.</p>;
  const matches = members.filter(m => m?.club && m.club === courseName);
  if (matches.length === 0) return <p style={{ ...base, color: C.danger }}>"{courseName}" 소속 회원이 없습니다. 회원 정보의 소속 클럽을 확인하세요.</p>;
  const names = matches.slice(0, 6).map(m => m.nickname || m.name).filter(Boolean).join(', ');
  return <p style={{ ...base, color: C.sub }}>면제 대상 <strong style={{ color: C.text }}>{matches.length}명</strong>: {names}{matches.length > 6 ? ` 외 ${matches.length - 6}명` : ''}</p>;
}

// 메모는 여러 줄이라 줄 안 입력칸 대신 별도 칸. 칸을 벗어날 때 저장.
function NotesField({ value, onSave }) {
  const [draft, setDraft] = useState(value || '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value || ''); }, [value]);
  return (
    <textarea
      value={draft}
      rows={4}
      placeholder="참가자에게 보일 안내사항"
      onFocus={() => { focused.current = true; }}
      onChange={e => setDraft(e.target.value)}
      onBlur={e => { focused.current = false; if (e.target.value !== (value || '')) onSave(e.target.value); }}
      style={{ ...textFieldStyle, resize: 'vertical', lineHeight: 1.6 }}
    />
  );
}

export default function CostTab({ booking, members, save, saving }) {
  const anyWaived = FEES.some(f => booking[f.waive]);
  const noCourse = !booking.courseName;

  return (
    <>
      <Section title="비용 (1인)">
        <Group>
          {FEES.map(f => (
            <Row key={f.field} label={f.label}>
              <span style={{ fontSize: 15, color: C.muted }}>$</span>
              <InlineInput type="number" inputMode="numeric" width={70} placeholder="0" value={booking[f.field] ?? ''}
                onSave={v => save({ [f.field]: parseInt(v) || null })} />
            </Row>
          ))}
        </Group>
      </Section>

      <Section title="골프장 소속 회원 면제">
        <Group>
          {FEES.map(f => (
            <Row key={f.waive} label={`${f.label} 면제`}>
              <Switch on={!!booking[f.waive]} disabled={saving || noCourse} onChange={v => save({ [f.waive]: v })} />
            </Row>
          ))}
        </Group>
        {(anyWaived || noCourse) && <WaivePreview members={members} courseName={booking.courseName} />}
      </Section>

      <Section title="회식">
        <Group>
          <Row label="장소">
            <InlineInput width={190} placeholder="식당 이름" value={booking.restaurantName || ''} onSave={v => save({ restaurantName: v || null })} />
          </Row>
          <Row label="주소">
            <InlineInput width={190} placeholder="주소" value={booking.restaurantAddress || ''} onSave={v => save({ restaurantAddress: v || null })} />
          </Row>
        </Group>
      </Section>

      <Section title="메모">
        <NotesField value={booking.notes} onSave={v => save({ notes: v || null })} />
      </Section>
    </>
  );
}
