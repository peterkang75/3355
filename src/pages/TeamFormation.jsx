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
  const [draggedMember, setDraggedMember] = useState(null);
  const [touchedElement, setTouchedElement] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking) {
        const parsedParticipants = parseParticipants(foundBooking.participants);
        setParticipants(parsedParticipants);
        
        // 조 편성 데이터 로드 또는 초기화
        if (foundBooking.teams) {
          try {
            const loadedTeams = typeof foundBooking.teams === 'string' 
              ? JSON.parse(foundBooking.teams) 
              : foundBooking.teams;
            setTeams(loadedTeams);
            
            // 미배정 참가자 계산
            const assignedPhones = loadedTeams.flatMap(team => 
              team.members.map(m => m.phone)
            );
            const unassignedMembers = parsedParticipants.filter(p => 
              !assignedPhones.includes(p.phone)
            );
            setUnassigned(unassignedMembers);
          } catch (e) {
            console.error('Failed to parse teams:', e);
            initializeTeams(parsedParticipants);
          }
        } else {
          initializeTeams(parsedParticipants);
        }
      }
    }
  }, [bookingId, bookings]);

  const parseParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) return [];
    return participants.map(p => {
      try {
        return typeof p === 'string' ? JSON.parse(p) : p;
      } catch {
        return p;
      }
    });
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
    if (member && member.nickname) return member.nickname;
    return participant.nickname || participant.name;
  };

  const handleDragStart = (e, member, fromTeamIndex, fromSlotIndex) => {
    setDraggedMember({ member, fromTeamIndex, fromSlotIndex });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (e, member, fromTeamIndex, fromSlotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedMember({ member, fromTeamIndex, fromSlotIndex });
    setTouchedElement(e.currentTarget);
    e.currentTarget.style.opacity = '0.3';
    
    // 페이지 스크롤 방지 (가로/세로 모두)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    // 드래그 프리뷰 생성
    const touch = e.touches[0];
    setDragPreview({
      text: getParticipantDisplayName(member),
      x: touch.clientX,
      y: touch.clientY
    });
  };

  const handleTouchMove = (e) => {
    if (!draggedMember) return;
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    
    // 드래그 프리뷰 위치 업데이트
    setDragPreview(prev => prev ? {
      ...prev,
      x: touch.clientX,
      y: touch.clientY
    } : null);
    
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // 드롭 가능한 영역 하이라이트
    document.querySelectorAll('.drop-zone').forEach(el => {
      el.style.backgroundColor = '';
    });
    
    if (elementBelow && elementBelow.classList.contains('drop-zone')) {
      elementBelow.style.backgroundColor = 'rgba(45, 95, 63, 0.1)';
    }
  };

  const handleTouchEnd = (e) => {
    if (!draggedMember) return;
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // 원래 스타일 복원
    if (touchedElement) {
      touchedElement.style.opacity = '1';
    }
    
    // 드롭 가능한 영역 하이라이트 제거
    document.querySelectorAll('.drop-zone').forEach(el => {
      el.style.backgroundColor = '';
    });
    
    // 페이지 스크롤 복원
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    
    // 드래그 프리뷰 제거
    setDragPreview(null);
    
    if (elementBelow && elementBelow.classList.contains('drop-zone')) {
      const targetType = elementBelow.getAttribute('data-drop-type');
      
      if (targetType === 'unassigned') {
        handleDropToUnassignedLogic();
      } else if (targetType === 'team') {
        const teamIndex = parseInt(elementBelow.getAttribute('data-team-index'));
        const slotIndex = parseInt(elementBelow.getAttribute('data-slot-index'));
        handleDropToTeamLogic(teamIndex, slotIndex);
      }
    }
    
    setDraggedMember(null);
    setTouchedElement(null);
  };

  const handleDropToUnassignedLogic = () => {
    if (!draggedMember) return;

    const { member, fromTeamIndex, fromSlotIndex } = draggedMember;
    
    if (fromTeamIndex !== -1) {
      const newTeams = [...teams];
      newTeams[fromTeamIndex].members[fromSlotIndex] = null;
      setTeams(newTeams);
      
      const newUnassigned = [...unassigned];
      if (!newUnassigned.find(m => m.phone === member.phone)) {
        newUnassigned.push(member);
      }
      setUnassigned(newUnassigned);
    }
  };

  const handleDropToTeamLogic = (toTeamIndex, toSlotIndex) => {
    if (!draggedMember) return;

    const newTeams = [...teams];
    const newUnassigned = [...unassigned];
    const { member, fromTeamIndex, fromSlotIndex } = draggedMember;

    if (fromTeamIndex === -1) {
      const unassignedIndex = newUnassigned.findIndex(m => m.phone === member.phone);
      if (unassignedIndex !== -1) {
        newUnassigned.splice(unassignedIndex, 1);
      }
    } else {
      newTeams[fromTeamIndex].members[fromSlotIndex] = null;
    }

    const existingMember = newTeams[toTeamIndex].members[toSlotIndex];
    if (existingMember) {
      newUnassigned.push(existingMember);
    }
    newTeams[toTeamIndex].members[toSlotIndex] = member;

    setTeams(newTeams);
    setUnassigned(newUnassigned);
  };

  const handleDropToTeam = (e, toTeamIndex, toSlotIndex) => {
    e.preventDefault();
    if (!draggedMember) return;
    handleDropToTeamLogic(toTeamIndex, toSlotIndex);
    setDraggedMember(null);
  };

  const handleDropToUnassigned = (e) => {
    e.preventDefault();
    if (!draggedMember) return;
    handleDropToUnassignedLogic();
    setDraggedMember(null);
  };

  const handleSaveTeams = async () => {
    try {
      await apiService.updateBooking(bookingId, {
        teams: JSON.stringify(teams)
      });
      alert('조편성이 저장되었습니다!');
    } catch (error) {
      console.error('Failed to save teams:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleAutoAssign = () => {
    const allMembers = [...unassigned];
    
    // 기존 조에서 배정된 멤버들도 수집
    teams.forEach(team => {
      team.members.forEach(member => {
        if (member) allMembers.push(member);
      });
    });

    // 섞기
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
  };

  if (!user?.isAdmin) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            관리자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            라운딩을 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 드래그 프리뷰 */}
      {dragPreview && (
        <div style={{
          position: 'fixed',
          left: dragPreview.x - 50,
          top: dragPreview.y - 20,
          padding: '8px 16px',
          background: 'var(--primary-green)',
          color: 'white',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transform: 'scale(1.1)',
          opacity: 0.9
        }}>
          {dragPreview.text}
        </div>
      )}
      
      <div className="header">
        <button 
          onClick={() => navigate(`/rounding-management?id=${bookingId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 8px'
          }}
        >
          ←
        </button>
        <h1>조편성</h1>
      </div>

      <div className="page-content">
        {/* 라운딩 정보 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ 
            background: 'var(--bg-green)',
            padding: '16px',
            borderRadius: '8px'
          }}>
            {booking.title && (
              <div style={{ fontSize: '13px', color: '#2d5f3f', fontWeight: '600', marginBottom: '4px' }}>
                {booking.title}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {booking.courseName}
            </h3>
            <div style={{ fontSize: '14px', color: '#666' }}>
              📅 {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              👥 총 {participants.length}명
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={handleAutoAssign}
            className="btn-outline"
            style={{ flex: 1 }}
          >
            🎲 자동 배정
          </button>
          <button
            onClick={handleSaveTeams}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            💾 저장하기
          </button>
        </div>

        {/* 미배정 참가자 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            📋 미배정 참가자 ({unassigned.length}명)
          </h3>
          <div 
            className="drop-zone"
            data-drop-type="unassigned"
            onDragOver={handleDragOver}
            onDrop={handleDropToUnassigned}
            style={{
              minHeight: '80px',
              background: '#f5f5f5',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              border: '2px dashed #ddd',
              transition: 'background-color 0.2s'
            }}
          >
            {unassigned.length === 0 ? (
              <div style={{ 
                width: '100%', 
                textAlign: 'center', 
                color: '#999',
                padding: '20px 0'
              }}>
                모든 참가자가 배정되었습니다
              </div>
            ) : (
              unassigned.map((member, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member, -1, -1)}
                  onTouchStart={(e) => handleTouchStart(e, member, -1, -1)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid var(--primary-green)',
                    cursor: 'grab',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--primary-green)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    touchAction: 'none',
                    WebkitTouchCallout: 'none'
                  }}
                >
                  {getParticipantDisplayName(member)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 조 목록 */}
        {teams.map((team, teamIndex) => (
          <div key={teamIndex} className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              marginBottom: '12px',
              color: '#2d5f3f'
            }}>
              {team.teamNumber}조
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              {team.members.map((member, slotIndex) => (
                <div
                  key={slotIndex}
                  className="drop-zone"
                  data-drop-type="team"
                  data-team-index={teamIndex}
                  data-slot-index={slotIndex}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToTeam(e, teamIndex, slotIndex)}
                  style={{
                    minHeight: '60px',
                    background: member ? 'var(--primary-green)' : '#f5f5f5',
                    color: member ? 'white' : '#999',
                    borderRadius: '8px',
                    border: member ? 'none' : '2px dashed #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: member ? 'grab' : 'default',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    touchAction: member ? 'none' : 'auto',
                    WebkitTouchCallout: 'none',
                    transition: 'all 0.2s'
                  }}
                  draggable={!!member}
                  onDragStart={member ? (e) => handleDragStart(e, member, teamIndex, slotIndex) : undefined}
                  onTouchStart={member ? (e) => handleTouchStart(e, member, teamIndex, slotIndex) : undefined}
                  onTouchMove={member ? handleTouchMove : undefined}
                  onTouchEnd={member ? handleTouchEnd : undefined}
                >
                  {member ? getParticipantDisplayName(member) : '빈 자리'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamFormation;
