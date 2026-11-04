import React, { useState } from 'react';
import { NEWPERIA_HOLE_COUNT, TOTAL_HOLES } from '../../utils/newperia';
import NewPeriaRateField, { rateToPercent, percentToRate } from '../../components/booking/NewPeriaRateField';

// 신페리오 12홀 지정 시트.
// 제비뽑기는 현장에서 하고, 그 결과를 여기에 입력한다.
// 지정 시각·지정자를 함께 남겨 "스코어 보고 고른 것 아니냐"는 의심에 대응할 근거로 삼는다.

const ACCENT = '#d97706';

export default function NewPeriaHolesSheet({ initialHoles, initialRate, setByName, setAt, onSave, onClear, onClose, saving }) {
  const [selected, setSelected] = useState(() => new Set(initialHoles || []));
  // 적용률은 홀과 함께 확정한다 — 순위가 나오기 직전이 조정하기 가장 자연스러운 시점이다
  const [percent, setPercent] = useState(() => String(rateToPercent(initialRate)));
  const hadPrevious = Array.isArray(initialHoles) && initialHoles.length === NEWPERIA_HOLE_COUNT;

  const toggle = (hole) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hole)) next.delete(hole);
      else if (next.size < NEWPERIA_HOLE_COUNT) next.add(hole);
      return next;
    });
  };

  const count = selected.size;
  const complete = count === NEWPERIA_HOLE_COUNT;

  const handleSave = () => {
    if (!complete || saving) return;
    if (hadPrevious) {
      const ok = window.confirm(
        '이미 지정된 홀이 있습니다.\n\n바꾸면 순위와 우승자가 달라질 수 있습니다.\n계속하시겠습니까?'
      );
      if (!ok) return;
    }
    onSave([...selected].sort((a, b) => a - b), percentToRate(percent));
  };

  const handleClear = () => {
    if (saving) return;
    const ok = window.confirm('지정을 취소하면 순위가 그로스 기준으로 돌아갑니다.\n계속하시겠습니까?');
    if (!ok) return;
    onClear(percentToRate(percent));
  };

  const renderRow = (label, from, to) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8, letterSpacing: '0.05em' }}>{label}</div>
      {/* minmax(0,1fr) + minWidth 0 이 없으면 aspect-ratio 때문에 칸이 화면 밖으로 밀린다 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: 5 }}>
        {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((hole) => {
          const on = selected.has(hole);
          const full = !on && count >= NEWPERIA_HOLE_COUNT;
          return (
            <button
              key={hole}
              onClick={() => toggle(hole)}
              disabled={saving}
              style={{
                aspectRatio: '1', padding: 0, borderRadius: 9, minWidth: 0,
                border: on ? `2px solid ${ACCENT}` : '1px solid #E2E8F0',
                background: on ? '#FEF3C7' : '#fff',
                color: on ? ACCENT : (full ? '#CBD5E1' : '#475569'),
                fontWeight: on ? 800 : 600, fontSize: 13.5, lineHeight: 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {hole}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{
        background: '#fff', width: '100%', maxHeight: '88vh', overflowY: 'auto',
        borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18,
        paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={onClose} disabled={saving}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer' }}>취소</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#0F172A' }}>신페리오 홀 지정</div>
          <span style={{ width: 40 }} />
        </div>

        <div style={{ fontSize: 12.5, color: '#94A3B8', textAlign: 'center', marginBottom: 16, lineHeight: 1.5 }}>
          제비뽑기로 뽑은 {NEWPERIA_HOLE_COUNT}개 홀을 선택하세요.<br />
          이 홀들의 점수로 참가자별 핸디캡이 정해집니다.
        </div>

        {hadPrevious && setAt && (
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 10, marginBottom: 16, fontSize: 12.5, color: '#64748B', lineHeight: 1.5 }}>
            현재 지정: {setByName || '알 수 없음'} · {new Date(setAt).toLocaleString('ko-KR', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}

        {renderRow('OUT', 1, 9)}
        {renderRow('IN', 10, TOTAL_HOLES)}

        <NewPeriaRateField percent={percent} onChange={setPercent} disabled={saving} />

        <div style={{
          textAlign: 'center', padding: '12px 0', marginBottom: 14,
          fontSize: 14, fontWeight: 700, color: complete ? ACCENT : '#94A3B8',
        }}>
          {NEWPERIA_HOLE_COUNT}개 중 {count}개 선택
          {!complete && count > 0 && (
            <span style={{ fontWeight: 500 }}> · {NEWPERIA_HOLE_COUNT - count}개 더 필요</span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!complete || saving}
          style={{
            width: '100%', padding: 15, borderRadius: 14, border: 'none',
            background: complete && !saving ? ACCENT : '#E2E8F0',
            color: complete && !saving ? '#fff' : '#94A3B8',
            fontSize: 15, fontWeight: 800,
            cursor: complete && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? '저장 중…' : '저장하고 순위 매기기'}
        </button>

        {hadPrevious && (
          <button onClick={handleClear} disabled={saving}
            style={{
              width: '100%', padding: 12, marginTop: 8, borderRadius: 14,
              border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            지정 취소
          </button>
        )}
      </div>
    </div>
  );
}
