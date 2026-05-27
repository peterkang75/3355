import { useState, useRef, useEffect } from 'react';

// 전체화면 이미지 뷰어 + 하단 필름스트립 (MediaGallery 뷰어와 동일 UX). images: [{ url, thumbUrl, type }]
export default function PhotoViewer({ images, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [dir, setDir] = useState('next');
  const touch = useRef(null);
  const stripRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const TW = 56;
    el.scrollTo({ left: Math.max(0, 12 + index * TW + 25 - el.clientWidth / 2), behavior: 'smooth' });
  }, [index]);

  const go = (i) => { if (i >= 0 && i < images.length && i !== index) { setDir(i > index ? 'next' : 'prev'); setIndex(i); } };
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) go(index + 1); else go(index - 1); }
  };

  if (!images || images.length === 0) return null;
  const item = images[index];
  const anim = `${dir === 'prev' ? 'pvSlideL' : 'pvSlideR'} 0.4s cubic-bezier(0.22,0.61,0.36,1)`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2200, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes pvSlideR{from{transform:translateX(140px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes pvSlideL{from{transform:translateX(-140px);opacity:0}to{transform:translateX(0);opacity:1}}.pv-strip::-webkit-scrollbar{display:none}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {item.type === 'video' ? (
          <video key={index} src={item.url} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%', animation: anim }} />
        ) : (
          <img key={index} src={item.url || item.thumbUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', animation: anim }} />
        )}
        {index > 0 && (
          <button onClick={() => go(index - 1)} style={navBtn('left')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {index < images.length - 1 && (
          <button onClick={() => go(index + 1)} style={navBtn('right')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div ref={stripRef} className="pv-strip" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px', flexShrink: 0, scrollbarWidth: 'none' }}>
          {images.map((m, i) => (
            <div key={i} onClick={() => go(i)}
              style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: i === index ? '2px solid #EF4444' : '2px solid transparent', opacity: i === index ? 1 : 0.5 }}>
              <img src={m.thumbUrl || m.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 12, padding: '10px 16px max(16px, env(safe-area-inset-bottom))', flexShrink: 0 }}>
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

const navBtn = (side) => ({
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 8,
  width: 40, height: 40, borderRadius: 9999, border: 'none',
  background: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
});
