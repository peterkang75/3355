import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';

function MemberScoreEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, members } = useApp();
  const [booking, setBooking] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking) {
        const parsedParticipants = parseParticipants(foundBooking.participants);
        setParticipants(parsedParticipants);
        
        const initialScores = {};
        parsedParticipants.forEach(p => {
          initialScores[p.phone] = '';
        });
        setScores(initialScores);
      }
    }
  }, [bookingId, bookings]);

  const parseParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) return [];
    return participants.map(p => {
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
  };

  const getParticipantDisplayName = (participant) => {
    if (!participant) return '';
    const member = members.find(m => m.phone === participant.phone);
    if (member && member.nickname) return member.nickname;
    return participant.nickname || participant.name;
  };

  const handleScoreChange = (phone, value) => {
    setScores(prev => ({
      ...prev,
      [phone]: value
    }));
  };

  const handleSaveScores = async () => {
    setSaving(true);
    
    try {
      const scoresToSave = [];
      
      for (const participant of participants) {
        const scoreValue = scores[participant.phone];
        
        if (scoreValue && scoreValue.trim() !== '') {
          const totalScore = parseInt(scoreValue);
          
          if (isNaN(totalScore) || totalScore <= 0) {
            alert(`${getParticipantDisplayName(participant)}의 스코어가 올바르지 않습니다.`);
            setSaving(false);
            return;
          }
          
          const member = members.find(m => m.phone === participant.phone);
          if (!member) {
            alert(`${getParticipantDisplayName(participant)} 회원 정보를 찾을 수 없습니다.`);
            setSaving(false);
            return;
          }
          
          scoresToSave.push({
            userId: member.id,
            date: booking.date,
            courseName: booking.courseName,
            totalScore: totalScore,
            coursePar: 72,
            holes: JSON.stringify([])
          });
        }
      }
      
      if (scoresToSave.length === 0) {
        alert('입력된 스코어가 없습니다.');
        setSaving(false);
        return;
      }
      
      for (const score of scoresToSave) {
        await apiService.createScore(score);
      }
      
      alert(`${scoresToSave.length}명의 스코어가 저장되었습니다!`);
      navigate(`/rounding-management?id=${bookingId}`);
      
    } catch (error) {
      console.error('스코어 저장 실패:', error);
      alert('스코어 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'operator' || user?.isAdmin;
  
  if (!hasAdminAccess) {
    return (
      <div className="page-content">
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
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
        <h1>회원 스코어 입력</h1>
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

        {booking.teams && Array.isArray(booking.teams) && booking.teams.length > 0 ? (
          booking.teams.map((team, teamIndex) => (
            <div key={teamIndex} className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                🏌️ {team.name}
              </h3>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px' 
              }}>
                {team.members.map((memberPhone, index) => {
                  const participant = participants.find(p => p.phone === memberPhone);
                  if (!participant) return null;
                  
                  return (
                    <div key={index} style={{
                      padding: '12px',
                      background: 'var(--bg-green)',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0'
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#2d5f3f',
                        marginBottom: '8px'
                      }}>
                        {getParticipantDisplayName(participant)}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="타수"
                        value={scores[participant.phone] || ''}
                        onChange={(e) => handleScoreChange(participant.phone, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '16px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          fontWeight: '700',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              marginBottom: '16px',
              color: 'var(--primary-green)'
            }}>
              📝 참가자별 총 타수 입력
            </h3>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '12px' 
            }}>
              {participants.map((participant, index) => (
                <div key={index} style={{
                  padding: '12px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#2d5f3f',
                    marginBottom: '8px'
                  }}>
                    {getParticipantDisplayName(participant)}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="타수"
                    value={scores[participant.phone] || ''}
                    onChange={(e) => handleScoreChange(participant.phone, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: '2px solid #ddd',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSaveScores}
          disabled={saving}
          className="btn-primary"
          style={{
            width: '100%',
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? '저장 중...' : '💾 저장하기'}
        </button>
      </div>
    </div>
  );
}

export default MemberScoreEntry;
