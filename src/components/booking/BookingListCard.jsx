import React, { memo } from 'react';
import { Badge, Button } from '../common';
import theme from '../../styles/theme';

const BookingListCard = memo(function BookingListCard({
  booking,
  isActive,
  canManage,
  userPhone,
  participants,
  allParticipants,
  totalFee,
  isFoursome,
  isJoined,
  isRenting,
  isMenuOpen,
  loadingStates,
  statusFlags,
  formatCurrency,
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
                      onNavigate(`/rounding-management?id=${booking.id}`);
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

          {booking.registrationDeadline && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>◔ 접수 마감:</span>
              <span>{new Date(booking.registrationDeadline).toLocaleDateString('ko-KR')}</span>
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
                  <span>참가비</span>
                  <span>{formatCurrency(booking.membershipFee)}</span>
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
            const totalCount = allParticipants.length + anonymousRentals.length;
            
            return (
              <>
                <div style={{ 
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'var(--primary-green)'
                }}>
                  ⚲ 참가자 ({totalCount}명)
                </div>
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  {allParticipants.map((participant, idx) => {
                    const isParticipantRenting = booking.numberRentals && booking.numberRentals.includes(participant.phone);
                    const isParticipating = participants.some(p => p.phone === participant.phone);
                    return (
                      <span key={idx}>
                        <span style={{ 
                          background: isParticipantRenting && !isParticipating ? '#E6AA68' : 'transparent',
                          color: isParticipantRenting && !isParticipating ? '#fff' : 'inherit',
                          padding: isParticipantRenting && !isParticipating ? '2px 6px' : '0',
                          borderRadius: isParticipantRenting && !isParticipating ? '4px' : '0'
                        }}>
                          {getParticipantDisplayName(participant)}
                        </span>
                        {(idx < allParticipants.length - 1 || anonymousRentals.length > 0) && ', '}
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
          {/* Stage 0: Past Rounding - Show Results */}
          {isPastRoundingDate && (booking.dailyHandicaps || hasUserScore) ? (
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

              {booking.type === '컴페티션' && (
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
            /* Stage 2 & 3: Registration Closed - Team Formation + Play (if within 30 mins) */
            <>
              <Button 
                variant="outline" 
                onClick={() => onNavigate(`/team-formation?id=${booking.id}`)} 
                style={{ flex: 1 }}
              >
                📋 조편성 보기
              </Button>
              {isPlayTime && (
                <Button 
                  variant="primary" 
                  onClick={() => onNavigate(`/play?id=${booking.id}`)} 
                  style={{ flex: 1 }}
                >
                  ⛳ 플레이
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
          <div style={{ fontSize: '13px', color: 'var(--primary-green)', fontWeight: '600', marginBottom: '2px' }}>
            {booking.title}
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
                    onNavigate(`/rounding-management?id=${booking.id}`);
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
