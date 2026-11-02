import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseNewPeriaConfig, buildNewPeriaHolesPayload } from '../../utils/newperia';
import NewPeriaHolesSheet from '../booking/NewPeriaHolesSheet';
import { Section, Group, Row } from './manageUi';

export default function ResultTab({ booking, members, user, perms, save, saving }) {
  const navigate = useNavigate();
  const [showHoles, setShowHoles] = useState(false);
  const np = parseNewPeriaConfig(booking.gradeSettings);
  const setByName = np.setBy ? (() => { const m = members.find(x => x.id === np.setBy); return m?.nickname || m?.name; })() : null;

  // 12홀 지정 저장. 지정자·시각을 함께 남겨 제비뽑기 시점과 대조할 수 있게 한다.
  const saveHoles = async (holes, rate) => {
    await save({ gradeSettings: buildNewPeriaHolesPayload(holes, user?.id, new Date().toISOString(), rate) });
    setShowHoles(false);
  };

  return (
    <>
      {perms.canAdvanced && (
        <Section title="스코어">
          <Group>
            <Row label="스코어 관리" hint="이 라운딩의 스코어 입력·수정"
              onClick={() => navigate('/admin', { state: { openScoreBookingId: booking.id } })} />
          </Group>
        </Section>
      )}

      {np.isNewPeria && (
        <Section title="신페리오">
          <Group>
            <Row label="12개 홀 지정"
              hint={np.isConfigured ? np.holes.join(', ') : '라운딩이 끝난 뒤 제비뽑기로 뽑은 홀을 넣으면 순위가 매겨집니다'}
              value={np.isConfigured ? '수정' : '지정하기'}
              onClick={() => setShowHoles(true)} />
          </Group>
        </Section>
      )}

      {showHoles && (
        <NewPeriaHolesSheet
          initialHoles={np.holes}
          initialRate={np.rate}
          setByName={setByName}
          setAt={np.setAt}
          saving={saving}
          onSave={(holes, rate) => saveHoles(holes, rate)}
          onClear={(rate) => saveHoles(null, rate)}
          onClose={() => !saving && setShowHoles(false)}
        />
      )}
    </>
  );
}
