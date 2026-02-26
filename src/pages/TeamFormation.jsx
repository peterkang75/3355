import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import PageHeader from '../components/common/PageHeader';
import ProfileBadge from '../components/common/ProfileBadge';

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
  const [editingTeeTime, setEditingTeeTime] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (bookingId && bookings.length > 0 && !isInitialized) {
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
            
            // 포썸 모드: 참가자 수에 맞게 조 수 조정
            const requiredTeams = Math.ceil(allParticipants.length / 4);
            let normalizedTeams = [...loadedTeams];
            
            // 필요한 조 수보다 적으면 빈 조 추가
            while (normalizedTeams.length < requiredTeams) {
              normalizedTeams.push({
                teamNumber: normalizedTeams.length + 1,
                members: Array(4).fill(null)
              });
            }
            
            // 각 조의 members 배열이 4명인지 확인
            normalizedTeams = normalizedTeams.map(team => ({
              ...team,
              members: team.members.length < 4 
                ? [...team.members, ...Array(4 - team.members.length).fill(null)]
                : team.members.slice(0, 4)
            }));
            
            setTeams(normalizedTeams);
            
            const assignedPhones = normalizedTeams.flatMap(team => 
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
        
        setIsInitialized(true);
      }
    }
  }, [bookingId, bookings, members, isInitialized]);

  useEffect(() => {
    if (bookingId && bookings.length > 0 && isInitialized) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      if (foundBooking) {
        setBooking(foundBooking);
      }
    }
  }, [bookingId, bookings, isInitialized]);

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
    
    const parts = [];
    
    // 회원 데이터 또는 게스트 참가자 데이터에서 핸디캡 가져오기
    const gaHandy = member?.gaHandy || participant?.gaHandy;
    const houseHandy = member?.houseHandy || participant?.houseHandy;
    const handicap = member?.handicap || participant?.handicap;
    
    if (gaHandy) {
      parts.push(`GA${gaHandy}`);
    } else if ((member?.golflinkNumber && handicap) || participant?.gaHandy) {
      parts.push(`GA${handicap}`);
    }
    
    if (houseHandy) {
      parts.push(`HH${houseHandy}`);
    }
    
    return parts.join(', ');
  };

  const handleSlotClick = (teamIndex, slotIndex, currentMember) => {
    const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;
    const isOrganizer = booking && user?.id === booking.organizerId;
    
    if (!hasAdminAccess && !isOrganizer) {
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
      // 포썸 모드일 경우 팀 핸디캡 계산
      const teamsWithHandicap = teams.map(team => {
        const newTeam = { ...team };
        
        // Pair A (members[0], members[1])의 팀 핸디캡
        const pairAMembers = [team.members[0], team.members[1]].filter(Boolean);
        if (pairAMembers.length === 2) {
          const hcp1 = getHandicapValue(pairAMembers[0]);
          const hcp2 = getHandicapValue(pairAMembers[1]);
          newTeam.pairAHandicap = parseFloat(((hcp1 + hcp2) / 2).toFixed(1));
        } else if (pairAMembers.length === 1) {
          newTeam.pairAHandicap = getHandicapValue(pairAMembers[0]);
        } else {
          newTeam.pairAHandicap = null;
        }
        
        // Pair B (members[2], members[3])의 팀 핸디캡
        const pairBMembers = [team.members[2], team.members[3]].filter(Boolean);
        if (pairBMembers.length === 2) {
          const hcp1 = getHandicapValue(pairBMembers[0]);
          const hcp2 = getHandicapValue(pairBMembers[1]);
          newTeam.pairBHandicap = parseFloat(((hcp1 + hcp2) / 2).toFixed(1));
        } else if (pairBMembers.length === 1) {
          newTeam.pairBHandicap = getHandicapValue(pairBMembers[0]);
        } else {
          newTeam.pairBHandicap = null;
        }
        
        return newTeam;
      });
      
      await apiService.updateBooking(bookingId, {
        teams: JSON.stringify(teamsWithHandicap)
      });
      setTeams(teamsWithHandicap);
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
    
    // 회원 데이터 또는 게스트 참가자 데이터에서 핸디캡 가져오기
    const gaHandy = member?.gaHandy || participant?.gaHandy;
    const handicap = member?.handicap || participant?.handicap;
    const houseHandy = member?.houseHandy || participant?.houseHandy;
    
    if (gaHandy && !isNaN(parseFloat(gaHandy))) {
      return parseFloat(gaHandy);
    }
    if (handicap && !isNaN(parseFloat(handicap))) {
      return parseFloat(handicap);
    }
    if (houseHandy && !isNaN(parseFloat(houseHandy))) {
      return parseFloat(houseHandy);
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
    const getMemberString = (p) => {
      if (!p) return '';
      
      if (p.isGuest) {
        const name = p.nickname || p.name;
        const number = p.memberNumber || '';
        return number ? `${name}(${number})` : `${name}(Guest)`;
      }
      
      const fullMember = members.find(m => m.phone === p.phone);
      const name = fullMember?.nickname || p.nickname || p.name;
      const number = fullMember?.clubMemberNumber || '';
      
      return number ? `${name}(${number})` : name;
    };

    const header = `[${booking?.date || ''}] 조편성`;
    let lines = [header];

    teams.forEach((team) => {
      const teamMembers = team.members.filter(m => m !== null);
      if (teamMembers.length === 0) return;

      const memberStrings = teamMembers.map(m => getMemberString(m));
      const teeTimeStr = team.teeTime ? ` (${team.teeTime})` : '';

      if (gameMode === 'foursome' && memberStrings.length >= 2) {
        const teamA = memberStrings.slice(0, 2).join(' & ');
        const teamB = memberStrings.slice(2, 4).join(' & ');
        if (teamB) {
          lines.push(`${team.teamNumber}조${teeTimeStr}: ${teamA} (A) vs ${teamB} (B)`);
        } else {
          lines.push(`${team.teamNumber}조${teeTimeStr}: ${teamA} (A)`);
        }
      } else {
        lines.push(`${team.teamNumber}조${teeTimeStr}: ${memberStrings.join(', ')}`);
      }
    });

    return lines.join('\n');
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

  const handleAddTeam = () => {
    const newTeamNumber = teams.length + 1;
    const newTeam = {
      teamNumber: newTeamNumber,
      members: [null, null, null, null]
    };
    setTeams([...teams, newTeam]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveTeam = () => {
    if (teams.length === 0) return;
    
    const lastTeam = teams[teams.length - 1];
    const membersToUnassign = lastTeam.members.filter(m => m !== null);
    
    if (membersToUnassign.length > 0) {
      if (!confirm(`${teams.length}조에 배정된 ${membersToUnassign.length}명이 미배정으로 이동됩니다. 삭제하시겠습니까?`)) {
        return;
      }
      setUnassigned([...unassigned, ...membersToUnassign]);
    }
    
    setTeams(teams.slice(0, -1));
    setHasUnsavedChanges(true);
  };

  const handleTeeTimeChange = (teamIndex, value) => {
    const newTeams = [...teams];
    newTeams[teamIndex] = { ...newTeams[teamIndex], teeTime: value };
    setTeams(newTeams);
    setHasUnsavedChanges(true);
  };

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;
  const isOrganizerAccess = booking && user?.id === booking.organizerId;
  const canAccess = hasAdminAccess || isOrganizerAccess;

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
      <PageHeader 
        title="조편성"
        onBack={() => canAccess ? navigate(`/rounding-management?id=${bookingId}`) : navigate('/booking')}
        rightContent={<ProfileBadge user={user} onClick={() => navigate('/mypage')} />}
      />

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

        {canAccess && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'stretch' }}>
            <LoadingButton
              onClick={handleAutoAssign}
              loading={isAutoAssigning}
              loadingText="..."
              style={{ 
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#374151',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
            >
              ⚡ 자동배정
            </LoadingButton>
            <button
              onClick={handleRemoveTeam}
              disabled={teams.length === 0}
              style={{
                width: '40px',
                height: '40px',
                background: '#FFFFFF',
                color: teams.length === 0 ? '#D1D5DB' : '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '500',
                cursor: teams.length === 0 ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              −
            </button>
            <button
              onClick={handleAddTeam}
              style={{
                width: '40px',
                height: '40px',
                background: '#FFFFFF',
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '500',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              +
            </button>
            <LoadingButton
              onClick={handleSaveTeams}
              loading={isSaving}
              loadingText="..."
              style={{ 
                flex: 1,
                padding: '10px 14px',
                background: hasUnsavedChanges ? '#EF4444' : '#1a3d47',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                cursor: 'pointer',
              }}
            >
              {hasUnsavedChanges ? '✕ 저장안됨' : '✓ 저장됨'}
            </LoadingButton>
            <button
              onClick={handleCopyTeamText}
              style={{
                padding: '10px 10px',
                background: '#FFFFFF',
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              📋 복사
            </button>
          </div>
        )}

        {canAccess && (
          <button
            onClick={() => navigate(`/play?id=${bookingId}`)}
            style={{
              width: '100%',
              padding: '14px',
              background: '#1a3d47',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(26,61,71,0.25)',
            }}
          >
            ⛳ 플레이하기
          </button>
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
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            background: '#F9FAFB',
          }}>
            {unassigned.length === 0 ? (
              <div style={{ 
                width: '100%', 
                textAlign: 'center', 
                color: '#9CA3AF',
                fontSize: '14px',
                padding: '20px 0'
              }}>
                모든 참가자가 배정되었습니다
              </div>
            ) : (
              unassigned.map((member, index) => {
                const isRenting = booking?.numberRentals && booking.numberRentals.includes(member.phone);
                const isGuest = isGuestParticipant(member);
                const handicapText = getHandicapDisplay(member);
                const memberInfo = members.find(m => m.phone === member.phone);
                const isFemale = memberInfo?.gender === '여';
                
                let bgColor = '#FFFFFF';
                let textColor = '#1F2937';
                let borderColor = '#E5E7EB';
                
                if (isGuest) {
                  bgColor = '#EFF6FF';
                  textColor = '#1D4ED8';
                  borderColor = '#BFDBFE';
                } else if (isRenting) {
                  bgColor = '#FEF3C7';
                  textColor = '#92400E';
                  borderColor = '#FDE68A';
                } else if (isFemale) {
                  bgColor = '#FDF2F8';
                  textColor = '#9D174D';
                  borderColor = '#FBCFE8';
                }
                
                return (
                  <div
                    key={index}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
                      fontSize: '14px',
                      fontWeight: '500',
                      color: textColor,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    {getParticipantDisplayName(member)}
                    {isGuest && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        background: '#BFDBFE',
                        color: '#1D4ED8',
                        padding: '1px 5px',
                        borderRadius: '6px'
                      }}>
                        G
                      </span>
                    )}
                    {handicapText && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>({handicapText})</span>}
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
            const memberInfo = member ? members.find(m => m.phone === member.phone) : null;
            const isFemale = memberInfo?.gender === '여';
            
            if (!member) {
              return (
                <button
                  key={slotIndex}
                  onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
                  style={{
                    minHeight: '56px',
                    background: '#FAFAFA',
                    color: '#9CA3AF',
                    borderRadius: '12px',
                    border: '2px dashed #D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                  }}
                >
                  + 추가
                </button>
              );
            }

            let bgColor = '#F0FDF4';
            let textColor = '#166534';
            let borderColor = '#BBF7D0';
            
            if (isGuest) {
              bgColor = '#EFF6FF';
              textColor = '#1D4ED8';
              borderColor = '#BFDBFE';
            } else if (isRenting) {
              bgColor = '#FEF3C7';
              textColor = '#92400E';
              borderColor = '#FDE68A';
            } else if (isFemale) {
              bgColor = '#FDF2F8';
              textColor = '#9D174D';
              borderColor = '#FBCFE8';
            }
            
            return (
              <button
                key={slotIndex}
                onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
                style={{
                  minHeight: '56px',
                  background: bgColor,
                  color: textColor,
                  borderRadius: '12px',
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  gap: '2px',
                  flex: 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{getParticipantDisplayName(member)}</span>
                  {isGuest && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      background: '#BFDBFE',
                      color: '#1D4ED8',
                      padding: '1px 4px',
                      borderRadius: '4px'
                    }}>
                      G
                    </span>
                  )}
                </div>
                {handicapText && <span style={{ fontSize: '11px', opacity: 0.7 }}>{handicapText}</span>}
              </button>
            );
          };

          return (
            <div key={teamIndex} className="card" style={{ marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '700',
                  color: 'var(--primary-green)',
                  margin: 0
                }}>
                  {team.teamNumber}조
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {canAccess ? (
                    <input
                      type="time"
                      value={team.teeTime || ''}
                      onChange={(e) => handleTeeTimeChange(teamIndex, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: 'var(--bg-card)',
                        color: 'var(--text-dark)',
                        width: '130px',
                        minWidth: '130px'
                      }}
                      placeholder="--:--"
                    />
                  ) : (
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: team.teeTime ? 'var(--primary-green)' : '#999'
                    }}>
                      {team.teeTime || '--:--'}
                    </span>
                  )}
                </div>
              </div>
              
              {gameMode === 'foursome' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    background: '#F0FDF4',
                    borderRadius: '12px',
                    padding: '10px',
                    border: '1px solid #BBF7D0',
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      color: '#166534', 
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
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '10px',
                    border: '1px solid #E2E8F0',
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      color: '#475569', 
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
