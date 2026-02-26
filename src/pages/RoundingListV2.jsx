import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import theme from '../styles/theme';
import { ProfileBadge } from '../components/common';
import PageHeader from '../components/common/PageHeader';

const parseParticipants = (participants) => {
  if (!participants || !Array.isArray(participants)) return [];
  return participants.map(p => {
    try {
      return typeof p === 'string' ? JSON.parse(p) : p;
    } catch {
      return p;
    }
  });
};

const isBookingActive = (booking) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

function RoundingListV2() {
  const { user, bookings, members, courses, addBooking, updateBooking, refreshBookings } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [createMode, setCreateMode] = useState('social');
  const [isJoining, setIsJoining] = useState(false);
  const [isRentalLoading, setIsRentalLoading] = useState(false);
  const [hoveredTileId, setHoveredTileId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [showHostManage, setShowHostManage] = useState(false);
  const [hmBooking, setHmBooking] = useState(null);
  const [hmType, setHmType] = useState('');
  const [hmTime, setHmTime] = useState('');
  const [hmParticipants, setHmParticipants] = useState([]);
  const [hmGuestName, setHmGuestName] = useState('');
  const [hmMemberSearch, setHmMemberSearch] = useState('');
  const [hmMemberDropdownOpen, setHmMemberDropdownOpen] = useState(false);
  const [hmSaving, setHmSaving] = useState(false);
  const [hmDeleteConfirm, setHmDeleteConfirm] = useState(false);
  const [hmViewMode, setHmViewMode] = useState('basic');
  const [hmAdvanced, setHmAdvanced] = useState({ playEnabled: false, is2BB: false, greenFee: '', cartFee: '', membershipFee: '', notes: '', courseName: '', date: '', gatheringTime: '', restaurantName: '', restaurantAddress: '', isFoursome: false, maxMembers: 4, registrationDeadline: '' });
  const [newRounding, setNewRounding] = useState({
    date: '',
    time: '',
    courseName: 'Strathfield Golf Club',
    maxMembers: 4,
    notes: '',
    roundingType: '',
    timeMode: 'recruit',
    timeSlot: 'Morning',
  });
  const [officialForm, setOfficialForm] = useState({
    title: '',
    courseName: '',
    date: '',
    time: '',
    greenFee: '',
    cartFee: '',
    membershipFee: '',
    registrationDeadline: '',
    maxMembers: 28,
    notes: '',
    meetingTime: '',
  });
  const isAdmin = user.role === '관리자';
  const canCreateBooking = true;
  const sheetRef = useRef(null);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && bookings.length > 0) {
      const found = bookings.find(b => b.id === idParam);
      if (found) {
        setSelectedBooking(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, bookings]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectedBooking && sheetRef.current && !sheetRef.current.contains(e.target)) {
        setSelectedBooking(null);
      }
    };
    if (selectedBooking) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBooking]);

  const officialRoundings = useMemo(() => {
    return bookings
      .filter(b => !b.isSocial && isBookingActive(b))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings]);

  const socialRoundings = useMemo(() => {
    return bookings
      .filter(b => b.isSocial && isBookingActive(b))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings]);

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekLabel = (monday) => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const month = sunday.getMonth() + 1;
    const weekNum = Math.ceil(sunday.getDate() / 7);
    return `${month}월 ${weekNum}주차`;
  };

  const groupedByWeek = useMemo(() => {
    const allActive = bookings
      .filter(b => isBookingActive(b))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const weekMap = {};
    allActive.forEach(booking => {
      const monday = getMonday(new Date(booking.date));
      const key = monday.toISOString().split('T')[0];
      if (!weekMap[key]) {
        weekMap[key] = { monday, label: getWeekLabel(monday), bookings: [] };
      }
      weekMap[key].bookings.push(booking);
    });

    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, week]) => ({
        ...week,
        bookings: week.bookings.sort((a, b) => new Date(a.date) - new Date(b.date)),
      }));
  }, [bookings]);

  const getMemberName = useCallback((id) => {
    const member = members.find(m => m.id === id);
    return member?.nickname || member?.name || '알 수 없음';
  }, [members]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = days[d.getDay()];
    return `${month}/${date} (${day})`;
  };

  const handleJoinLeave = async (booking) => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      const latest = bookings.find(b => b.id === booking.id) || booking;
      const participants = parseParticipants(latest.participants);
      const alreadyJoined = participants.some(p => p.phone === user.phone);

      if (alreadyJoined) {
        const updatedParticipants = participants
          .filter(p => p.phone !== user.phone)
          .map(p => JSON.stringify(p));
        await updateBooking(booking.id, { participants: updatedParticipants });
      } else {
        if (booking.type === '컴페티션' && (!user.golflinkNumber || user.golflinkNumber.trim() === '')) {
          alert('클럽 컴페티션은 골프링크 번호가 필수입니다. 마이페이지에서 등록해주세요.');
          setIsJoining(false);
          return;
        }
        const max = latest.maxMembers || 4;
        if (participants.length >= max) {
          alert('이미 정원이 마감되었습니다.');
          return;
        }
        const updatedParticipants = [
          ...participants,
          { name: user.name, nickname: user.nickname, phone: user.phone }
        ].map(p => JSON.stringify(p));
        await updateBooking(booking.id, { participants: updatedParticipants });
      }
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
      if (!isCurrentlyRenting) {
        alert(`${user.nickname}님, 번호 대여 감사합니다!`);
      }
    } catch (error) {
      alert('번호대여 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsRentalLoading(false);
    }
  };

  const openHostManage = (booking) => {
    const parts = parseParticipants(booking.participants);
    setHmBooking(booking);
    setHmType(booking.type || '소셜');
    setHmTime(booking.time || '');
    setHmParticipants(parts);
    setHmGuestName('');
    setHmDeleteConfirm(false);
    setHmSaving(false);
    setHmViewMode('basic');
    let savedGameMode = 'stroke';
    if (booking.gradeSettings) {
      try {
        const parsed = typeof booking.gradeSettings === 'string'
          ? JSON.parse(booking.gradeSettings)
          : booking.gradeSettings;
        if (parsed?.mode) savedGameMode = parsed.mode;
      } catch {}
    }
    setHmAdvanced({
      playEnabled: booking.playEnabled || false,
      is2BB: booking.is2BB || false,
      greenFee: booking.greenFee || '',
      cartFee: booking.cartFee || '',
      membershipFee: booking.membershipFee || '',
      notes: booking.notes || '',
      courseName: booking.courseName || '',
      date: booking.date || '',
      gatheringTime: booking.gatheringTime || '',
      restaurantName: booking.restaurantName || '',
      restaurantAddress: booking.restaurantAddress || '',
      isFoursome: booking.title?.includes('포썸') || false,
      maxMembers: booking.maxMembers || 4,
      registrationDeadline: booking.registrationDeadline || '',
      gameMode: savedGameMode,
    });
    setShowHostManage(true);
    setSelectedBooking(null);
  };

  const hmSaveField = async (fields) => {
    if (!hmBooking) return;
    setHmSaving(true);
    try {
      await updateBooking(hmBooking.id, fields);
      setHmBooking(prev => ({ ...prev, ...fields }));
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
      console.error('Host manage save failed:', err);
    } finally {
      setHmSaving(false);
    }
  };

  const handleHmTypeChange = async (newType) => {
    setHmType(newType);
    await hmSaveField({ type: newType });
  };

  const handleHmTimeSave = async () => {
    await hmSaveField({ time: hmTime });
  };

  const handleHmRemoveParticipant = async (phone) => {
    const updated = hmParticipants.filter(p => p.phone !== phone);
    setHmParticipants(updated);
    const serialized = updated.map(p => JSON.stringify(p));
    await hmSaveField({ participants: serialized });
  };

  const handleHmAddMember = async (member) => {
    if (hmParticipants.some(p => p.phone === member.phone)) return;
    if (hmType === '컴페티션' && (!member.golflinkNumber || member.golflinkNumber.trim() === '')) {
      alert(`${member.nickname || member.name}님은 골프링크 번호가 없어 컴페티션에 추가할 수 없습니다.`);
      return;
    }
    const newP = { name: member.name, nickname: member.nickname, phone: member.phone, memberId: member.id };
    const updated = [...hmParticipants, newP];
    setHmParticipants(updated);
    const serialized = updated.map(p => JSON.stringify(p));
    await hmSaveField({ participants: serialized });
  };

  const handleHmAddGuest = async () => {
    const name = hmGuestName.trim();
    if (!name) return;
    const guest = {
      name: name,
      nickname: name,
      phone: `guest_${Date.now()}`,
    };
    const updated = [...hmParticipants, guest];
    setHmParticipants(updated);
    setHmGuestName('');
    const serialized = updated.map(p => JSON.stringify(p));
    await hmSaveField({ participants: serialized });
  };

  const handleHmAdvancedToggle = async (field) => {
    const newVal = !hmAdvanced[field];
    setHmAdvanced(prev => ({ ...prev, [field]: newVal }));
    await hmSaveField({ [field]: newVal });
  };

  const handleHmAdvancedSave = async (field, value) => {
    setHmAdvanced(prev => ({ ...prev, [field]: value }));
    const saveVal = (field === 'maxMembers') ? (parseInt(value) || 4) : (value || null);
    await hmSaveField({ [field]: saveVal });
  };

  const handleHmDelete = async () => {
    if (!hmDeleteConfirm) {
      setHmDeleteConfirm(true);
      return;
    }
    setHmSaving(true);
    try {
      await apiService.deleteBooking(hmBooking.id);
      setShowHostManage(false);
      await refreshBookings();
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setHmSaving(false);
    }
  };

  const handleHmGameModeChange = async (mode) => {
    setHmAdvanced(prev => ({ ...prev, gameMode: mode }));
    setHmSaving(true);
    try {
      let existing = {};
      if (hmBooking.gradeSettings) {
        try {
          existing = typeof hmBooking.gradeSettings === 'string'
            ? JSON.parse(hmBooking.gradeSettings)
            : hmBooking.gradeSettings;
        } catch {}
      }
      await apiService.updateBooking(hmBooking.id, {
        gradeSettings: JSON.stringify({ ...existing, mode }),
      });
      setHmBooking(prev => ({ ...prev, gradeSettings: JSON.stringify({ ...existing, mode }) }));
      await refreshBookings();
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setHmSaving(false);
    }
  };

  const getEffectiveDeadline = (booking) => {
    if (booking.registrationDeadline) {
      const d = new Date(booking.registrationDeadline);
      if (!isNaN(d.getTime())) return d;
    }
    const bookingDate = new Date(booking.date);
    const deadline = new Date(bookingDate);
    deadline.setDate(bookingDate.getDate() - 8);
    deadline.setHours(18, 0, 0, 0);
    return deadline;
  };

  const getBookingStatusFlags = (booking) => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastRoundingDate = bookingDate < today;
    const isRoundingDay = bookingDate.toDateString() === new Date().toDateString();
    const deadline = getEffectiveDeadline(booking);
    const isRegistrationClosed = new Date() > deadline;
    return { isPastRoundingDate, isRoundingDay, isRegistrationClosed };
  };

  const isStrathfield = newRounding.courseName.toLowerCase().includes('strathfield');

  const timeSlotMap = {
    'Morning': { label: '오전', value: '08:00' },
    'Afternoon': { label: '오후', value: '13:00' },
    'Evening': { label: '저녁', value: '17:00' },
    'TBD': { label: '시간미정', value: '23:59' },
    'Exact': { label: '직접 입력', value: '' },
  };

  const handleCreateRounding = async () => {
    if (isCreating) return;
    if (!newRounding.courseName) {
      alert('골프장을 선택해주세요.');
      return;
    }

    let finalDate = newRounding.date;
    let finalTime = newRounding.time;
    let playEnabled = false;

    if (newRounding.timeMode === 'now') {
      const now = new Date();
      finalDate = now.toISOString().split('T')[0];
      finalTime = now.toTimeString().slice(0, 5);
      playEnabled = true;
    } else {
      if (!finalDate) {
        alert('날짜를 선택해주세요.');
        return;
      }
      if (newRounding.timeSlot === 'Exact' && !finalTime) {
        alert('시간을 입력해주세요.');
        return;
      }
      if (newRounding.timeSlot !== 'Exact') {
        finalTime = timeSlotMap[newRounding.timeSlot].value;
      }
    }

    let title = '소셜 라운딩';
    let type = '소셜';
    if (newRounding.roundingType === 'competition') {
      title = '클럽 컴페티션';
      type = '컴페티션';
    } else if (newRounding.roundingType === 'greenfee') {
      title = '그린피';
      type = '그린피';
    } else {
      title = '소셜 라운딩';
      type = '소셜';
    }

    setIsCreating(true);
    try {
      const bookingData = {
        title,
        type,
        isSocial: true,
        courseName: newRounding.courseName,
        date: finalDate,
        time: finalTime,
        maxMembers: parseInt(newRounding.maxMembers) || 4,
        notes: newRounding.notes || '',
        organizerId: user.id,
        organizerPhone: user.phone,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true,
        playEnabled,
      };
      await addBooking(bookingData);
      setShowCreateModal(false);
      setNewRounding({ date: '', time: '', courseName: 'Strathfield Golf Club', maxMembers: 4, notes: '', roundingType: '', timeMode: 'recruit', timeSlot: 'Morning' });
    } catch (err) {
      alert('라운딩 생성에 실패했습니다.\n' + (err.message || ''));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateOfficial = async () => {
    if (isCreating) return;
    if (!officialForm.courseName || !officialForm.date || !officialForm.time) {
      alert('골프장, 날짜, 시간은 필수 입력입니다.');
      return;
    }
    setIsCreating(true);
    try {
      const bookingData = {
        title: officialForm.title || '정기 라운딩',
        type: '정기모임',
        isSocial: false,
        courseName: officialForm.courseName,
        date: officialForm.date,
        time: officialForm.time,
        gatheringTime: officialForm.meetingTime || null,
        greenFee: parseInt(officialForm.greenFee) || null,
        cartFee: parseInt(officialForm.cartFee) || null,
        membershipFee: parseInt(officialForm.membershipFee) || null,
        registrationDeadline: officialForm.registrationDeadline || null,
        maxMembers: parseInt(officialForm.maxMembers) || 28,
        notes: officialForm.notes || null,
        organizerId: user.id,
        organizerPhone: user.phone,
        participants: [JSON.stringify({ name: user.name, nickname: user.nickname, phone: user.phone })],
        isGuestAllowed: true,
      };
      await addBooking(bookingData);
      setShowCreateModal(false);
      setOfficialForm({ title: '', courseName: '', date: '', time: '', greenFee: '', cartFee: '', membershipFee: '', registrationDeadline: '', maxMembers: 28, notes: '', meetingTime: '' });
    } catch (err) {
      alert('라운딩 생성에 실패했습니다.\n' + (err.message || ''));
    } finally {
      setIsCreating(false);
    }
  };

  const renderParticipantsSummary = (booking) => {
    const participants = parseParticipants(booking.participants);
    if (participants.length === 0) return <span style={{ color: theme.colors.success, fontStyle: 'italic' }}>모집중...</span>;
    const names = participants.map(p => p.nickname || p.name);
    const maxShow = 3;
    if (names.length <= maxShow) {
      return <span>{names.join(', ')}</span>;
    }
    return <span>{names.slice(0, maxShow).join(', ')} +{names.length - maxShow}명</span>;
  };

  const getTypeBadge = (booking) => {
    const typeLabel = booking.title || booking.type || '';
    let bg = '#FFEDD5';
    let color = '#9A3412';
    if (typeLabel.includes('컴페티션')) { bg = '#1E293B'; color = '#FFFFFF'; }
    else if (typeLabel.includes('그린피')) { bg = '#D1FAE5'; color = '#065F46'; }
    else if (typeLabel.includes('소셜') || typeLabel.includes('Social')) { bg = '#FFEDD5'; color = '#9A3412'; }
    else if (typeLabel.includes('정기')) { bg = '#BF4D34'; color = '#FFFFFF'; }
    if (!typeLabel) return null;
    return (
      <span style={{
        fontSize: '11px',
        fontWeight: '700',
        padding: '4px 10px',
        borderRadius: '9999px',
        background: bg,
        color: color,
        display: 'inline-block',
      }}>
        {typeLabel}
      </span>
    );
  };

  const getStatusBadge = (booking) => {
    const participants = parseParticipants(booking.participants);
    const max = booking.maxMembers || 4;
    const isFull = participants.length >= max;
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        background: isFull ? '#FEE2E2' : 'rgba(26,61,71,0.08)',
        color: isFull ? '#DC2626' : '#1a3d47',
      }}>
        {isFull ? '마감' : `모집중 ${participants.length}/${max}`}
      </span>
    );
  };

  const renderOfficialCard = (booking) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    return (
      <div
        key={booking.id}
        onClick={() => setSelectedBooking(booking)}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderLeft: '4px solid #D97706',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {getTypeBadge(booking)}
          <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: '700' }}>{formatDate(booking.date)}</span>
        </div>
        <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
          {booking.courseName}
        </div>
        <div style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{participants.length}명 참가</span>
          {isJoined && (
            <>
              <span>·</span>
              <span style={{ color: '#059669', fontWeight: '600' }}>참가중</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSocialCard = (booking) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    return (
      <div
        key={booking.id}
        onClick={() => setSelectedBooking(booking)}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: 'none',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getTypeBadge(booking)}
            <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: '700' }}>{formatDate(booking.date)}</span>
          </div>
          {getStatusBadge(booking)}
        </div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
          {booking.courseName}
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <span style={{ fontWeight: '500' }}>주최: {getMemberName(booking.organizerId)}</span>
        </div>
        <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
          {renderParticipantsSummary(booking)}
        </div>
      </div>
    );
  };

  const getTileAccentColor = (booking) => {
    const typeLabel = (booking.title || booking.type || '').toLowerCase();
    if (typeLabel.includes('정기') || typeLabel.includes('official')) return '#D97706';
    if (typeLabel.includes('컴페티션') || typeLabel.includes('competition')) return '#1D4ED8';
    if (typeLabel.includes('그린피') || typeLabel.includes('greenfee')) return '#059669';
    return '#EA580C';
  };

  const getTileTypeBadge = (booking) => {
    const type = (booking.type || '').trim();
    if (type === '정기모임') return { label: '정기', bg: '#FDF4E7', color: '#B45309' };
    if (type === '컴페티션') return { label: '컴페티션', bg: '#EEF0F8', color: '#4338CA' };
    if (type === '그린피') return { label: '그린피', bg: '#E6F4F3', color: '#0F766E' };
    return { label: '소셜', bg: '#FBF0EC', color: '#C2410C' };
  };

  const formatTileDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월${d.getDate()}일 (${days[d.getDay()]})`;
  };

  const formatTileTime = (timeStr) => {
    if (!timeStr || timeStr === '23:59') return '';
    if (timeStr.startsWith('08:00')) return '오전';
    if (timeStr.startsWith('13:00')) return '오후';
    return timeStr.slice(0, 5);
  };

  const renderWeekTile = (booking, tilesInRow = 3) => {
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const max = booking.maxMembers || 4;
    const isFull = participants.length >= max;
    const accentColor = getTileAccentColor(booking);
    const time = formatTileTime(booking.time);
    const { isRegistrationClosed } = getBookingStatusFlags(booking);
    const isCompetition = booking.type === '컴페티션';

    const deadline = getEffectiveDeadline(booking);
    const now = new Date();
    const msLeft = deadline - now;
    const hoursLeft = msLeft / (1000 * 60 * 60);
    const daysLeft = Math.ceil(hoursLeft / 24);

    let badgeText;
    let badgeBg;
    let badgeColor;
    if (isCompetition && isRegistrationClosed) {
      badgeText = '마감';
      badgeBg = '#FFF1F2';
      badgeColor = '#9F1239';
    } else if (isCompetition && hoursLeft <= 24) {
      const h = Math.max(1, Math.ceil(hoursLeft));
      badgeText = `${h}h`;
      badgeBg = '#FFFBEB';
      badgeColor = '#92400E';
    } else if (isCompetition) {
      badgeText = `마감${daysLeft}일`;
      badgeBg = '#DCFCE7';
      badgeColor = '#166534';
    } else {
      badgeText = `${participants.length}명`;
      badgeBg = '#F9FAFB';
      badgeColor = '#374151';
    }

    const visibleNames = participants.slice(0, 3).map(p => p.nickname || p.name).join(', ');
    const remainingCount = participants.length - 3;
    const participantText = remainingCount > 0 ? `${visibleNames} 외 ${remainingCount}명` : visibleNames;

    const { label: typeLabel, bg: typeBg, color: typeColor } = getTileTypeBadge(booking);
    const rawName = booking.courseName || booking.title || '';
    const shortLocation = rawName.split(/\s*golf\s*/i)[0].trim();

    return (
      <div
        key={booking.id}
        onClick={() => setSelectedBooking(booking)}
        style={{
          flex: '1 1 0',
          minWidth: '115px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          border: '1px solid #F0F1F3',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          cursor: 'pointer',
          position: 'relative',
          transition: 'box-shadow 0.15s ease',
          minHeight: '160px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
        {/* Row 1: location badge first, then type badge, then joined dot */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
          {shortLocation && (
            <span style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#374151',
              background: '#F3F4F6',
              borderRadius: '5px',
              padding: '2px 6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {shortLocation}
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: typeColor,
            background: typeBg,
            borderRadius: '5px',
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {typeLabel}
          </span>
          {isJoined && (
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', flexShrink: 0, marginLeft: 'auto' }} />
          )}
        </div>

        {/* Row 2: Date + Time (hero) */}
        <div>
          <div style={{ fontSize: 'clamp(16px, 4.5vw, 20px)', fontWeight: '800', color: '#111827', lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.5px', display: 'block' }}>
            {formatTileDate(booking.date)}
          </div>
          {time && (
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
              {time}
            </div>
          )}
        </div>

        {/* Row 3: Participants as plain text */}
        {participantText && (
          <div style={{
            fontSize: '11px',
            fontWeight: '500',
            color: '#6B7280',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {participantText}
          </div>
        )}

        {/* Row 4: Status badge — pushed to bottom */}
        <div style={{
          display: 'inline-block',
          alignSelf: 'flex-start',
          fontSize: '10px',
          fontWeight: '600',
          padding: '2px 7px',
          borderRadius: '5px',
          background: badgeBg,
          color: badgeColor,
          marginTop: 'auto',
        }}>
          {badgeText}
        </div>
        </div>
      </div>
    );
  };

  const renderWeeklyTimeline = () => {
    if (groupedByWeek.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: '#9CA3AF',
          fontSize: '14px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⛳</div>
          <div style={{ fontWeight: '500' }}>예정된 라운딩이 없습니다</div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: '#D1D5DB' }}>+ 버튼을 눌러 라운딩을 만들어보세요</div>
        </div>
      );
    }

    return groupedByWeek.map((week, idx) => (
      <React.Fragment key={week.monday.toISOString()}>
        {idx > 0 && (
          <hr style={{
            border: 'none',
            borderTop: '1px solid #E5E7EB',
            marginTop: '20px',
            marginBottom: '20px',
          }} />
        )}
        <div style={{
          marginTop: idx === 0 ? '8px' : 0,
          marginBottom: '4px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#374151',
            marginBottom: '8px',
          }}>
            {week.label}
          </div>
          <div
            className="scroll-hide"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'stretch',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginLeft: '-16px',
              marginRight: '-16px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
          >
            {week.bookings.map(b => renderWeekTile(b, week.bookings.length))}
          </div>
        </div>
      </React.Fragment>
    ));
  };

  const handleShare = async (booking) => {
    const shareUrl = `${window.location.origin}/v2/roundings?id=${booking.id}`;
    const shareText = `${booking.courseName} ${formatDate(booking.date)} 라운딩에 참가하세요!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '라운딩 초대',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          alert('링크가 복사되었습니다!');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('링크가 복사되었습니다!');
      } catch {
        prompt('아래 링크를 복사하세요:', shareUrl);
      }
    }
  };

  const renderHostManage = () => {
    if (!showHostManage || !hmBooking) return null;

    const typeOptions = [
      { key: '컴페티션', label: '컴페티션', icon: '🏆' },
      { key: '그린피', label: '그린피', icon: '⛳' },
      { key: '소셜', label: '소셜', icon: '☕' },
    ];

    const primaryDark = '#1a3d47';

    const sectionTitle = (text) => (
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
        {text}
      </div>
    );

    const divider = () => (
      <div style={{ height: '1px', background: '#F3F4F6', margin: '20px 0' }} />
    );

    return (
      <>
        <div
          onClick={() => setShowHostManage(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(2px)' }}
        />
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          zIndex: 1000,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.25s ease-out',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}>
          <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
            <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>

          <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hmViewMode === 'advanced' && (
                <button
                  onClick={() => setHmViewMode('basic')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                  {hmViewMode === 'basic' ? '라운딩 관리' : '고급 설정'}
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>{hmBooking.courseName} · {formatDate(hmBooking.date)}</div>
              </div>
            </div>
            <button
              onClick={() => setShowHostManage(false)}
              style={{
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                maxWidth: '36px',
                maxHeight: '36px',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B7280',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', paddingBottom: 'max(120px, calc(100px + env(safe-area-inset-bottom)))' }}>

            {hmViewMode === 'basic' && (<>

            {sectionTitle('라운딩 유형')}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
              {typeOptions.map(opt => {
                const active = hmType === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleHmTypeChange(opt.key)}
                    disabled={hmSaving}
                    style={{
                      flex: 1,
                      padding: '12px 4px',
                      borderRadius: '14px',
                      border: active ? 'none' : '1px solid #E5E7EB',
                      background: active ? primaryDark : '#FFFFFF',
                      color: active ? '#FFFFFF' : '#6B7280',
                      fontWeight: active ? '700' : '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: active ? '0 2px 8px rgba(26,61,71,0.2)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '16px', filter: active ? 'brightness(1.2)' : 'grayscale(0.4)' }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {divider()}

            {sectionTitle('라운딩 시간')}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="time"
                value={hmTime}
                onChange={(e) => setHmTime(e.target.value)}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '14px',
                  border: '1px solid #E5E7EB',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleHmTimeSave}
                disabled={hmSaving}
                style={{
                  padding: '11px 20px',
                  borderRadius: '14px',
                  background: primaryDark,
                  color: 'white',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  opacity: hmSaving ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                저장
              </button>
            </div>

            {divider()}

            {sectionTitle(`참가자 (${hmParticipants.length}명)`)}

            {(() => {
              const participantPhones = hmParticipants.map(p => p.phone);
              const availableMembers = members.filter(m => m.isActive && m.approvalStatus === 'approved' && !participantPhones.includes(m.phone));
              const searchTerm = hmMemberSearch.trim().toLowerCase();
              const filteredMembers = searchTerm
                ? availableMembers.filter(m => (m.nickname || m.name || '').toLowerCase().includes(searchTerm) || (m.name || '').toLowerCase().includes(searchTerm))
                : availableMembers;
              return (
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={hmMemberSearch}
                    onChange={(e) => { setHmMemberSearch(e.target.value); setHmMemberDropdownOpen(true); }}
                    onFocus={() => setHmMemberDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setHmMemberDropdownOpen(false), 150)}
                    placeholder="+ 회원 검색 또는 추가..."
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '14px',
                      border: `1px solid ${hmMemberDropdownOpen ? '#1a3d47' : '#E5E7EB'}`,
                      fontSize: '15px',
                      background: '#FFFFFF',
                      color: '#374151',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                  {hmMemberDropdownOpen && filteredMembers.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}>
                      {filteredMembers.map(m => (
                        <div
                          key={m.id}
                          onClick={() => { handleHmAddMember(m); setHmMemberSearch(''); setHmMemberDropdownOpen(false); }}
                          style={{
                            padding: '10px 14px',
                            fontSize: '15px',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderBottom: '1px solid #F9FAFB',
                          }}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#3B82F6',
                            flexShrink: 0,
                          }}>
                            {(m.nickname || m.name || '').charAt(0)}
                          </div>
                          {m.nickname || m.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {hmMemberDropdownOpen && filteredMembers.length === 0 && searchTerm && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      marginTop: '4px',
                      padding: '12px 14px',
                      fontSize: '14px',
                      color: '#9CA3AF',
                      zIndex: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}>
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {hmParticipants.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: '14px', padding: '8px 0' }}>참가자가 없습니다.</div>
              ) : (
                hmParticipants.map((p, idx) => {
                  const isGuest = p.phone && p.phone.startsWith('guest_');
                  return (
                    <div
                      key={p.phone || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#F9FAFB',
                        border: '1px solid #F3F4F6',
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isGuest ? '#F3F4F6' : '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        flexShrink: 0,
                        marginRight: '8px',
                        color: isGuest ? '#6B7280' : '#3B82F6',
                      }}>
                        {isGuest ? 'G' : (p.nickname || p.name || '').charAt(0)}
                      </div>
                      <span style={{ flex: 1, fontSize: '15px', fontWeight: '500', color: '#111827' }}>
                        {p.nickname || p.name}
                        {isGuest && <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '6px' }}>게스트</span>}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleHmRemoveParticipant(p.phone); }}
                        disabled={hmSaving}
                        style={{
                          width: '28px',
                          height: '28px',
                          minWidth: '28px',
                          minHeight: '28px',
                          maxWidth: '28px',
                          maxHeight: '28px',
                          padding: 0,
                          borderRadius: '50%',
                          background: '#F3F4F6',
                          border: 'none',
                          color: '#9CA3AF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxSizing: 'border-box',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={hmGuestName}
                onChange={(e) => { e.stopPropagation(); setHmGuestName(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleHmAddGuest(); } }}
                placeholder="게스트 이름 입력"
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '14px',
                  border: '1px solid #E5E7EB',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleHmAddGuest(); }}
                disabled={hmSaving || !hmGuestName.trim()}
                style={{
                  padding: '11px 16px',
                  borderRadius: '14px',
                  background: primaryDark,
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: (!hmGuestName.trim() || hmSaving) ? 0.4 : 1,
                }}
              >
                + 추가
              </button>
            </div>

            {hmParticipants.length >= 4 && (
              <>
                {divider()}
                <button
                  onClick={() => { setShowHostManage(false); navigate(`/team-formation?id=${hmBooking.id}`); }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    background: primaryDark,
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(26,61,71,0.15)',
                  }}
                >
                  조편성 하기
                </button>
              </>
            )}

            {(user.isAdmin || hmType === '정기모임' || hmType === '컴페티션') && (
              <>
                {divider()}
                <button
                  onClick={() => setHmViewMode('advanced')}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: '#F9FAFB',
                    border: '1px solid #F3F4F6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>고급 설정</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </>
            )}

            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <button
                onClick={handleHmDelete}
                disabled={hmSaving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: hmDeleteConfirm ? '#DC2626' : '#9CA3AF',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  opacity: hmSaving ? 0.6 : 1,
                  transition: 'color 0.2s',
                }}
              >
                {hmDeleteConfirm ? '정말 삭제하시겠습니까? 다시 클릭하여 확인' : '라운딩 삭제'}
              </button>
            </div>

            </>)}

            {hmViewMode === 'advanced' && (() => {
              const toggleRow = (label, field, description) => (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{label}</div>
                    {description && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{description}</div>}
                  </div>
                  <button
                    onClick={() => handleHmAdvancedToggle(field)}
                    disabled={hmSaving}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      border: 'none',
                      background: hmAdvanced[field] ? '#1a3d47' : '#E5E7EB',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: hmAdvanced[field] ? '23px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </button>
                </div>
              );

              const inputRow = (label, field, placeholder, type = 'text') => (
                <div style={{
                  padding: '16px 0',
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>{label}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type={type}
                      value={hmAdvanced[field]}
                      onChange={(e) => setHmAdvanced(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={placeholder}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={() => handleHmAdvancedSave(field, type === 'number' ? (hmAdvanced[field] ? parseInt(hmAdvanced[field]) : null) : hmAdvanced[field])}
                      disabled={hmSaving}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: '#1a3d47',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        opacity: hmSaving ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              );

              const advInputStyle = {
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              };

              return (
                <>
                  {sectionTitle('라운딩 정보')}

                  <div style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>골프장</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={hmAdvanced.courseName}
                        onChange={(e) => setHmAdvanced(prev => ({ ...prev, courseName: e.target.value }))}
                        style={{ ...advInputStyle, flex: 1, background: '#FFFFFF' }}
                      >
                        <option value="">골프장 선택...</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleHmAdvancedSave('courseName', hmAdvanced.courseName)}
                        disabled={hmSaving}
                        style={{ padding: '10px 16px', borderRadius: '12px', background: '#1a3d47', color: '#FFFFFF', border: 'none', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: hmSaving ? 0.5 : 1, whiteSpace: 'nowrap' }}
                      >
                        저장
                      </button>
                    </div>
                  </div>

                  {inputRow('날짜', 'date', 'YYYY-MM-DD', 'date')}

                  <div style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>집결 시간</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="time"
                        value={hmAdvanced.gatheringTime}
                        onChange={(e) => setHmAdvanced(prev => ({ ...prev, gatheringTime: e.target.value }))}
                        style={{ ...advInputStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => handleHmAdvancedSave('gatheringTime', hmAdvanced.gatheringTime)}
                        disabled={hmSaving}
                        style={{ padding: '10px 16px', borderRadius: '12px', background: '#1a3d47', color: '#FFFFFF', border: 'none', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: hmSaving ? 0.5 : 1, whiteSpace: 'nowrap' }}
                      >
                        저장
                      </button>
                    </div>
                  </div>

                  {inputRow('접수 마감일', 'registrationDeadline', 'YYYY-MM-DD', 'date')}
                  {inputRow('최대 인원', 'maxMembers', '4', 'number')}

                  <div style={{ height: '24px' }} />
                  {sectionTitle('게임 설정')}
                  {toggleRow('플레이 활성화', 'playEnabled', '참가자가 스코어를 입력할 수 있습니다')}
                  {toggleRow('Net 2-Ball Best Ball', 'is2BB', '핸디캡 기반 2BB 팀 자동 편성')}

                  {/* 경기 방식 */}
                  <div style={{ padding: '16px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>경기 방식</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>스코어 계산 방식을 선택합니다</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { key: 'stroke', label: '⛳ 스트로크', activeColor: '#1a3d47', activeBg: '#E8F4ED', activeBorder: '#C6E0CF' },
                        { key: 'foursome', label: '🏌️ 포썸', activeColor: '#7C3AED', activeBg: '#F3E8FF', activeBorder: '#DDD6FE' },
                      ].map(opt => {
                        const isActive = hmAdvanced.gameMode === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => handleHmGameModeChange(opt.key)}
                            disabled={hmSaving}
                            style={{
                              flex: 1,
                              padding: '11px 0',
                              border: `${isActive ? '2px' : '1px'} solid ${isActive ? opt.activeBorder : '#E5E7EB'}`,
                              borderRadius: '10px',
                              background: isActive ? opt.activeBg : '#FFFFFF',
                              color: isActive ? opt.activeColor : '#6B7280',
                              fontWeight: isActive ? '700' : '500',
                              fontSize: '14px',
                              cursor: hmSaving ? 'not-allowed' : 'pointer',
                              opacity: hmSaving ? 0.6 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {hmAdvanced.gameMode === 'foursome' && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: '#F3E8FF', borderRadius: '8px', fontSize: '12px', color: '#7C3AED' }}>
                        ※ 포썸은 2인 1조 팀 매치 방식으로 진행됩니다
                      </div>
                    )}
                  </div>

                  {/* 그레이드 설정 */}
                  <button
                    onClick={() => { setShowHostManage(false); navigate(`/grade-settings?id=${hmBooking.id}`); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 0',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>그레이드 설정</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>핸디캡 그레이드 기준 설정</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>

                  <div style={{ height: '24px' }} />
                  {sectionTitle('비용 정보')}
                  {inputRow('그린피', 'greenFee', '$0', 'number')}
                  {inputRow('카트비', 'cartFee', '$0', 'number')}
                  {inputRow('참가비', 'membershipFee', '$0', 'number')}

                  <div style={{ height: '24px' }} />
                  {sectionTitle('회식 정보')}
                  {inputRow('회식 장소', 'restaurantName', '장소 이름')}
                  {inputRow('회식 주소', 'restaurantAddress', '주소 입력')}

                  <div style={{ height: '24px' }} />
                  {sectionTitle('기타')}
                  <div style={{ padding: '12px 0' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>메모</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <textarea
                        value={hmAdvanced.notes}
                        onChange={(e) => setHmAdvanced(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="라운딩 메모를 입력하세요"
                        rows={3}
                        style={{ ...advInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                      />
                      <button
                        onClick={() => handleHmAdvancedSave('notes', hmAdvanced.notes)}
                        disabled={hmSaving}
                        style={{ padding: '10px 16px', borderRadius: '12px', background: '#1a3d47', color: '#FFFFFF', border: 'none', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: hmSaving ? 0.5 : 1, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}
                      >
                        저장
                      </button>
                    </div>
                  </div>

                  {user.isAdmin && (
                    <>
                      <div style={{ height: '16px' }} />
                      <button
                        onClick={() => { setShowHostManage(false); navigate(`/play?id=${hmBooking.id}`); }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '14px',
                          background: '#F9FAFB',
                          border: '1px solid #F3F4F6',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                        }}
                      >
                        <span>📝</span> 스코어 입력 페이지로 이동
                      </button>
                    </>
                  )}
                </>
              );
            })()}

          </div>
        </div>
      </>
    );
  };

  const renderBottomSheet = () => {
    if (!selectedBooking) return null;
    const booking = bookings.find(b => b.id === selectedBooking.id) || selectedBooking;
    const participants = parseParticipants(booking.participants);
    const isJoined = participants.some(p => p.phone === user.phone);
    const canManage = user.id === booking.organizerId || user.isAdmin;
    const isHostOnly = user.id === booking.organizerId;
    const max = booking.maxMembers || 4;
    const isFull = participants.length >= max;

    return (
      <>
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        }} />
        <div
          ref={sheetRef}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#FFFFFF',
            borderRadius: '20px 20px 0 0',
            zIndex: 1000,
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.25s ease-out',
          }}
        >
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>

          <div style={{ padding: '8px 20px 16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary }}>
                  {booking.courseName}
                </div>
                <div style={{ fontSize: '14px', color: theme.colors.text_sub, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{formatDate(booking.date)} · {booking.time}</span>
                  {getStatusBadge(booking)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(booking); }}
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F3F4F6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: '12px',
                  padding: 0,
                  color: '#6B7280',
                }}
                title="공유"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
            </div>

            <div style={{ fontSize: '13px', color: theme.colors.text_sub, marginBottom: '14px' }}>
              👑 호스트: <strong>{getMemberName(booking.organizerId)}</strong>
            </div>

            <div style={{
              background: '#F9FAFB',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '14px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_main, marginBottom: '10px' }}>
                참가자 ({participants.length}/{max})
              </div>
              {participants.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>아직 참가자가 없습니다</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {participants.map((p, i) => {
                    const isHost = p.memberId === booking.organizerId;
                    const isMe = p.phone === user.phone;
                    const isGuest = p.isGuest;
                    let chipBg = '#F3F4F6';
                    let chipColor = '#374151';
                    let chipBorder = 'transparent';
                    let chipWeight = '500';
                    if (isHost) {
                      chipBg = '#F9FAFB';
                      chipColor = '#1a3d47';
                      chipBorder = '#E5E7EB';
                      chipWeight = '600';
                    }
                    if (isMe) {
                      chipBg = 'rgba(26,61,71,0.08)';
                      chipColor = '#1a3d47';
                      chipWeight = '700';
                    }
                    if (isGuest) {
                      chipBg = '#FFFFFF';
                      chipBorder = '#E5E7EB';
                      chipColor = '#6B7280';
                    }
                    return (
                      <span key={i} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: chipBg,
                        color: chipColor,
                        fontWeight: chipWeight,
                        fontSize: '13px',
                        border: `1px solid ${chipBorder}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {isHost && '👑 '}{p.nickname || p.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
              <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_main, marginBottom: '8px' }}>비용</div>
                {booking.greenFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: theme.colors.text_sub }}>그린피</span>
                    <span>${booking.greenFee}</span>
                  </div>
                )}
                {booking.cartFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: theme.colors.text_sub }}>카트비</span>
                    <span>${booking.cartFee}</span>
                  </div>
                )}
                {booking.membershipFee && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: theme.colors.text_sub }}>참가비</span>
                    <span>${booking.membershipFee}</span>
                  </div>
                )}
              </div>
            )}

            {booking.notes && (
              <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text_main, marginBottom: '6px' }}>메모</div>
                <div style={{ fontSize: '13px', color: theme.colors.text_sub, whiteSpace: 'pre-wrap' }}>{booking.notes}</div>
              </div>
            )}
          </div>

          <div style={{
            padding: '12px 20px',
            paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))',
            borderTop: '1px solid #F3F4F6',
          }}>
            {(() => {
              const statusFlags = getBookingStatusFlags(booking);
              const { isPastRoundingDate, isRegistrationClosed } = statusFlags;
              const hasResults = booking.dailyHandicaps || isPastRoundingDate;
              const isRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
              const isCompetition = booking.type === '컴페티션';
              const effectiveClosed = isCompetition ? isRegistrationClosed : false;
              const showTeamFormation = participants.length > 4;

              const deepGreen = '#1a3d47';

              const btnStyle = (bg, color, border) => ({
                flex: 1,
                padding: '14px',
                borderRadius: '14px',
                border: border || 'none',
                background: bg,
                color: color,
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
              });

              const manageBtn = canManage && (
                <button
                  onClick={() => {
                    if (isHostOnly) {
                      openHostManage(booking);
                    } else {
                      setSelectedBooking(null);
                      navigate(`/rounding-management?id=${booking.id}`);
                    }
                  }}
                  style={btnStyle('#FFFFFF', '#374151', '1px solid #E5E7EB')}
                >
                  관리
                </button>
              );

              const playBtn = (
                <button
                  onClick={() => navigate(`/play?id=${booking.id}`)}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: deepGreen, color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,61,71,0.2)' }}
                >
                  ⛳ 플레이하기
                </button>
              );

              if (hasResults) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {manageBtn}
                      {showTeamFormation && (
                        <button onClick={() => navigate(`/team-formation?id=${booking.id}`)} style={btnStyle('#FFFFFF', '#374151', '1px solid #E5E7EB')}>
                          조편성
                        </button>
                      )}
                      <button onClick={() => navigate(`/leaderboard?id=${booking.id}`)} style={btnStyle(deepGreen, '#FFFFFF')}>
                        결과보기
                      </button>
                    </div>
                    {!isCompetition && playBtn}
                  </div>
                );
              }

              if (effectiveClosed) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {manageBtn}
                      {showTeamFormation && (
                        <button onClick={() => navigate(`/team-formation?id=${booking.id}`)} style={btnStyle('#FFFFFF', '#374151', '1px solid #E5E7EB')}>
                          조편성 보기
                        </button>
                      )}
                    </div>
                    {booking.playEnabled && playBtn}
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {manageBtn}
                    {isJoined ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinLeave(booking); }}
                        disabled={isJoining}
                        style={{ ...btnStyle('#FFFFFF', '#E11D48', '1px solid #E5E7EB'), opacity: isJoining ? 0.6 : 1 }}
                      >
                        {isJoining ? '처리중...' : '참가 취소'}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinLeave(booking); }}
                        disabled={isJoining || isFull || isRenting}
                        style={{ ...btnStyle(isFull ? '#F3F4F6' : deepGreen, isFull ? '#9CA3AF' : 'white'), opacity: (isJoining || isRenting) ? 0.6 : 1 }}
                      >
                        {isJoining ? '처리중...' : isFull ? '마감됨' : '참가하기'}
                      </button>
                    )}
                    {isCompetition && (
                      isRenting ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleRental(booking.id); }}
                          disabled={isRentalLoading}
                          style={{ ...btnStyle('#E6AA68', 'white'), opacity: isRentalLoading ? 0.6 : 1 }}
                        >
                          {isRentalLoading ? '처리중...' : '대여 취소'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleRental(booking.id); }}
                          disabled={isRentalLoading || isJoined}
                          style={{ ...btnStyle('#FFFFFF', '#E6AA68', '1px solid #E5E7EB'), opacity: (isRentalLoading || isJoined) ? 0.5 : 1 }}
                        >
                          {isRentalLoading ? '처리중...' : '번호 대여'}
                        </button>
                      )
                    )}
                    {showTeamFormation && !isCompetition && (
                      <button onClick={() => navigate(`/team-formation?id=${booking.id}`)} style={btnStyle('#FFFFFF', '#374151', '1px solid #E5E7EB')}>
                        조편성
                      </button>
                    )}
                  </div>
                  {!isCompetition && playBtn}
                </div>
              );
            })()}
          </div>
        </div>
      </>
    );
  };

  const renderTypeSelector = () => {
    if (!showTypeSelector) return null;
    return (
      <>
        <div
          onClick={() => setShowTypeSelector(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(2px)' }}
        />
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          zIndex: 1000,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
          animation: 'slideUp 0.25s ease-out',
        }}>
          <div style={{ width: '48px', height: '6px', background: '#E5E7EB', borderRadius: '3px', margin: '12px auto 20px' }} />

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              새로운 라운딩 만들기
            </div>
          </div>

          <div style={{ padding: '0 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
            <div
              onClick={() => {
                setShowTypeSelector(false);
                setCreateMode('official');
                setShowCreateModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #F3F4F6',
                background: '#FFFFFF',
                cursor: 'pointer',
                marginBottom: '12px',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FFFBEB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginRight: '16px',
                flexShrink: 0,
              }}>
                👑
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>
                  정기 라운딩 개설
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.4' }}>
                  관리자 전용. 회비, 마감일 등 상세 설정이 가능합니다.
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                setShowTypeSelector(false);
                setCreateMode('social');
                setShowCreateModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #F3F4F6',
                background: '#FFFFFF',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginRight: '16px',
                flexShrink: 0,
              }}>
                ⚡
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>
                  소셜/번개 개설
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.4' }}>
                  누구나 쉽고 빠르게. 골프장과 시간만 선택하세요.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTypeSelector(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
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

    return (
      <>
        <div
          onClick={() => setShowCreateModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
          }}
        />
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          zIndex: 1000,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.25s ease-out',
        }}>
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: isOfficial ? '#92400E' : theme.colors.primary,
            marginBottom: '0',
            textAlign: 'center',
            padding: '8px 20px 16px',
          }}>
            {isOfficial ? '👑 정기 라운딩 만들기' : '라운딩 만들기'}
          </h3>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>

          {isOfficial ? (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>라운딩 이름</label>
                <input
                  type="text"
                  value={officialForm.title}
                  onChange={(e) => setOfficialForm({ ...officialForm, title: e.target.value })}
                  placeholder="예: 3월 정기라운딩"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>골프장</label>
                <select
                  value={officialForm.courseName}
                  onChange={(e) => setOfficialForm({ ...officialForm, courseName: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">골프장 선택</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>날짜</label>
                  <input type="date" value={officialForm.date} onChange={(e) => setOfficialForm({ ...officialForm, date: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>티오프 시간</label>
                  <input type="time" value={officialForm.time} onChange={(e) => setOfficialForm({ ...officialForm, time: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>집결 시간</label>
                <input type="time" value={officialForm.meetingTime} onChange={(e) => setOfficialForm({ ...officialForm, meetingTime: e.target.value })} style={inputStyle} />
              </div>

              <div style={{
                padding: '14px',
                background: '#FFFBEB',
                borderRadius: '12px',
                border: '1px solid #FDE68A',
                marginBottom: '14px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', marginBottom: '10px' }}>💰 비용 안내</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>그린피</label>
                    <input type="number" value={officialForm.greenFee} onChange={(e) => setOfficialForm({ ...officialForm, greenFee: e.target.value })} placeholder="$0" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>카트비</label>
                    <input type="number" value={officialForm.cartFee} onChange={(e) => setOfficialForm({ ...officialForm, cartFee: e.target.value })} placeholder="$0" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>참가비</label>
                  <input type="number" value={officialForm.membershipFee} onChange={(e) => setOfficialForm({ ...officialForm, membershipFee: e.target.value })} placeholder="$0" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>접수 마감일</label>
                  <input type="date" value={officialForm.registrationDeadline} onChange={(e) => setOfficialForm({ ...officialForm, registrationDeadline: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>최대 인원</label>
                  <input type="number" value={officialForm.maxMembers} onChange={(e) => setOfficialForm({ ...officialForm, maxMembers: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>메모 (선택)</label>
                <textarea
                  value={officialForm.notes}
                  onChange={(e) => setOfficialForm({ ...officialForm, notes: e.target.value })}
                  placeholder="추가 안내사항을 입력하세요"
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Step 1: Course Selection */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>골프장</label>
                <select
                  value={newRounding.courseName}
                  onChange={(e) => setNewRounding({ ...newRounding, courseName: e.target.value, roundingType: '' })}
                  style={inputStyle}
                >
                  <option value="">골프장 선택</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Rounding Type */}
              {newRounding.courseName && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>라운딩 타입</label>
                  <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    {[
                      { key: 'competition', label: '🏆 컴페티션' },
                      { key: 'greenfee', label: '💵 그린피' },
                      { key: 'social', label: '☕ 소셜' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setNewRounding({ ...newRounding, roundingType: opt.key })}
                        style={{
                          flex: 1,
                          padding: '11px 0',
                          border: 'none',
                          background: newRounding.roundingType === opt.key ? theme.colors.primary : '#FFFFFF',
                          color: newRounding.roundingType === opt.key ? '#FFFFFF' : theme.colors.text_sub,
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Time Mode */}
              {newRounding.courseName && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>시간 설정</label>
                    <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                      {[
                        { key: 'now', label: '⚡ 바로 시작' },
                        { key: 'recruit', label: '📅 멤버 모집' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setNewRounding({ ...newRounding, timeMode: opt.key, date: '', time: '', timeSlot: 'Morning' })}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            border: 'none',
                            background: newRounding.timeMode === opt.key ? theme.colors.primary : '#FFFFFF',
                            color: newRounding.timeMode === opt.key ? '#FFFFFF' : theme.colors.text_sub,
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newRounding.timeMode === 'now' ? (
                    <div style={{
                      marginBottom: '14px',
                      padding: '14px',
                      background: '#F0FDF4',
                      borderRadius: '10px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#065F46',
                      fontWeight: '500',
                    }}>
                      ⚡ 바로 시작합니다 — 현재 시간으로 자동 설정됩니다
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>날짜</label>
                        <input
                          type="date"
                          value={newRounding.date}
                          onChange={(e) => setNewRounding({ ...newRounding, date: e.target.value })}
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>시간대</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {Object.entries(timeSlotMap).map(([key, { label }]) => (
                            <button
                              key={key}
                              onClick={() => setNewRounding({ ...newRounding, timeSlot: key, time: '' })}
                              style={{
                                padding: '9px 16px',
                                borderRadius: '10px',
                                border: newRounding.timeSlot === key ? `2px solid ${theme.colors.primary}` : '1px solid #E5E7EB',
                                background: newRounding.timeSlot === key ? '#EBF5F0' : 'white',
                                color: newRounding.timeSlot === key ? theme.colors.primary : theme.colors.text_sub,
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {newRounding.timeSlot === 'Exact' && (
                        <div style={{ marginBottom: '14px' }}>
                          <label style={labelStyle}>정확한 시간</label>
                          <input
                            type="time"
                            value={newRounding.time}
                            onChange={(e) => setNewRounding({ ...newRounding, time: e.target.value })}
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Max Members */}
              {newRounding.courseName && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>최대 인원</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[2, 3, 4, 5, 6, 8].map(n => (
                      <button
                        key={n}
                        onClick={() => setNewRounding({ ...newRounding, maxMembers: n })}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: '10px',
                          border: newRounding.maxMembers === n ? `2px solid ${theme.colors.primary}` : '1px solid #E5E7EB',
                          background: newRounding.maxMembers === n ? '#EBF5F0' : 'white',
                          color: newRounding.maxMembers === n ? theme.colors.primary : theme.colors.text_sub,
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {n}명
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {newRounding.courseName && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>메모 (선택)</label>
                  <textarea
                    value={newRounding.notes}
                    onChange={(e) => setNewRounding({ ...newRounding, notes: e.target.value })}
                    placeholder="추가 정보를 입력하세요"
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
              )}
            </>
          )}

          </div>

          <div style={{ padding: '12px 20px', paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
            <button
              onClick={isOfficial ? handleCreateOfficial : handleCreateRounding}
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: isOfficial ? '#92400E' : theme.colors.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.6 : 1,
              }}
            >
              {isCreating ? '생성중...' : isOfficial ? '정기 라운딩 만들기' : '라운딩 만들기'}
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ background: '#F3F4F6', minHeight: '100vh' }}>
      <PageHeader
        title="라운딩 라운지"
        showBackButton={false}
        rightContent={<ProfileBadge user={user} showGreeting={false} />}
      />

      <div style={{ padding: '72px 16px 100px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            padding: '14px 16px',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #F3F4F6',
            marginBottom: '16px',
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', lineHeight: 1.7 }}>
              누구나 라운딩을 개설하여 멤버를 모집할 수 있습니다.<br />
              아래 <strong style={{ color: '#1a3d47' }}>＋ 버튼</strong>을 눌러 라운딩을 생성해보세요.<br />
              모임회원, 외부 게스트 모두 초대 · 스코어 기록 가능합니다.
            </p>
          </div>
          {(() => {
            const myBookings = bookings
              .filter(b => isBookingActive(b))
              .filter(b => {
                const parts = parseParticipants(b.participants);
                return parts.some(p => p.phone === user.phone);
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            return (
              <div style={{
                background: '#F8FAFC',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '0 16px',
                marginBottom: '28px',
              }}>
                <div
                  onClick={() => setIsMyBookingsOpen(!isMyBookingsOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: '#6B7280',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}>
                      {isMyBookingsOpen ? '−' : '+'}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937' }}>나의 라운딩</span>
                    {myBookings.length > 0 && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#1D4ED8',
                        background: '#EFF6FF',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}>
                        {myBookings.length}
                      </span>
                    )}
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isMyBookingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {isMyBookingsOpen && (
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px solid #F3F4F6',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}>
                    {myBookings.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>
                        예정된 라운딩이 없습니다
                      </div>
                    ) : (
                      myBookings.map((b, idx) => {
                        const parts = parseParticipants(b.participants);
                        const names = parts.map(p => p.nickname || p.name);
                        const summary = names.length <= 2
                          ? names.join(', ')
                          : `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`;
                        const d = new Date(b.date);
                        const days = ['일', '월', '화', '수', '목', '금', '토'];
                        const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
                        const timeStr = b.time && b.time !== '23:59' ? ` ${b.time.slice(0, 5)}` : '';

                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBooking(b)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              cursor: 'pointer',
                              borderBottom: idx < myBookings.length - 1 ? '1px solid #F9FAFB' : 'none',
                              transition: 'background 0.1s',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                                {dateStr}{timeStr}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {b.courseName} <span style={{ color: '#9CA3AF' }}>({b.type || '소셜'})</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                                {summary}
                              </div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '8px' }}>
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
              개설된 라운딩
            </div>
            {canCreateBooking && (
              <button
                onClick={() => {
                  if (isAdmin) {
                    setShowTypeSelector(true);
                  } else {
                    setCreateMode('social');
                    setShowCreateModal(true);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: '1.5px solid #1a3d47',
                  color: '#1a3d47',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> 라운딩 생성
              </button>
            )}
          </div>

          {renderWeeklyTimeline()}
        </div>

      </div>

      {canCreateBooking && (
        <button
          onClick={() => {
            if (isAdmin) {
              setShowTypeSelector(true);
            } else {
              setCreateMode('social');
              setShowCreateModal(true);
            }
          }}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: 'none',
            background: '#1a3d47',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '30px',
            fontWeight: 'bold',
            fontSize: '15px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 0 0 4px rgba(26,61,71,0.12)',
            cursor: 'pointer',
            zIndex: 1000,
            animation: 'fabPulse 2.8s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span>
          라운딩 만들기
        </button>
      )}

      {renderHostManage()}
      {renderBottomSheet()}
      {renderTypeSelector()}
      {renderCreateModal()}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.25), 0 0 0 4px rgba(26,61,71,0.12); }
          50% { box-shadow: 0 6px 20px rgba(0,0,0,0.32), 0 0 0 8px rgba(26,61,71,0.08); }
        }
      `}</style>
    </div>
  );
}

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#6B7280',
  display: 'block',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default RoundingListV2;
