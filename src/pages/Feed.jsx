import { useEffect, useState, useCallback } from 'react';
import apiService from '../services/api';
import { useApp } from '../contexts/AppContext';
import { checkIsOperator } from '../utils';
import RoundPostCard from './feed/RoundPostCard';
import FreePostCard from './feed/FreePostCard';
import ComposeFreePost from './feed/ComposeFreePost';
import ComposeChooser from './feed/ComposeChooser';
import RoundPhotoUploader from './feed/RoundPhotoUploader';
import MediaGallery from './booking/MediaGallery';

export default function Feed() {
  const { user } = useApp();
  const [items, setItems] = useState(null);
  const [composeMode, setComposeMode] = useState(null); // null | 'choose' | 'free' | 'round'
  const [galleryBooking, setGalleryBooking] = useState(null);
  const [bookings, setBookings] = useState([]);

  const isOperator = checkIsOperator(user);
  const isGuest = user?.approvalStatus === 'guest' || user?.isGuest;

  const load = useCallback(() => {
    apiService.fetchFeed().then((r) => setItems(r.items || [])).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { apiService.fetchBookings().then(setBookings).catch(() => {}); }, []);

  const openGallery = (bookingId) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (b) setGalleryBooking(b);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 12px 90px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '6px 4px 12px' }}>소식</h1>
      {items === null ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 14 }}>아직 게시물이 없어요.<br />라운딩 사진을 올리거나 첫 글을 남겨보세요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((it) => it.kind === 'round'
            ? <RoundPostCard key={`r-${it.id}`} item={it} currentUser={user} isOperator={isOperator} onOpenGallery={openGallery} />
            : <FreePostCard key={`f-${it.id}`} item={it} currentUser={user} isOperator={isOperator} onDeleted={() => load()} />)}
        </div>
      )}
      {!isGuest && (
        <button onClick={() => setComposeMode('choose')} aria-label="올리기" style={{ position: 'fixed', right: 18, bottom: 'calc(72px + env(safe-area-inset-bottom))', width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#0047AB', color: '#fff', fontSize: 28, boxShadow: '0 4px 14px rgba(0,71,171,0.4)', zIndex: 1500 }}>+</button>
      )}
      {composeMode === 'choose' && (
        <ComposeChooser
          onPickRound={() => setComposeMode('round')}
          onPickFree={() => setComposeMode('free')}
          onClose={() => setComposeMode(null)}
        />
      )}
      {composeMode === 'free' && <ComposeFreePost onClose={() => setComposeMode(null)} onCreated={() => load()} />}
      {composeMode === 'round' && (
        <RoundPhotoUploader currentUser={user} onClose={() => setComposeMode(null)} onUploaded={() => load()} />
      )}
      {galleryBooking && (<MediaGallery booking={galleryBooking} user={user} onClose={() => { setGalleryBooking(null); load(); }} />)}
    </div>
  );
}
