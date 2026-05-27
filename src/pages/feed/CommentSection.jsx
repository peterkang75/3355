import { useEffect, useState } from 'react';
import apiService from '../../services/api';

export default function CommentSection({ targetType, targetId, currentUser, isOperator }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const isGuest = currentUser?.approvalStatus === 'guest' || currentUser?.isGuest;

  useEffect(() => {
    apiService.fetchFeedComments(targetType, targetId)
      .then((r) => setComments(r.comments || [])).catch(() => setComments([]));
  }, [targetType, targetId]);

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const r = await apiService.addFeedComment(targetType, targetId, t);
      setComments((cs) => [...(cs || []), r.comment]); setText('');
    } catch { /* noop */ } finally { setSending(false); }
  };

  const remove = async (id) => {
    try { await apiService.deleteFeedComment(id);
      setComments((cs) => cs.filter((c) => c.id !== id)); } catch { /* noop */ }
  };

  if (comments === null) return null;

  return (
    <div style={{ marginTop: 4 }}>
      {comments.map((c) => (
        <div key={c.id} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: '#0F172A', flexShrink: 0 }}>{c.authorName}</span>
          <span style={{ color: '#334155', flex: 1 }}>{c.content}</span>
          {(c.authorId === currentUser?.id || isOperator) && (
            <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none',
              color: '#CBD5E1', cursor: 'pointer', fontSize: 12 }}>삭제</button>
          )}
        </div>
      ))}
      {!isGuest && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="댓글 입력..."
            style={{ flex: 1, minHeight: 40, border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '0 12px', fontSize: 14 }} />
          <button onClick={submit} disabled={sending}
            style={{ minHeight: 40, padding: '0 14px', border: 'none', borderRadius: 8,
              background: '#0047AB', color: '#fff', fontWeight: 600, fontSize: 14 }}>등록</button>
        </div>
      )}
    </div>
  );
}
