import React from 'react';
import { parseParticipants } from '../../utils';
import { azure, getTileTypeBadge, formatTileTime, getBookingStatusFlags, getEffectiveDeadline } from './bookingHelpers';

function WeekTile({ booking, user, onSelect }) {
  const participants = parseParticipants(booking.participants);
  const isJoined = participants.some(p => p.phone === user.phone);
  const max = booking.maxMembers || 4;
  const { isRegistrationClosed } = getBookingStatusFlags(booking);
  const isCompetition = booking.type === '컴페티션';
  const isRegular = booking.type === '정기모임';
  const time = formatTileTime(booking.time);

  const deadline = getEffectiveDeadline(booking);
  const now = new Date();
  const msLeft = deadline - now;
  const hoursLeft = msLeft / (1000 * 60 * 60);
  const daysLeft = Math.ceil(hoursLeft / 24);
  const hasExplicitDeadline = !!booking.registrationDeadline;
  const isClosed = isCompetition
    ? isRegistrationClosed
    : (participants.length >= max || (hasExplicitDeadline && isRegistrationClosed));

  let statusText, statusColor;
  if (isClosed) {
    statusText = '마감';
    statusColor = azure.muted;
  } else if (isCompetition && hoursLeft <= 24 && hoursLeft > 0) {
    statusText = `D-${Math.max(1, Math.ceil(hoursLeft))}h`;
    statusColor = '#B45309';
  } else if (isCompetition && daysLeft > 0) {
    statusText = `D-${daysLeft}`;
    statusColor = azure.primary;
  } else {
    statusText = `${participants.length}/${max}`;
    statusColor = azure.sub;
  }

  const { label: typeLabel, bg: typeBg, color: typeColor } = getTileTypeBadge(booking);
  const d = new Date(booking.date);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateNum = d.getDate();
  const dayName = days[d.getDay()];
  const isDayOff = d.getDay() === 0 || d.getDay() === 6;

  const visibleNames = participants.slice(0, 3).map(p => p.nickname || p.name).join(', ');
  const remainingCount = participants.length - 3;
  const participantText = participants.length === 0
    ? '모집중...'
    : remainingCount > 0 ? `${visibleNames} 외 ${remainingCount}명` : visibleNames;

  return (
    <div
      onClick={() => onSelect(booking)}
      style={{ display: 'flex', alignItems: 'stretch', background: '#FFFFFF', cursor: 'pointer', padding: '0', minHeight: isRegular ? '90px' : '72px' }}
    >
      {/* Left: Date column */}
      <div style={{
        width: isRegular ? '62px' : '52px', minWidth: isRegular ? '62px' : '52px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: isRegular ? '16px 0' : '12px 0', borderRight: '1px solid #F1F5F9',
      }}>
        <div style={{ fontSize: isRegular ? '28px' : '22px', fontWeight: '800', color: isRegular ? '#C0392B' : isDayOff ? azure.primary : azure.text, lineHeight: 1 }}>
          {dateNum}
        </div>
        <div style={{ fontSize: isRegular ? '12px' : '11px', fontWeight: '600', color: isRegular ? '#E05A4D' : isDayOff ? azure.primary : azure.muted, marginTop: '2px' }}>
          {dayName}
        </div>
      </div>

      {/* Middle: Main info */}
      <div style={{ flex: 1, padding: isRegular ? '16px 14px' : '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', minWidth: 0 }}>
        {/* 배지 (위) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: typeColor, background: typeBg, borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {typeLabel}
          </span>
        </div>
        {/* 라운딩 이름 (메인) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: isRegular ? '16px' : '15px', fontWeight: '700', color: azure.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {booking.title || booking.courseName}
          </span>
          {isJoined && (
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0047AB', flexShrink: 0 }} />
          )}
        </div>
        {/* 골프장 이름 · 참가자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: azure.sub, minWidth: 0 }}>
          <span style={{ flexShrink: 0, color: azure.muted }}>{booking.courseName}</span>
          <span style={{ color: azure.border, flexShrink: 0 }}>·</span>
          <span style={{
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
            color: participants.length === 0 ? azure.primary : azure.muted,
            fontStyle: participants.length === 0 ? 'italic' : 'normal',
          }}>
            {participantText}
          </span>
        </div>
      </div>

      {/* Right: Status */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 12px 0', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: statusColor, whiteSpace: 'nowrap' }}>
          {statusText}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  );
}

export default function WeeklyTimeline({ groupedByWeek, user, onSelectBooking }) {
  if (groupedByWeek.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF', fontSize: '14px', background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⛳</div>
        <div style={{ fontWeight: '500' }}>예정된 라운딩이 없습니다</div>
        <div style={{ marginTop: '6px', fontSize: '13px', color: '#D1D5DB' }}>+ 버튼을 눌러 라운딩을 만들어보세요</div>
      </div>
    );
  }

  // 월별로 재그룹: { month: '4월', weeks: [...] }
  const byMonth = [];
  groupedByWeek.forEach(week => {
    const monthLabel = week.label.replace(/\s*\d+주차$/, ''); // "4월 2주차" → "4월"
    const last = byMonth[byMonth.length - 1];
    if (last && last.month === monthLabel) {
      last.weeks.push(week);
    } else {
      byMonth.push({ month: monthLabel, weeks: [week] });
    }
  });

  let cardIdx = 0;
  return byMonth.map(({ month, weeks }) => (
    <React.Fragment key={month}>
      <div style={{ fontSize: '15px', fontWeight: '800', color: '#64748B', marginBottom: '10px', marginTop: cardIdx === 0 ? '0' : '28px', letterSpacing: '-0.01em' }}>
        {month}
      </div>
      {weeks.map(week => {
        const el = (
          <div key={week.monday.toISOString()} style={{ marginBottom: '10px' }}>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0' }}>
              {week.bookings.map((b, bIdx) => (
                <React.Fragment key={b.id}>
                  {bIdx > 0 && <div style={{ height: '1px', background: '#F1F5F9', marginLeft: '52px' }} />}
                  <WeekTile booking={b} user={user} onSelect={onSelectBooking} />
                </React.Fragment>
              ))}
            </div>
          </div>
        );
        cardIdx++;
        return el;
      })}
    </React.Fragment>
  ));
}
