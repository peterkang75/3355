import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import PageHeader from '../components/common/PageHeader';
import { parseParticipants } from '../utils';

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

  const PRIMARY = '#0047AB';

  const getMemberStyle = (member) => {
    if (!member) return null;
    const isRenting = booking?.numberRentals?.includes(member.phone);
    const isGuest = isGuestParticipant(member);
    const memberInfo = members.find(m => m.phone === member.phone);
    const isFemale = memberInfo?.gender === '여';
    if (isGuest)   return { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' };
    if (isRenting) return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
    if (isFemale)  return { bg: '#FEE2E2', text: '#BE185D', border: '#FECACA' };
    return { bg: '#E1EBF9', text: PRIMARY, border: '#BFDBFE' };
  };

  if (!booking) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.7 }}>라운딩을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="조편성"
        onBack={() => navigate('/booking')}
        user={user}
      />

      <div className="page-content">

        {/* ── 상단 통합 카드 ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: '20px',
          border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden', marginBottom: '14px',
        }}>
          {/* 헤더: 블루 그라디언트 */}
          <div style={{
            background: 'linear-gradient(145deg, #08183A 0%, #003780 100%)',
            padding: '18px 20px', position: 'relative',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.07) 0%, transparent 55%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                {booking.type && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px',
                  }}>
                    {booking.type}
                  </div>
                )}
                <div style={{ fontSize: '19px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', marginBottom: '5px' }}>
                  {booking.courseName}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '8px' }}>
                  <span>{new Date(booking.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  <span>·</span>
                  <span>총 {participants.length}명</span>
                </div>
              </div>
              {/* 미배정 뱃지 */}
              <div style={{
                flexShrink: 0, textAlign: 'center',
                background: unassigned.length > 0 ? 'rgba(220,38,38,0.18)' : 'rgba(21,128,61,0.18)',
                border: `1px solid ${unassigned.length > 0 ? 'rgba(220,38,38,0.35)' : 'rgba(21,128,61,0.35)'}`,
                borderRadius: '12px', padding: '6px 12px',
              }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: unassigned.length > 0 ? '#FCA5A5' : '#86EFAC', lineHeight: 1 }}>
                  {unassigned.length}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>미배정</div>
              </div>
            </div>
          </div>

          {/* 미배정 칩 목록 */}
          {unassigned.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {unassigned.map((member, index) => {
                const st = getMemberStyle(member);
                const handicapText = getHandicapDisplay(member);
                return (
                  <div key={index} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '5px 11px', borderRadius: '20px',
                    background: st.bg, border: `1px solid ${st.border}`,
                    fontSize: '12px', fontWeight: '600', color: st.text,
                  }}>
                    {getParticipantDisplayName(member)}
                    {handicapText && <span style={{ fontSize: '10px', opacity: 0.65 }}>({handicapText})</span>}
                  </div>
                );
              })}
            </div>
          )}
          {unassigned.length === 0 && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#15803D' }}>모든 참가자 배정 완료</span>
            </div>
          )}

          {/* 액션 바 */}
          {canAccess && (
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LoadingButton
                onClick={handleAutoAssign}
                loading={isAutoAssigning}
                loadingText="배정중…"
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '8px 12px', borderRadius: '10px',
                  background: '#F1F5F9', border: 'none',
                  fontSize: '12px', fontWeight: '600', color: '#334155',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                자동배정
              </LoadingButton>

              <div style={{ width: '1px', height: '24px', background: '#E2E8F0', flexShrink: 0 }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <button onClick={handleRemoveTeam} disabled={teams.length === 0}
                  style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#fff', color: teams.length === 0 ? '#CBD5E1' : '#475569', fontSize: '16px', cursor: teams.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', minWidth: '28px', textAlign: 'center' }}>{teams.length}조</span>
                <button onClick={handleAddTeam}
                  style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
              </div>

              <div style={{ width: '1px', height: '24px', background: '#E2E8F0', flexShrink: 0 }} />

              <LoadingButton onClick={handleSaveTeams} loading={isSaving} loadingText="저장중…"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  padding: '8px 10px', borderRadius: '10px', border: 'none',
                  background: hasUnsavedChanges ? '#FEF3C7' : '#F0FDF4',
                  color: hasUnsavedChanges ? '#92400E' : '#15803D',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                }}>
                {hasUnsavedChanges
                  ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>미저장</>
                  : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>저장됨</>
                }
              </LoadingButton>

              <button onClick={handleCopyTeamText}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                복사
              </button>
            </div>
          )}
        </div>

        {/* 조 카드들 */}
        {teams.map((team, teamIndex) => {
          const renderSlot = (member, slotIndex) => {
            if (!member) {
              return (
                <button
                  key={slotIndex}
                  onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
                  style={{
                    minHeight: '64px', flex: 1,
                    background: '#F8FAFC', color: '#CBD5E1',
                    borderRadius: '12px', border: '1.5px dashed #CBD5E1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              );
            }
            const st = getMemberStyle(member);
            const handicapText = getHandicapDisplay(member);
            const isGuest = isGuestParticipant(member);
            return (
              <button
                key={slotIndex}
                onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
                style={{
                  minHeight: '64px', flex: 1,
                  background: st.bg, color: st.text,
                  borderRadius: '12px', border: `1.5px solid ${st.border}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  gap: '3px', padding: '8px 4px',
                }}
              >
                <span style={{ lineHeight: 1.2 }}>{getParticipantDisplayName(member)}</span>
                {isGuest && <span style={{ fontSize: '10px', fontWeight: '600', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: '6px' }}>게스트</span>}
                {handicapText && <span style={{ fontSize: '11px', opacity: 0.65, fontWeight: '500' }}>{handicapText}</span>}
              </button>
            );
          };

          return (
            <div key={teamIndex} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px 20px', marginBottom: '12px' }}>
              {/* 조 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '800', color: PRIMARY,
                  }}>
                    {team.teamNumber}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>{team.teamNumber}조</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {canAccess ? (
                    <input
                      type="time"
                      value={team.teeTime || ''}
                      onChange={(e) => handleTeeTimeChange(teamIndex, e.target.value)}
                      style={{
                        padding: '5px 10px', border: '1px solid #E2E8F0',
                        borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                        background: '#F8FAFC', color: '#1E293B', outline: 'none',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '13px', fontWeight: '600', color: team.teeTime ? PRIMARY : '#CBD5E1' }}>
                      {team.teeTime || '--:--'}
                    </span>
                  )}
                </div>
              </div>

              {/* 멤버 슬롯 */}
              {gameMode === 'foursome' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '2px' }}>A팀</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {renderSlot(team.members[0], 0)}
                      {renderSlot(team.members[1], 1)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#E8ECF0' }} />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', letterSpacing: '0.1em' }}>VS</span>
                    <div style={{ flex: 1, height: '1px', background: '#E8ECF0' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '2px' }}>B팀</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {renderSlot(team.members[2], 2)}
                      {renderSlot(team.members[3], 3)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {team.members.map((member, slotIndex) => renderSlot(member, slotIndex))}
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* 참가자 선택 바텀시트 */}
      {showSelectModal && (
        <>
          <div onClick={() => { setShowSelectModal(false); setSelectedSlot(null); setSelectedParticipants([]); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(3px)' }} />
          <div style={{
            position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom))', left: 0, right: 0,
            background: '#F8FAFC', borderRadius: '24px 24px 0 0',
            zIndex: 1000, maxHeight: '72vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          }}>
            {/* 핸들 */}
            <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px', margin: '0 auto' }} />
            </div>
            {/* 헤더 */}
            <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SELECT</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em' }}>
                  참가자 선택 <span style={{ fontSize: '14px', fontWeight: '600', color: PRIMARY }}>({selectedParticipants.length}/4)</span>
                </div>
              </div>
              <button onClick={() => { setShowSelectModal(false); setSelectedSlot(null); setSelectedParticipants([]); }}
                style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {unassigned.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: '14px' }}>배정 가능한 참가자가 없습니다.</p>
              ) : (
                <div style={{ display: 'grid', gap: '6px' }}>
                  {unassigned.map((participant, index) => {
                    const isSelected = selectedParticipants.some(p => p.phone === participant.phone);
                    const st = getMemberStyle(participant);
                    const handicapText = getHandicapDisplay(participant);
                    const isGuest = isGuestParticipant(participant);
                    return (
                      <button
                        key={index}
                        onClick={() => handleToggleParticipant(participant)}
                        style={{
                          padding: '13px 16px', borderRadius: '12px',
                          background: isSelected ? PRIMARY : '#FFFFFF',
                          border: isSelected ? 'none' : `1.5px solid ${st.border}`,
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: '12px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                          background: isSelected ? 'rgba(255,255,255,0.2)' : st.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '800',
                          color: isSelected ? 'white' : st.text,
                        }}>
                          {isSelected
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : (participant.nickname || participant.name || '?').charAt(0)
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: isSelected ? 'white' : '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {getParticipantDisplayName(participant)}
                            {isGuest && <span style={{ fontSize: '10px', fontWeight: '600', background: isSelected ? 'rgba(255,255,255,0.25)' : st.bg, color: isSelected ? 'white' : st.text, padding: '2px 6px', borderRadius: '6px' }}>게스트</span>}
                          </div>
                          {handicapText && <div style={{ fontSize: '12px', color: isSelected ? 'rgba(255,255,255,0.75)' : '#94A3B8', marginTop: '1px' }}>{handicapText}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* 확인 버튼 */}
            <div style={{ padding: '12px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedParticipants.length === 0}
                style={{
                  width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                  background: selectedParticipants.length > 0 ? PRIMARY : '#E2E8F0',
                  color: selectedParticipants.length > 0 ? 'white' : '#94A3B8',
                  fontSize: '16px', fontWeight: '700',
                  cursor: selectedParticipants.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: selectedParticipants.length > 0 ? '0 4px 12px rgba(0,71,171,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {selectedParticipants.length > 0 ? `${selectedParticipants.length}명 배정하기` : '참가자를 선택하세요'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TeamFormation;
