import { useState } from 'react';
import apiService from '../../services/api';
import { HeartIcon, CommentIcon } from './icons';

export default function ReactionBar({ targetType, targetId, likeCount, likedByViewer, commentCount, onToggleComments }) {
  const [liked, setLiked] = useState(!!likedByViewer);
  const [count, setCount] = useState(likeCount || 0);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const prevLiked = liked, prevCount = count;
    setLiked(!liked); setCount(count + (liked ? -1 : 1));
    try {
      const r = await apiService.toggleFeedReaction(targetType, targetId);
      setLiked(r.liked); setCount(r.count);
    } catch {
      setLiked(prevLiked); setCount(prevCount);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 0' }}>
      <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: 0,
        color: liked ? '#E0245E' : '#64748B', fontSize: 15, fontWeight: 600 }}>
        <HeartIcon size={21} filled={liked} />{count > 0 ? count : ''}
      </button>
      <button onClick={onToggleComments} style={{ display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: 0,
        color: '#64748B', fontSize: 15, fontWeight: 600 }}>
        <CommentIcon size={20} />{commentCount > 0 ? commentCount : ''}
      </button>
    </div>
  );
}
