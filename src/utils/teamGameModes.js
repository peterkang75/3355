// 조별 경기 방식(혼용) - 단일 소스
//
// 한 라운딩 안에서 조마다 다른 경기 방식을 쓰기 위한 규칙.
//
//   gradeSettings.mode      : 기본 방식 (기존 키 그대로 — 조 배정이 없는 사람에게 적용)
//   gradeSettings.teamModes : 조별 방식 { "1": "foursome", "3": "newperia" }
//
// teamModes가 비어 있으면 모든 판정이 기존 mode 하나로 떨어진다 → 기존 라운딩 동작 불변.
// 이 파일은 "누가 어떤 방식으로 뛰는가"만 답한다. 계산·렌더는 각 화면이 기존대로 한다.

import { GAME_MODES } from '../constants/gameModes';

// 이번 단계에서 혼용을 지원하는 방식. 조별 지정 UI가 이 목록만 노출한다.
// (스트로크·엠브로스 혼용은 구조상 가능하나 이번 범위 밖 — 저장된 값은 존중한다)
export const MIXABLE_MODES = ['newperia', 'foursome'];

// 'stableford'는 GAME_MODES에 없지만 방장 관리 시트에서 실제로 저장되는 값이라 허용한다
// (계산은 스트로크와 동일하고, 조별 지정에서는 고를 수 없다)
const VALID_MODES = [...GAME_MODES.map((m) => m.value), 'stableford'];
const DEFAULT_MODE = 'stroke';

function safeParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** booking.teams(문자열 또는 배열)를 배열로. 실패 시 빈 배열. */
export function parseTeams(rawTeams) {
  const parsed = Array.isArray(rawTeams) ? rawTeams : safeParse(rawTeams);
  return Array.isArray(parsed) ? parsed : [];
}

/** gradeSettings에서 기본 경기 방식을 꺼낸다. */
export function getBaseMode(gradeSettings) {
  const gs = safeParse(gradeSettings);
  const mode = gs?.mode;
  return VALID_MODES.includes(mode) ? mode : DEFAULT_MODE;
}

/**
 * 조별 방식 맵을 정규화해 반환. { [조번호(Number)]: mode }
 * 유효하지 않은 조번호·방식은 버린다. 항목이 없으면 빈 객체.
 */
export function parseTeamModes(gradeSettings) {
  const gs = safeParse(gradeSettings);
  const raw = gs?.teamModes;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const teamNumber = Number(key);
    if (!Number.isInteger(teamNumber) || teamNumber <= 0) continue;
    if (!VALID_MODES.includes(value)) continue;
    out[teamNumber] = value;
  }
  return out;
}

/** 조별 지정이 하나라도 걸려 있는가 (= 혼용 라운딩인가). */
export function hasTeamModes(gradeSettings) {
  return Object.keys(parseTeamModes(gradeSettings)).length > 0;
}

/**
 * 이 라운딩 어딘가에서 해당 방식을 쓰는가.
 * 기본 방식이거나 조별 지정에 들어 있으면 true.
 * 서버의 팀 점수 동기화 게이트처럼 "방식 하나만 확인" 하는 곳에서 쓴다.
 */
export function usesMode(gradeSettings, mode) {
  if (getBaseMode(gradeSettings) === mode) return true;
  return Object.values(parseTeamModes(gradeSettings)).includes(mode);
}

/** 특정 조의 경기 방식. 지정이 없으면 기본 방식. */
export function resolveTeamMode(gradeSettings, teamNumber) {
  const teamModes = parseTeamModes(gradeSettings);
  const n = Number(teamNumber);
  return teamModes[n] ?? getBaseMode(gradeSettings);
}

/** 전화번호로 소속 조를 찾는다. 없으면 null. */
export function findTeamByPhone(teams, phone) {
  if (!phone) return null;
  const list = parseTeams(teams);
  return list.find((t) => Array.isArray(t?.members) && t.members.some((m) => m?.phone === phone)) || null;
}

/**
 * 이 선수가 뛰는 경기 방식.
 * 조에 배정돼 있으면 그 조의 방식, 아니면 기본 방식.
 */
export function resolvePlayerMode(gradeSettings, teams, phone) {
  const team = findTeamByPhone(teams, phone);
  if (!team) return getBaseMode(gradeSettings);
  return resolveTeamMode(gradeSettings, team.teamNumber);
}

/** 해당 방식으로 지정된 조 목록. */
export function getTeamsByMode(gradeSettings, teams, mode) {
  return parseTeams(teams).filter((t) => resolveTeamMode(gradeSettings, t?.teamNumber) === mode);
}

/**
 * 해당 방식으로 뛰는 사람들의 전화번호 Set.
 * 기본 방식과 일치하면 "조에 없는 사람"도 이 방식이므로 Set만으로 판정하면 안 된다
 * → 그런 경우를 위해 resolvePlayerMode를 쓰거나 fallsBackToBase를 함께 본다.
 */
export function getPhonesByMode(gradeSettings, teams, mode) {
  const phones = new Set();
  for (const team of getTeamsByMode(gradeSettings, teams, mode)) {
    for (const m of team?.members || []) {
      if (m?.phone) phones.add(m.phone);
    }
  }
  return { phones, fallsBackToBase: getBaseMode(gradeSettings) === mode };
}

/**
 * 저장 payload. 조별 지정 전체를 통째로 교체한다.
 * 지정 해제는 빈 맵 → 명시적 null로 보내야 서버 병합에서 키가 삭제된다.
 *
 * @param {Object|null} map - { [조번호]: mode }
 */
export function buildTeamModesPayload(map) {
  const clean = {};
  for (const [key, value] of Object.entries(map || {})) {
    const teamNumber = Number(key);
    if (!Number.isInteger(teamNumber) || teamNumber <= 0) continue;
    if (!VALID_MODES.includes(value)) continue;
    clean[String(teamNumber)] = value;
  }
  return { teamModes: Object.keys(clean).length > 0 ? clean : null };
}

/**
 * 조별 지정이 실제로 굴러갈 수 있는 상태인지 검사.
 * 포썸 조는 4자리가 다 차야 페어 매치가 성립한다.
 *
 * @returns {{ ok: boolean, problems: Array<{teamNumber: number, mode: string, reason: string}> }}
 */
export function validateTeamModes(gradeSettings, teams) {
  const problems = [];
  for (const team of parseTeams(teams)) {
    const mode = resolveTeamMode(gradeSettings, team?.teamNumber);
    if (mode !== 'foursome') continue;
    const filled = (team?.members || []).filter(Boolean).length;
    if (filled !== 4) {
      problems.push({
        teamNumber: team?.teamNumber,
        mode,
        reason: `포썸은 4명이 모두 배정돼야 합니다 (현재 ${filled}명)`,
      });
    }
  }
  return { ok: problems.length === 0, problems };
}
