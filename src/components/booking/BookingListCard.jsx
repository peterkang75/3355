import React, { memo } from 'react';
import { Badge, Button } from '../common';
import theme from '../../styles/theme';
import { formatCurrency as defaultFormatCurrency } from '../../utils';

const BookingListCard = memo(function BookingListCard({
  booking,
  isActive,
  isDashboard = false,
  canManage,
  userPhone,
  participants,
  allParticipants,
  clubMembers,
  totalFee,
  isFoursome,
  isJoined,
  isRenting,
  isFeeExempt,
  isMenuOpen,
  loadingStates,
  statusFlags,
  isGuest,
  formatCurrency = defaultFormatCurrency,
  getParticipantDisplayName,
  onMenuToggle,
  onNavigate,
  onToggleAnnounce,
  onEdit,
  onDelete,
  onJoin,
  onToggleRental
}) {
  const { isDeleting, isTogglingAnnounce, isJoining, isRentalLoading } = loadingStates;
  const { isPastRoundingDate, isRoundingDay, isRegistrationClosed, hasUserScore } = statusFlags;
  
  const isParticipantGuest = (participantPhone) => {
    if (!clubMembers || clubMembers.length === 0) return false;
    const member = clubMembers.find(m => m.phone === participantPhone);
    return member ? member.club !== booking.courseName : true;
  };

  const isExternalGuest = (participant) => {
    return participant && participant.isGuest === true;
  };

  const getSortedParticipants = (participants) => {
    return [...participants].sort((a, b) => {
      const dateA = a.joinedAt ? new Date(a.joinedAt) : new Date(0);
      const dateB = b.joinedAt ? new Date(b.joinedAt) : new Date(0);
      return dateA - dateB;
    });
  };

  const getWaitlistCutoff = (totalCount) => {
    if (!booking.useSquadWaitlist) return totalCount;
    return Math.floor(totalCount / 4) * 4;
  };

  const isWaitlisted = (index, totalCount) => {
    if (!booking.useSquadWaitlist) return false;
    const cutoff = getWaitlistCutoff(totalCount);
    return index >= cutoff;
  };

  const getCompetitionDeadline = (roundingDateStr) => {
    const roundingDate = new Date(roundingDateStr);
    
    // Get the start of the rounding week (Monday-based week)
    const roundingDayOfWeek = roundingDate.getDay();
    const daysFromMonday = roundingDayOfWeek === 0 ? 6 : roundingDayOfWeek - 1;
    const startOfRoundingWeek = new Date(roundingDate);
    startOfRoundingWeek.setDate(roundingDate.getDate() - daysFromMonday);
    
    // Go back one week
    const oneWeekBefore = new Date(startOfRoundingWeek);
    oneWeekBefore.setDate(startOfRoundingWeek.getDate() - 7);
    
    // Get the Saturday of that week (5 days after Monday)
    const deadline = new Date(oneWeekBefore);
    deadline.setDate(oneWeekBefore.getDate() + 5);
    deadline.setHours(18, 0, 0, 0); // 6 PM
    
    return deadline;
  };

  const getEffectiveDeadline = () => {
    if (booking.type === '컴페티션') {
      return getCompetitionDeadline(booking.date);
    }
    return booking.registrationDeadline ? new Date(booking.registrationDeadline) : null;
  };

  const getRemainingTime = (deadlineDate) => {
    if (!deadlineDate) return null;
    const now = new Date();
    const diff = deadlineDate - now;
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}일 남음`;
    if (hours > 0) return `${hours}시간 남음`;
    return '마감 임박';
  };

  const effectiveDeadline = getEffectiveDeadline();

  // Calculate isPlayTime: 30 minutes before rounding start time
  const isPlayTime = (() => {
    if (!booking.date || !booking.time) return false;
    try {
      const [hours, minutes] = booking.time.split(':').map(Number);
      const roundingStart = new Date(booking.date);
      roundingStart.setHours(hours, minutes, 0, 0);
      const playTimeStart = new Date(roundingStart.getTime() - 30 * 60 * 1000); // 30 mins before
      return new Date() >= playTimeStart;
    } catch {
      return false;
    }
  })();

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    const diff = deadlineDate - now;
    if (diff <= 0) return null;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (isActive && isDashboard) {
    const anonymousRentals = (booking.numberRentals || []).filter(
      phone => !allParticipants.some(p => p.phone === phone)
    );
    const totalCount = allParticipants.length + anonymousRentals.length;
    const daysRemaining = getDaysRemaining(booking.registrationDeadline);
    
    return (
      <div 
        key={booking.id} 
        className="card"
        onClick={() => onNavigate(`/booking?highlight=${booking.id}`)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ marginBottom: '12px' }}>
          {booking.title && (
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '700', 
              color: 'white', 
              background: booking.type === '컴페티션' ? '#2d5355' : '#BF4D34',
              padding: '6px 10px',
              borderRadius: '6px',
              marginBottom: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {booking.title}
              {isFoursome && (
                <Badge variant="purple" size="xs">포썸</Badge>
              )}
            </h3>
          )}
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
            ⛳ {booking.courseName}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>
            ◷ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
          </div>
        </div>

        {isRegistrationClosed ? (
          <div style={{
            background: '#F3F4F6',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ 
              fontSize: '15px', 
              fontWeight: '600',
              color: '#4B5563'
            }}>
              접수 마감 (총 {totalCount}명)
            </span>
          </div>
        ) : (
          <div style={{
            background: '#FFEDD5',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: '600',
                color: '#C05621'
              }}>
                접수 중! (현재 {totalCount}명)
              </span>
              {daysRemaining !== null && daysRemaining <= 7 && (
                <span style={{ 
                  fontSize: '12px', 
                  color: daysRemaining <= 2 ? '#DC2626' : '#92400E',
                  fontWeight: daysRemaining <= 2 ? '600' : '400'
                }}>
                  마감 D-{daysRemaining}
                </span>
              )}
            </div>
          </div>
        )}

        {isRegistrationClosed ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              variant="outline" 
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/team-formation?id=${booking.id}`);
              }}
            >
              📋 조편성 보기
            </Button>
            {booking.playEnabled && (
              <Button 
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/play?id=${booking.id}`);
                }}
                style={{ background: '#3B82F6', color: 'white', border: 'none' }}
              >
                ⛳ 플레이하기
              </Button>
            )}
          </div>
        ) : (
          <Button 
            variant="outline" 
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/booking?highlight=${booking.id}`);
            }}
          >
            자세히 보기 →
          </Button>
        )}
      </div>
    );
  }

  if (isActive) {
    return (
      <div key={booking.id} className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1 }}>
            {booking.title && (
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: booking.type === '컴페티션' ? 'white' : 'white', 
                background: booking.type === '컴페티션' ? '#2d5355' : '#BF4D34',
                padding: '6px 10px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {booking.title}
                {isFoursome && (
                  <Badge variant="purple" size="xs">포썸</Badge>
                )}
              </h3>
            )}
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
              ⛳ {booking.courseName}
            </div>
          </div>
          {canManage && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle(booking.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  opacity: 0.7
                }}
              >
                ⋮
              </button>
              {isMenuOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  zIndex: 10,
                  minWidth: '140px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <button
                    onClick={() => {
                      onNavigate(`/booking`);
                      onMenuToggle(null);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    ◉ 라운딩 관리
                  </button>
                  <button
                    onClick={() => onToggleAnnounce(booking.id)}
                    disabled={isTogglingAnnounce}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: isTogglingAnnounce ? '#f0f0f0' : 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: isTogglingAnnounce ? 'wait' : 'pointer',
                      opacity: isTogglingAnnounce ? 0.7 : 1
                    }}
                  >
                    {isTogglingAnnounce ? '처리중...' : (booking.isAnnounced ? '★ 공지 내리기' : '★ 공지 활성화')}
                  </button>
                  <button
                    onClick={() => onEdit(booking)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    ✎ 수정
                  </button>
                  <button
                    onClick={() => {
                      onDelete(booking.id);
                      onMenuToggle(null);
                    }}
                    disabled={isDeleting}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: isDeleting ? '#f0f0f0' : 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: isDeleting ? 'wait' : 'pointer',
                      color: isDeleting ? '#999' : 'var(--alert-red)',
                      opacity: isDeleting ? 0.7 : 1
                    }}
                  >
                    {isDeleting ? '삭제중...' : '× 삭제'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gap: '12px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>◷ 라운딩 날짜:</span>
            <span>{new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}</span>
          </div>

          {booking.gatheringTime && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>⏲ 집결시간:</span>
              <span>{booking.gatheringTime}</span>
            </div>
          )}

          {effectiveDeadline && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>◔ 접수 마감:</span>
              <span>
                {effectiveDeadline.toLocaleDateString('ko-KR')}
                {booking.type === '컴페티션' && (
                  <span style={{ marginLeft: '4px', fontSize: '12px', color: '#888' }}>
                    {effectiveDeadline.getHours()}시
                  </span>
                )}
                {getRemainingTime(effectiveDeadline) ? (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '12px', 
                    color: getRemainingTime(effectiveDeadline) === '마감 임박' ? '#e74c3c' : '#888',
                    fontWeight: getRemainingTime(effectiveDeadline) === '마감 임박' ? '600' : '400'
                  }}>
                    ({getRemainingTime(effectiveDeadline)})
                  </span>
                ) : (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '12px', 
                    color: '#e74c3c',
                    fontWeight: '600'
                  }}>
                    (마감완료)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {(booking.greenFee || booking.cartFee || booking.membershipFee) && (
          <div style={{
            background: 'var(--bg-green)',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-green)' }}>$ 비용 안내</div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {booking.greenFee && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>그린피</span>
                  <span>{formatCurrency(booking.greenFee)}</span>
                </div>
              )}
              {booking.cartFee && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>카트비</span>
                  <span>{formatCurrency(booking.cartFee)}</span>
                </div>
              )}
              {booking.membershipFee && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>참가비{isFeeExempt ? ' (면제)' : ''}</span>
                  <span style={isFeeExempt ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>
                    {formatCurrency(booking.membershipFee)}
                  </span>
                </div>
              )}
              {totalFee > 0 && (
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid var(--primary-green)',
                  fontWeight: '700',
                  color: 'var(--primary-green)'
                }}>
                  <span>총 금액</span>
                  <span>{formatCurrency(totalFee)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(booking.restaurantName || booking.restaurantAddress) && (
          <div style={{
            background: '#FFD449',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px', color: '#8B6914' }}>⚑ 회식 정보</div>
            {booking.restaurantName && <div>{booking.restaurantName}</div>}
            {booking.restaurantAddress && <div style={{ opacity: 0.7, fontSize: '13px' }}>{booking.restaurantAddress}</div>}
          </div>
        )}

        <div style={{
          background: '#f5f5f5',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {(() => {
            const anonymousRentals = (booking.numberRentals || []).filter(
              phone => !allParticipants.some(p => p.phone === phone)
            );
            const sortedParticipants = getSortedParticipants(allParticipants);
            const totalCount = sortedParticipants.length + anonymousRentals.length;
            const isRegularRounding = booking.type !== '컴페티션';
            const cutoffIndex = getWaitlistCutoff(totalCount);
            const confirmedCount = booking.useSquadWaitlist ? cutoffIndex : totalCount;
            const waitlistCount = booking.useSquadWaitlist ? totalCount - cutoffIndex : 0;
            
            return (
              <>
                <div style={{ 
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'var(--primary-green)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚲ 참가자 ({totalCount}명)
                  {booking.useSquadWaitlist && waitlistCount > 0 && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#666',
                      background: '#eee',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      확정 {confirmedCount} / 대기 {waitlistCount}
                    </span>
                  )}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  {sortedParticipants.map((participant, idx) => {
                    const isParticipantRenting = booking.numberRentals && booking.numberRentals.includes(participant.phone);
                    const isParticipating = participants.some(p => p.phone === participant.phone);
                    const isClubExternalMember = isParticipantGuest(participant.phone);
                    const isExtGuest = isExternalGuest(participant);
                    const waitlisted = isWaitlisted(idx, totalCount);
                    
                    let bgColor = 'transparent';
                    let textColor = 'inherit';
                    let padding = '0';
                    let fontWeight = '400';

                    if (isRegularRounding) {
                      fontWeight = '400';
                    } else {
                      if (waitlisted) {
                        fontWeight = '300';
                        textColor = '#888';
                      } else if (isExtGuest) {
                        bgColor = '#DBEAFE';
                        textColor = '#1E40AF';
                        padding = '2px 6px';
                        fontWeight = '500';
                      } else if (isClubExternalMember) {
                        bgColor = '#D1E7DD';
                        textColor = '#0A5C36';
                        padding = '2px 6px';
                        fontWeight = '500';
                      } else if (isParticipantRenting && !isParticipating) {
                        bgColor = '#E6AA68';
                        textColor = '#fff';
                        padding = '2px 6px';
                        fontWeight = '500';
                      } else {
                        fontWeight = '700';
                      }
                    }
                    
                    return (
                      <span key={idx}>
                        <span style={{ 
                          background: bgColor,
                          color: textColor,
                          padding: padding,
                          borderRadius: padding !== '0' ? '4px' : '0',
                          fontWeight: fontWeight
                        }}>
                          {getParticipantDisplayName(participant)}
                        </span>
                        {(idx < sortedParticipants.length - 1 || anonymousRentals.length > 0) && ', '}
                      </span>
                    );
                  })}
                  {anonymousRentals.map((phone, idx) => (
                    <span key={`anon-${idx}`}>
                      <span style={{ 
                        background: '#E6AA68',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        번호대여 #{idx + 1}
                      </span>
                      {idx < anonymousRentals.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* 버튼 렌더링 영역: 3-Stage Lifecycle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Stage 0: Past Rounding or Rounding Day with Results - Show Results */}
          {(booking.dailyHandicaps || (isPastRoundingDate && hasUserScore)) ? (
            <Button variant="primary" fullWidth onClick={() => onNavigate(`/leaderboard?id=${booking.id}`)}>
              ▲ 결과보기
            </Button>
          ) : !isRegistrationClosed ? (
            /* Stage 1: Registration Open - Join/Cancel + Rental */
            <>
              {isJoined ? (
                <Button 
                  variant="outline" 
                  onClick={() => onJoin(booking.id)} 
                  disabled={isJoining}
                  style={{ flex: 1, borderColor: 'var(--alert-red)', color: 'var(--alert-red)' }}
                >
                  {isJoining ? '처리중...' : '참가 취소'}
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={() => onJoin(booking.id)} 
                  disabled={isJoining || isRenting}
                  style={{ flex: 1, opacity: isRenting ? 0.5 : 1 }}
                >
                  {isJoining ? '처리중...' : '참가하기'}
                </Button>
              )}

              {booking.type === '컴페티션' && !isGuest && (
                isRenting ? (
                  <Button 
                    variant="secondary" 
                    onClick={() => onToggleRental(booking.id)} 
                    disabled={isRentalLoading}
                    style={{ flex: 1, background: '#E6AA68', color: 'white', border: 'none' }}
                  >
                    {isRentalLoading ? '처리중...' : '대여 취소'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => onToggleRental(booking.id)} 
                    disabled={isRentalLoading || isJoined}
                    style={{ flex: 1, opacity: isJoined ? 0.5 : 1 }}
                  >
                    {isRentalLoading ? '처리중...' : '번호 대여'}
                  </Button>
                )
              )}
            </>
          ) : (
            /* Stage 2 & 3: Registration Closed - Team Formation + Play (if enabled) */
            <>
              <Button 
                variant="outline" 
                onClick={() => onNavigate(`/team-formation?id=${booking.id}`)} 
                style={{ flex: 1 }}
              >
                📋 조편성 보기
              </Button>
              {booking.playEnabled && (
                <Button 
                  onClick={() => onNavigate(`/play?id=${booking.id}`)} 
                  style={{ flex: 1, background: '#3B82F6', color: 'white', border: 'none' }}
                >
                  ⛳ 플레이하기
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div key={booking.id} style={{
      background: 'var(--bg-card)',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '12px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ flex: 1 }}>
        {booking.title && (
          <div style={{ 
            fontSize: '13px', 
            color: 'var(--primary-green)', 
            fontWeight: '600', 
            marginBottom: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {booking.title}
            {isFoursome && (
              <Badge variant="purple" size="xs">포썸</Badge>
            )}
          </div>
        )}
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
          {booking.courseName}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.7 }}>
          ◷ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {booking.dailyHandicaps ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate(`/leaderboard?id=${booking.id}`)}
          >
            ▲ 결과보기
          </Button>
        ) : booking.playEnabled ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate(`/play?id=${booking.id}`)}
          >
            ⛳ 플레이
          </Button>
        ) : null}
        
        {canManage && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle(booking.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                opacity: 0.7
              }}
            >
              ⋮
            </button>
            {isMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--bg-card)',
                borderRadius: '8px',
                zIndex: 10,
                minWidth: '140px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                <button
                  onClick={() => {
                    onNavigate(`/booking`);
                    onMenuToggle(null);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ◉ 라운딩 관리
                </button>
                <button
                  onClick={() => onEdit(booking)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ✎ 수정
                </button>
                <button
                  onClick={() => {
                    onDelete(booking.id);
                    onMenuToggle(null);
                  }}
                  disabled={isDeleting}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: isDeleting ? '#f0f0f0' : 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    cursor: isDeleting ? 'wait' : 'pointer',
                    color: isDeleting ? '#999' : 'var(--alert-red)',
                    opacity: isDeleting ? 0.7 : 1
                  }}
                >
                  {isDeleting ? '삭제중...' : '× 삭제'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default BookingListCard;
