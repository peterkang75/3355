// 소식 피드 공용 라인 아이콘 (컬러 이모티콘 대체, 인스타그램풍 아웃라인)

export const HeartIcon = ({ size = 26, filled = false, color = '#1E293B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#ED4956' : 'none'} aria-hidden="true">
    <path d="M12 20.5s-7.2-4.6-9.3-9.2C1.3 8 3 4.8 6.1 4.8c2 0 3.3 1.2 3.9 2.3.6-1.1 1.9-2.3 3.9-2.3 3.1 0 4.8 3.2 3.4 6.5-2.1 4.6-9.3 9.2-9.3 9.2z"
      stroke={filled ? '#ED4956' : color} strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const CommentIcon = ({ size = 25, color = '#1E293B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShareIcon = ({ size = 24, color = '#1E293B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
