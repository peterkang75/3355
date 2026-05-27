// 소식 피드 공용 라인 아이콘 (컬러 이모티콘 대체)
export const PhotoIcon = ({ size = 20, color = '#0047AB' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} strokeWidth="1.8" />
    <circle cx="8.5" cy="10" r="1.6" stroke={color} strokeWidth="1.8" />
    <path d="M5 17l4.5-4 3 2.5L16 12l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EditIcon = ({ size = 20, color = '#0047AB' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M14 5l5 5M4 20l1-4 10-10 4 4-10 10-5 1z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HeartIcon = ({ size = 22, filled = false, color = '#64748B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#E0245E' : 'none'} aria-hidden="true">
    <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5c0 5-7 9.5-7 9.5z"
      stroke={filled ? '#E0245E' : color} strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const CommentIcon = ({ size = 20, color = '#64748B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 5h16v11H9l-4 3v-3H4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const LinkIcon = ({ size = 18, color = '#64748B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1M9 15l6-6"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlayIcon = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);
