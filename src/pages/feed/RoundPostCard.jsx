import PhotoCarousel from './PhotoCarousel';
import PostFooter from './PostFooter';
import { PhotoIcon } from './icons';

export default function RoundPostCard({ item, currentUser, isOperator, onOpenGallery }) {
  const d = new Date(item.date);
  const photos = item.photos || [];
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PhotoIcon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{item.courseName} · {d.getMonth() + 1}/{d.getDate()}</div>
        </div>
      </div>

      {/* 사진 캐러셀 (탭 → 전체 갤러리) */}
      {photos.length > 0 && (
        <PhotoCarousel images={photos} aspectRatio="4/3" onOpen={() => onOpenGallery(item.id)} />
      )}

      <PostFooter targetType="booking" targetId={item.id} item={item} currentUser={currentUser} isOperator={isOperator} shareTitle={item.title} />
    </div>
  );
}
