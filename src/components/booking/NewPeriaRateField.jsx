import React from 'react';
import { NEWPERIA_DEFAULT_RATE } from '../../utils/newperia';

// 신페리오 적용률 입력. 라운딩 생성·수정 화면에서 공용으로 쓴다.
// 값은 화면에서 퍼센트(85)로 다루고 저장할 때 비율(0.85)로 바꾼다 — 사장님이 %로 이해하시는 게 자연스럽다.

export const rateToPercent = (rate) =>
  Math.round((Number(rate) > 0 ? Number(rate) : NEWPERIA_DEFAULT_RATE) * 100);

export const percentToRate = (percent) => {
  const n = parseInt(String(percent), 10);
  if (!Number.isFinite(n) || n <= 0) return NEWPERIA_DEFAULT_RATE;
  // 오타로 순위가 뒤집히는 걸 막는 최소 방어 (50~100%)
  return Math.min(100, Math.max(50, n)) / 100;
};

export default function NewPeriaRateField({ percent, onChange, disabled }) {
  return (
    <div style={{
      marginBottom: 16, padding: 14, background: '#FFFBEB',
      border: '1px solid #FDE68A', borderRadius: 10,
    }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
        핸디캡 적용률
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          value={percent}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
          onBlur={() => {
            // 50~100 범위로 보정한 값을 화면에 되돌려, 저장될 값과 보이는 값이 어긋나지 않게 한다
            const corrected = String(rateToPercent(percentToRate(percent)));
            if (corrected !== percent) onChange(corrected);
          }}
          style={{
            width: 80, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #FCD34D',
            fontSize: 16, fontWeight: 700, textAlign: 'center', outline: 'none',
            background: '#fff', boxSizing: 'border-box',
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#92400E' }}>%</span>
      </div>
      <div style={{ fontSize: 12, color: '#B45309', marginTop: 8, lineHeight: 1.5 }}>
        낮을수록 잘 치는 사람이 유리합니다. 일반 표준은 80%이지만, 우리 모임은 실력 차이가 넓어
        <strong> 85%를 권장</strong>합니다. 88%로 올리면 실력과 무관하게 모두 우승 확률이 같아집니다.
      </div>
    </div>
  );
}
