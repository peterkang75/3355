import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import PageHeader from '../components/common/PageHeader';

function ParticipantManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, members, refreshBookings } = useApp();
  const [booking, setBooking] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(null);
  const [removingRentalPhone, setRemovingRentalPhone] = useState(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestFormData, setGuestFormData] = useState({ memberNumber: '', name: '', handicapType: 'GA', handicapValue: '' });
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking?.participants) {
        try {
          const parsed = foundBooking.participants.map(p => 
            typeof p === 'string' ? JSON.parse(p) : p
          );
          setParticipants(parsed);
        } catch (e) {
          console.error('참가자 데이터 파싱 오류:', e);
          setParticipants([]);
        }
      }
    }
  }, [bookingId, bookings]);

  useEffect(() => {
    if (members.length > 0 && booking) {
      if (booking.type === '컴페티션') {
        const clubMembers = members.filter(m => m.club === booking.courseName);
        const nonClubMembers = members.filter(m => m.club !== booking.courseName);
        setAvailableMembers([...clubMembers, ...nonClubMembers]);
      } else {
        setAvailableMembers(members);
      }
    }
  }, [members, booking]);

  const isParticipant = (memberPhone) => {
    return participants.some(p => p.phone === memberPhone);
  };

  const handleToggleMemberSelection = (member) => {
    const isSelected = selectedToAdd.some(m => m.phone === member.phone);
    if (isSelected) {
      setSelectedToAdd(selectedToAdd.filter(m => m.phone !== member.phone));
    } else {
      setSelectedToAdd([...selectedToAdd, member]);
    }
  };

  const handleConfirmAdd = async () => {
    if (isAddingParticipants) return;
    if (selectedToAdd.length === 0) {
      alert('추가할 참가자를 선택해주세요.');
      return;
    }

    setIsAddingParticipants(true);

    try {
      const newParticipants = selectedToAdd.map(member => ({
        name: member.name,
        nickname: member.nickname,
        phone: member.phone
      }));

      const updatedParticipants = [...participants, ...newParticipants];
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: updatedParticipants.map(p => JSON.stringify(p))
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setSelectedToAdd([]);
        refreshBookings();
      } else {
        const errorData = await response.text();
        alert(`참가자 추가에 실패했습니다: ${errorData}`);
      }
    } catch (error) {
      alert(`참가자 추가 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsAddingParticipants(false);
    }
  };

  const handleAddGuest = async () => {
    if (isAddingGuest) return;
    if (!guestFormData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setIsAddingGuest(true);
    try {
      const guestPhone = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const handicapValue = guestFormData.handicapValue ? parseFloat(guestFormData.handicapValue) : null;
      const newGuest = {
        name: guestFormData.name.trim(),
        nickname: guestFormData.name.trim(),
        phone: guestPhone,
        memberNumber: guestFormData.memberNumber.trim() || '',
        isGuest: true,
        handicap: handicapValue,
        gaHandy: guestFormData.handicapType === 'GA' ? handicapValue : null,
        houseHandy: guestFormData.handicapType === 'HH' ? handicapValue : null
      };

      const updatedParticipants = [...participants, newGuest];
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: updatedParticipants.map(p => JSON.stringify(p))
        })
      });

      if (response.ok) {
        setShowGuestModal(false);
        setGuestFormData({ memberNumber: '', name: '', handicapType: 'GA', handicapValue: '' });
        refreshBookings();
      } else {
        const errorData = await response.text();
        alert(`게스트 추가에 실패했습니다: ${errorData}`);
      }
    } catch (error) {
      alert(`게스트 추가 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleRemoveParticipant = async (phoneToRemove) => {
    if (removingPhone) return;
    if (!confirm('이 참가자를 삭제하시겠습니까?')) return;

    setRemovingPhone(phoneToRemove);
    try {
      const updatedParticipants = participants.filter(p => p.phone !== phoneToRemove);
      
      // 조편성에서도 해당 참가자 제거
      let updatedTeams = null;
      if (booking.teams) {
        const currentTeams = typeof booking.teams === 'string' 
          ? JSON.parse(booking.teams) 
          : booking.teams;
        
        updatedTeams = currentTeams.map(team => ({
          ...team,
          members: team.members.map(member => 
            member?.phone === phoneToRemove ? null : member
          )
        }));
      }
      
      const updateData = {
        participants: updatedParticipants.map(p => JSON.stringify(p))
      };
      
      if (updatedTeams) {
        updateData.teams = JSON.stringify(updatedTeams);
      }
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await refreshBookings();
      } else {
        const errorData = await response.text();
        alert(`참가자 삭제에 실패했습니다: ${errorData}`);
      }
    } catch (error) {
      alert(`참가자 삭제 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setRemovingPhone(null);
    }
  };

  const handleRemoveRental = async (phoneToRemove) => {
    if (removingRentalPhone) return;
    if (!confirm('이 번호대여자를 삭제하시겠습니까?')) return;

    setRemovingRentalPhone(phoneToRemove);
    try {
      const updatedRentals = (booking.numberRentals || []).filter(phone => phone !== phoneToRemove);
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberRentals: updatedRentals
        })
      });

      if (response.ok) {
        await refreshBookings();
      } else {
        const errorData = await response.text();
        alert(`번호대여자 삭제에 실패했습니다: ${errorData}`);
      }
    } catch (error) {
      alert(`번호대여자 삭제 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setRemovingRentalPhone(null);
    }
  };

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;
  const isOrganizer = booking && user?.id === booking.organizerId;
  const canAccess = hasAdminAccess || isOrganizer;

  if (!booking) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
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
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
            관리자 또는 운영진만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="참가자 관리"
        onBack={() => navigate('/booking')}
      />

      <div className="page-content">
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ 
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {booking.title && (
              <div style={{ fontSize: '13px', color: 'var(--primary-green)', fontWeight: '600', marginBottom: '4px' }}>
                {booking.title}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {booking.courseName}
            </h3>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              {new Date(booking.date).toLocaleDateString('ko-KR')} • {booking.time}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px' 
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-green)' }}>
              참가자 목록 ({participants.length}명)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowGuestModal(true)}
                style={{
                  padding: '8px 12px',
                  background: '#87CEEB',
                  color: '#1a3a4a',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + 외부게스트
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--primary-green)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + 참가자
              </button>
            </div>
          </div>

          {participants.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.7, padding: '32px 0' }}>
              참가자가 없습니다. 참가자를 추가해주세요.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {participants.map((participant, index) => {
                const memberInfo = members.find(m => m.phone === participant.phone);
                const isGuest = participant.isGuest === true;
                const memberNumberText = isGuest && participant.memberNumber 
                  ? ` (${participant.memberNumber})`
                  : (booking?.type === '컴페티션' && memberInfo?.clubMemberNumber ? 
                    ` (${memberInfo.clubMemberNumber})` : '');
                
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      borderRadius: '8px',
                      border: isGuest ? '2px solid #87CEEB' : '2px solid var(--border-color)',
                      background: isGuest ? 'rgba(135, 206, 235, 0.15)' : 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '16px', 
                        fontWeight: '600', 
                        marginBottom: '4px' 
                      }}>
                        <span style={{ color: isGuest ? '#4A90A4' : 'inherit' }}>
                          {participant.nickname}{memberNumberText}
                        </span>
                        {isGuest && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#87CEEB',
                            color: '#1a3a4a',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            외부게스트
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        {participant.name}
                      </div>
                    </div>
                    <LoadingButton
                      onClick={() => handleRemoveParticipant(participant.phone)}
                      loading={removingPhone === participant.phone}
                      loadingText="삭제중..."
                      style={{
                        padding: '6px 12px',
                        background: 'var(--alert-red)',
                        color: 'var(--text-light)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      삭제
                    </LoadingButton>
                  </div>
                );
              })}
            </div>
          )}

          {/* 번호대여자 목록 */}
          {booking.numberRentals && booking.numberRentals.length > 0 && (() => {
            const rentalPhones = booking.numberRentals || [];
            const rentalMembers = rentalPhones
              .map(phone => {
                const member = members.find(m => m.phone === phone);
                const isParticipant = participants.some(p => p.phone === phone);
                return member ? { ...member, isParticipant } : null;
              })
              .filter(Boolean);

            if (rentalMembers.length === 0) return null;

            return (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF9800', marginBottom: '12px' }}>
                  🔢 번호대여자 ({rentalMembers.length}명)
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {rentalMembers.map((member, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid #FF9800',
                        background: 'rgba(255, 152, 0, 0.1)'
                      }}
                    >
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '15px', 
                          fontWeight: '600'
                        }}>
                          <span style={{ color: '#E65100' }}>
                            {member.nickname}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#FF9800',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            번호대여
                          </span>
                          {member.isParticipant && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              background: 'var(--primary-green)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              참가중
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7 }}>
                          {member.name}
                        </div>
                      </div>
                      <LoadingButton
                        onClick={() => handleRemoveRental(member.phone)}
                        loading={removingRentalPhone === member.phone}
                        loadingText="삭제중..."
                        style={{
                          padding: '6px 12px',
                          background: 'var(--alert-red)',
                          color: 'var(--text-light)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        삭제
                      </LoadingButton>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={() => navigate(`/team-formation?id=${bookingId}`)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--primary-green)',
                color: 'var(--text-light)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📋 조편성하기
            </button>
            <button
              onClick={() => navigate(`/play?id=${bookingId}`)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#2196F3',
                color: 'var(--text-light)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ⛳ 플레이하기
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>참가자 추가</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedToAdd([]);
                  setSearchTerm('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  padding: 0
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '0 16px 8px 16px' }}>
              <input
                type="text"
                placeholder="이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px'
            }}>
              {availableMembers.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.7, padding: '32px 0' }}>
                  회원이 없습니다.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {(() => {
                    const filteredMembers = availableMembers.filter(member => {
                      if (!searchTerm.trim()) return true;
                      const term = searchTerm.toLowerCase();
                      return (
                        (member.name && member.name.toLowerCase().includes(term)) ||
                        (member.nickname && member.nickname.toLowerCase().includes(term))
                      );
                    });

                    if (filteredMembers.length === 0) {
                      return (
                        <p style={{ textAlign: 'center', opacity: 0.7, padding: '32px 0' }}>
                          검색 결과가 없습니다.
                        </p>
                      );
                    }

                    return (
                      <>
                        {booking?.type === '컴페티션' && (
                          <>
                            {filteredMembers.filter(m => m.club === booking.courseName).length > 0 && (
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--primary-green)',
                                padding: '8px 0 4px 0',
                                borderBottom: '2px solid var(--primary-green)'
                              }}>
                                {booking.courseName} 회원
                              </div>
                            )}
                          </>
                        )}
                        {filteredMembers.map((member, index) => {
                    const alreadyAdded = isParticipant(member.phone);
                    const isSelected = selectedToAdd.some(m => m.phone === member.phone);
                    const prevMember = index > 0 ? filteredMembers[index - 1] : null;
                    const showDivider = booking?.type === '컴페티션' && 
                      prevMember && 
                      prevMember.club === booking.courseName && 
                      member.club !== booking.courseName;
                    
                    return (
                      <React.Fragment key={member.id}>
                        {showDivider && (
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-dark)',
                            opacity: 0.7,
                            padding: '12px 0 4px 0',
                            marginTop: '8px',
                            borderBottom: '1px solid var(--border-color)'
                          }}>
                            비회원
                          </div>
                        )}
                        <button
                          onClick={() => handleToggleMemberSelection(member)}
                          disabled={alreadyAdded}
                          style={{
                            padding: '16px',
                            background: isSelected ? 'var(--primary-green)' : alreadyAdded ? 'var(--bg-card)' : 'var(--bg-card)',
                            border: isSelected ? '2px solid var(--primary-green)' : '2px solid var(--border-color)',
                            borderRadius: '8px',
                            cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            opacity: alreadyAdded ? 0.6 : 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: isSelected ? 'white' : alreadyAdded ? 'var(--text-dark)' : 'var(--primary-green)' 
                          }}>
                            {member.nickname}
                          </div>
                          {isSelected && (
                            <span style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              ✓
                            </span>
                          )}
                          {alreadyAdded && (
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              opacity: 0.7,
                              background: 'var(--border-color)',
                              padding: '4px 12px',
                              borderRadius: '12px'
                            }}>
                              추가됨
                            </span>
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 24px 24px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedToAdd([]);
                  setSearchTerm('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <LoadingButton
                onClick={handleConfirmAdd}
                disabled={selectedToAdd.length === 0}
                loading={isAddingParticipants}
                loadingText="추가중..."
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedToAdd.length === 0 ? '#999' : 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                확인 ({selectedToAdd.length}명)
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {showGuestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid #87CEEB',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(135, 206, 235, 0.15)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#4A90A4' }}>
                외부게스트 추가
              </h3>
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setGuestFormData({ memberNumber: '', name: '', handicapType: 'GA', handicapValue: '' });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  padding: 0
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#4A90A4'
                }}>
                  회원번호 (선택)
                </label>
                <input
                  type="text"
                  placeholder="회원번호 입력"
                  value={guestFormData.memberNumber}
                  onChange={(e) => setGuestFormData({ ...guestFormData, memberNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#4A90A4'
                }}>
                  이름 *
                </label>
                <input
                  type="text"
                  placeholder="이름 입력"
                  value={guestFormData.name}
                  onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#4A90A4'
                }}>
                  핸디캡 (선택)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setGuestFormData({ ...guestFormData, handicapType: 'GA' })}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px 0 0 6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: guestFormData.handicapType === 'GA' ? '#4A90A4' : '#e0e0e0',
                        color: guestFormData.handicapType === 'GA' ? 'white' : '#666'
                      }}
                    >
                      GA
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuestFormData({ ...guestFormData, handicapType: 'HH' })}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: guestFormData.handicapType === 'HH' ? '#4A90A4' : '#e0e0e0',
                        color: guestFormData.handicapType === 'HH' ? 'white' : '#666'
                      }}
                    >
                      HH
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="핸디캡 입력"
                    value={guestFormData.handicapValue}
                    onChange={(e) => setGuestFormData({ ...guestFormData, handicapValue: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 24px 24px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setGuestFormData({ memberNumber: '', name: '', handicapType: 'GA', handicapValue: '' });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <LoadingButton
                onClick={handleAddGuest}
                disabled={!guestFormData.name.trim()}
                loading={isAddingGuest}
                loadingText="추가중..."
                style={{
                  flex: 1,
                  padding: '12px',
                  background: !guestFormData.name.trim() ? '#999' : '#87CEEB',
                  color: '#1a3a4a',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                추가
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParticipantManagement;
