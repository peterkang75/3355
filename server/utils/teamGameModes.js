// server/utils/teamGameModes.js
// 조별 경기 방식 판정 (서버용) — src/utils/teamGameModes.js의 규칙을 그대로 옮긴 것.
//
//   gradeSettings.mode      : 기본 방식
//   gradeSettings.teamModes : 조별 방식 { "1": "foursome" }
//
// 서버는 팀 점수 동기화를 걸지 말지만 판단하면 되므로 필요한 함수만 둔다.
// ⚠️ 프론트 파일과 규칙이 갈라지면 스코어가 엉뚱한 사람에게 복사된다 — 함께 고칠 것.

const VALID_MODES = ['stroke', 'foursome', 'ambrose', 'newperia', 'stableford'];
const DEFAULT_MODE = 'stroke';

function parse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getBaseMode(gradeSettings) {
  const mode = parse(gradeSettings)?.mode;
  return VALID_MODES.includes(mode) ? mode : DEFAULT_MODE;
}

function parseTeamModes(gradeSettings) {
  const raw = parse(gradeSettings)?.teamModes;
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

/** 이 라운딩 어딘가에서 해당 방식을 쓰는가 (동기화를 시도할지 판단). */
function usesMode(gradeSettings, mode) {
  if (getBaseMode(gradeSettings) === mode) return true;
  return Object.values(parseTeamModes(gradeSettings)).includes(mode);
}

/** 특정 조의 방식. 지정이 없으면 기본 방식. */
function resolveTeamMode(gradeSettings, teamNumber) {
  const teamModes = parseTeamModes(gradeSettings);
  return teamModes[Number(teamNumber)] ?? getBaseMode(gradeSettings);
}

module.exports = { getBaseMode, parseTeamModes, usesMode, resolveTeamMode };
