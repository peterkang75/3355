import React, { useCallback, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import useGoBack from '../hooks/useGoBack';
import { parseParticipants } from '../utils';
import { formatDate, getManagePermissions, isTeeTimeUnknown } from './booking/bookingHelpers';
import { C, ManageStyles } from './manage/manageUi';
import RecruitTab from './manage/RecruitTab';
import GameTab from './manage/GameTab';
import CostTab from './manage/CostTab';
import ResultTab from './manage/ResultTab';
import { parseNewPeriaConfig } from '../utils/newperia';
import InfoEditSheet from './manage/InfoEditSheet';

// 라운딩 관리 — 방장·운영진이 라운딩 하나를 준비하고 마무리하는 화면.
// 일하는 순서대로 탭을 나눈다: 모집 → 경기 → 비용·회식 → 결과.
// 라운딩 정보는 앱 공용 목록(bookings)에서 바로 읽는다. 따로 복사해 두지 않아야 저장 후 화면이 어긋나지 않는다.

const TABS = [
  { key: 'recruit', label: '모집' },
  { key: 'game', label: '경기' },
  { key: 'cost', label: '비용·회식', advancedOnly: true },
  { key: 'result', label: '결과', resultOnly: true },
];

const Center = ({ children }) => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14, padding: 24, textAlign: 'center' }}>
    {children}
  </div>
);

export default function RoundingManage() {
  const { user, bookings, members, updateBooking, refreshBookings } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/booking');
  const bookingId = searchParams.get('id');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  const [showInfo, setShowInfo] = useState(false);
  const savedTimer = useRef(null);

  const booking = bookings.find(b => b.id === bookingId);

  const save = useCallback(async (fields) => {
    setSaveStatus('saving');
    try {
      await updateBooking(bookingId, fields);
      setSaveStatus('saved');
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
      alert('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }, [bookingId, updateBooking]);

  // updateBooking을 거치지 않는 요청(게스트·초대링크·번호대여) 뒤에는 목록을 새로 받아야 화면에 반영된다
  const reload = useCallback(async () => {
    apiService.invalidateCache('bookings');
    await refreshBookings();
  }, [refreshBookings]);

  if (!user) return null;
  if (!booking) return <Center>{bookings.length === 0 ? '불러오는 중…' : '라운딩을 찾을 수 없습니다.'}</Center>;

  const perms = getManagePermissions(booking, user);
  if (!perms.canManage) return <Center>이 라운딩을 관리할 권한이 없습니다.</Center>;

  // 결과 탭은 스코어 관리(고급 권한)나 신페리오 홀 지정이 있을 때만
  const hasResult = perms.canAdvanced || parseNewPeriaConfig(booking.gradeSettings).isNewPeria;
  const tabs = TABS.filter(t => (!t.advancedOnly || perms.canAdvanced) && (!t.resultOnly || hasResult));
  const requested = searchParams.get('tab');
  const tab = tabs.some(t => t.key === requested) ? requested : 'recruit';
  // 다른 화면(조편성·그레이드)에 갔다 돌아와도 같은 탭이 열리도록 주소에 남긴다
  const selectTab = (key) => setSearchParams({ id: bookingId, tab: key }, { replace: true });

  const phones = new Set(parseParticipants(booking.participants).map(p => p.phone));
  const count = phones.size + (booking.numberRentals || []).filter(ph => !phones.has(ph)).length;
  const saving = saveStatus === 'saving';

  const handleDelete = async () => {
    try {
      await apiService.deleteBooking(booking.id);
      await reload();
      navigate('/booking', { replace: true });
    } catch { alert('삭제하지 못했습니다.'); }
  };

  // 골프장 이름이 길어 잘릴 때 날짜·시간은 남도록 앞에 둔다
  const meta = [formatDate(booking.date), !isTeeTimeUnknown(booking) && booking.time, booking.courseName].filter(Boolean).join(' · ');
  const tabProps = { booking, members: members || [], user, perms, save, saving, reload };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <ManageStyles />

      <header style={{ position: 'sticky', top: 0, zIndex: 200, background: '#FFFFFF', paddingTop: 'env(safe-area-inset-top)', boxShadow: '0 1px 0 rgba(20,40,75,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 4px 4px' }}>
          <button type="button" onClick={goBack} aria-label="뒤로"
            style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {booking.title || booking.type || '라운딩'}
            </h1>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</div>
          </div>
          <span aria-live="polite" style={{ fontSize: 12, fontWeight: 600, color: saveStatus === 'saved' ? C.sub : C.muted, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
            {saveStatus === 'saving' ? '저장 중' : saveStatus === 'saved' ? '저장됨' : ''}
          </span>
          <button type="button" onClick={() => setShowInfo(true)} aria-label="라운딩 정보 수정"
            style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer', color: C.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </button>
        </div>

        <nav role="tablist" style={{ display: 'flex', padding: '0 8px' }}>
          {tabs.map(t => {
            const active = t.key === tab;
            return (
              <button key={t.key} role="tab" aria-selected={active} type="button" onClick={() => selectTab(t.key)}
                // 색 대신 굵기와 글자 폭만큼의 곧은 먹색 밑줄로 구분 (앱 공통 버튼 모서리가 밑줄을 휘게 하므로 0)
                style={{
                  flex: 1, minHeight: 44, padding: 0, border: 'none', borderRadius: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 15, fontWeight: active ? 700 : 500, color: active ? C.text : C.muted, letterSpacing: '-0.01em',
                }}>
                <span style={{ position: 'relative', display: 'inline-block', padding: '12px 1px 11px' }}>
                  {t.label}
                  {t.key === 'recruit' && count > 0 && <span style={{ marginLeft: 4, fontWeight: 500, color: active ? C.sub : C.muted }}>{count}</span>}
                  {active && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: C.text }} />}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ padding: '0 16px', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>
        {tab === 'recruit' && <RecruitTab {...tabProps} />}
        {tab === 'game' && <GameTab {...tabProps} />}
        {tab === 'cost' && <CostTab {...tabProps} />}
        {tab === 'result' && <ResultTab {...tabProps} />}
      </main>

      {showInfo && (
        <InfoEditSheet booking={booking} perms={perms} save={save} saving={saving} onDelete={handleDelete} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}
