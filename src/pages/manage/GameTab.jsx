import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseParticipants } from '../../utils';
import { GAME_MODES, TEAM_MIX_MODE, TEAM_MIX_BASE_MODE } from '../../constants/gameModes';
import { parseTeams, parseTeamModes, hasTeamModes, buildTeamModesPayload, getBaseMode } from '../../utils/teamGameModes';
import TeamModeAssigner from '../../components/booking/TeamModeAssigner';
import { C, Section, Group, Row, Switch, primaryButtonStyle } from './manageUi';

// 관리 화면에는 스테이블포드가 따로 있어 공용 목록에 한 항목을 끼워 쓴다
const MODES = [
  { value: 'stroke', label: '스트로크' },
  { value: 'stableford', label: '스테이블포드' },
  ...GAME_MODES.filter(m => m.value !== 'stroke').map(m => ({ value: m.value, label: m.label, hint: m.hint })),
  { value: TEAM_MIX_MODE.value, label: TEAM_MIX_MODE.label, hint: TEAM_MIX_MODE.hint },
];

export default function GameTab({ booking, members, perms, save, saving }) {
  const navigate = useNavigate();
  // 조별 지정을 막 켠 직후엔 아직 저장된 조별 방식이 없을 수 있어 화면 상태를 따로 든다
  const [teamMixOpen, setTeamMixOpen] = useState(false);

  const participantCount = parseParticipants(booking.participants).length;
  const teams = parseTeams(booking.teams);
  const canFormTeams = participantCount >= 4 || booking.type === '정기모임';
  const goTeamFormation = () => navigate(`/team-formation?id=${booking.id}`);

  const baseMode = getBaseMode(booking.gradeSettings);
  const teamModes = parseTeamModes(booking.gradeSettings);
  const isTeamMix = hasTeamModes(booking.gradeSettings) || teamMixOpen;
  const selected = isTeamMix ? TEAM_MIX_MODE.value : baseMode;
  const selectedHint = MODES.find(m => m.value === selected)?.hint;

  const saveGrade = (patch) => save({ gradeSettings: JSON.stringify(patch) });

  const selectMode = async (value) => {
    if (value === TEAM_MIX_MODE.value) {
      // 조별 지정 켜기: 기본을 신페리오로 두고, 편성된 조는 전부 신페리오로 시작
      setTeamMixOpen(true);
      const initial = {};
      for (const t of teams) {
        if (Number.isInteger(Number(t?.teamNumber))) initial[t.teamNumber] = TEAM_MIX_BASE_MODE;
      }
      await saveGrade({ mode: TEAM_MIX_BASE_MODE, ...buildTeamModesPayload(initial) });
      return;
    }
    // 단일 방식: 조별 지정은 null로 명시해야 서버 병합에서 지워진다
    setTeamMixOpen(false);
    await saveGrade({ mode: value, teamModes: null });
  };

  return (
    <>
      {/* 핵심: 조편성 */}
      <Group style={{ padding: '18px 16px 16px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {teams.length > 0 ? (
            <>
              <span style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{teams.length}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>개 조 편성됨</span>
            </>
          ) : (
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>아직 조편성 전입니다</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
          {canFormTeams ? `참가자 ${participantCount}명을 조로 나눕니다.` : '참가자가 4명 이상이면 조편성할 수 있습니다.'}
        </div>
        {canFormTeams && (
          <button type="button" onClick={goTeamFormation} style={{ ...primaryButtonStyle(false), width: '100%', marginTop: 14 }}>
            {teams.length > 0 ? '조편성 수정' : '조편성 하기'}
          </button>
        )}
      </Group>

      {perms.canAdvanced && (
        <Section title="경기 방식">
          <Group style={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {MODES.map(m => {
                const active = m.value === selected;
                return (
                  <button key={m.value} type="button" onClick={() => !active && selectMode(m.value)} disabled={saving}
                    aria-pressed={active}
                    style={{
                      minHeight: 44, borderRadius: 10, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
                      border: active ? `1.5px solid ${C.text}` : `1px solid ${C.border}`,
                      background: '#FFFFFF', color: active ? C.text : C.muted, fontWeight: active ? 800 : 600,
                    }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {selectedHint && <p style={{ margin: '12px 2px 2px', fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{selectedHint}</p>}
            {selected === 'newperia' && (
              <p style={{ margin: '8px 2px 2px', fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                라운딩이 끝나면 <strong>결과</strong> 탭에서 제비뽑기로 뽑은 12개 홀을 지정하세요.
              </p>
            )}
            {isTeamMix && (
              <TeamModeAssigner
                teams={booking.teams}
                teamModes={teamModes}
                baseMode={TEAM_MIX_BASE_MODE}
                members={members}
                disabled={saving}
                onChange={(teamNumber, mode) => saveGrade(buildTeamModesPayload({ ...teamModes, [teamNumber]: mode }))}
                onGoTeamFormation={goTeamFormation}
              />
            )}
          </Group>
        </Section>
      )}

      {perms.canAdvanced && (
        <Section title="경기 설정">
          <Group>
            <Row label="2BB" hint="2인 1조 베스트볼">
              <Switch on={!!booking.is2BB} disabled={saving} onChange={v => save({ is2BB: v })} />
            </Row>
            <Row label="스코어 입력 열기" hint="회원이 앱에서 홀별 스코어를 입력할 수 있습니다">
              <Switch on={!!booking.playEnabled} disabled={saving} onChange={v => save({ playEnabled: v })} />
            </Row>
            {baseMode === 'newperia' ? (
              <Row label="그레이드" hint="신페리오는 전원이 한 판에서 겨루므로 그레이드를 쓰지 않습니다" />
            ) : (
              <Row label="그레이드" hint="핸디캡 구간별 등급 나누기"
                onClick={() => navigate(`/grade-settings?id=${booking.id}`, { state: { fromBookingId: booking.id } })} />
            )}
          </Group>
        </Section>
      )}
    </>
  );
}
