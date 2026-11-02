import React, { useState } from 'react';
import { C, Group, Row, InlineInput, Segmented, Sheet } from './manageUi';

const TYPES = [
  { value: '정기모임', label: '정기' },
  { value: '소셜', label: '소셜' },
  { value: '컴페티션', label: '컴페티션' },
  { value: '그린피', label: '그린피' },
];

// 머리줄 연필 버튼 → 라운딩 기본 정보 한 곳에서 고치기 + 라운딩 삭제
export default function InfoEditSheet({ booking, perms, save, saving, onDelete, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Sheet title="라운딩 정보" onClose={onClose}>
      <Group>
        <Row label="이름">
          <InlineInput width={190} value={booking.title || ''} placeholder="라운딩 이름" onSave={v => save({ title: v })} />
        </Row>
        {perms.canAdvanced && (
          <Row label="골프장">
            <InlineInput width={190} value={booking.courseName || ''} placeholder="골프장 이름" onSave={v => save({ courseName: v || null })} />
          </Row>
        )}
        {perms.canAdvanced && (
          <Row label="날짜">
            <InlineInput type="date" width={150} value={booking.date || ''} onSave={v => save({ date: v || null })} />
          </Row>
        )}
        {/* 멤버 모집 중이면 티오프 시간이 아직 없다 */}
        {!booking.isRecruiting && (
          <Row label="티오프">
            <InlineInput type="time" width={110} value={booking.time || ''} onSave={v => save({ time: v })} />
          </Row>
        )}
        {perms.canAdvanced && (
          <Row label="집합 시간">
            <InlineInput type="time" width={110} value={booking.gatheringTime || ''} onSave={v => save({ gatheringTime: v || null })} />
          </Row>
        )}
      </Group>

      {perms.canAdvanced && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, padding: '0 4px 8px' }}>라운딩 유형</div>
          <Segmented options={TYPES} value={booking.type} disabled={saving} onChange={v => save({ type: v })} />
        </div>
      )}

      {!perms.isClubMemberOnly && (
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button type="button" disabled={saving}
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            style={{ border: 'none', background: 'none', minHeight: 44, padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: confirmDelete ? C.danger : C.muted }}>
            {confirmDelete ? '한 번 더 누르면 라운딩이 삭제됩니다' : '라운딩 삭제'}
          </button>
        </div>
      )}
    </Sheet>
  );
}
