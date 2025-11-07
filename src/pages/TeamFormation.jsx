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
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropToTeam = (e, toTeamIndex, toSlotIndex) => {
    e.preventDefault();
    if (!draggedMember) return;

    const newTeams = [...teams];
    const newUnassigned = [...unassigned];
    const { member, fromTeamIndex, fromSlotIndex } = draggedMember;

    // 원래 위치에서 제거
    if (fromTeamIndex === -1) {
      // 미배정에서 가져옴
      const unassignedIndex = newUnassigned.findIndex(m => m.phone === member.phone);
      if (unassignedIndex !== -1) {
        newUnassigned.splice(unassignedIndex, 1);
      }
    } else {
      // 다른 조에서 가져옴
      newTeams[fromTeamIndex].members[fromSlotIndex] = null;
    }

    // 새 위치에 배치
    const existingMember = newTeams[toTeamIndex].members[toSlotIndex];
    if (existingMember) {
      // 기존 멤버를 미배정으로
      newUnassigned.push(existingMember);
    }
    newTeams[toTeamIndex].members[toSlotIndex] = member;

    setTeams(newTeams);
    setUnassigned(newUnassigned);
    setDraggedMember(null);
  };

  const handleDropToUnassigned = (e) => {
    e.preventDefault();
    if (!draggedMember) return;

    const { member, fromTeamIndex, fromSlotIndex } = draggedMember;
    
    // 조에서만 제거 (이미 미배정이면 무시)
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
              border: '2px dashed #ddd'
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
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid var(--primary-green)',
                    cursor: 'grab',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--primary-green)',
                    userSelect: 'none'
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
                    transition: 'all 0.2s'
                  }}
                  draggable={!!member}
                  onDragStart={member ? (e) => handleDragStart(e, member, teamIndex, slotIndex) : undefined}
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
