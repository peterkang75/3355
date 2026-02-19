import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import PageHeader from '../components/common/PageHeader';
import ProfileBadge from '../components/common/ProfileBadge';

function RoundingManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, refreshBookings } = useApp();
  const [booking, setBooking] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAnnounce, setIsTogglingAnnounce] = useState(false);
  const [isTogglingPlay, setIsTogglingPlay] = useState(false);
  const [isTogglingGuest, setIsTogglingGuest] = useState(false);
  const [isToggling2BB, setIsToggling2BB] = useState(false);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      if (foundBooking && !editData) {
        let gameMode = 'stroke';
        if (foundBooking.gradeSettings) {
          try {
            const parsed = typeof foundBooking.gradeSettings === 'string'
              ? JSON.parse(foundBooking.gradeSettings)
              : foundBooking.gradeSettings;
            gameMode = parsed.mode || 'stroke';
          } catch (e) {
            console.error('gradeSettings 파싱 오류:', e);
          }
        }
        
        setEditData({
          title: foundBooking.title || '',
          courseName: foundBooking.courseName,
          date: foundBooking.date,
          time: foundBooking.time,
          gatheringTime: foundBooking.gatheringTime || '',
          greenFee: foundBooking.greenFee || '',
          cartFee: foundBooking.cartFee || '',
          membershipFee: foundBooking.membershipFee || '',
          registrationDeadline: foundBooking.registrationDeadline || '',
          restaurantName: foundBooking.restaurantName || '',
          restaurantAddress: foundBooking.restaurantAddress || '',
          gameMode: gameMode
        });
      }
    }
  }, [bookingId, bookings]);

  // 점 세 개 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;

  const handleDeleteBooking = async () => {
    if (isDeleting) return;
    if (!confirm('정말로 이 라운딩을 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiService.deleteBooking(bookingId);
      alert('라운딩이 삭제되었습니다.');
      navigate('/booking');
    } catch (error) {
      alert('라운딩 삭제에 실패했습니다.');
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (isSaving) return;
    if (!editData.courseName || !editData.date || !editData.time) {
      alert('골프장, 날짜, 시간을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        ...editData,
        greenFee: parseInt(editData.greenFee) || null,
        cartFee: parseInt(editData.cartFee) || null,
        membershipFee: parseInt(editData.membershipFee) || null,
        gradeSettings: JSON.stringify({ mode: editData.gameMode || 'stroke' })
      };
      delete updatedData.gameMode;

      await apiService.updateBooking(bookingId, updatedData);
      await refreshBookings();
      setIsEditing(false);
      setShowMenu(false);
      alert('라운딩이 수정되었습니다.');
    } catch (error) {
      alert('라운딩 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAnnounce = async () => {
    if (isTogglingAnnounce) return;
    
    setIsTogglingAnnounce(true);
    try {
      await apiService.toggleBookingAnnounce(bookingId);
      await refreshBookings();
      setShowMenu(false);
      alert(booking.isAnnounced ? '공지가 해제되었습니다.' : '공지가 활성화되었습니다.');
    } catch (error) {
      alert('공지 상태 변경에 실패했습니다.');
    } finally {
      setIsTogglingAnnounce(false);
    }
  };

  const handleTogglePlay = async () => {
    if (isTogglingPlay) return;
    
    setIsTogglingPlay(true);
    try {
      await apiService.togglePlayEnabled(bookingId);
      await refreshBookings();
    } catch (error) {
      alert('플레이 활성화 상태 변경에 실패했습니다.');
    } finally {
      setIsTogglingPlay(false);
    }
  };

  const handleToggleGuest = async () => {
    if (isTogglingGuest) return;
    
    setIsTogglingGuest(true);
    try {
      await apiService.updateBooking(bookingId, { isGuestAllowed: !booking.isGuestAllowed });
      await refreshBookings();
    } catch (error) {
      alert('외부 공개 상태 변경에 실패했습니다.');
    } finally {
      setIsTogglingGuest(false);
    }
  };

  const handleToggle2BB = async () => {
    if (isToggling2BB) return;
    
    setIsToggling2BB(true);
    try {
      await apiService.updateBooking(bookingId, { is2BB: !booking.is2BB });
      await refreshBookings();
    } catch (error) {
      alert('2BB 모드 변경에 실패했습니다.');
    } finally {
      setIsToggling2BB(false);
    }
  };
  
  const isOrganizer = booking && user?.id === booking.organizerId;
  const canAccess = hasAdminAccess || isOrganizer;
  const isOfficial = booking?.type === '정기모임' || user?.isAdmin;

  if (!booking) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center' }}>
            라운딩을 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center' }}>
            관리자 또는 운영진만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="라운딩 관리"
        onBack={() => navigate('/booking')}
        rightContent={<ProfileBadge user={user} onClick={() => navigate('/mypage')} />}
      />

      <div className="page-content">
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ 
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1 }}>
              {booking.title && (
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '700',
                  color: booking.type === '컴페티션' ? 'white' : '#333',
                  background: booking.type === '컴페티션' ? '#1a3d47' : '#ff8c42',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'inline-block'
                }}>
                  {booking.title}
                </div>
              )}
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                {booking.courseName}
              </h3>
              <div style={{ fontSize: '14px' }}>
                {new Date(booking.date).toLocaleDateString('ko-KR')} • {booking.time}
              </div>
            </div>
            
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
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
              {showMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  minWidth: '140px'
                }}>
                  <LoadingButton
                    onClick={handleToggleAnnounce}
                    loading={isTogglingAnnounce}
                    loadingText="처리중..."
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    {booking.isAnnounced ? '★ 공지 내리기' : '★ 공지 활성화'}
                  </LoadingButton>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    ✏️ 라운딩 수정
                  </button>
                  <LoadingButton
                    onClick={handleDeleteBooking}
                    loading={isDeleting}
                    loadingText="삭제중..."
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: 'var(--alert-red)'
                    }}
                  >
                    🗑️ 라운딩 삭제
                  </LoadingButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--primary-green)' }}>
              라운딩 수정
            </h3>
            
            <input
              className="input-field"
              type="text"
              placeholder="라운딩 이름 (선택)"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="text"
              placeholder="골프장"
              value={editData.courseName}
              onChange={(e) => setEditData({ ...editData, courseName: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block' }}>
                경기 방식
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditData({ ...editData, gameMode: 'stroke' })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: editData.gameMode === 'stroke' ? '2px solid var(--primary-green)' : '1px solid #ddd',
                    borderRadius: '8px',
                    background: editData.gameMode === 'stroke' ? '#e8f5e9' : 'white',
                    color: editData.gameMode === 'stroke' ? 'var(--primary-green)' : '#666',
                    fontWeight: editData.gameMode === 'stroke' ? '700' : '500',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ⛳ 스트로크
                </button>
                <button
                  type="button"
                  onClick={() => setEditData({ ...editData, gameMode: 'foursome' })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: editData.gameMode === 'foursome' ? '2px solid #9333ea' : '1px solid #ddd',
                    borderRadius: '8px',
                    background: editData.gameMode === 'foursome' ? '#f3e8ff' : 'white',
                    color: editData.gameMode === 'foursome' ? '#9333ea' : '#666',
                    fontWeight: editData.gameMode === 'foursome' ? '700' : '500',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  🏌️ 포썸
                </button>
              </div>
            </div>

            <input
              className="input-field"
              type="date"
              value={editData.date}
              onChange={(e) => setEditData({ ...editData, date: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="time"
              value={editData.time}
              onChange={(e) => setEditData({ ...editData, time: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="time"
              placeholder="집결시간 (선택)"
              value={editData.gatheringTime}
              onChange={(e) => setEditData({ ...editData, gatheringTime: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="number"
              placeholder="그린피"
              value={editData.greenFee}
              onChange={(e) => setEditData({ ...editData, greenFee: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="number"
              placeholder="카트비"
              value={editData.cartFee}
              onChange={(e) => setEditData({ ...editData, cartFee: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="number"
              placeholder="회원권비"
              value={editData.membershipFee}
              onChange={(e) => setEditData({ ...editData, membershipFee: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="date"
              placeholder="접수 마감일"
              value={editData.registrationDeadline}
              onChange={(e) => setEditData({ ...editData, registrationDeadline: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="text"
              placeholder="회식장소 (선택)"
              value={editData.restaurantName}
              onChange={(e) => setEditData({ ...editData, restaurantName: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <input
              className="input-field"
              type="text"
              placeholder="회식장소 주소"
              value={editData.restaurantAddress}
              onChange={(e) => setEditData({ ...editData, restaurantAddress: e.target.value })}
              style={{ marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: '#BD5B43',
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
              <LoadingButton 
                onClick={handleSaveEdit}
                loading={isSaving}
                loadingText="저장중..."
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                저장
              </LoadingButton>
            </div>
          </div>
        )}

        {isOfficial && (
        <div className="card" style={{ marginBottom: '16px', padding: 0, overflow: 'hidden' }}>
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)',
            background: '#f8f9fa'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              설정
            </h3>
          </div>

          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                background: '#E3F2FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>⛳</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>플레이 활성화</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                  {booking.playEnabled ? '플레이 버튼 표시 중' : '30분 전 자동 활성화'}
                </div>
              </div>
            </div>
            <button
              onClick={handleTogglePlay}
              disabled={isTogglingPlay}
              style={{
                width: '52px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: booking.playEnabled ? '#4CAF50' : '#ddd',
                cursor: isTogglingPlay ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                opacity: isTogglingPlay ? 0.6 : 1,
                flexShrink: 0
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: booking.playEnabled ? '25px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                background: '#E8F5E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>🌐</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>외부 공개</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                  {booking.isGuestAllowed ? '비회원 참가 가능' : '클럽 회원만'}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleGuest}
              disabled={isTogglingGuest}
              style={{
                width: '52px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: booking.isGuestAllowed ? '#4CAF50' : '#ddd',
                cursor: isTogglingGuest ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                opacity: isTogglingGuest ? 0.6 : 1,
                flexShrink: 0
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: booking.isGuestAllowed ? '25px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                background: '#FFF3E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>🏆</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>2BB (Two Best Ball)</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                  {booking.is2BB ? '팀 베스트볼 계산 활성화' : '개인 스트로크만'}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggle2BB}
              disabled={isToggling2BB}
              style={{
                width: '52px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: booking.is2BB ? '#FF9800' : '#ddd',
                cursor: isToggling2BB ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                opacity: isToggling2BB ? 0.6 : 1,
                flexShrink: 0
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: booking.is2BB ? '25px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>
        </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)',
            background: '#f8f9fa'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              관리
            </h3>
          </div>

          {[
            { 
              icon: '👥', 
              bg: '#FFF3E0', 
              title: '참가자 관리', 
              desc: '참가자 추가/삭제 및 관리',
              path: `/participant-management?id=${bookingId}`,
              officialOnly: false
            },
            { 
              icon: '📋', 
              bg: '#F3E5F5', 
              title: '조편성하기', 
              desc: '참가자들을 팀으로 편성',
              path: `/team-formation?id=${bookingId}`,
              officialOnly: false
            },
            { 
              icon: '✏️', 
              bg: '#E0F7FA', 
              title: booking.dailyHandicaps ? '결과보기' : '스코어 입력', 
              desc: booking.dailyHandicaps ? '라운딩 결과 및 순위' : '참가자 스코어 입력',
              path: `/member-score-entry?id=${bookingId}`,
              officialOnly: true
            },
            { 
              icon: '⚙️', 
              bg: '#ECEFF1', 
              title: '그레이드 설정', 
              desc: '핸디캡 그레이드 기준',
              path: `/grade-settings?id=${bookingId}`,
              officialOnly: true
            }
          ].filter(item => !item.officialOnly || isOfficial).map((item, idx, arr) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'transparent',
                border: 'none',
                borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '10px', 
                  background: item.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>{item.icon}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </div>
              <div style={{ color: '#ccc', fontSize: '20px', fontWeight: '300' }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RoundingManagement;
