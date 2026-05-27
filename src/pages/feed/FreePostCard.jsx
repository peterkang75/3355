import { useState } from 'react';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import LinkEmbed, { extractFirstUrl } from './LinkEmbed';
import apiService from '../../services/api';

export default function FreePostCard({ item, currentUser, isOperator, onDeleted }) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(item.commentCount || 0);
  const url = extractFirstUrl(item.content);
  const photos = (item.media || []).filter((m) => m.status === 'ready');
  const canDelete = item.authorId === currentUser?.id || isOperator;

  const del = async () => {
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    try { await apiService.deleteFeedPost(item.id); onDeleted?.(item.id); } catch { /* noop */ }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: '#E2E8F0', flexShrink: 0 }}>
          {item.authorPhoto && <img src={item.authorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{item.authorName}</div>
        {canDelete && (<button onClick={del} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 13 }}>삭제</button>)}
      </div>
      {item.content && (<div style={{ fontSize: 14.5, color: '#1E293B', whiteSpace: 'pre-wrap', marginTop: 8, lineHeight: 1.5 }}>{item.content}</div>)}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : '1fr 1fr', gap: 4, marginTop: 8, borderRadius: 10, overflow: 'hidden' }}>
          {photos.map((m) => (<img key={m.id} src={m.thumbUrl || m.url} alt="" style={{ width: '100%', aspectRatio: photos.length === 1 ? '4/3' : '1/1', objectFit: 'cover' }} />))}
        </div>
      )}
      <LinkEmbed url={url} />
      <ReactionBar targetType="feedpost" targetId={item.id} likeCount={item.likeCount} likedByViewer={item.likedByViewer} commentCount={commentCount} onToggleComments={() => setShowComments((s) => !s)} />
      {!showComments && item.recentComments?.slice(-2).map((c) => (<div key={c.id} style={{ fontSize: 13.5, color: '#334155', padding: '2px 0' }}><b style={{ color: '#0F172A' }}>{c.authorName}</b> {c.content}</div>))}
      {showComments && (<CommentSection targetType="feedpost" targetId={item.id} currentUser={currentUser} isOperator={isOperator} onCountChange={setCommentCount} />)}
    </div>
  );
}
