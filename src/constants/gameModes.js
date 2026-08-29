// 경기 방식 정의 - 단일 소스
// 화면 3곳(BookingForm / RoundingManagement / HostManageSheet)이 각자 목록을 갖고 있어
// 방식을 추가할 때마다 세 곳을 손대야 했다. 여기 한 곳만 고치면 되도록 모은다.

import { NEWPERIA_DEFAULT_RATE } from '../utils/newperia';

export const GAME_MODES = [
  {
    value: 'stroke',
    label: '스트로크',
    icon: '⛳',
    color: 'var(--primary-green)',
    activeBg: '#e8f5e9',
  },
  {
    value: 'foursome',
    label: '포썸',
    icon: '🏌️',
    color: '#9333ea',
    activeBg: '#f3e8ff',
    hint: '포썸은 2인 1조 팀 매치 방식으로 진행됩니다.',
  },
  {
    value: 'ambrose',
    label: '엠브로스',
    icon: '👥',
    color: '#0891b2',
    activeBg: '#e0f2fe',
    hint: '엠브로스는 한 조(최대 4인)가 한 팀이 되어 팀 공동 점수를 기록하는 방식입니다. 팀원 누구나 점수를 입력할 수 있고, 순위는 팀별 타수(그로스)로 매겨집니다.',
  },
  {
    value: 'newperia',
    label: '신페리오',
    icon: '🎲',
    color: '#d97706',
    activeBg: '#fef3c7',
    hint: '신페리오는 라운딩이 끝난 뒤 지정한 12개 홀의 점수로 그날의 핸디캡을 만들어 순위를 매기는 방식입니다. 등록된 핸디캡과 그레이드는 쓰지 않으며, 핸디캡이 없는 게스트도 같은 조건으로 겨룹니다.',
  },
];

export const getGameMode = (value) =>
  GAME_MODES.find((m) => m.value === value) || GAME_MODES[0];

export const getGameModeLabel = (value) => getGameMode(value).label;

export { NEWPERIA_DEFAULT_RATE };

// 조별로 다른 방식을 쓰는 상태를 나타내는 UI 전용 항목.
// gradeSettings.mode에 저장되지 않는다 — 저장은 mode(기본 방식) + teamModes(조별 지정)로 나뉜다.
export const TEAM_MIX_MODE = {
  value: '__teamMix',
  label: '조별 지정',
  icon: '🔀',
  color: '#0047AB',
  activeBg: '#E8F0FE',
  hint: '조마다 다른 경기 방식으로 진행합니다. 조편성이 먼저 되어 있어야 하며, 조에 배정되지 않은 참가자는 신페리오로 집계됩니다.',
};

// 조별 지정에서 고를 수 있는 방식 (이번 단계는 신페리오·포썸)
export const TEAM_MIX_BASE_MODE = 'newperia';
