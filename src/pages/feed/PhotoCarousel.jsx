import { useState, useRef } from 'react';

// 인라인 가로 스와이프 캐러셀 + 페이지 점. images: [{ thumbUrl, url, type }]
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

      {images.length > 1 && (
        <>
          <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
            {idx + 1}/{images.length}
          </div>
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none' }}>
            {images.map((_, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
