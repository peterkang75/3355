import { useState } from 'react';
import apiService from '../../services/api';
import PhotoCarousel from './PhotoCarousel';
import PhotoViewer from './PhotoViewer';
import PostFooter from './PostFooter';
import LinkEmbed, { extractFirstUrl } from './LinkEmbed';

export default function FreePostCard({ item, currentUser, isOperator, onDeleted }) {
  const [viewerIdx, setViewerIdx] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const url = extractFirstUrl(item.content);
  const photos = (item.media || []).filter((m) => m.status === 'ready');
  const canDelete = item.authorId === currentUser?.id || isOperator;
  const content = item.content || '';
  const long = content.length > 90;

  const del = async () => {
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    try { await apiService.deleteFeedPost(item.id); onDeleted?.(item.id); } catch { /* noop */ }
  };

  const caption = content ? (
    <div style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap' }}>
      <b style={{ fontWeight: 700, color: '#0F172A' }}>{item.authorName}</b>{' '}
      {long && !expanded
        ? <>{content.slice(0, 90)}… <span onClick={() => setExpanded(true)} style={{ color: '#94A3B8', cursor: 'pointer' }}>더 보기</span></>
        : content}
    </div>
  ) : null;

  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#E2E8F0', flexShrink: 0 }}>
          {item.authorPhoto && <img src={item.authorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{item.authorName}</div>
        {canDelete && (<button onClick={del} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 13 }}>삭제</button>)}
      </div>

      {/* 미디어: 사진 캐러셀 → 없으면 링크/유튜브 임베드 */}
      {photos.length > 0 ? (
        <PhotoCarousel images={photos} aspectRatio="1/1" onOpen={(i) => setViewerIdx(i)} />
      ) : url ? (
        <div style={{ padding: '0 14px' }}><LinkEmbed url={url} /></div>
      ) : null}

      <PostFooter
        targetType="feedpost" targetId={item.id} item={item}
        currentUser={currentUser} isOperator={isOperator}
        shareTitle={content ? content.slice(0, 40) : item.authorName}
        captionNode={caption}
      />

      {viewerIdx != null && (
        <PhotoViewer images={photos} startIndex={viewerIdx} onClose={() => setViewerIdx(null)} />
      )}
    </div>
  );
}
