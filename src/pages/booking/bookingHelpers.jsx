import React from 'react';
import { parseParticipants } from '../../utils';

// ─── Pure utility functions ───────────────────────────────────────────────────

export const isBookingActive = (booking) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const day = days[d.getDay()];
  return `${month}/${date} (${day})`;
};

export const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getWeekLabel = (monday) => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const month = sunday.getMonth() + 1;
  const weekNum = Math.ceil(sunday.getDate() / 7);
  return `${month}월 ${weekNum}주차`;
};

export const getEffectiveDeadline = (booking) => {
  const isCompetition = booking.type === '컴페티션';
  if (isCompetition) {
    if (booking.registrationDeadline) {
      const d = new Date(booking.registrationDeadline);
      if (!isNaN(d.getTime())) return d;
    }
    const bookingDate = new Date(booking.date);
    const deadline = new Date(bookingDate);
    deadline.setDate(bookingDate.getDate() - 8);
    deadline.setHours(18, 0, 0, 0);
    return deadline;
  }
  if (booking.registrationDeadline) {
    const d = new Date(booking.registrationDeadline);
    if (!isNaN(d.getTime())) return d;
  }
  const bookingDate = new Date(booking.date);
  bookingDate.setHours(23, 59, 59, 999);
  return bookingDate;
};

export const getBookingStatusFlags = (booking) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastRoundingDate = bookingDate < today;
  const isRoundingDay = bookingDate.toDateString() === new Date().toDateString();
  const deadline = getEffectiveDeadline(booking);
  const isRegistrationClosed = new Date() > deadline;
  return { isPastRoundingDate, isRoundingDay, isRegistrationClosed };
};

export const formatTileTime = (timeStr) => {
  if (!timeStr || timeStr === '23:59') return '';
  if (timeStr.startsWith('08:00')) return '오전';
  if (timeStr.startsWith('13:00')) return '오후';
  return timeStr.slice(0, 5);
};

// ─── Azure Modern palette ─────────────────────────────────────────────────────

export const azure = {
  primary: '#0047AB',
  primaryLight: '#EBF2FF',
  surface: '#F8FAFC',
  text: '#1E293B',
  sub: '#64748B',
  muted: '#94A3B8',
  border: '#E2E8F0',
  card: '#FFFFFF',
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

export const getTileTypeBadge = (booking) => {
  const type = (booking.type || '').trim();
  if (type === '정기모임') return { label: '정기모임', bg: '#C0392B', color: '#FFFFFF' };
  if (type === '컴페티션') return { label: '컴페티션', bg: azure.primary, color: '#FFFFFF' };
  if (type === '그린피') return { label: '그린피', bg: '#F0FDF4', color: '#166534' };
  if (type === '캐주얼') return { label: '캐주얼', bg: '#D1FAE5', color: '#065F46' };
  return { label: '소셜', bg: '#F1F5F9', color: azure.sub };
};

export const getTypeBadge = (booking) => {
  const type = (booking.type || '').trim();
  let label = type || booking.title || '';
  let bg = '#FFEDD5';
  let color = '#9A3412';
  if (type === '정기모임') { label = '정기모임'; bg = '#EA580C'; color = '#FFFFFF'; }
  else if (type === '컴페티션') { label = '컴페티션'; bg = '#0F766E'; color = '#FFFFFF'; }
  else if (type === '그린피') { label = '그린피'; bg = '#D1FAE5'; color = '#065F46'; }
  else if (type === '캐주얼') { label = '캐주얼'; bg = '#D1FAE5'; color = '#065F46'; }
  else if (type === '소셜' || type.toLowerCase().includes('social')) { label = '소셜'; bg = '#F3F4F6'; color = '#374151'; }
  if (!label) return null;
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '9999px', background: bg, color: color, display: 'inline-block' }}>
      {label}
    </span>
  );
};

export const getStatusBadge = (booking) => {
  const participants = parseParticipants(booking.participants);
  const max = booking.maxMembers || 4;
  const isFull = participants.length >= max;
  const isCompetition = booking.type === '컴페티션';
  const { isRegistrationClosed } = getBookingStatusFlags(booking);
  const hasExplicitDeadline = !!booking.registrationDeadline;
  const isClosed = isCompetition
    ? isRegistrationClosed
    : (isFull || (hasExplicitDeadline && isRegistrationClosed));
  return (
    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: isClosed ? '#FEE2E2' : 'rgba(26,61,71,0.08)', color: isClosed ? '#DC2626' : '#1a3d47' }}>
      {isClosed ? '마감' : `모집중 ${participants.length}/${max}`}
    </span>
  );
};

// ─── timeSlotMap constant ─────────────────────────────────────────────────────

export const timeSlotMap = {
  'Morning': { label: '오전', value: '08:00' },
  'Afternoon': { label: '오후', value: '13:00' },
  'Evening': { label: '저녁', value: '17:00' },
  'TBD': { label: '시간미정', value: '23:59' },
  'Exact': { label: '직접 입력', value: '' },
};
