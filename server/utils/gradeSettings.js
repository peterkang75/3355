// server/utils/gradeSettings.js
// Booking.gradeSettings 병합 - 단일 소스
//
// 이 필드 하나에 성격이 다른 값이 함께 들어간다:
//   - mode            : 경기방식 (stroke / foursome / ambrose / newperia)
//   - gradeA~D        : 그레이드 구간 설정
//   - newPeria*       : 신페리오 적용률·지정 12홀·지정 이력
//
// 화면마다 자기가 아는 키만 보내기 때문에 통째로 덮어쓰면 나머지가 소멸한다.
// (실제로 라운딩 정보 수정 시 그레이드가, 그레이드 저장 시 경기방식이 지워지고 있었음)
// 그래서 저장은 반드시 이 함수를 거친다.

/**
 * 문자열 또는 객체로 저장된 gradeSettings를 객체로 파싱. 실패 시 null.
 */
function parseGradeSettings(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 기존 gradeSettings 위에 들어온 값을 병합한다.
 *
 * 키를 지우려면 `null`을 명시적으로 보낸다 (키를 생략하면 기존 값이 유지됨).
 * 예) 12홀 지정 취소 → { newPeriaHoles: null }
 *
 * @param {string|object|null} existing - DB에 저장된 현재 값
 * @param {string|object|null} incoming - 이번 요청이 보낸 값
 * @returns {string|undefined} 저장할 JSON 문자열. 병합할 게 없으면 undefined
 */
function mergeGradeSettings(existing, incoming) {
  const next = parseGradeSettings(incoming);
  if (next === null) return undefined;

  const prev = parseGradeSettings(existing) || {};
  const merged = { ...prev, ...next };

  // 명시적 null은 삭제 의도로 해석
  for (const [key, value] of Object.entries(next)) {
    if (value === null) delete merged[key];
  }

  return JSON.stringify(merged);
}

module.exports = { parseGradeSettings, mergeGradeSettings };
