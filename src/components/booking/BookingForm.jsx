import React, { memo } from 'react';
import SearchableDropdown from '../SearchableDropdown';

const BookingForm = memo(function BookingForm({
  data,
  onChange,
  onSubmit,
  submitLabel,
  isNew,
  bookingType,
  onBookingTypeChange,
  gameMode,
  onGameModeChange,
  onCancel,
  isSaving,
  courses,
  currentType
}) {
  const isCompetition = currentType === '컴페티션';

  return (
    <>
      {isNew && (
        <>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            라운딩 종류 *
          </label>
          <select
            value={bookingType}
            onChange={(e) => onBookingTypeChange(e.target.value)}
            style={{ marginBottom: '16px' }}
          >
            <option value="정기모임">정기모임</option>
            <option value="컴페티션">컴페티션</option>
          </select>

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            경기 방식
          </label>
          <select
            value={gameMode}
            onChange={(e) => onGameModeChange(e.target.value)}
            style={{ marginBottom: '16px' }}
          >
            <option value="stroke">스트로크</option>
            <option value="foursome">포썸</option>
          </select>

          {gameMode === 'foursome' && (
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: 'var(--bg-green)', 
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--text-gray)'
            }}>
              ※ 포썸은 2인 1조 팀 매치 방식으로 진행됩니다.
            </div>
          )}
        </>
      )}

      {isNew && isCompetition && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          background: 'var(--bg-green)', 
          borderRadius: '6px',
          fontSize: '14px',
          color: 'var(--text-gray)'
        }}>
          {data.courseName && data.date ? (
            <>
              라운딩 이름: <strong>클럽 컴페티션 [{(new Date(data.date).getMonth() + 1).toString().padStart(2, '0')}월 {new Date(data.date).getDate().toString().padStart(2, '0')}일]</strong>
            </>
          ) : (
            '골프장과 날짜를 선택하면 라운딩 이름이 자동 생성됩니다.'
          )}
        </div>
      )}

      {isCompetition ? (
        <>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            골프장 * (컴페티션)
          </label>
          <div style={{ marginBottom: '12px' }}>
            <SearchableDropdown
              options={courses.filter(course => course.isCompetition === true)}
              value={data.courseName}
              onChange={(value) => onChange({ ...data, courseName: value })}
              placeholder="골프장 선택 (검색 가능)"
              displayKey="name"
              valueKey="name"
            />
          </div>

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            라운딩 날짜 *
          </label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
            style={{ marginBottom: '12px' }}
          />
        </>
      ) : (
        <>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            라운딩 이름
          </label>
          <input
            type="text"
            placeholder="라운딩 이름 (예: 1월 정기 라운딩)"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            골프장 *
          </label>
          <div style={{ marginBottom: '12px' }}>
            <SearchableDropdown
              options={courses}
              value={data.courseName}
              onChange={(value) => onChange({ ...data, courseName: value })}
              placeholder="골프장 선택 (검색 가능)"
              displayKey="name"
              valueKey="name"
            />
          </div>

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            라운딩 날짜 *
          </label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            라운딩 시간 *
          </label>
          <input
            type="time"
            value={data.time}
            onChange={(e) => onChange({ ...data, time: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            집결시간
          </label>
          <input
            type="time"
            placeholder="집결시간"
            value={data.gatheringTime}
            onChange={(e) => onChange({ ...data, gatheringTime: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            그린피
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="그린피 금액 ($)"
            value={data.greenFee}
            onChange={(e) => onChange({ ...data, greenFee: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            카트비
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="카트비 금액 ($)"
            value={data.cartFee}
            onChange={(e) => onChange({ ...data, cartFee: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            참가비
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="참가비 금액 ($)"
            value={data.membershipFee}
            onChange={(e) => onChange({ ...data, membershipFee: e.target.value })}
            style={{ marginBottom: '12px' }}
          />
        </>
      )}

      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
        접수 마감날짜
      </label>
      <input
        type="datetime-local"
        value={data.registrationDeadline}
        onChange={(e) => onChange({ ...data, registrationDeadline: e.target.value })}
        style={{ marginBottom: '12px' }}
      />

      {!(isNew && isCompetition) && (
        <>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            회식장소
          </label>
          <input
            type="text"
            placeholder="회식장소 이름"
            value={data.restaurantName}
            onChange={(e) => onChange({ ...data, restaurantName: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
            회식 주소
          </label>
          <input
            type="text"
            placeholder="회식장소 주소"
            value={data.restaurantAddress}
            onChange={(e) => onChange({ ...data, restaurantAddress: e.target.value })}
            style={{ marginBottom: '16px' }}
          />
        </>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={onCancel}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '14px 24px',
            background: isSaving ? '#ccc' : '#BD5B43',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          취소하기
        </button>
        <button 
          onClick={onSubmit}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '14px 24px',
            background: isSaving ? '#999' : 'var(--primary-green)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? '저장 중...' : submitLabel}
        </button>
      </div>
    </>
  );
});

export default BookingForm;
