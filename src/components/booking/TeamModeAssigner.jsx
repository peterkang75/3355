import React from 'react';
import { getGameMode } from '../../constants/gameModes';
import { MIXABLE_MODES, parseTeams } from '../../utils/teamGameModes';

// 조별 경기 방식 지정 — 방장 관리 시트와 라운딩 관리에서 함께 쓴다.
// 값을 들고 있지 않는 순수 표시 컴포넌트. 저장은 부모가 한다.
//
// props
//   teams       : booking.teams (문자열/배열 모두 허용)
//   teamModes   : { [조번호]: mode }  — 지정이 없는 조는 baseMode로 표시
//   baseMode    : 지정이 없을 때의 방식
//   members     : 이름 보강용 회원 목록 (선택)
//   onChange    : (teamNumber, mode) => void
//   onGoTeamFormation : 조편성 화면으로 이동 (조가 없을 때만 노출)

const nameOf = (m, members) => {
  if (!m) return null;
  const full = (members || []).find((x) => x?.phone === m.phone);
  return full?.nickname || full?.name || m.nickname || m.name || '이름 없음';
};

export default function TeamModeAssigner({
  teams,
  teamModes = {},
  baseMode = 'newperia',
  members = [],
  onChange,
  onGoTeamFormation,
  disabled = false,
}) {
  const teamList = parseTeams(teams);

  if (teamList.length === 0) {
    return (
      <div style={{
        marginTop: 10, padding: 14, background: '#FFF7ED', border: '1px solid #FED7AA',
        borderRadius: 10, fontSize: 12.5, color: '#C2410C', lineHeight: 1.6,
      }}>
        조편성이 아직 없습니다. 조별로 경기 방식을 나누려면 <strong>조편성을 먼저</strong> 해주세요.
        {onGoTeamFormation && (
          <button
            type="button"
            onClick={onGoTeamFormation}
            style={{
              display: 'block', marginTop: 10, padding: '9px 14px', width: '100%',
              borderRadius: 9, border: '1px solid #FDBA74', background: '#FFFFFF',
              color: '#C2410C', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            조편성 하러 가기
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 10, padding: 14, background: '#F8FAFC',
      border: '1px solid #E8ECF0', borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    }}>
      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, marginBottom: 12 }}>
        조마다 경기 방식을 지정합니다. 조에 배정되지 않은 참가자는 <strong>신페리오</strong>로 집계됩니다.
      </div>

      {teamList.map((team) => {
        const teamNumber = team?.teamNumber;
        const mode = teamModes[teamNumber] ?? baseMode;
        const assigned = (team?.members || []).filter(Boolean);
        const names = assigned.map((m) => nameOf(m, members)).join(' · ');
        const foursomeShort = mode === 'foursome' && assigned.length !== 4;

        return (
          <div
            key={teamNumber}
            style={{
              padding: '10px 0',
              borderTop: '1px solid #E8ECF0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', flexShrink: 0 }}>
                {teamNumber}조
              </span>
              <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                {names || '배정된 인원 없음'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {MIXABLE_MODES.map((value) => {
                const meta = getGameMode(value);
                const active = mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange?.(teamNumber, value)}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 9,
                      border: active ? `1.5px solid ${meta.color}` : '1px solid #E2E8F0',
                      background: active ? meta.activeBg : '#FFFFFF',
                      color: active ? meta.color : '#94A3B8',
                      fontSize: 13, fontWeight: active ? 800 : 600,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {foursomeShort && (
              <div style={{ marginTop: 7, fontSize: 11.5, color: '#DC2626', lineHeight: 1.5 }}>
                포썸은 4명이 모두 배정돼야 페어 대결이 성립합니다 (현재 {assigned.length}명).
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
