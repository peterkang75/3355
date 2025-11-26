import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';

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

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      if (foundBooking && !editData) {
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
          restaurantAddress: foundBooking.restaurantAddress || ''
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
        membershipFee: parseInt(editData.membershipFee) || null
      };

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
  
  if (!hasAdminAccess) {
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

  return (
    <div>
      <div className="header">
        <button 
          onClick={() => navigate('/booking')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>라운딩 관리</h1>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            {user.nickname || user.name}
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            border: '2px solid var(--border-color)'
          }}>
            {user.photo ? (
              <img 
                src={user.photo} 
                alt="프로필" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span>{(user.nickname || user.name).charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

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

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '16px',
            color: 'var(--primary-green)'
          }}>
            관리 메뉴
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              onClick={() => navigate(`/participant-management?id=${bookingId}`)}
              style={{
                padding: '20px',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: 'var(--primary-green)' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  참가자 관리
                </div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  참가자 추가/삭제 및 관리
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/team-formation?id=${bookingId}`)}
              style={{
                padding: '20px',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: 'var(--primary-green)' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  조편성하기
                </div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  참가자들을 팀으로 편성합니다
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/play?id=${bookingId}`)}
              style={{
                padding: '20px',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2196F3',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: '#2196F3' }}>⛳</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  플레이하기
                </div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  홀별 스코어를 입력합니다
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/member-score-entry?id=${bookingId}`)}
              style={{
                padding: '20px',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: 'var(--primary-green)' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  {booking.dailyHandicaps ? '결과보기' : '회원 스코어 입력'}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  {booking.dailyHandicaps 
                    ? '라운딩 결과 및 순위를 확인합니다' 
                    : '참가자들의 스코어를 입력합니다'}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate(`/grade-settings?id=${bookingId}`)}
              style={{
                padding: '20px',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px', color: 'var(--primary-green)' }}>•</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                  그레이드 설정
                </div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  이 라운딩의 핸디캡 그레이드 기준 설정
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoundingManagement;
