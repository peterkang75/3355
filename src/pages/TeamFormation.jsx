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
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking && !hasInitialized) {
        const parsedParticipants = parseParticipants(foundBooking.participants);
        setParticipants(parsedParticipants);
        
        if (foundBooking.teams) {
          try {
            const loadedTeams = typeof foundBooking.teams === 'string' 
              ? JSON.parse(foundBooking.teams) 
              : foundBooking.teams;
            
            setTeams(loadedTeams);
            
            const assignedPhones = loadedTeams.flatMap(team => 
              team.members.filter(m => m !== null).map(m => m.phone)
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
        
        setHasInitialized(true);
      }
    }
  }, [bookingId, bookings, hasInitialized]);

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
    if (member && member.nickname) return member.nickname;
    return participant.nickname || participant.name;
  };

  const handleSlotClick = (teamIndex, slotIndex, currentMember) => {
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
      setShowSelectModal(true);
    }
  };

  const handleSelectParticipant = (participant) => {
    if (!selectedSlot) return;

    const { teamIndex, slotIndex } = selectedSlot;
    const newTeams = [...teams];
    const newUnassigned = unassigned.filter(p => p.phone !== participant.phone);

    newTeams[teamIndex].members[slotIndex] = participant;

    setTeams(newTeams);
    setUnassigned(newUnassigned);
    setShowSelectModal(false);
    setSelectedSlot(null);
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
            style={{ 
              flex: 1,
              padding: '12px 24px',
              background: hasUnsavedChanges ? '#dc3545' : 'var(--primary-green)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {hasUnsavedChanges ? '❌ 저장안됨' : '✅ 저장됨'}
          </button>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            📋 미배정 참가자 ({unassigned.length}명)
          </h3>
          <div style={{
            minHeight: '60px',
            background: '#f5f5f5',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            border: '2px dashed #ddd'
          }}>
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
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid var(--primary-green)',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--primary-green)'
                  }}
                >
                  {getParticipantDisplayName(member)}
                </div>
              ))
            )}
          </div>
        </div>

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
                <button
                  key={slotIndex}
                  onClick={() => handleSlotClick(teamIndex, slotIndex, member)}
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
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {member ? getParticipantDisplayName(member) : '+ 추가'}
                </button>
              ))}
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
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px' 
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>참가자 선택</h3>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedSlot(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {unassigned.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '32px 0' }}>
                배정 가능한 참가자가 없습니다.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {unassigned.map((participant, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectParticipant(participant)}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-green)',
                      border: '2px solid var(--primary-green)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--primary-green)'
                    }}
                  >
                    {getParticipantDisplayName(participant)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamFormation;
