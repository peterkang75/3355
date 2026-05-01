import React, { useState } from 'react';
import { timeSlotMap } from './bookingHelpers';
import apiService from '../../services/api';

const labelStyle = {
  fontSize: '12px', fontWeight: '700', color: '#6B7280',
  display: 'block', marginBottom: '8px', letterSpacing: '0.03em', textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%', padding: '13px 14px', borderRadius: '10px',
  border: '1px solid #E8ECF0', fontSize: '15px', outline: 'none',
  boxSizing: 'border-box', background: '#FAFBFC', color: '#111827',
};

// iOS에서 type="date"/"time" 인풋이 얇아지는 문제 방지
const dateInputStyle = {
  ...inputStyle,
  WebkitAppearance: 'none',
  display: 'block',
  minHeight: '48px',
  lineHeight: '1.5',
};

const sectionStyle = {
  background: '#FFFFFF', borderRadius: '14px',
  border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  padding: '16px', marginBottom: '12px',
};

// ── 캐주얼 라운딩 폼 ─────────────────────────────────────────────────────────
function CasualForm({ casualForm, onChange, courses, members, onAddCourse }) {
  // 골프장 검색
  const [courseQuery, setCourseQuery] = useState('');
  const [courseDropOpen, setCourseDropOpen] = useState(false);
  const [aiState, setAiState] = useState('idle'); // 'idle'|'searching'|'found'|'error'
  const [aiResult, setAiResult] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // 참가자
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDrop, setShowMemberDrop] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestHandicap, setGuestHandicap] = useState('');

  const timeSlots = [
    { key: 'Morning', label: '오전' },
    { key: 'Afternoon', label: '오후' },
    { key: 'Evening', label: '저녁' },
    { key: 'Exact', label: '직접입력' },
  ];

  const sStyle = { background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', marginBottom: '12px' };
  const lStyle = { fontSize: '12px', fontWeight: '700', color: '#6B7280', display: 'block', marginBottom: '8px', letterSpacing: '0.03em', textTransform: 'uppercase' };
  const iStyle = { width: '100%', padding: '13px 14px', borderRadius: '10px', border: '1px solid #E8ECF0', fontSize: '15px', outline: 'none', boxSizing: 'border-box', background: '#FAFBFC', color: '#111827' };

  // 기존 골프장 필터
  const filteredCourses = courseQuery.trim()
    ? (courses || []).filter(c => c.name.toLowerCase().includes(courseQuery.toLowerCase()))
    : (courses || []).slice(0, 6);

  // 기존 목록에서 선택
  const selectCourse = (name) => {
    onChange({ ...casualForm, courseName: name, courseNameCustom: '' });
    setCourseQuery(name);
    setCourseDropOpen(false);
    setAiState('idle');
    setAiResult(null);
  };

  // 골프장 선택 해제
  const clearCourse = () => {
    onChange({ ...casualForm, courseName: '', courseNameCustom: '' });
    setCourseQuery('');
    setAiState('idle');
    setAiResult(null);
  };

  // AI 검색
  const handleAiSearch = async () => {
    const q = courseQuery.trim();
    if (!q) return;
    // 먼저 기존 목록에서 확인
    const existing = (courses || []).find(c => c.name.toLowerCase().includes(q.toLowerCase()));
    if (existing) { selectCourse(existing.name); return; }
    setAiState('searching');
    setAiResult(null);
    setCourseDropOpen(false);
    try {
      const result = await apiService.searchCourse(q);
      setAiResult(result);
      setAiState('found');
    } catch {
      setAiState('error');
    }
  };

  // AI 결과 골프장 등록 후 사용
  const handleConfirmAiCourse = async () => {
    if (!aiResult) return;
    setIsRegistering(true);
    try {
      const malePars = (aiResult.holePars?.male || []).map(p => parseInt(p) || 4);
      const femalePars = (aiResult.holePars?.female || []).map(p => parseInt(p) || 4);
      const name = aiResult.name || courseQuery;
      let savedCourse = null;
      if (onAddCourse) {
        savedCourse = await onAddCourse({
          name,
          address: aiResult.address || '',
          city: aiResult.city || null,
          state: aiResult.state || null,
          country: aiResult.country || null,
          latitude: aiResult.latitude || null,
          longitude: aiResult.longitude || null,
          holePars: { male: malePars, female: femalePars },
          holeIndexes: aiResult.holeIndexes || null,
          tees: aiResult.tees || null,
          nearHoles: Array(18).fill(false),
          isCompetition: false,
          externalId: aiResult.externalId || null,
        });
      }
      onChange({ ...casualForm, courseName: name, courseNameCustom: '' });
      setCourseQuery(name);
      setAiState('idle');
      setAiResult(null);

      // GolfCourseAPI에서 SI 없을 때만 bluegolf 시도
      if (savedCourse?.id && !aiResult.holeIndexes) {
        apiService.fetchStrokeIndex(name).then(async (siData) => {
          if (siData?.holeIndexes) {
            await apiService.updateCourse(savedCourse.id, { holeIndexes: siData.holeIndexes });
          }
        }).catch(() => {});
      }
    } catch {
      alert('골프장 등록에 실패했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  // 직접 입력으로 사용 (AI 실패 시 fallback)
  const useDirectInput = () => {
    const q = courseQuery.trim();
    if (!q) return;
    onChange({ ...casualForm, courseName: q, courseNameCustom: '' });
    setAiState('idle');
    setAiResult(null);
    setCourseDropOpen(false);
  };

  // 참가자
  const activeMembers = (members || []).filter(m => m.isActive && m.approvalStatus === 'approved');
  const filteredMembers = memberSearch.trim()
    ? activeMembers.filter(m => (m.nickname || m.name || '').includes(memberSearch))
    : activeMembers.slice(0, 8);

  const addMember = (m) => {
    if (casualForm.participants.some(p => p.type === 'member' && p.data.phone === m.phone)) return;
    onChange({ ...casualForm, participants: [...casualForm.participants, { type: 'member', data: m }] });
    setMemberSearch('');
    setShowMemberDrop(false);
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    onChange({ ...casualForm, participants: [...casualForm.participants, { type: 'guest', data: { name, handicap: parseFloat(guestHandicap) || 36 } }] });
    setGuestName('');
    setGuestHandicap('');
  };

  const removeParticipant = (idx) => {
    onChange({ ...casualForm, participants: casualForm.participants.filter((_, i) => i !== idx) });
  };

  return (
    <>
      {/* 골프장 */}
      <div style={sStyle}>
        <label style={lStyle}>골프장</label>

        {/* 선택된 골프장 chip */}
        {casualForm.courseName ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#D1FAE5', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#065F46' }}>{casualForm.courseName}</span>
            </div>
            <button onClick={clearCourse} style={{ background: 'none', border: 'none', color: '#065F46', fontSize: '16px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, opacity: 0.6 }}>✕</button>
          </div>
        ) : (
          <>
            {/* 검색 입력 + AI 버튼 */}
            <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              <input
                type="text"
                value={courseQuery}
                onChange={e => { setCourseQuery(e.target.value); setCourseDropOpen(true); setAiState('idle'); setAiResult(null); }}
                onFocus={() => setCourseDropOpen(true)}
                onBlur={() => setTimeout(() => setCourseDropOpen(false), 200)}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                placeholder="골프장 이름을 입력하세요"
                style={{ ...iStyle, flex: 1 }}
              />
              <button
                onClick={handleAiSearch}
                disabled={!courseQuery.trim() || aiState === 'searching'}
                style={{
                  padding: '0 16px', borderRadius: '10px', border: 'none', flexShrink: 0,
                  background: (!courseQuery.trim() || aiState === 'searching') ? '#E5E7EB' : '#065F46',
                  color: (!courseQuery.trim() || aiState === 'searching') ? '#9CA3AF' : '#fff',
                  fontWeight: '700', fontSize: '13px', cursor: (!courseQuery.trim() || aiState === 'searching') ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {aiState === 'searching' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    검색중
                  </span>
                ) : 'AI 검색'}
              </button>
            </div>

            {/* 기존 골프장 드롭다운 */}
            {courseDropOpen && filteredCourses.length > 0 && (
              <div style={{ border: '1px solid #E8ECF0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', background: '#fff', marginTop: '6px', overflow: 'hidden', maxHeight: '180px', overflowY: 'auto' }}>
                <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.04em', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                  등록된 골프장
                </div>
                {filteredCourses.map(c => (
                  <div key={c.id}
                    onMouseDown={e => { e.preventDefault(); selectCourse(c.name); }}
                    onTouchStart={e => { e.stopPropagation(); }}
                    onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); selectCourse(c.name); }}
                    style={{ padding: '14px', cursor: 'pointer', fontSize: '14px', color: '#1E293B', borderBottom: '1px solid #F8FAFC', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {c.name}
                  </div>
                ))}
              </div>
            )}

            {/* AI 검색 결과 카드 */}
            {aiState === 'found' && aiResult && (
              <div style={{ border: '1px solid #A7F3D0', borderRadius: '12px', padding: '14px 16px', marginTop: '10px', background: '#F0FDF4' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#065F46', letterSpacing: '0.06em', marginBottom: '6px' }}>AI 검색 결과</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', marginBottom: '3px' }}>{aiResult.name}</div>
                {aiResult.address && (
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{aiResult.address}</div>
                )}
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                  파 {aiResult.totalPar ?? (aiResult.holePars?.male || []).reduce((a, b) => a + b, 0)}
                  {aiResult.totalMeters ? ` · ${aiResult.totalMeters.toLocaleString()}m` : ''}
                  {aiResult.country ? ` · ${aiResult.country}` : ''}
                </div>
                <button
                  onClick={handleConfirmAiCourse}
                  disabled={isRegistering}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#065F46', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: isRegistering ? 'not-allowed' : 'pointer', opacity: isRegistering ? 0.7 : 1 }}
                >
                  {isRegistering ? '골프장 등록 중...' : '이 골프장 사용하기 (자동 등록)'}
                </button>
              </div>
            )}

            {/* AI 검색 실패 */}
            {aiState === 'error' && (
              <div style={{ marginTop: '10px', padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', color: '#92400E', marginBottom: '8px' }}>골프장을 찾지 못했습니다. 이름을 다시 확인하거나 직접 입력해주세요.</div>
                <button onClick={useDirectInput} style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', background: 'none', border: '1px solid #FCA869', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}>
                  "{courseQuery}" 그대로 사용
                </button>
              </div>
            )}

            {/* 힌트 */}
            {aiState === 'idle' && !courseQuery && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                목록에 없으면 AI 검색으로 자동 등록
              </div>
            )}
          </>
        )}
      </div>

      {/* 날짜 + 시간 */}
      <div style={sStyle}>
        <div style={{ marginBottom: '14px' }}>
          <label style={lStyle}>날짜</label>
          <input type="date" value={casualForm.date} onChange={e => onChange({ ...casualForm, date: e.target.value })} style={{ ...iStyle, WebkitAppearance: 'none', display: 'block', minHeight: '48px', lineHeight: '1.5' }} />
        </div>
        <label style={lStyle}>시간대</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {timeSlots.map(({ key, label }) => (
            <button key={key} onClick={() => onChange({ ...casualForm, timeSlot: key, time: '' })}
              style={{ padding: '9px 16px', borderRadius: '10px', border: casualForm.timeSlot === key ? '2px solid #065F46' : '1px solid #E8ECF0', background: casualForm.timeSlot === key ? '#D1FAE5' : 'white', color: casualForm.timeSlot === key ? '#065F46' : '#6B7280', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        {casualForm.timeSlot === 'Exact' && (
          <div style={{ marginTop: '12px' }}>
            <input type="time" value={casualForm.time} onChange={e => onChange({ ...casualForm, time: e.target.value })} style={iStyle} />
          </div>
        )}
      </div>

      {/* 참가자 */}
      <div style={sStyle}>
        <label style={lStyle}>참가자 추가</label>

        {/* 4명 미만일 때만 추가 입력 표시 */}
        {casualForm.participants.length < 4 && (
          <>
            {/* 기존 회원 검색 */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setShowMemberDrop(true); }}
                onFocus={() => setShowMemberDrop(true)}
                onBlur={() => setTimeout(() => setShowMemberDrop(false), 200)}
                placeholder="회원 이름 검색"
                style={iStyle}
              />
              {showMemberDrop && filteredMembers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E8ECF0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredMembers.map(m => (
                    <div key={m.phone}
                      onMouseDown={e => { e.preventDefault(); addMember(m); }}
                      onTouchStart={e => e.stopPropagation()}
                      onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); addMember(m); }}
                      style={{ padding: '14px', cursor: 'pointer', fontSize: '14px', color: '#1E293B', borderBottom: '1px solid #F1F5F9', fontWeight: '500' }}>
                      {m.nickname || m.name}
                      <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '6px' }}>HC {m.handicap || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 게스트 직접 추가 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="게스트 이름"
                style={{ ...iStyle, flex: 2 }} />
              <input type="number" value={guestHandicap} onChange={e => setGuestHandicap(e.target.value)} placeholder="HC"
                style={{ ...iStyle, flex: 1 }} />
              <button onClick={addGuest}
                style={{ padding: '0 14px', borderRadius: '10px', border: 'none', background: '#065F46', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                추가
              </button>
            </div>
          </>
        )}

        {/* 참가자 슬롯 (최대 4명) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {casualForm.participants.map((p, i) => {
            const isOrganizer = p.isOrganizer;
            const name = p.type === 'member' ? (p.data.nickname || p.data.name) : p.data.name;
            const hc = p.type === 'member' ? (p.data.handicap || '-') : p.data.handicap;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: isOrganizer ? '#EFF6FF' : '#F8FAFC', borderRadius: '8px', border: `1px solid ${isOrganizer ? '#BFDBFE' : '#E8ECF0'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: isOrganizer ? '#1D4ED8' : (p.type === 'guest' ? '#065F46' : '#0047AB'), background: isOrganizer ? '#DBEAFE' : (p.type === 'guest' ? '#D1FAE5' : '#DBEAFE'), padding: '2px 7px', borderRadius: '5px' }}>
                    {isOrganizer ? '나' : (p.type === 'guest' ? '게스트' : '회원')}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{name}</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>HC {hc}</span>
                </div>
                {isOrganizer ? (
                  <span style={{ fontSize: '11px', color: '#93C5FD' }}>주최자</span>
                ) : (
                  <button onClick={() => removeParticipant(i)}
                    style={{ background: 'none', border: 'none', color: '#CBD5E1', fontSize: '16px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {/* 빈 슬롯 표시 */}
          {Array.from({ length: Math.max(0, 4 - casualForm.participants.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #E2E8F0' }}>
              <span style={{ fontSize: '13px', color: '#CBD5E1' }}>빈 자리</span>
            </div>
          ))}
        </div>
        {casualForm.participants.length < 4 && (
          <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'right', marginTop: '6px' }}>
            {4 - casualForm.participants.length}자리 남음
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function CreateBookingModal({
  showCreateModal,
  showTypeSelector,
  createMode,
  newRounding,
  officialForm,
  casualForm,
  isCreating,
  canSelectType,
  courses,
  members,
  onCloseCreate,
  onCloseTypeSelector,
  onSelectType,
  onChangeNewRounding,
  onChangeOfficialForm,
  onChangeCasualForm,
  onCreateRounding,
  onCreateOfficial,
  onCreateCasual,
  onOpenCreate,
  onAddCourse,
}) {
  const renderTypeSelector = () => {
    if (!showTypeSelector) return null;
    return (
      <>
        <div onClick={onCloseTypeSelector} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(3px)' }} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F8FAFC', borderRadius: '24px 24px 0 0', zIndex: 1000, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', animation: 'slideUp 0.25s ease-out' }}>
          {/* 핸들 */}
          <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '14px auto 0' }} />

          {/* 헤더 */}
          <div style={{ padding: '20px 24px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>ROUNDING</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em' }}>새로운 라운딩 만들기</div>
          </div>

          <div style={{ padding: '0 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
            {/* 정기 라운딩 */}
            <div
              onClick={() => onSelectType('official')}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', cursor: 'pointer', marginBottom: '10px' }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z" fill="#1E3A6E"/>
                  <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65z" stroke="#1E3A6E" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '3px' }}>정기 라운딩 개설</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.45' }}>관리자 전용 · 회비, 마감일 등 상세 설정</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            {/* 클럽컴/소셜 라운딩 */}
            <div
              onClick={() => onSelectType('social')}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', cursor: 'pointer', marginBottom: '10px' }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="7" y1="4" x2="7" y2="20" stroke="#1E3A6E" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M7 4l10 4-10 4" fill="#1E3A6E" stroke="#1E3A6E" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="10" cy="20" r="1.5" fill="#1E3A6E"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '3px' }}>클럽컴/소셜 라운딩 개설</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.45' }}>누구나 쉽고 빠르게 · 골프장과 시간만 선택</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            {/* 캐주얼 라운딩 */}
            <div
              onClick={() => onSelectType('casual')}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', cursor: 'pointer', marginBottom: '16px' }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="3" fill="#065F46"/>
                  <circle cx="6" cy="10" r="2.2" fill="#065F46" opacity="0.6"/>
                  <circle cx="18" cy="10" r="2.2" fill="#065F46" opacity="0.6"/>
                  <path d="M12 13c-3.5 0-6 1.5-6 3v1h12v-1c0-1.5-2.5-3-6-3z" fill="#065F46"/>
                  <path d="M6 14c-2.5 0-4 1-4 2.5V17h4v-1c0-.8.3-1.5.8-2.1C6.5 13.9 6.2 14 6 14z" fill="#065F46" opacity="0.5"/>
                  <path d="M18 14c2.5 0 4 1 4 2.5V17h-4v-1c0-.8-.3-1.5-.8-2.1.3-.1.5 0 .8 0z" fill="#065F46" opacity="0.5"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '3px' }}>캐주얼 라운딩</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.45' }}>외부인 초대 가능 · 초대링크 자동 생성</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            <button onClick={onCloseTypeSelector} style={{ width: '100%', padding: '14px', background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              닫기
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;
    const isOfficial = createMode === 'official';
    const isCasual = createMode === 'casual';

    return (
      <>
        <div onClick={onCloseCreate} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1099, backdropFilter: 'blur(3px)' }} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F8FAFC', borderRadius: '24px 24px 0 0', zIndex: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease-out', overflow: 'hidden' }}>
          {/* 핸들 */}
          <div style={{ textAlign: 'center', padding: '14px 0 0', flexShrink: 0 }}>
            <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>

          {/* 모달 헤더 */}
          <div style={{ padding: '16px 24px 12px', flexShrink: 0, borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: isOfficial ? '#B45309' : isCasual ? '#065F46' : '#0047AB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              {isOfficial ? 'OFFICIAL' : isCasual ? 'CASUAL' : 'SOCIAL / CLUBCOM'}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em' }}>
              {isOfficial ? '정기 라운딩 만들기' : isCasual ? '캐주얼 라운딩 만들기' : '라운딩 만들기'}
            </div>
          </div>

          {/* 폼 */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', overscrollBehavior: 'contain' }}>
            {isOfficial ? (
              <>
                <div style={sectionStyle}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>라운딩 이름</label>
                    <input type="text" value={officialForm.title} onChange={(e) => onChangeOfficialForm({ ...officialForm, title: e.target.value })} placeholder="예: 4월 정기라운딩" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>골프장</label>
                    <select value={officialForm.courseName} onChange={(e) => onChangeOfficialForm({ ...officialForm, courseName: e.target.value })} style={inputStyle}>
                      <option value="">골프장 선택</option>
                      {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>날짜</label>
                      <input type="date" value={officialForm.date} onChange={(e) => onChangeOfficialForm({ ...officialForm, date: e.target.value })} style={dateInputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>티오프 시간</label>
                      <input type="time" value={officialForm.time} onChange={(e) => onChangeOfficialForm({ ...officialForm, time: e.target.value })} style={dateInputStyle} />
                    </div>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#B45309', marginBottom: '12px' }}>💰 비용 안내</div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>그린피</label>
                      <input type="number" value={officialForm.greenFee} onChange={(e) => onChangeOfficialForm({ ...officialForm, greenFee: e.target.value })} placeholder="$0" style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>카트비</label>
                      <input type="number" value={officialForm.cartFee} onChange={(e) => onChangeOfficialForm({ ...officialForm, cartFee: e.target.value })} placeholder="$0" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>참가비</label>
                    <input type="number" value={officialForm.membershipFee} onChange={(e) => onChangeOfficialForm({ ...officialForm, membershipFee: e.target.value })} placeholder="$0" style={inputStyle} />
                  </div>
                </div>

                <div style={sectionStyle}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>집결 시간</label>
                      <input type="time" value={officialForm.meetingTime} onChange={(e) => onChangeOfficialForm({ ...officialForm, meetingTime: e.target.value })} style={dateInputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>접수 마감일</label>
                      <input type="date" value={officialForm.registrationDeadline} onChange={(e) => onChangeOfficialForm({ ...officialForm, registrationDeadline: e.target.value })} style={dateInputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={labelStyle}>최대 인원</label>
                    <input type="number" value={officialForm.maxMembers} onChange={(e) => onChangeOfficialForm({ ...officialForm, maxMembers: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>메모 (선택)</label>
                    <textarea value={officialForm.notes} onChange={(e) => onChangeOfficialForm({ ...officialForm, notes: e.target.value })} placeholder="추가 안내사항" rows={2} style={{ ...inputStyle, resize: 'none' }} />
                  </div>
                </div>
              </>
            ) : isCasual ? (
              <CasualForm
                casualForm={casualForm}
                onChange={onChangeCasualForm}
                courses={courses}
                members={members}
                onAddCourse={onAddCourse}
              />
            ) : (
              <>
                <div style={sectionStyle}>
                  <div style={{ marginBottom: newRounding.courseName ? '14px' : 0 }}>
                    <label style={labelStyle}>골프장</label>
                    <select value={newRounding.courseName} onChange={(e) => onChangeNewRounding({ ...newRounding, courseName: e.target.value, roundingType: '' })} style={inputStyle}>
                      <option value="">골프장 선택</option>
                      {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  {newRounding.courseName && (
                    <div>
                      <label style={labelStyle}>라운딩 타입</label>
                      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E8ECF0' }}>
                        {[
                          { key: 'competition', label: '컴페티션' },
                          { key: 'greenfee', label: '그린피' },
                          { key: 'social', label: '소셜' },
                        ].map(opt => (
                          <button key={opt.key} onClick={() => onChangeNewRounding({ ...newRounding, roundingType: opt.key })}
                            style={{ flex: 1, padding: '11px 0', border: 'none', background: newRounding.roundingType === opt.key ? '#0047AB' : '#FFFFFF', color: newRounding.roundingType === opt.key ? '#FFFFFF' : '#6B7280', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {newRounding.courseName && (
                  <div style={sectionStyle}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={labelStyle}>날짜</label>
                      <input type="date" value={newRounding.date} onChange={(e) => onChangeNewRounding({ ...newRounding, date: e.target.value })} style={dateInputStyle} />
                    </div>
                    <div style={{ marginBottom: newRounding.timeSlot === 'Exact' ? '14px' : 0 }}>
                      <label style={labelStyle}>시간대</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(timeSlotMap).map(([key, { label }]) => (
                          <button key={key} onClick={() => onChangeNewRounding({ ...newRounding, timeSlot: key, time: '' })}
                            style={{ padding: '9px 16px', borderRadius: '10px', border: newRounding.timeSlot === key ? '2px solid #0047AB' : '1px solid #E8ECF0', background: newRounding.timeSlot === key ? '#EBF2FF' : 'white', color: newRounding.timeSlot === key ? '#0047AB' : '#6B7280', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {newRounding.timeSlot === 'Exact' && (
                      <div style={{ marginTop: '14px' }}>
                        <label style={labelStyle}>정확한 시간</label>
                        <input type="time" value={newRounding.time} onChange={(e) => onChangeNewRounding({ ...newRounding, time: e.target.value })} style={dateInputStyle} />
                      </div>
                    )}
                  </div>
                )}

                {newRounding.courseName && (
                  <div style={sectionStyle}>
                    {newRounding.roundingType !== 'competition' && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={labelStyle}>최대 인원</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[4, 8, 12, 16, 20, 24].map(n => (
                          <button key={n} onClick={() => onChangeNewRounding({ ...newRounding, maxMembers: n })}
                            style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: newRounding.maxMembers === n ? '2px solid #0047AB' : '1px solid #E8ECF0', background: newRounding.maxMembers === n ? '#EBF2FF' : 'white', color: newRounding.maxMembers === n ? '#0047AB' : '#6B7280', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            {n}명
                          </button>
                        ))}
                      </div>
                    </div>
                    )}
                    <div>
                      <label style={labelStyle}>메모 (선택)</label>
                      <textarea value={newRounding.notes} onChange={(e) => onChangeNewRounding({ ...newRounding, notes: e.target.value })} placeholder="추가 정보를 입력하세요" rows={2} style={{ ...inputStyle, resize: 'none' }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 하단 버튼 */}
          <div style={{ padding: '14px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <button
              onClick={isOfficial ? onCreateOfficial : isCasual ? onCreateCasual : onCreateRounding}
              disabled={isCreating}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                background: isOfficial ? '#92400E' : isCasual ? '#065F46' : '#0047AB',
                color: 'white', fontSize: '16px', fontWeight: '700',
                cursor: isCreating ? 'not-allowed' : 'pointer', opacity: isCreating ? 0.6 : 1,
                boxShadow: isOfficial ? '0 4px 12px rgba(146,64,14,0.3)' : isCasual ? '0 4px 12px rgba(6,95,70,0.3)' : '0 4px 12px rgba(0,71,171,0.3)',
              }}
            >
              {isCreating ? '생성중...' : isOfficial ? '정기 라운딩 만들기' : isCasual ? '캐주얼 라운딩 만들기' : '라운딩 만들기'}
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {renderTypeSelector()}
      {renderCreateModal()}
    </>
  );
}
