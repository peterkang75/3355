import React from 'react';

// 라운딩 개설 시 니어홀(니어핀) 지정 — 골프장 정보에 저장되므로 같은 골프장의 다음 라운딩에도 그대로 쓰인다.
// 골프장 정보 수정은 서버가 운영진에게만 허용하므로, 그 외에는 보기만 한다.
//
// props
//   course   : 고른 골프장 (courses 목록의 항목)
//   value    : 18칸 true/false. null이면 골프장에 저장된 값을 보여준다
//   onChange : (18칸 배열) => void
//   canEdit  : 운영진 여부

const INK = '#1E293B';
const HOLES = Array.from({ length: 18 }, (_, i) => i);

export const courseNearHoles = (course) => {
  const raw = Array.isArray(course?.nearHoles) ? course.nearHoles : [];
  return HOLES.map(i => !!raw[i]);
};

const parsOf = (course) => {
  const hp = course?.holePars;
  const list = Array.isArray(hp) ? hp : hp?.male;
  return Array.isArray(list) ? list.map(p => parseInt(p) || null) : [];
};

export const sameHoles = (a, b) => HOLES.every(i => !!a[i] === !!b[i]);

export default function NearHolePicker({ course, value, onChange, canEdit }) {
  if (!course) return null;
  const holes = value || courseNearHoles(course);
  const pars = parsOf(course);
  const picked = HOLES.filter(i => holes[i]).map(i => i + 1);

  if (!canEdit) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>니어홀</div>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.5 }}>
          {picked.length ? `${picked.join(', ')}번 홀` : '지정된 니어홀이 없습니다'} · 운영진이 바꿀 수 있습니다
        </div>
      </div>
    );
  }

  const toggle = (i) => onChange(HOLES.map(j => (j === i ? !holes[j] : holes[j])));

  const renderNine = (start, label) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
        {HOLES.slice(start, start + 9).map(i => {
          const on = holes[i];
          const par3 = pars[i] === 3;
          return (
            <button key={i} type="button" onClick={() => toggle(i)} aria-pressed={on}
              aria-label={`${i + 1}번 홀${pars[i] ? ` 파${pars[i]}` : ''}`}
              style={{
                minHeight: 46, padding: 0, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                border: on ? `1.5px solid ${INK}` : `1px solid ${par3 ? '#CBD5E1' : '#E8ECF0'}`,
                background: on ? INK : par3 ? '#F1F5F9' : '#FFFFFF',
                color: on ? '#FFFFFF' : '#1E293B',
              }}>
              <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>{i + 1}</span>
              {pars[i] && <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1, color: on ? 'rgba(255,255,255,0.75)' : par3 ? INK : '#94A3B8' }}>P{pars[i]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>니어홀</span>
        <span style={{ fontSize: 12.5, color: picked.length ? INK : '#94A3B8', fontWeight: 600 }}>
          {picked.length ? `${picked.length}개 · ${picked.join(', ')}번` : '선택 안 함'}
        </span>
      </div>
      {renderNine(0, '전반 1–9')}
      {renderNine(9, '후반 10–18')}
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, lineHeight: 1.5 }}>
        파3 홀은 회색 바탕으로 표시됩니다. 여기서 바꾸면 이 골프장의 다음 라운딩에도 그대로 적용됩니다.
      </div>
    </div>
  );
}
