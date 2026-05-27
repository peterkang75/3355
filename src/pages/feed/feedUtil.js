export function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return '방금 전';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}일 전`;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

// 좋아요 요약 줄: "○○○님 외 N명이 좋아합니다"
export function likesSummary(count, names) {
  if (!count || count <= 0) return '';
  const first = (names && names[0]) || null;
  if (!first) return `좋아요 ${count}개`;
  if (count === 1) return `${first}님이 좋아합니다`;
  return `${first}님 외 ${count - 1}명이 좋아합니다`;
}

// 공유: 기기 공유시트 → 없으면 링크 복사
export async function sharePost(title) {
  const url = window.location.origin;
  const text = title ? `${title} · 3355 골프클럽` : '3355 골프클럽';
  try {
    if (navigator.share) { await navigator.share({ title: text, url }); return; }
  } catch { return; } // 사용자가 취소한 경우
  try { await navigator.clipboard.writeText(url); alert('링크가 복사되었습니다.'); } catch { /* noop */ }
}
