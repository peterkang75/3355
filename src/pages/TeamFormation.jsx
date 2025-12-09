import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [gameMode, setGameMode] = useState('stroke');

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking) {
        if (foundBooking.gradeSettings) {
          try {
            const parsed = typeof foundBooking.gradeSettings === 'string'
              ? JSON.parse(foundBooking.gradeSettings)
              : foundBooking.gradeSettings;
            if (parsed.mode) {
              setGameMode(parsed.mode);
            }
          } catch (e) {
            console.error('gradeSettings 파싱 오류:', e);
          }
        }
        
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
    
    if (participant.isGuest) {
      const memberNumber = participant.memberNumber ? ` (${participant.memberNumber})` : '';
      return `${participant.nickname || participant.name}${memberNumber}`;
    }
    
    const member = members.find(m => m.phone === participant.phone);
    const nickname = (member && member.nickname) ? member.nickname : (participant.nickname || participant.name);
    
    if (booking?.type === '컴페티션' && member?.clubMemberNumber) {
      return `${nickname} (${member.clubMemberNumber})`;
    }
    
    return nickname;
  };

  const isGuestParticipant = (participant) => {
    return participant && participant.isGuest === true;
  };

  const getHandicapDisplay = (participant) => {
    if (!participant) return '';
    const member = members.find(m => m.phone === participant.phone);
    if (!member) return '';
    
    const parts = [];
    
    if (member.gaHandy) {
      parts.push(`GA${member.gaHandy}`);
    } else if (member.golflinkNumber && member.handicap) {
      parts.push(`GA${member.handicap}`);
    }
    
    if (member.houseHandy) {
      parts.push(`HH${member.houseHandy}`);
    }
    
    return parts.join(', ');
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
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await apiService.updateBooking(bookingId, {
        teams: JSON.stringify(teams)
      });
      setHasUnsavedChanges(false);
      alert('조편성이 저장되었습니다!');
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const getHandicapValue = (participant) => {
    if (!participant) return 36;
    const member = members.find(m => m.phone === participant.phone);
    if (!member) return 36;
    
    if (member.gaHandy && !isNaN(parseFloat(member.gaHandy))) {
      return parseFloat(member.gaHandy);
    }
    if (member.handicap && !isNaN(parseFloat(member.handicap))) {
      return parseFloat(member.handicap);
    }
    if (member.houseHandy && !isNaN(parseFloat(member.houseHandy))) {
      return parseFloat(member.houseHandy);
    }
    return 36;
  };

  const handleAutoAssign = async () => {
    if (isAutoAssigning) return;
    
    setIsAutoAssigning(true);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allMembers = [...unassigned];
    
    teams.forEach(team => {
      team.members.forEach(member => {
        if (member) allMembers.push(member);
      });
    });

    const sortedByHandicap = [...allMembers].sort((a, b) => {
      return getHandicapValue(a) - getHandicapValue(b);
    });
    
    const numTeams = Math.ceil(sortedByHandicap.length / 4);
    const newTeams = Array.from({ length: numTeams }, (_, i) => ({
      teamNumber: i + 1,
      members: []
    }));

    sortedByHandicap.forEach((member, index) => {
      const round = Math.floor(index / numTeams);
      const isReverseRound = round % 2 === 1;
      let teamIndex = index % numTeams;
      
      if (isReverseRound) {
        teamIndex = numTeams - 1 - teamIndex;
      }
      
      newTeams[teamIndex].members.push(member);
    });

    newTeams.forEach(team => {
      while (team.members.length < 4) {
        team.members.push(null);
      }
    });

    setTeams(newTeams);
    setUnassigned([]);
    setHasUnsavedChanges(true);
    setIsAutoAssigning(false);
  };

  const generateTeamText = () => {
    const title = booking?.title || booking?.courseName || '라운딩';
    let text = `[ ${title} ] 조편성 결과\n\n`;

    teams.forEach((team) => {
      const teamMembers = team.members.filter(m => m !== null);
      if (teamMembers.length === 0) return;

      const memberNames = teamMembers.map(m => {
        const displayName = m.nickname || m.name;
        return displayName;
      });

      if (gameMode === 'foursome' && memberNames.length >= 2) {
        const teamA = memberNames.slice(0, 2).join(' & ');
        const teamB = memberNames.slice(2, 4).join(' & ');
        if (teamB) {
          text += `${team.teamNumber}조: ${teamA} (A) vs ${teamB} (B)\n`;
        } else {
          text += `${team.teamNumber}조: ${teamA} (A)\n`;
        }
      } else {
        text += `${team.teamNumber}조: ${memberNames.join(', ')}\n`;
      }
    });

    return text.trim();
  };

  const handleCopyTeamText = async () => {
    try {
      const text = generateTeamText();
      await navigator.clipboard.writeText(text);
      alert('조편성 결과가 복사되었습니다!');
    } catch (error) {
      alert('복사에 실패했습니다. 다시 시도해주세요.');
    }
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
            <LoadingButton
              onClick={handleAutoAssign}
              loading={isAutoAssigning}
              loadingText="배정중..."
              className="btn-outline"
              style={{ flex: 1 }}
            >
              ⚡ 자동 배정
            </LoadingButton>
            <LoadingButton
              onClick={handleSaveTeams}
              loading={isSaving}
              loadingText="저장중..."
              style={{ 
                flex: 1,
                padding: '12px 24px',
                background: hasUnsavedChanges ? 'var(--alert-red)' : 'var(--primary-green)',
                color: 'var(--text-light)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {hasUnsavedChanges ? '× 저장안됨' : '✓ 저장됨'}
            </LoadingButton>
            <button
              onClick={handleCopyTeamText}
              style={{
                padding: '12px 16px',
                background: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              📋 텍스트 복사
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
                const isGuest = isGuestParticipant(member);
                const handicapText = getHandicapDisplay(member);
                
                let bgColor = 'transparent';
                let textColor = 'var(--primary-green)';
                let borderColor = 'var(--border-color)';
                
                if (isGuest) {
                  bgColor = 'rgba(135, 206, 235, 0.3)';
                  textColor = '#4A90A4';
                  borderColor = '#87CEEB';
                } else if (isRenting) {
                  bgColor = '#E6AA68';
                  textColor = '#fff';
                }
                
                return (
                  <div
                    key={index}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: `2px solid ${borderColor}`,
                      background: bgColor,
                      fontSize: '14px',
                      fontWeight: '600',
                      color: textColor,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {getParticipantDisplayName(member)}
                    {isGuest && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        background: '#87CEEB',
                        color: '#1a3a4a',
                        padding: '2px 4px',
                        borderRadius: '3px'
                      }}>
                        게스트
                      </span>
                    )}
                    {handicapText && <span style={{ fontSize: '12px', opacity: 0.8 }}>({handicapText})</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {teams.map((team, teamIndex) => {
          const renderSlotButton = (member, slotIndex) => {
            const isRenting = member && booking?.numberRentals && booking.numberRentals.includes(member.phone);
            const isGuest = isGuestParticipant(member);
            const handicapText = member ? getHandicapDisplay(member) : '';
            
            let bgColor = 'var(--bg-card)';
            let textColor = 'var(--text-dark)';
            let borderColor = 'var(--border-color)';
            
            if (member) {
              if (isGuest) {
                bgColor = '#87CEEB';
                textColor = '#1a3a4a';
                borderColor = '#5BA3C0';
              } else if (isRenting) {
                bgColor = '#E6AA68';
                textColor = '#fff';
              } else {
                bgColor = 'var(--primary-green)';
                textColor = 'var(--text-light)';
              }
            }
            
            return (
              <button
                key={slotIndex}
                onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
                style={{
                  minHeight: '60px',
                  background: bgColor,
                  color: textColor,
                  borderRadius: '8px',
                  border: `2px solid ${borderColor}`,
                  opacity: member ? 1 : 0.7,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  gap: '2px',
                  flex: 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{member ? getParticipantDisplayName(member) : '+ 추가'}</span>
                  {isGuest && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      background: 'rgba(255,255,255,0.4)',
                      color: '#1a3a4a',
                      padding: '1px 3px',
                      borderRadius: '2px'
                    }}>
                      G
                    </span>
                  )}
                </div>
                {handicapText && <span style={{ fontSize: '11px', opacity: 0.85 }}>{handicapText}</span>}
              </button>
            );
          };

          return (
            <div key={teamIndex} className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '12px',
                color: 'var(--primary-green)'
              }}>
                {team.teamNumber}조
              </h3>
              
              {gameMode === 'foursome' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      color: '#3B82F6', 
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      A팀
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {renderSlotButton(team.members[0], 0)}
                      {renderSlotButton(team.members[1], 1)}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 0'
                  }}>
                    <div style={{
                      background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)',
                      height: '1px',
                      flex: 1
                    }} />
                    <span style={{
                      padding: '4px 16px',
                      fontSize: '14px',
                      fontWeight: '800',
                      color: 'var(--text-gray)',
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)'
                    }}>
                      VS
                    </span>
                    <div style={{
                      background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)',
                      height: '1px',
                      flex: 1
                    }} />
                  </div>
                  
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      color: '#EF4444', 
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      B팀
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {renderSlotButton(team.members[2], 2)}
                      {renderSlotButton(team.members[3], 3)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {team.members.map((member, slotIndex) => renderSlotButton(member, slotIndex))}
                </div>
              )}
            </div>
          );
        })}
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
                    const isGuest = isGuestParticipant(participant);
                    
                    let bgColor, textColor, borderColor;
                    borderColor = 'var(--border-color)';
                    if (isSelected) {
                      bgColor = isGuest ? '#5BA3C0' : 'var(--primary-green)';
                      textColor = 'white';
                      borderColor = isGuest ? '#87CEEB' : 'var(--primary-green)';
                    } else if (isGuest) {
                      bgColor = 'rgba(135, 206, 235, 0.3)';
                      textColor = '#4A90A4';
                      borderColor = '#87CEEB';
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
                          border: `2px solid ${borderColor}`,
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>
                            {getParticipantDisplayName(participant)}
                          </span>
                          {isGuest && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              background: isSelected ? 'rgba(255,255,255,0.3)' : '#87CEEB',
                              color: isSelected ? '#fff' : '#1a3a4a',
                              padding: '2px 4px',
                              borderRadius: '3px'
                            }}>
                              게스트
                            </span>
                          )}
                        </div>
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
