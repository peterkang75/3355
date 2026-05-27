import { useState } from 'react';
import apiService from '../../services/api';
import { compressImageFile } from '../../utils/compressImage';

export default function ComposeFreePost({ onClose, onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const pick = (e) => setFiles(Array.from(e.target.files || []));

  const submit = async () => {
    if (!text.trim() && files.length === 0) return;
    setBusy(true);
    try {
      const { id } = await apiService.createFeedPost(text.trim());
      if (files.length > 0) {
        const imgs = await Promise.all(files.map((f) => f.type.startsWith('image/') ? compressImageFile(f) : f));
        await apiService.uploadFeedPostMedia(id, imgs);
      }
      onCreated?.();
      onClose();
    } catch { alert('게시 실패. 다시 시도해주세요.'); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', width: '100%', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 15 }}>취소</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>새 글</div>
          <button onClick={submit} disabled={busy} style={{ background: 'none', border: 'none', color: '#0047AB', fontWeight: 700, fontSize: 15 }}>{busy ? '게시중…' : '게시'}</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="무슨 일이 있었나요? (유튜브/인스타 링크도 붙여보세요)" style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, resize: 'none', boxSizing: 'border-box' }} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, color: '#0047AB', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          📷 사진 추가
          <input type="file" accept="image/*,video/*" multiple onChange={pick} style={{ display: 'none' }} />
        </label>
        {files.length > 0 && <span style={{ marginLeft: 8, color: '#64748B', fontSize: 13 }}>{files.length}개 선택됨</span>}
      </div>
    </div>
  );
}
