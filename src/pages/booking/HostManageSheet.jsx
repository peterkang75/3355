import React from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import apiService from '../../services/api';
import { formatDate, getBookingStatusFlags } from './bookingHelpers';

const PRIMARY = '#0047AB';

const sLabel = (text) => (
  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
    {text}
  </div>
);

const card = { background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '10px' };

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid #E8ECF0', fontSize: '15px', outline: 'none',
  boxSizing: 'border-box', background: '#FAFBFC', color: '#111827',
};
const dateInputStyle = {
  ...inputStyle, WebkitAppearance: 'none', display: 'block', minHeight: '48px', lineHeight: '1.5',
};

export default function HostManageSheet({ show, onClose, booking, state, setters, handlers, user, members }) {
  const navigate = useNavigate();
  if (!show || !booking) return null;

  const {
    hmType, hmTitle, hmTime, hmParticipants, hmGuestName, hmGuestHandicap, hmMemberSearch,
    hmMemberDropdownOpen, hmSaving, hmSaveStatus, hmDeleteConfirm,
    hmInviteUrl, hmInviteLoading, hmViewMode, hmClubMemberOnly, hmAdvanced,
  } = state;

  const {
    setHmType, setHmTitle, setHmTime, setHmGuestName, setHmGuestHandicap, setHmMemberSearch,
    setHmMemberDropdownOpen, setHmDeleteConfirm,
    setHmInviteUrl, setHmInviteLoading, setHmViewMode, setHmAdvanced,
  } = setters;

  const {
    handleHmTypeChange, handleHmTitleSave, handleHmTimeSave, handleHmRemoveParticipant,
    handleHmAddMember, handleHmAddGuest, handleHmAdvancedToggle,
    handleHmAdvancedSave, handleHmDelete, handleHmGameModeChange, hmSaveField,
  } = handlers;

  const typeColors = {
    '컴페티션': { bg: '#EBF2FF', color: PRIMARY, border: PRIMARY },
    '그린피': { bg: '#F0FDF4', color: '#16A34A', border: '#16A34A' },
    '소셜': { bg: '#FFF7ED', color: '#EA580C', border: '#EA580C' },
    '멤버모집': { bg: '#F8FAFC', color: '#64748B', border: '#94A3B8' },
    '정기모임': { bg: '#FEF3C7', color: '#B45309', border: '#B45309' },
  };

  const Toggle = ({ field, description, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{label}</div>
        {description && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{description}</div>}
      </div>
      <button
        onClick={() => handleHmAdvancedToggle(field)}
        disabled={hmSaving}
        style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', background: hmAdvanced[field] ? PRIMARY : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0 }}
      >
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#FFFFFF', position: 'absolute', top: '3px', left: hmAdvanced[field] ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
      </button>
    </div>
  );

  const InputRow = ({ label, field, placeholder, type = 'text' }) => {
    const isPickerType = type === 'date' || type === 'time' || type === 'datetime-local';
    const parseValue = (val) => type === 'number' ? (val ? parseInt(val) : null) : val;
    return (
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>{label}</label>
        <input
          type={type}
          value={hmAdvanced[field]}
          onChange={(e) => {
            const val = e.target.value;
            setHmAdvanced(prev => ({ ...prev, [field]: val }));
            if (isPickerType) hmSaveField({ [field]: val || null });
          }}
          onBlur={(e) => handleHmAdvancedSave(field, parseValue(e.target.value))}
          placeholder={placeholder}
          style={isPickerType ? dateInputStyle : inputStyle}
        />
      </div>
    );
  };

  const renderBasicView = () => {
    const participantPhones = hmParticipants.map(p => p.phone);
    const availableMembers = members.filter(m => m.isActive && m.approvalStatus === 'approved' && !participantPhones.includes(m.phone));
    const searchTerm = hmMemberSearch.trim().toLowerCase();
    const filteredMembers = searchTerm
      ? availableMembers.filter(m => (m.nickname || m.name || '').toLowerCase().includes(searchTerm))
      : availableMembers;

    return (
      <>
        {/* 라운딩 이름 */}
        <div style={card}>
          {sLabel('라운딩 이름')}
          <input
            type="text"
            value={hmTitle}
            onChange={(e) => setHmTitle(e.target.value)}
            onBlur={(e) => handleHmTitleSave(e.target.value)}
            placeholder="라운딩 이름을 입력하세요"
            style={inputStyle}
          />
        </div>

        {/* 라운딩 유형 - 읽기 전용 표시 */}
        <div style={card}>
          {sLabel('라운딩 유형')}
          {(() => {
            const tc = typeColors[hmType] || typeColors['소셜'];
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: '10px', background: tc.bg, border: `1.5px solid ${tc.border}` }}>
                <span style={{ fontSize: '15px', fontWeight: '700', color: tc.color }}>{hmType || '소셜'}</span>
              </div>
            );
          })()}
        </div>

        {/* 라운딩 시간 - 멤버모집(모집 중)이면 숨김 */}
        {!hmAdvanced.isRecruiting && (
        <div style={card}>
          {sLabel('라운딩 시간')}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="time" value={hmTime} onChange={(e) => setHmTime(e.target.value)} style={dateInputStyle} />
            <button onClick={handleHmTimeSave} disabled={hmSaving}
              style={{ padding: '12px 20px', borderRadius: '10px', background: PRIMARY, color: 'white', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', opacity: hmSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              저장
            </button>
          </div>
        </div>
        )}

        {/* 참가자 */}
        <div style={card}>
          {sLabel(`참가자 (${hmParticipants.length}명)`)}

          {/* 검색 */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input
              type="text" value={hmMemberSearch}
              onChange={(e) => { setHmMemberSearch(e.target.value); setHmMemberDropdownOpen(true); }}
              onFocus={() => setHmMemberDropdownOpen(true)}
              onBlur={() => setTimeout(() => setHmMemberDropdownOpen(false), 150)}
              placeholder="+ 회원 검색 또는 추가..."
              style={{ ...inputStyle, border: `1px solid ${hmMemberDropdownOpen ? PRIMARY : '#E8ECF0'}` }}
            />
            {hmMemberDropdownOpen && filteredMembers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: '12px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                {filteredMembers.map(m => (
                  <div key={m.id} onClick={() => { handleHmAddMember(m); setHmMemberSearch(''); setHmMemberDropdownOpen(false); }}
                    style={{ padding: '10px 14px', fontSize: '14px', color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: PRIMARY, fontWeight: '700', flexShrink: 0 }}>
                      {(m.nickname || m.name || '').charAt(0)}
                    </div>
                    {m.nickname || m.name}
                  </div>
                ))}
              </div>
            )}
            {hmMemberDropdownOpen && filteredMembers.length === 0 && searchTerm && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: '12px', marginTop: '4px', padding: '12px 14px', fontSize: '14px', color: '#94A3B8', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                검색 결과가 없습니다
              </div>
            )}
          </div>

          {/* 참가자 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {hmParticipants.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '14px', padding: '8px 0' }}>참가자가 없습니다.</div>
            ) : (
              hmParticipants.map((p, idx) => {
                const isGuest = p.phone && p.phone.startsWith('guest_');
                return (
                  <div key={p.phone || idx} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: isGuest ? '#F1F5F9' : '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0, marginRight: '10px', color: isGuest ? '#94A3B8' : PRIMARY }}>
                      {isGuest ? 'G' : (p.nickname || p.name || '').charAt(0)}
                    </div>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>
                      {p.nickname || p.name}
                      {isGuest && <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '400', marginLeft: '6px' }}>게스트</span>}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleHmRemoveParticipant(p.phone); }} disabled={hmSaving}
                      style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#F1F5F9', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* GA 명단 PDF */}
          {hmParticipants.length > 0 && (
            <button
              onClick={() => {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const date = booking.date || '';
                const rows = hmParticipants.map(p => {
                  const m = members.find(mm => mm.phone === p.phone || mm.id === p.memberId);
                  return {
                    name: m?.gaRegisteredName || '-',
                    golflink: m?.golflinkNumber || '-',
                  };
                }).sort((a, b) => a.name.localeCompare(b.name));

                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('3355 GOLF CLUB', 14, 18);
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(date, 14, 25);

                const startY = 35;
                const colX = [14, 110];
                const rowH = 8;

                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text('GA Registered Name', colX[0], startY);
                doc.text('Golflink Number', colX[1], startY);
                doc.line(14, startY + 2, 196, startY + 2);

                doc.setFont(undefined, 'normal');
                rows.forEach((r, i) => {
                  const y = startY + rowH * (i + 1);
                  doc.text(r.name, colX[0], y);
                  doc.text(r.golflink, colX[1], y);
                });

                doc.setFontSize(8);
                doc.text(`Total: ${rows.length} players`, 14, startY + rowH * (rows.length + 1) + 4);

                doc.save(`3355_GA_List_${date}.pdf`);
              }}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                background: '#F0F9FF', border: '1px solid #BAE6FD',
                color: '#0369A1', fontWeight: '600', fontSize: '13px',
                cursor: 'pointer', marginBottom: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              GA 명단 PDF 다운로드
            </button>
          )}

          {/* 게스트 추가 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input type="text" value={hmGuestName}
              onChange={(e) => { e.stopPropagation(); setHmGuestName(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleHmAddGuest(); } }}
              placeholder="이름"
              style={{ ...inputStyle, flex: 2 }} />
            <input type="number" inputMode="decimal" value={hmGuestHandicap}
              onChange={(e) => { e.stopPropagation(); setHmGuestHandicap(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleHmAddGuest(); } }}
              placeholder="핸디"
              style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
            <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleHmAddGuest(); }}
              disabled={hmSaving || !hmGuestName.trim()}
              style={{ padding: '12px 16px', borderRadius: '10px', background: PRIMARY, color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!hmGuestName.trim() || hmSaving) ? 0.4 : 1 }}>
              추가
            </button>
          </div>
        </div>

        {/* 조편성 */}
        {(hmParticipants.length >= 4 || hmType === '정기모임') && (
          <button onClick={() => { onClose(); navigate(`/team-formation?id=${booking.id}`); }}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#1E293B', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginBottom: '10px' }}>
            조편성 하기
          </button>
        )}

        {/* 게스트 초대링크 */}
        {!hmClubMemberOnly && (
          <div style={card}>
            {sLabel('게스트 초대링크')}
            {hmInviteUrl ? (
              <>
                <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '600', marginBottom: '8px' }}>링크가 생성되었습니다</div>
                <div style={{ fontSize: '12px', color: '#64748B', wordBreak: 'break-all', marginBottom: '10px', background: '#F8FAFC', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E8ECF0' }}>
                  {hmInviteUrl}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { if (navigator.share) { navigator.share({ title: '라운딩 초대', url: hmInviteUrl }); } else { navigator.clipboard.writeText(hmInviteUrl); alert('링크가 복사되었습니다.'); } }}
                    style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: PRIMARY, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    {navigator.share ? '공유하기' : '링크 복사'}
                  </button>
                  <button
                    onClick={async () => { if (!confirm('초대링크를 삭제하면 기존 링크로 접속할 수 없게 됩니다.')) return; setHmInviteLoading(true); try { await apiService.deleteInviteLink(booking.id); setHmInviteUrl(''); } catch { alert('삭제 실패'); } finally { setHmInviteLoading(false); } }}
                    style={{ padding: '11px 16px', borderRadius: '10px', border: '1px solid #E8ECF0', background: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={async () => { setHmInviteLoading(true); try { const { inviteUrl } = await apiService.generateInviteLink(booking.id); setHmInviteUrl(inviteUrl); } catch { alert('링크 생성 실패'); } finally { setHmInviteLoading(false); } }}
                disabled={hmInviteLoading}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px dashed #CBD5E1', background: '#FAFBFC', color: hmInviteLoading ? '#94A3B8' : '#475569', fontSize: '14px', fontWeight: '600', cursor: hmInviteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                {hmInviteLoading ? '생성 중…' : '게스트 초대링크 생성'}
              </button>
            )}
          </div>
        )}

        {/* 고급 설정 */}
        {!hmClubMemberOnly && (user.isAdmin || hmType === '정기모임' || hmType === '컴페티션') && (
          <button onClick={() => setHmViewMode('advanced')}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>고급 설정</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}

        {/* 삭제 */}
        {!hmClubMemberOnly && (
          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <button onClick={handleHmDelete} disabled={hmSaving}
              style={{ background: 'none', border: 'none', color: hmDeleteConfirm ? '#DC2626' : '#CBD5E1', fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: '8px 16px', opacity: hmSaving ? 0.6 : 1, transition: 'color 0.2s' }}>
              {hmDeleteConfirm ? '정말 삭제하시겠습니까? 다시 클릭하여 확인' : '라운딩 삭제'}
            </button>
          </div>
        )}
      </>
    );
  };

  const renderAdvancedView = () => (
    <>
      <div style={card}>
        {sLabel('라운딩 정보')}
        <InputRow label="골프장" field="courseName" placeholder="골프장 이름" />
        <InputRow label="날짜" field="date" placeholder="" type="date" />
        <InputRow label="집합 시간" field="gatheringTime" placeholder="예: 07:30" type="time" />
        <InputRow label="등록 마감일" field="registrationDeadline" placeholder="" type="datetime-local" />
        <InputRow label="최대 인원" field="maxMembers" placeholder="28" type="number" />
      </div>

      {/* ── 라운딩 설정 통합 카드 ── */}
      <div style={card}>
        {sLabel('라운딩 설정')}

        {/* 라운딩 유형 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>라운딩 유형</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: '정기라운딩', value: '정기모임' },
              { label: '소셜', value: '소셜' },
              { label: '컴페티션', value: '컴페티션' },
              { label: '그린피', value: '그린피' },
            ].map(({ label, value }) => {
              const isActive = hmType === value;
              return (
                <button key={value} onClick={() => handleHmTypeChange(value)} disabled={hmSaving}
                  style={{ flex: 1, padding: '8px 2px', borderRadius: '10px', border: isActive ? 'none' : '1px solid #E8ECF0', background: isActive ? PRIMARY : '#FFFFFF', color: isActive ? '#FFFFFF' : '#64748B', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: '1px', background: '#F1F5F9', margin: '0 -16px 16px' }} />

        {/* 모집 방식 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>모집 방식</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ value: true, label: '멤버 모집 중' }, { value: false, label: '즉시 플레이' }].map(({ value, label }) => {
              const isActive = hmAdvanced.isRecruiting === value;
              return (
                <button key={String(value)} onClick={async () => {
                  setHmAdvanced(prev => ({ ...prev, isRecruiting: value }));
                  await hmSaveField({ isRecruiting: value });
                }} disabled={hmSaving}
                  style={{ flex: 1, padding: '10px 4px', borderRadius: '10px', border: isActive ? 'none' : '1px solid #E8ECF0', background: isActive ? PRIMARY : '#FFFFFF', color: isActive ? '#FFFFFF' : '#64748B', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: '1px', background: '#F1F5F9', margin: '0 -16px 16px' }} />

        {/* 게임 방식 */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>게임 방식</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['stroke', 'stableford', 'foursome'].map(mode => {
              const isActive = hmAdvanced.gameMode === mode;
              return (
                <button key={mode} onClick={() => handleHmGameModeChange(mode)} disabled={hmSaving}
                  style={{ flex: 1, padding: '10px 4px', borderRadius: '10px', border: isActive ? 'none' : '1px solid #E8ECF0', background: isActive ? PRIMARY : '#FFFFFF', color: isActive ? '#FFFFFF' : '#64748B', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  {mode === 'stroke' ? '스트로크' : mode === 'stableford' ? '스테이블포드' : '포썸'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={card}>
        {sLabel('게임 설정')}
        <Toggle field="playEnabled" label="Play 기능 활성화" description="스코어 입력 활성화" />
        <Toggle field="is2BB" label="2BB 방식" description="2인 1조 베스트볼 방식" />
        {(() => {
          const { isRegistrationClosed: isEffectivelyClosed } = getBookingStatusFlags(booking);
          const descText = booking.status === 'closed'
            ? '수동 마감 중'
            : booking.status === 'open'
            ? '수동 오픈 중 (자동마감 무시)'
            : isEffectivelyClosed ? '자동 마감됨' : '접수 중 (자동)';
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>접수 마감</div>
                <div style={{ fontSize: '12px', color: isEffectivelyClosed ? '#DC2626' : '#94A3B8', marginTop: '2px' }}>{descText}</div>
              </div>
              <button
                onClick={async () => {
                  const newStatus = isEffectivelyClosed ? 'open' : 'closed';
                  await hmSaveField({ status: newStatus });
                }}
                disabled={hmSaving}
                style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', background: isEffectivelyClosed ? '#DC2626' : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0 }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#FFFFFF', position: 'absolute', top: '3px', left: isEffectivelyClosed ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
              </button>
            </div>
          );
        })()}
        <button onClick={() => { onClose(); navigate('/admin', { state: { openScoreBookingId: booking.id } }); }}
          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📝</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>스코어 관리</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>해당 라운딩 스코어 입력 · 관리</div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div style={card}>
        {sLabel('등급 설정')}
        <button onClick={() => { onClose(); navigate(`/grade-settings?id=${booking.id}`, { state: { fromBookingId: booking.id } }); }}
          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>그레이드 설정</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>핸디캡 그레이드 기준 설정</div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div style={card}>
        {sLabel('비용 정보')}
        <InputRow label="그린피" field="greenFee" placeholder="$0" type="number" />
        <InputRow label="카트비" field="cartFee" placeholder="$0" type="number" />
        <InputRow label="참가비" field="membershipFee" placeholder="$0" type="number" />
      </div>

      <div style={card}>
        {sLabel('회식 정보')}
        <InputRow label="회식 장소" field="restaurantName" placeholder="장소 이름" />
        <InputRow label="회식 주소" field="restaurantAddress" placeholder="주소 입력" />
      </div>

      <div style={card}>
        {sLabel('메모')}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <textarea value={hmAdvanced.notes} onChange={(e) => setHmAdvanced(prev => ({ ...prev, notes: e.target.value }))} placeholder="라운딩 메모를 입력하세요" rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          <button onClick={() => handleHmAdvancedSave('notes', hmAdvanced.notes)} disabled={hmSaving}
            style={{ padding: '12px 16px', borderRadius: '10px', background: PRIMARY, color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', opacity: hmSaving ? 0.5 : 1, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
            저장
          </button>
        </div>
      </div>

      {user.isAdmin && (
        <button onClick={() => { onClose(); navigate('/admin', { state: { openScoreBookingId: booking.id } }); }}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>
          <span>📝</span> 스코어 입력 페이지로 이동
        </button>
      )}
    </>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F8FAFC', borderRadius: '24px 24px 0 0', zIndex: 1000, maxHeight: '88vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease-out', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
        {/* 핸들 */}
        <div style={{ textAlign: 'center', padding: '14px 0 6px', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
        </div>

        {/* 헤더 */}
        <div style={{ padding: '6px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hmViewMode === 'advanced' && (
              <button onClick={() => setHmViewMode('basic')}
                style={{ background: 'none', border: 'none', padding: '0 4px 0 0', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            )}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {hmViewMode === 'basic' ? 'MANAGE' : 'ADVANCED'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em' }}>
                {hmViewMode === 'basic' ? '라운딩 관리' : '고급 설정'}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px' }}>{booking.courseName} · {formatDate(booking.date)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {hmViewMode === 'advanced' && hmSaveStatus !== 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600',
                color: hmSaveStatus === 'saved' ? '#16A34A' : '#94A3B8',
                transition: 'color 0.2s',
              }}>
                {hmSaveStatus === 'saving' ? (
                  <><div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #CBD5E1', borderTopColor: '#0047AB', animation: 'spin 0.8s linear infinite' }} />저장 중</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>저장됨</>
                )}
              </div>
            )}
            <button onClick={onClose}
              style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', width: '36px', height: '36px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', paddingBottom: 'max(120px, calc(100px + env(safe-area-inset-bottom)))' }}>
          {hmViewMode === 'basic' ? renderBasicView() : renderAdvancedView()}
        </div>
      </div>
    </>
  );
}
