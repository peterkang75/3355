import React, { useEffect, useRef, useState } from 'react';

// 라운딩 관리 페이지 공용 부품.
// 입력 부품은 반드시 모듈 레벨에 둔다 — 부모 안에서 정의하면 매 렌더마다 새 부품으로 인식돼
// input이 다시 만들어지고, iOS에서 글자 하나 칠 때마다 키보드가 닫힌다.

export const PRIMARY = '#0047AB';
export const C = {
  text: '#1E293B',
  sub: '#64748B',
  muted: '#94A3B8',
  line: '#EEF1F5',
  border: '#E8ECF0',
  bg: '#F8FAFC',
  danger: '#DC2626',
};

// 장부식 한 줄 사이 구분선(왼쪽 들여쓰기)과 날짜 입력칸 오른쪽 정렬은 인라인 스타일로 안 돼서 한 번만 주입
export const ManageStyles = () => (
  <style>{`
    .mg-row + .mg-row::before { content: ''; position: absolute; top: 0; left: 16px; right: 0; height: 1px; background: ${C.line}; }
    .mg-input::-webkit-date-and-time-value { text-align: right; }
    .mg-input::placeholder { color: ${C.muted}; }
  `}</style>
);

export function Section({ title, aside, children }) {
  return (
    <section style={{ marginTop: 24 }}>
      {(title || aside) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 8px' }}>
          {title && <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.sub }}>{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Group({ children, style }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// 왼쪽 항목 이름 / 오른쪽 값. onClick이 있으면 줄 전체가 버튼.
export function Row({ label, hint, value, onClick, disabled, children, danger }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className="mg-row"
      type={onClick ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        minHeight: 52, padding: '6px 16px', boxSizing: 'border-box', textAlign: 'left',
        background: 'none', border: 'none', font: 'inherit',
        cursor: onClick && !disabled ? 'pointer' : 'default', opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: danger ? C.danger : C.text }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      {value !== undefined && <span style={{ fontSize: 14, color: C.sub, flexShrink: 0 }}>{value}</span>}
      {children}
      {onClick && <Chevron />}
    </Tag>
  );
}

// 줄 안에 들어가는 입력칸. 글자는 칸을 벗어날 때, 날짜·시간은 고르는 즉시 저장.
export function InlineInput({ value, onSave, type = 'text', placeholder, inputMode, width = 150, align = 'right' }) {
  const [draft, setDraft] = useState(value ?? '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value ?? ''); }, [value]);
  const isPicker = type === 'date' || type === 'time' || type === 'datetime-local';
  // 비어 있는 날짜칸은 브라우저가 "연도/월/일 --:--"를 그려 지저분하다 → "정하기"를 보여주고 칸은 투명하게 위에 덮는다
  if (isPicker && !draft) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex', justifyContent: 'flex-end', alignItems: 'center', width, minHeight: 40 }}>
        <span style={{ fontSize: 15, color: PRIMARY, fontWeight: 600 }}>정하기</span>
        <input className="mg-input" type={type} value="" aria-label={placeholder || '날짜 정하기'}
          onClick={(e) => { try { e.target.showPicker?.(); } catch { /* 지원 안 하는 브라우저는 기본 동작 */ } }}
          onChange={(e) => { setDraft(e.target.value); onSave(e.target.value); }}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }} />
      </span>
    );
  }
  return (
    <input
      className="mg-input"
      type={type}
      value={draft}
      placeholder={placeholder}
      inputMode={inputMode}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        setDraft(e.target.value);
        if (isPicker) onSave(e.target.value);
      }}
      onBlur={(e) => {
        focused.current = false;
        if (!isPicker && e.target.value !== String(value ?? '')) onSave(e.target.value);
      }}
      style={{
        width, minWidth: 0, minHeight: 40, padding: 0, border: 'none', outline: 'none', background: 'transparent',
        textAlign: align, fontSize: 15, color: C.text, fontFamily: 'inherit', WebkitAppearance: 'none',
      }}
    />
  );
}

export function Switch({ on, onChange, disabled, tone = PRIMARY }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      style={{ width: 46, height: 28, borderRadius: 14, border: 'none', padding: 0, position: 'relative', flexShrink: 0, cursor: disabled ? 'default' : 'pointer', background: on ? tone : '#E2E8F0', transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.18)', transition: 'left 0.2s' }} />
    </button>
  );
}

// 2~4개 중 하나 고르기
export function Segmented({ options, value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => !disabled && !active && onChange(o.value)}
            disabled={disabled}
            style={{
              flex: 1, minHeight: 36, padding: '0 10px', border: 'none', borderRadius: 8, whiteSpace: 'nowrap',
              background: active ? '#FFFFFF' : 'transparent', color: active ? PRIMARY : C.sub,
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// 작은 입력용 바텀시트 (회원 추가, 게스트 추가, 기본 정보 수정)
export function Sheet({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 1200 }} />
      <div role="dialog" aria-label={title} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1201, background: C.bg,
        borderRadius: '20px 20px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.22s ease-out', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px 20px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기"
            style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer', color: C.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </>
  );
}

export const textFieldStyle = {
  width: '100%', minHeight: 48, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`,
  fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#FFFFFF', color: C.text, fontFamily: 'inherit',
};

export const primaryButtonStyle = (disabled) => ({
  minHeight: 48, padding: '0 18px', borderRadius: 12, border: 'none', background: PRIMARY, color: '#FFFFFF',
  fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1, fontFamily: 'inherit',
});

export const secondaryButtonStyle = {
  flex: 1, minHeight: 44, borderRadius: 12, border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
