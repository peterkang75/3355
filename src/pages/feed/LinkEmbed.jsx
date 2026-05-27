import { useState } from 'react';

const URL_RE = /(https?:\/\/[^\s]+)/i;

function youtubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function extractFirstUrl(text) {
  if (!text) return null;
  const m = text.match(URL_RE);
  return m ? m[0] : null;
}

export default function LinkEmbed({ url }) {
  const [playing, setPlaying] = useState(false);
  if (!url) return null;
  const yt = youtubeId(url);

  if (yt) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9',
        borderRadius: 10, overflow: 'hidden', background: '#000', marginTop: 8 }}>
        {playing ? (
          <iframe title="youtube" width="100%" height="100%"
            src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
            frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen
            style={{ position: 'absolute', inset: 0 }} />
        ) : (
          <button onClick={() => setPlaying(true)} style={{ position: 'absolute', inset: 0,
            border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}>
            <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>▶</span>
          </button>
        )}
      </div>
    );
  }

  const isInsta = /instagram\.com/i.test(url);
  let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* noop */ }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: 12,
        border: '1px solid #E2E8F0', borderRadius: 10, textDecoration: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <span style={{ fontSize: 20 }}>{isInsta ? '📷' : '🔗'}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, color: '#0F172A', fontSize: 14 }}>
          {isInsta ? 'Instagram' : host}</span>
        <span style={{ display: 'block', color: '#94A3B8', fontSize: 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
      </span>
    </a>
  );
}
