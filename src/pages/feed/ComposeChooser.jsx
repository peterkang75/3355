import { PhotoIcon, EditIcon } from './icons';

export default function ComposeChooser({ onPickRound, onPickFree, onClose }) {
  const card = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 16,
    border: '1px solid #E2E8F0', borderRadius: 12, background: '#fff', cursor: 'pointer', minHeight: 44,
  };
  const iconWrap = {
    width: 40, height: 40, borderRadius: 10, background: '#EFF4FF',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>무엇을 올릴까요?</div>
        <button onClick={onPickRound} style={{ ...card, marginBottom: 10 }}>
          <span style={iconWrap}><PhotoIcon size={22} /></span>
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>정기모임 사진</span>
            <span style={{ display: 'block', fontSize: 12.5, color: '#94A3B8' }}>지난 라운딩을 골라 사진을 추가</span>
          </span>
        </button>
        <button onClick={onPickFree} style={card}>
          <span style={iconWrap}><EditIcon size={22} /></span>
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>자유 게시물</span>
            <span style={{ display: 'block', fontSize: 12.5, color: '#94A3B8' }}>글과 사진을 자유롭게</span>
          </span>
        </button>
      </div>
    </div>
  );
}
