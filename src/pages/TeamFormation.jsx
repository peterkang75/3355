import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';

function TeamFormation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, members } = useApp();
  const [booking, setBooking] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking) {
        const parsedParticipants = parseParticipants(foundBooking.participants);
        
        // 번호대여 회원도 조편성에 포함
        const rentalMembers = (foundBooking.numberRentals || []).map(phone => {
          const member = members.find(m => m.phone === phone);
          return member ? {
            name: member.name,
            nickname: member.nickname,
            phone: member.phone
          } : null;
        }).filter(m => m !== null);
        
        // 참가자 + 번호대여 회원 합치기 (중복 제거)
        const allParticipants = [...parsedParticipants];
        rentalMembers.forEach(rental => {
          if (!allParticipants.some(p => p.phone === rental.phone)) {
            allParticipants.push(rental);
          }
        });
        
        setParticipants(allParticipants);
        
        if (foundBooking.teams) {
          try {
            const loadedTeams = typeof foundBooking.teams === 'string' 
              ? JSON.parse(foundBooking.teams) 
              : foundBooking.teams;
            
            setTeams(loadedTeams);
            
            const assignedPhones = loadedTeams.flatMap(team => 
              team.members.filter(m => m !== null).map(m => m.phone)
            );
            
            const unassignedMembers = allParticipants.filter(p => 
              !assignedPhones.includes(p.phone)
            );
            
            setUnassigned(unassignedMembers);
          } catch (e) {
            console.error('Failed to parse teams:', e);
            initializeTeams(allParticipants);
          }
        } else {
          initializeTeams(allParticipants);
        }
      }
    }
  }, [bookingId, bookings, members]);

  const parseParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) {
      return [];
    }
    
    const parsed = participants.map(p => {
      try {
        let result = typeof p === 'string' ? JSON.parse(p) : p;
        if (typeof result === 'string') {
          result = JSON.parse(result);
        }
        return result;
      } catch (e) {
        return p;
      }
    });
    
    return parsed;
  };

  const initializeTeams = (parsedParticipants) => {
    const numTeams = Math.ceil(parsedParticipants.length / 4);
    const initialTeams = Array.from({ length: numTeams }, (_, i) => ({
      teamNumber: i + 1,
      members: Array(4).fill(null)
    }));
    setTeams(initialTeams);
    setUnassigned(parsedParticipants);
  };

  const getParticipantDisplayName = (participant) => {
    if (!participant) return '';
    const member = members.find(m => m.phone === participant.phone);
    const nickname = (member && member.nickname) ? member.nickname : (participant.nickname || participant.name);
    
    if (booking?.type === '컴페티션' && member?.clubMemberNumber) {
      return `${nickname} (${member.clubMemberNumber})`;
    }
    
    return nickname;
  };

  const getHandicapDisplay = (participant) => {
    if (!participant) return '';
    const member = members.find(m => m.phone === participant.phone);
    if (!member) return '';
    
    if (member.gaHandy) {
      return `GA ${member.gaHandy}`;
    } else if (member.houseHandy) {
      return `HH ${member.houseHandy}`;
    }
    return '';
  };

  const handleSlotClick = (teamIndex, slotIndex, currentMember) => {
    const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;
    
    if (!hasAdminAccess) {
      return;
    }
    
    if (currentMember) {
      if (confirm(`${getParticipantDisplayName(currentMember)}을(를) 미배정으로 이동하시겠습니까?`)) {
        handleRemoveParticipant(teamIndex, slotIndex);
      }
    } else {
      if (unassigned.length === 0) {
        alert('배정 가능한 참가자가 없습니다.');
        return;
      }
      setSelectedSlot({ teamIndex, slotIndex });
      setSelectedParticipants([]);
      setShowSelectModal(true);
    }
  };

  const handleToggleParticipant = (participant) => {
    const isSelected = selectedParticipants.some(p => p.phone === participant.phone);
    
    if (isSelected) {
      setSelectedParticipants(selectedParticipants.filter(p => p.phone !== participant.phone));
    } else {
      if (selectedParticipants.length >= 4) {
        alert('최대 4명까지만 선택할 수 있습니다.');
        return;
      }
      setSelectedParticipants([...selectedParticipants, participant]);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedParticipants.length === 0) {
      alert('참가자를 선택해주세요.');
      return;
    }

    const { teamIndex, slotIndex } = selectedSlot;
    const newTeams = [...teams];
    let currentSlotIndex = slotIndex;
    let currentTeamIndex = teamIndex;

    selectedParticipants.forEach((participant) => {
      while (currentTeamIndex < newTeams.length) {
        if (currentSlotIndex < 4 && newTeams[currentTeamIndex].members[currentSlotIndex] === null) {
          newTeams[currentTeamIndex].members[currentSlotIndex] = participant;
          currentSlotIndex++;
          break;
        } else {
          currentTeamIndex++;
          currentSlotIndex = 0;
        }
      }
    });

    const selectedPhones = selectedParticipants.map(p => p.phone);
    const newUnassigned = unassigned.filter(p => !selectedPhones.includes(p.phone));

    setTeams(newTeams);
    setUnassigned(newUnassigned);
    setShowSelectModal(false);
    setSelectedSlot(null);
    setSelectedParticipants([]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveParticipant = (teamIndex, slotIndex) => {
    const newTeams = [...teams];
    const member = newTeams[teamIndex].members[slotIndex];
    
    if (member) {
      newTeams[teamIndex].members[slotIndex] = null;
      setTeams(newTeams);
      setUnassigned([...unassigned, member]);
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveTeams = async () => {
    try {
      await apiService.updateBooking(bookingId, {
        teams: JSON.stringify(teams)
      });
      setHasUnsavedChanges(false);
      alert('조편성이 저장되었습니다!');
    } catch (error) {
      console.error('Failed to save teams:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleAutoAssign = () => {
    const allMembers = [...unassigned];
    
    teams.forEach(team => {
      team.members.forEach(member => {
        if (member) allMembers.push(member);
      });
    });

    const shuffled = [...allMembers].sort(() => Math.random() - 0.5);
    
    const numTeams = Math.ceil(shuffled.length / 4);
    const newTeams = Array.from({ length: numTeams }, (_, i) => ({
      teamNumber: i + 1,
      members: Array(4).fill(null)
    }));

    shuffled.forEach((member, index) => {
      const teamIndex = Math.floor(index / 4);
      const slotIndex = index % 4;
      if (teamIndex < newTeams.length) {
        newTeams[teamIndex].members[slotIndex] = member;
      }
    });

    setTeams(newTeams);
    setUnassigned([]);
    setHasUnsavedChanges(true);
  };

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;

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

  return (
    <div>
      <div className="header">
        <button 
          onClick={() => hasAdminAccess ? navigate(`/rounding-management?id=${bookingId}`) : navigate('/booking')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-dark)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>조편성</h1>
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
            borderRadius: '8px'
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
            <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '4px' }}>
              총 {participants.length}명
            </div>
          </div>
        </div>

        {hasAdminAccess && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={handleAutoAssign}
              className="btn-outline"
              style={{ flex: 1 }}
            >
              ⚡ 자동 배정
            </button>
            <button
              onClick={handleSaveTeams}
              style={{ 
                flex: 1,
                padding: '12px 24px',
                background: hasUnsavedChanges ? 'var(--alert-red)' : 'var(--primary-green)',
                color: 'var(--text-light)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {hasUnsavedChanges ? '× 저장안됨' : '✓ 저장됨'}
            </button>
          </div>
        )}

        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: 'var(--primary-green)',
              margin: 0
            }}>
              미배정 참가자 ({unassigned.length}명)
            </h3>
            {unassigned.filter(m => booking?.numberRentals && booking.numberRentals.includes(m.phone)).length > 0 && (
              <span style={{
                background: '#E6AA68',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                번호대여자 {unassigned.filter(m => booking?.numberRentals && booking.numberRentals.includes(m.phone)).length}
              </span>
            )}
          </div>
          <div style={{
            minHeight: '60px',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            border: '2px solid var(--border-color)'
          }}>
            {unassigned.length === 0 ? (
              <div style={{ 
                width: '100%', 
                textAlign: 'center', 
                opacity: 0.7,
                padding: '20px 0'
              }}>
                모든 참가자가 배정되었습니다
              </div>
            ) : (
              unassigned.map((member, index) => {
                const isRenting = booking?.numberRentals && booking.numberRentals.includes(member.phone);
                const handicapText = getHandicapDisplay(member);
                return (
                  <div
                    key={index}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '2px solid var(--border-color)',
                      background: isRenting ? '#E6AA68' : 'transparent',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isRenting ? '#fff' : 'var(--primary-green)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {getParticipantDisplayName(member)}
                    {handicapText && <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '4px' }}>({handicapText})</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {teams.map((team, teamIndex) => (
          <div key={teamIndex} className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              marginBottom: '12px',
              color: 'var(--primary-green)'
            }}>
              {team.teamNumber}조
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              {team.members.map((member, slotIndex) => {
                const isRenting = member && booking?.numberRentals && booking.numberRentals.includes(member.phone);
                const handicapText = member ? getHandicapDisplay(member) : '';
                return (
                  <button
                    key={slotIndex}
                    onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
                    style={{
                      minHeight: '60px',
                      background: member ? (isRenting ? '#E6AA68' : 'var(--primary-green)') : 'var(--bg-card)',
                      color: member ? (isRenting ? '#fff' : 'var(--text-light)') : 'var(--text-dark)',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      opacity: member ? 1 : 0.7,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      gap: '2px'
                    }}
                  >
                    <span>{member ? getParticipantDisplayName(member) : '+ 추가'}</span>
                    {handicapText && <span style={{ fontSize: '11px', opacity: 0.85 }}>{handicapText}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showSelectModal && (
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
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  참가자 선택 ({selectedParticipants.length}/4)
                </h3>
                {unassigned.filter(m => booking?.numberRentals && booking.numberRentals.includes(m.phone)).length > 0 && (
                  <span style={{
                    background: '#E6AA68',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    번호대여자 {unassigned.filter(m => booking?.numberRentals && booking.numberRentals.includes(m.phone)).length}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedSlot(null);
                  setSelectedParticipants([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  opacity: 0.7
                }}
              >
                ×
              </button>
            </div>

            <p style={{ 
              fontSize: '13px', 
              opacity: 0.7,
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              최대 4명까지 선택할 수 있습니다
            </p>

            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              marginBottom: '16px' 
            }}>
              {unassigned.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.7, padding: '32px 0' }}>
                  배정 가능한 참가자가 없습니다.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '6px' }}>
                  {unassigned.map((participant, index) => {
                    const isSelected = selectedParticipants.some(p => p.phone === participant.phone);
                    const isRenting = booking?.numberRentals && booking.numberRentals.includes(participant.phone);
                    
                    let bgColor, textColor;
                    if (isSelected) {
                      bgColor = 'var(--primary-green)';
                      textColor = 'white';
                    } else if (isRenting) {
                      bgColor = '#E6AA68';
                      textColor = '#fff';
                    } else {
                      bgColor = 'var(--bg-card)';
                      textColor = 'var(--primary-green)';
                    }
                    
                    const handicapText = getHandicapDisplay(participant);
                    return (
                      <button
                        key={index}
                        onClick={() => handleToggleParticipant(participant)}
                        style={{
                          padding: '12px 14px',
                          background: bgColor,
                          border: '2px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: textColor,
                          transition: 'all 0.2s',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px'
                        }}
                      >
                        {isSelected && (
                          <span style={{ 
                            position: 'absolute', 
                            left: '10px', 
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '16px' 
                          }}>
                            ✓
                          </span>
                        )}
                        <span>
                          {getParticipantDisplayName(participant)}
                        </span>
                        {handicapText && <span style={{ fontSize: '11px', opacity: 0.8 }}>{handicapText}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedSlot(null);
                  setSelectedParticipants([]);
                }}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: '#BD5B43',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소하기
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedParticipants.length === 0}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: selectedParticipants.length > 0 ? 'var(--primary-green)' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: selectedParticipants.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamFormation;
