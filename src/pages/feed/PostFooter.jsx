import { useState } from 'react';
import apiService from '../../services/api';
import CommentSection from './CommentSection';
import { HeartIcon, CommentIcon, ShareIcon } from './icons';
import { timeAgo, likesSummary, sharePost } from './feedUtil';

const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', minHeight: 44, minWidth: 40, alignItems: 'center' };

export default function PostFooter({ targetType, targetId, item, currentUser, isOperator, shareTitle, captionNode }) {
  const myName = currentUser?.nickname || currentUser?.name || '나';
  const [liked, setLiked] = useState(!!item.likedByViewer);
  const [likeCount, setLikeCount] = useState(item.likeCount || 0);
  const [likeNames, setLikeNames] = useState(item.likeNames || []);
  const [commentCount, setCommentCount] = useState(item.commentCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    const prev = { liked, likeCount, likeNames };
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    setLikeNames((ns) => (nextLiked ? [myName, ...ns.filter((n) => n !== myName)] : ns.filter((n) => n !== myName)));
    try {
      const r = await apiService.toggleFeedReaction(targetType, targetId);
      setLiked(r.liked);
      setLikeCount(r.count);
    } catch {
      setLiked(prev.liked); setLikeCount(prev.likeCount); setLikeNames(prev.likeNames);
    } finally { setBusy(false); }
  };

  const summary = likesSummary(likeCount, likeNames);

  return (
    <div style={{ padding: '6px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0 2px' }}>
        <button onClick={toggleLike} style={iconBtn} aria-label="좋아요"><HeartIcon size={26} filled={liked} /></button>
        <button onClick={() => setShowComments((s) => !s)} style={iconBtn} aria-label="댓글"><CommentIcon size={25} /></button>
        <button onClick={() => sharePost(shareTitle)} style={iconBtn} aria-label="공유"><ShareIcon size={24} /></button>
      </div>

      {summary && (
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', margin: '2px 0' }}>{summary}</div>
      )}

      {captionNode}

      {commentCount > 0 && !showComments && (
        <button onClick={() => setShowComments(true)} style={{ background: 'none', border: 'none', padding: '4px 0 0', color: '#94A3B8', fontSize: 13.5, cursor: 'pointer' }}>
          댓글 {commentCount}개 모두 보기
        </button>
      )}

      {showComments && (
        <CommentSection targetType={targetType} targetId={targetId} currentUser={currentUser} isOperator={isOperator} onCountChange={setCommentCount} />
      )}

      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {timeAgo(item.feedTs)}
      </div>
    </div>
  );
}
