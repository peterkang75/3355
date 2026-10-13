import React from 'react';

// 공지 글의 **굵게** 표시를 굵은 글씨로 보여준다 (그 외 문법은 처리하지 않음)
export function renderBold(text) {
  if (!text) return text;
  return String(text).split(/(\*\*[^*\n]+?\*\*)/g).map((part, i) =>
    /^\*\*[^*\n]+?\*\*$/.test(part)
      ? <strong key={i} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong>
      : part
  );
}

// 배너 미리보기처럼 한 줄로 줄여 보여줄 때: ** 제거 + 줄바꿈을 공백으로
export function plainPreview(text) {
  if (!text) return text;
  return String(text).replace(/\*\*/g, '').replace(/\s*\n+\s*/g, ' ').trim();
}
