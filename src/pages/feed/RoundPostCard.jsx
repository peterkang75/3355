import { useState } from 'react';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import { PhotoIcon } from './icons';

export default function RoundPostCard({ item, currentUser, isOperator, onOpenGallery }) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(item.commentCount || 0);
  const d = new Date(item.date);
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '12px 14px 8px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{item.title}</div>
        <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>{item.courseName} · {d.getMonth() + 1}/{d.getDate()}</div>
      </div>
      <button onClick={() => onOpenGallery(item.id)} style={{ display: 'block', width: '100%', border: 'none', padding: 0, cursor: 'pointer', position: 'relative', background: '#F1F5F9' }}>
        {item.coverThumbUrl
          ? <img src={item.coverThumbUrl} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', aspectRatio: '4/3' }} />}
        <span style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}><PhotoIcon size={13} color="#fff" /> {item.mediaCount}</span>
      </button>
      <div style={{ padding: '4px 14px 12px' }}>
        <ReactionBar targetType="booking" targetId={item.id} likeCount={item.likeCount} likedByViewer={item.likedByViewer} commentCount={commentCount} onToggleComments={() => setShowComments((s) => !s)} />
        {!showComments && item.recentComments?.slice(-2).map((c) => (
          <div key={c.id} style={{ fontSize: 13.5, color: '#334155', padding: '2px 0' }}><b style={{ color: '#0F172A' }}>{c.authorName}</b> {c.content}</div>
        ))}
        {showComments && (<CommentSection targetType="booking" targetId={item.id} currentUser={currentUser} isOperator={isOperator} onCountChange={setCommentCount} />)}
      </div>
    </div>
  );
}
