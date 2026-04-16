import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { parseParticipants, checkIsOperator } from '../utils';
import {
  isBookingActive, formatDate, getMonday, getWeekLabel, getTileTypeBadge,
} from './booking/bookingHelpers';
import WeeklyTimeline from './booking/WeeklyTimeline';
import BookingBottomSheet from './booking/BookingBottomSheet';
import HostManageSheet from './booking/HostManageSheet';
import CreateBookingModal from './booking/CreateBookingModal';
import golfMembersPhoto from '../assets/golf-members.jpeg';

function RoundingListV2() {
  const { user, bookings, members, courses, addBooking, updateBooking, refreshBookings, addCourse } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [createMode, setCreateMode] = useState('social');
  const [isJoining, setIsJoining] = useState(false);
  const [isRentalLoading, setIsRentalLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [myBookingsExpanded, setMyBookingsExpanded] = useState(false);
  const sheetRef = useRef(null);

  // ── Host Manage state ──────────────────────────────────────────────────────
  const [showHostManage, setShowHostManage] = useState(false);
  const [hmBooking, setHmBooking] = useState(null);
  const [hmType, setHmType] = useState('');
  const [hmTitle, setHmTitle] = useState('');
  const [hmTime, setHmTime] = useState('');
  const [hmParticipants, setHmParticipants] = useState([]);
  const [hmGuestName, setHmGuestName] = useState('');
  const [hmGuestHandicap, setHmGuestHandicap] = useState('');
  const [hmMemberSearch, setHmMemberSearch] = useState('');
  const [hmMemberDropdownOpen, setHmMemberDropdownOpen] = useState(false);
  const [hmSaving, setHmSaving] = useState(false);
  const [hmSaveStatus, setHmSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [hmDeleteConfirm, setHmDeleteConfirm] = useState(false);
  const [hmInviteUrl, setHmInviteUrl] = useState('');
  const [hmInviteLoading, setHmInviteLoading] = useState(false);
  const [hmViewMode, setHmViewMode] = useState('basic');
  const [hmClubMemberOnly, setHmClubMemberOnly] = useState(false);
  const [hmAdvanced, setHmAdvanced] = useState({
    playEnabled: false, is2BB: false, isRecruiting: false, greenFee: '', cartFee: '', membershipFee: '',
    notes: '', courseName: '', date: '', gatheringTime: '', restaurantName: '',
    restaurantAddress: '', isFoursome: false, maxMembers: 4, registrationDeadline: '', gameMode: 'stroke',
  });

  // ── Create modal state ─────────────────────────────────────────────────────
  const [newRounding, setNewRounding] = useState({
    date: '', time: '', courseName: 'Strathfield Golf Club',
    maxMembers: 4, notes: '', roundingType: '', timeSlot: 'Morning',
  });
  const [officialForm, setOfficialForm] = useState({
    title: '', courseName: '', date: '', time: '', greenFee: '', cartFee: '',
    membershipFee: '', registrationDeadline: '', maxMembers: 28, notes: '', meetingTime: '',
  });
  const [casualForm, setCasualForm] = useState({
    courseName: '', courseNameCustom: '', date: '', timeSlot: 'Morning', time: '',
    participants: user ? [{ type: 'member', data: user, isOrganizer: true }] : [],
  });
  const [casualInviteUrl, setCasualInviteUrl] = useState('');
  const [showCasualSuccess, setShowCasualSuccess] = useState(false);

  const isAdmin = user.role === '관리자';
  const canSelectType = checkIsOperator(user);
  const canCreateBooking = true;

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && bookings.length > 0) {
      const found = bookings.find(b => b.id === idParam);
      if (found) { setSelectedBooking(found); setSearchParams({}, { replace: true }); }
    }
  }, [searchParams, bookings]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectedBooking && sheetRef.current && !sheetRef.current.contains(e.target)) {
        setSelectedBooking(null);
      }
    };
    if (selectedBooking) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBooking]);

  useEffect(() => {
    const isAnyModalOpen = showCreateModal || showTypeSelector || !!selectedBooking;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCreateModal, showTypeSelector, selectedBooking]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const groupedByWeek = useMemo(() => {
    const allActive = bookings.filter(b => isBookingActive(b)).sort((a, b) => new Date(a.date) - new Date(b.date));
    const weekMap = {};
    allActive.forEach(booking => {
      const monday = getMonday(new Date(booking.date));
      const key = monday.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = { monday, label: getWeekLabel(monday), bookings: [] };
      weekMap[key].bookings.push(booking);
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, week]) => ({ ...week, bookings: week.bookings.sort((a, b) => new Date(a.date) - new Date(b.date)) }));
  }, [bookings]);

  const getMemberName = useCallback((id) => {
    const member = members.find(m => m.id === id);
    return member?.nickname || member?.name || '알 수 없음';
  }, [members]);

  const myBookings = useMemo(() => (
    bookings.filter(b => isBookingActive(b)).filter(b => {
      const parts = parseParticipants(b.participants);
      return parts.some(p => p.phone === user.phone);
    }).sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [bookings, user.phone]);

  // 다가오는 정기모임 (미래 또는 오늘)
  const upcomingRegular = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings
      .filter(b => b.type === '정기모임' && new Date(b.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings]);

  // ── Join / Leave ───────────────────────────────────────────────────────────
  const handleJoinLeave = async (booking) => {
    if (isJoining) return;

    const latest = bookings.find(b => b.id === booking.id) || booking;
    const participants = parseParticipants(latest.participants);
    const alreadyJoined = participants.some(p => p.phone === user.phone);

    if (!alreadyJoined && booking.type === '컴페티션' && (!user.golflinkNumber || user.golflinkNumber.trim() === '')) {
      alert('클럽 컴페티션은 골프링크 번호가 필수입니다. 마이페이지에서 등록해주세요.');
      return;
    }

    setIsJoining(true);
    try {
      await apiService.toggleJoinBooking(booking.id);
      await refreshBookings();
    } catch (e) {
      alert(e.message || '참가 처리 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleRental = async (bookingId) => {
    if (isRentalLoading) return;
    setIsRentalLoading(true);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      const isCurrentlyRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
      await apiService.toggleNumberRental(bookingId, user.phone);
      await refreshBookings();
      if (!isCurrentlyRenting) alert(`${user.nickname}님, 번호 대여 감사합니다!`);
    } catch { alert('번호대여 상태 변경 중 오류가 발생했습니다.'); }
    finally { setIsRentalLoading(false); }
  };

  // ── Host Manage ────────────────────────────────────────────────────────────
  const openHostManage = (booking, clubMemberOnly = false) => {
    const parts = parseParticipants(booking.participants);
    setHmBooking(booking);
    setHmType(booking.type || '소셜');
    setHmTitle(booking.title || '');
    setHmTime(booking.time || '');
    setHmParticipants(parts);
    setHmGuestName('');
    setHmDeleteConfirm(false);
    setHmSaving(false);
    setHmViewMode('basic');
    setHmInviteUrl(booking.inviteToken ? `${window.location.origin}/invite/${booking.inviteToken}` : '');
    setHmInviteLoading(false);
    setHmClubMemberOnly(clubMemberOnly);
    let savedGameMode = 'stroke';
    if (booking.gradeSettings) {
      try {
        const parsed = typeof booking.gradeSettings === 'string' ? JSON.parse(booking.gradeSettings) : booking.gradeSettings;
        if (parsed?.mode) savedGameMode = parsed.mode;
      } catch {}
    }
    setHmAdvanced({
      playEnabled: booking.playEnabled || false, is2BB: booking.is2BB || false,
      greenFee: booking.greenFee || '', cartFee: booking.cartFee || '', membershipFee: booking.membershipFee || '',
      notes: booking.notes || '', courseName: booking.courseName || '', date: booking.date || '',
      gatheringTime: booking.gatheringTime || '', restaurantName: booking.restaurantName || '',
      restaurantAddress: booking.restaurantAddress || '', isFoursome: booking.title?.includes('포썸') || false,
      maxMembers: booking.maxMembers || 4, registrationDeadline: booking.registrationDeadline || '', gameMode: savedGameMode,
      isRecruiting: booking.isRecruiting || false,
    });
    setShowHostManage(true);
    setSelectedBooking(null);
  };

  // GradeSettings에서 뒤로가기 시 고급설정 시트 재오픈
  useEffect(() => {
    const reopenId = location.state?.reopenManage;
    if (!reopenId || !bookings.length) return;
    const target = bookings.find(b => b.id === reopenId);
    if (target) {
      openHostManage(target);
      window.history.replaceState({}, '');
    }
  }, [location.state, bookings]);

  const hmSaveField = async (fields) => {
    if (!hmBooking) return;
    setHmSaving(true);
    setHmSaveStatus('saving');
    try {
      await updateBooking(hmBooking.id, fields);
      setHmBooking(prev => ({ ...prev, ...fields }));
      setHmSaveStatus('saved');
      setTimeout(() => setHmSaveStatus('idle'), 2000);
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
      setHmSaveStatus('idle');
    } finally {
      setHmSaving(false);
    }
  };

  const handleHmTypeChange = async (newType) => { setHmType(newType); await hmSaveField({ type: newType }); };
  const handleHmTitleSave = async (val) => await hmSaveField({ title: val });
  const handleHmTimeSave = async () => await hmSaveField({ time: hmTime });

  const handleHmRemoveParticipant = async (phone) => {
    // 게스트이고 Member 레코드가 있는 경우 → 이 라운딩 청구 삭제
    const target = hmParticipants.find(p => p.phone === phone);
    if (target?.isGuest && target?.id && hmBooking?.id) {
      try {
        await apiService.deleteChargeTransaction(target.id, hmBooking.id);
      } catch (e) {
        // 청구가 없거나 이미 삭제된 경우 무시
      }
    }
    const updated = hmParticipants.filter(p => p.phone !== phone);
    setHmParticipants(updated);
    await hmSaveField({ participants: updated.map(p => JSON.stringify(p)) });
  };

  const handleHmAddMember = async (member) => {
    if (hmParticipants.some(p => p.phone === member.phone)) return;
    if (hmType === '컴페티션' && (!member.golflinkNumber || member.golflinkNumber.trim() === '')) {
      alert(`${member.nickname || member.name}님은 골프링크 번호가 없어 컴페티션에 추가할 수 없습니다.`);
      return;
    }
    const updated = [...hmParticipants, { name: member.name, nickname: member.nickname, phone: member.phone, memberId: member.id }];
    setHmParticipants(updated);
    await hmSaveField({ participants: updated.map(p => JSON.stringify(p)) });
  };

  const handleHmAddGuest = async () => {
    const name = hmGuestName.trim();
    if (!name) return;
    const hc = hmGuestHandicap !== '' ? parseFloat(hmGuestHandicap) : 36;
    const handicap = isNaN(hc) ? 36 : hc;
    const updated = [...hmParticipants, {
      name, nickname: name,
      phone: `guest_${Date.now()}`,
      isGuest: true,
      handicap: String(handicap),
      gaHandy: String(handicap),
    }];
    setHmParticipants(updated);
    setHmGuestName('');
    setHmGuestHandicap('');
    await hmSaveField({ participants: updated.map(p => JSON.stringify(p)) });
  };

  const handleHmAdvancedToggle = async (field) => {
    const newVal = !hmAdvanced[field];
    setHmAdvanced(prev => ({ ...prev, [field]: newVal }));
    await hmSaveField({ [field]: newVal });
  };

  const handleHmAdvancedSave = async (field, value) => {
    setHmAdvanced(prev => ({ ...prev, [field]: value }));
    await hmSaveField({ [field]: field === 'maxMembers' ? (parseInt(value) || 4) : (value || null) });
  };

  const handleHmDelete = async () => {
    if (!hmDeleteConfirm) { setHmDeleteConfirm(true); return; }
    setHmSaving(true);
    try {
      await apiService.deleteBooking(hmBooking.id);
      setShowHostManage(false);
      await refreshBookings();
    } catch { alert('삭제 중 오류가 발생했습니다.'); }
    finally { setHmSaving(false); }
  };

  const handleHmGameModeChange = async (mode) => {
    setHmAdvanced(prev => ({ ...prev, gameMode: mode }));
    setHmSaving(true);
    try {
      let existing = {};
      if (hmBooking.gradeSettings) {
        try { existing = typeof hmBooking.gradeSettings === 'string' ? JSON.parse(hmBooking.gradeSettings) : hmBooking.gradeSettings; } catch {}
      }
      await apiService.updateBooking(hmBooking.id, { gradeSettings: JSON.stringify({ ...existing, mode }) });
      setHmBooking(prev => ({ ...prev, gradeSettings: JSON.stringify({ ...existing, mode }) }));
      await refreshBookings();
    } catch { alert('저장 중 오류가 발생했습니다.'); }
    finally { setHmSaving(false); }
  };

  // ── Create booking ─────────────────────────────────────────────────────────
  const timeSlotValues = { 'Morning': '08:00', 'Afternoon': '13:00', 'Evening': '17:00', 'TBD': '23:59' };

  const handleCreateRounding = async () => {
    if (isCreating) return;
    if (!newRounding.courseName) { alert('골프장을 선택해주세요.'); return; }
    if (!newRounding.date) { alert('날짜를 선택해주세요.'); return; }
    let finalTime = newRounding.time;
    if (newRounding.timeSlot === 'Exact' && !finalTime) { alert('시간을 입력해주세요.'); return; }
    if (newRounding.timeSlot !== 'Exact') finalTime = timeSlotValues[newRounding.timeSlot];

    let title = '소셜 라운딩', type = '소셜';
    if (newRounding.roundingType === 'competition') { title = '클럽 컴페티션'; type = '컴페티션'; }
    else if (newRounding.roundingType === 'greenfee') { title = '그린피'; type = '그린피'; }

    setIsCreating(true);
    try {
      await addBooking({
        title, type, isSocial: true, courseName: newRounding.courseName,
        date: newRounding.date, time: finalTime, maxMembers: parseInt(newRounding.maxMembers) || 4,
        notes: newRounding.notes || '', organizerId: user.id, organizerPhone: user.phone,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true, playEnabled: false,
      });
      setShowCreateModal(false);
      setNewRounding({ date: '', time: '', courseName: 'Strathfield Golf Club', maxMembers: 4, notes: '', roundingType: '', timeSlot: 'Morning' });
    } catch (err) { alert('라운딩 생성에 실패했습니다.\n' + (err.message || '')); }
    finally { setIsCreating(false); }
  };

  const handleCreateOfficial = async () => {
    if (isCreating) return;
    if (!officialForm.courseName || !officialForm.date || !officialForm.time) { alert('골프장, 날짜, 시간은 필수 입력입니다.'); return; }
    setIsCreating(true);
    try {
      await addBooking({
        title: officialForm.title || '정기 라운딩', type: '정기모임', isSocial: false,
        courseName: officialForm.courseName, date: officialForm.date, time: officialForm.time,
        gatheringTime: officialForm.meetingTime || null,
        greenFee: parseInt(officialForm.greenFee) || null, cartFee: parseInt(officialForm.cartFee) || null,
        membershipFee: parseInt(officialForm.membershipFee) || null,
        registrationDeadline: officialForm.registrationDeadline || null,
        maxMembers: parseInt(officialForm.maxMembers) || 28, notes: officialForm.notes || null,
        organizerId: user.id, organizerPhone: user.phone,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true,
      });
      setShowCreateModal(false);
      setOfficialForm({ title: '', courseName: '', date: '', time: '', greenFee: '', cartFee: '', membershipFee: '', registrationDeadline: '', maxMembers: 28, notes: '', meetingTime: '' });
    } catch (err) { alert('라운딩 생성에 실패했습니다.\n' + (err.message || '')); }
    finally { setIsCreating(false); }
  };

  const timeSlotValuesCasual = { Morning: '08:00', Afternoon: '13:00', Evening: '17:00', TBD: '23:59' };

  const handleCreateCasual = async () => {
    if (isCreating) return;
    const courseName = casualForm.courseNameCustom.trim() || casualForm.courseName;
    if (!courseName) { alert('골프장을 선택하거나 입력해주세요.'); return; }
    if (!casualForm.date) { alert('날짜를 선택해주세요.'); return; }
    const finalTime = casualForm.timeSlot === 'Exact'
      ? (casualForm.time || '08:00')
      : timeSlotValuesCasual[casualForm.timeSlot] || '08:00';

    // 참가자 직렬화: 기존 멤버 + 게스트 모두 포함
    const participantList = [
      JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone }),
      ...casualForm.participants.map(p =>
        p.type === 'member'
          ? JSON.stringify({ name: p.data.name, nickname: p.data.nickname, phone: p.data.phone })
          : JSON.stringify({ name: p.data.name, nickname: p.data.name, phone: `guest_${Math.random().toString(36).slice(2,10)}`, isGuest: true, handicap: p.data.handicap })
      ),
    ];

    setIsCreating(true);
    try {
      const created = await addBooking({
        title: '캐주얼 라운딩',
        type: '캐주얼',
        isSocial: true,
        courseName,
        date: casualForm.date,
        time: finalTime,
        maxMembers: Math.max(4, participantList.length),
        organizerId: user.id,
        organizerPhone: user.phone,
        participants: participantList,
        isGuestAllowed: true,
        playEnabled: false,
      });

      // 초대 링크 자동 생성
      const bookingId = created?.id;
      if (bookingId) {
        try {
          const { inviteUrl } = await apiService.generateInviteLink(bookingId);
          setCasualInviteUrl(inviteUrl);
        } catch (_) { setCasualInviteUrl(''); }
      }
      setShowCreateModal(false);
      setShowCasualSuccess(true);
      setCasualForm({ courseName: '', courseNameCustom: '', date: '', timeSlot: 'Morning', time: '', participants: user ? [{ type: 'member', data: user, isOrganizer: true }] : [] });
    } catch (err) { alert('라운딩 생성에 실패했습니다.\n' + (err.message || '')); }
    finally { setIsCreating(false); }
  };

  const openCreate = () => {
    if (canSelectType) setShowTypeSelector(true);
    else { setCreateMode('social'); setShowCreateModal(true); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <PageHeader title="라운딩 라운지" showBackButton={false} user={user} />

      <div style={{ padding: '12px 16px 100px' }}>

        {/* ── 나의 라운딩 (컴팩트 컬러 카드) ──────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #dbe6f7' }}>
            {/* 컬러 타이틀 헤더 (클릭 시 펼침/접힘 토글) */}
            <div
              onClick={() => setMyBookingsExpanded(v => !v)}
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #1A6FD4 100%)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>나의 라운딩</span>
                {myBookings.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0047AB', background: 'rgba(255,255,255,0.9)', padding: '1px 7px', borderRadius: '9999px' }}>
                    {myBookings.length}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>＋ 버튼으로 개설</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: myBookingsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* 리스트 — 펼쳐진 경우에만 */}
            {myBookingsExpanded && (
              <div style={{ background: '#fff' }}>
                {myBookings.length === 0 ? (
                  <div style={{ padding: '12px 14px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>예정된 라운딩이 없습니다</div>
                ) : (
                  myBookings.map((b, idx) => {
                    const parts = parseParticipants(b.participants);
                    const names = parts.map(p => p.nickname || p.name);
                    const summary = names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}명`;
                    const d = new Date(b.date);
                    const days2 = ['일', '월', '화', '수', '목', '금', '토'];
                    return (
                      <div key={b.id} onClick={() => setSelectedBooking(b)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: 'pointer', borderTop: idx === 0 ? 'none' : '1px solid #F3F4F6' }}>
                        <div style={{ minWidth: '32px', textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0047AB', lineHeight: 1 }}>{d.getDate()}</div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '1px' }}>{days2[d.getDay()]}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.title || b.courseName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.courseName} · {summary}</div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 정기 라운딩 히어로 ───────────────────────────────── */}
        {upcomingRegular.length > 0 && (() => {
          const b = upcomingRegular[0];
          const d = new Date(b.date);
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const dow = days[d.getDay()];
          const timeStr = b.time && b.time !== '23:59' ? b.time.slice(0, 5) : '-';
          const parts = parseParticipants(b.participants);
          const maxCap = b.maxMembers || 24;
          const isJoined = parts.some(p => p.phone === user.phone);
          return (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 20px rgba(0,71,171,0.12)', border: '1px solid #E8ECF0' }}>
                {/* 이미지 */}
                <div style={{ position: 'relative', height: '180px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelectedBooking(b)}>
                  <img src={golfMembersPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 90%' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)' }} />
                  <div style={{ position: 'absolute', top: 14, left: 14, background: '#C0392B', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.02em' }}>정기라운딩</div>
                  {upcomingRegular.length > 1 && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>전체 {upcomingRegular.length}개</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)', fontWeight: '600', marginBottom: '2px', letterSpacing: '0.04em' }}>라운딩 날짜</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{month}월 {day}일 ({dow})</div>
                  </div>
                </div>
                {/* 정보 + 버튼 */}
                <div style={{ padding: '14px 16px 14px', cursor: 'pointer' }} onClick={() => setSelectedBooking(b)}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '3px', letterSpacing: '-0.02em' }}>{b.title || b.courseName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748B' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {b.courseName}
                    </div>
                    {(() => {
                      const course = (courses || []).find(c => c.name === b.courseName);
                      const mapsUrl = course?.latitude && course?.longitude
                        ? `https://www.google.com/maps/search/?api=1&query=${course.latitude},${course.longitude}`
                        : course?.address
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.address)}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.courseName)}`;
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(mapsUrl, '_blank'); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: '#EBF2FF', color: '#0047AB', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          지도보기
                        </button>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.02em', marginBottom: '2px' }}>참여 현황</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>{parts.length} <span style={{ fontSize: '12px', fontWeight: '500', color: '#94A3B8' }}>/ {maxCap}명</span></div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.02em', marginBottom: '2px' }}>티타임</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>{timeStr}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}
                      style={{ background: isJoined ? '#F1F5F9' : '#0047AB', color: isJoined ? '#64748B' : '#fff', border: 'none', borderRadius: '14px', padding: '11px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', letterSpacing: '-0.01em' }}
                    >
                      {isJoined ? '참가 중' : '참가하기'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* All bookings header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>개설된 라운딩</div>
        </div>

        <WeeklyTimeline groupedByWeek={groupedByWeek} user={user} onSelectBooking={setSelectedBooking} />
      </div>

      {/* FAB */}
      {canCreateBooking && (
        <button onClick={openCreate} style={{ position: 'fixed', bottom: '100px', right: '20px', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: '#0047AB', color: 'white', padding: '12px 20px', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 16px rgba(0,71,171,0.3), 0 0 0 4px rgba(0,71,171,0.08)', cursor: 'pointer', zIndex: 1000, animation: 'fabPulse 2.8s ease-in-out infinite' }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span> 라운딩 만들기
        </button>
      )}

      <BookingBottomSheet
        selectedBooking={selectedBooking}
        bookings={bookings}
        user={user}
        isJoining={isJoining}
        isRentalLoading={isRentalLoading}
        onJoinLeave={handleJoinLeave}
        onToggleRental={handleToggleRental}
        onOpenHostManage={openHostManage}
        onClose={() => setSelectedBooking(null)}
        sheetRef={sheetRef}
        getMemberName={getMemberName}
      />

      <HostManageSheet
        show={showHostManage}
        onClose={() => setShowHostManage(false)}
        booking={hmBooking}
        state={{ hmType, hmTitle, hmTime, hmParticipants, hmGuestName, hmGuestHandicap, hmMemberSearch, hmMemberDropdownOpen, hmSaving, hmSaveStatus, hmDeleteConfirm, hmInviteUrl, hmInviteLoading, hmViewMode, hmClubMemberOnly, hmAdvanced }}
        setters={{ setHmType, setHmTitle, setHmTime, setHmGuestName, setHmGuestHandicap, setHmMemberSearch, setHmMemberDropdownOpen, setHmDeleteConfirm, setHmInviteUrl, setHmInviteLoading, setHmViewMode, setHmAdvanced }}
        handlers={{ handleHmTypeChange, handleHmTitleSave, handleHmTimeSave, handleHmRemoveParticipant, handleHmAddMember, handleHmAddGuest, handleHmAdvancedToggle, handleHmAdvancedSave, handleHmDelete, handleHmGameModeChange, hmSaveField }}
        user={user}
        members={members}
      />

      <CreateBookingModal
        showCreateModal={showCreateModal}
        showTypeSelector={showTypeSelector}
        createMode={createMode}
        newRounding={newRounding}
        officialForm={officialForm}
        casualForm={casualForm}
        isCreating={isCreating}
        canSelectType={canSelectType}
        courses={courses}
        members={members}
        onCloseCreate={() => setShowCreateModal(false)}
        onCloseTypeSelector={() => setShowTypeSelector(false)}
        onSelectType={(mode) => { setCreateMode(mode); setShowTypeSelector(false); setShowCreateModal(true); }}
        onChangeNewRounding={setNewRounding}
        onChangeOfficialForm={setOfficialForm}
        onChangeCasualForm={setCasualForm}
        onCreateRounding={handleCreateRounding}
        onCreateOfficial={handleCreateOfficial}
        onCreateCasual={handleCreateCasual}
        onOpenCreate={openCreate}
        onAddCourse={addCourse}
      />

      {/* 캐주얼 라운딩 생성 완료 모달 */}
      {showCasualSuccess && (
        <>
          <div onClick={() => setShowCasualSuccess(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 1300, padding: '28px 24px', paddingBottom: 'max(32px, calc(24px + env(safe-area-inset-bottom)))', boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏌️</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>캐주얼 라운딩 생성 완료!</div>
              <div style={{ fontSize: '14px', color: '#64748B' }}>초대 링크를 공유하면 외부인도 스코어를 입력할 수 있습니다</div>
            </div>

            {casualInviteUrl ? (
              <>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, fontSize: '13px', color: '#475569', wordBreak: 'break-all', lineHeight: 1.4 }}>{casualInviteUrl}</div>
                </div>
                <button
                  onClick={async () => {
                    const url = casualInviteUrl;
                    // 1) Web Share API 시도 (iOS Safari / Android Chrome)
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: '캐주얼 라운딩 초대', text: '골프 라운딩에 초대합니다!', url });
                        return;
                      } catch (err) {
                        if (err.name === 'AbortError') return; // 사용자가 직접 닫은 경우
                      }
                    }
                    // 2) Clipboard API 시도
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      try {
                        await navigator.clipboard.writeText(url);
                        alert('링크가 복사되었습니다!');
                        return;
                      } catch (_) {}
                    }
                    // 3) execCommand fallback (구형 브라우저, HTTP)
                    try {
                      const ta = document.createElement('textarea');
                      ta.value = url;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.focus();
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      alert('링크가 복사되었습니다!');
                    } catch (_) {
                      // 최후 수단: 직접 보여주기
                      prompt('아래 링크를 복사해주세요:', url);
                    }
                  }}
                  style={{ width: '100%', padding: '15px', borderRadius: '14px', border: 'none', background: '#065F46', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px' }}
                >
                  초대 링크 공유하기
                </button>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', marginBottom: '16px' }}>
                초대 링크는 라운딩 관리 페이지에서 생성할 수 있습니다
              </div>
            )}

            <button
              onClick={() => setShowCasualSuccess(false)}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: '#F1F5F9', color: '#64748B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
            >
              닫기
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(0,71,171,0.3), 0 0 0 4px rgba(0,71,171,0.08); }
          50% { box-shadow: 0 6px 20px rgba(0,71,171,0.4), 0 0 0 8px rgba(0,71,171,0.05); }
        }
      `}</style>
    </div>
  );
}

export default RoundingListV2;
