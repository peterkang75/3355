// 신페리오(New Peria) 핸디캡 계산 - 단일 소스
//
//   핸디캡 = (지정 12홀 합계 × (18 / 12) − 코스파) × 적용률
//   넷     = 18홀 그로스 − 핸디캡
//
// 지정 12홀의 점수는 핸디캡 산출과 18홀 그로스에 모두 반영된다(신페리오의 원리).
// 적용률은 라운딩별로 지정한다. 표준은 0.8이나 3355는 실력 편차(약 25타)가 넓어
// 0.8이면 상위권이 약 3배 유리하다 — 시뮬레이션 근거는 설계 문서 참조.

import { round1 } from './index';

export const NEWPERIA_DEFAULT_RATE = 0.85;
export const NEWPERIA_HOLE_COUNT = 12;
export const TOTAL_HOLES = 18;
const DEFAULT_COURSE_PAR = 72;

/**
 * gradeSettings에서 신페리오 설정을 꺼낸다.
 * @returns {{isNewPeria: boolean, rate: number, holes: number[]|null, setBy: string|null, setAt: string|null, isConfigured: boolean}}
 */
export function parseNewPeriaConfig(gradeSettings) {
  const gs = !gradeSettings
    ? null
    : (typeof gradeSettings === 'string' ? safeParse(gradeSettings) : gradeSettings);

  const isNewPeria = gs?.mode === 'newperia';
  const holes = normalizeHoles(gs?.newPeriaHoles);
  const rawRate = Number(gs?.newPeriaRate);

  return {
    isNewPeria,
    rate: Number.isFinite(rawRate) && rawRate > 0 ? rawRate : NEWPERIA_DEFAULT_RATE,
    holes,
    setBy: gs?.newPeriaSetBy ?? null,
    setAt: gs?.newPeriaSetAt ?? null,
    // 12홀이 온전히 지정된 상태여야 순위를 낼 수 있다
    isConfigured: isNewPeria && holes !== null,
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/**
 * 지정 홀 배열을 검증해 1~18 오름차순 12개로 정규화. 조건 미달이면 null.
 * 홀 번호는 1부터 시작한다.
 */
export function normalizeHoles(raw) {
  if (!Array.isArray(raw)) return null;
  const nums = raw.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_HOLES);
  const unique = [...new Set(nums)];
  if (unique.length !== NEWPERIA_HOLE_COUNT) return null;
  return unique.sort((a, b) => a - b);
}

/**
 * 12홀 지정 저장 payload를 만든다.
 * 경기방식·적용률·그레이드는 서버가 병합해 보존하므로 여기서는 신페리오 키만 보낸다.
 * 지정 취소는 명시적 null이어야 서버 병합에서 키가 삭제된다 (생략하면 기존 값이 남음).
 *
 * @param {number[]|null} holes - 지정 12홀. null이면 지정 취소
 * @param {string|null} userId - 지정한 운영진
 * @param {string} nowISO - 지정 시각 (ISO 문자열)
 */
export function buildNewPeriaHolesPayload(holes, userId, nowISO) {
  return JSON.stringify(
    holes
      ? { newPeriaHoles: holes, newPeriaSetBy: userId ?? null, newPeriaSetAt: nowISO }
      : { newPeriaHoles: null, newPeriaSetBy: null, newPeriaSetAt: null }
  );
}

/**
 * 신페리오 핸디캡 계산.
 *
 * @param {number[]} holeScores - 18홀 스코어 (0 또는 없음 = 미기록)
 * @param {number[]} hiddenHoles - 지정 홀 번호 (1~18, 12개)
 * @param {number[]} pars - 18홀 파
 * @param {number} rate - 적용률 (예: 0.85)
 * @returns {number|null} 핸디캡(소수점 1자리). 지정 홀 중 미기록이 있으면 null
 */
export function calculateNewPeriaHandicap(holeScores, hiddenHoles, pars, rate = NEWPERIA_DEFAULT_RATE) {
  const holes = normalizeHoles(hiddenHoles);
  if (!holes || !Array.isArray(holeScores)) return null;

  let sum = 0;
  for (const holeNo of holes) {
    const score = Number(holeScores[holeNo - 1]);
    // 지정 홀 중 하나라도 안 쳤으면 핸디캡을 낼 수 없다
    if (!Number.isFinite(score) || score <= 0) return null;
    sum += score;
  }

  const coursePar = Array.isArray(pars) && pars.length === TOTAL_HOLES
    ? pars.reduce((a, b) => a + (Number(b) || 0), 0)
    : DEFAULT_COURSE_PAR;

  const estimatedGross = sum * (TOTAL_HOLES / holes.length);
  const effectiveRate = Number.isFinite(Number(rate)) && Number(rate) > 0 ? Number(rate) : NEWPERIA_DEFAULT_RATE;
  const handicap = (estimatedGross - coursePar) * effectiveRate;

  // 12홀을 코스파 페이스보다 잘 친 경우 음수가 나온다 — 핸디캡을 빼앗지는 않는다
  return round1(Math.max(0, handicap));
}
