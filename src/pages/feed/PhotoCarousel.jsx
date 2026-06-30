import { useState, useRef } from 'react';

// 인라인 가로 스와이프 캐러셀 + 페이지 점 + 좌우 화살표. images: [{ thumbUrl, url, type }]
export default function PhotoCarousel({ images, onOpen, aspectRatio = '1/1' }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  if (!images || images.length === 0) return null;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  const scrollTo = (i) => {
    const el = ref.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  const multi = images.length > 1;

  return (
    <div style={{ position: 'relative', background: '#000' }}>
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', aspectRatio,
        }}
      >
        {images.map((m, i) => (
          <button
            key={i}
            onClick={() => onOpen?.(i)}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'start', border: 'none', padding: 0, margin: 0, background: '#000', cursor: 'pointer' }}
          >
            <img src={m.thumbUrl || m.url} alt="" loading="lazy"
              style={{ width: '100%', height: '100%', aspectRatio, objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>

      {multi && (
        <>
          {/* 좌우 화살표 — 끝에 닿으면 해당 방향 화살표 숨김 */}
          {idx > 0 && (
            <button onClick={(e) => { e.stopPropagation(); scrollTo(idx - 1); }} aria-label="이전 사진" style={arrowBtn('left')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {idx < images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); scrollTo(idx + 1); }} aria-label="다음 사진" style={arrowBtn('right')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}

          {/* 우상단 카운터 */}
          <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
            {idx + 1}/{images.length}
          </div>

          {/* 페이지 점 — 사진이 많으면 지저분하므로 8장 이하일 때만 */}
          {images.length <= 8 && (
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none' }}>
              {images.map((_, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)' }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const arrowBtn = (side) => ({
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 8,
  width: 30, height: 30, borderRadius: '50%', border: 'none', padding: 0,
  background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', zIndex: 2,
});
