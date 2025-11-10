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
  const [leaderboard, setLeaderboard] = useState(null);

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

  const parseTeams = (teams) => {
    if (!teams) return [];
    try {
      if (typeof teams === 'string') {
        return JSON.parse(teams);
      }
      if (Array.isArray(teams)) {
        return teams;
      }
      return [];
    } catch (e) {
      return [];
    }
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

  const getGrade = (handicap, gradeSettings) => {
    if (!gradeSettings) return 'C';
    
    const hc = parseFloat(handicap) || 0;
    
    const gradeA = gradeSettings.gradeA || { type: 'below', value: 10 };
    const gradeB = gradeSettings.gradeB || { min: 11, max: 22 };
    const gradeC = gradeSettings.gradeC || { type: 'above', value: 23 };
    
    if (gradeA.type === 'below' && hc <= gradeA.value) return 'A';
    if (gradeA.type === 'above' && hc >= gradeA.value) return 'A';
    
    if (hc >= gradeB.min && hc <= gradeB.max) return 'B';
    
    if (gradeC.type === 'below' && hc <= gradeC.value) return 'C';
    if (gradeC.type === 'above' && hc >= gradeC.value) return 'C';
    
    return 'C';
  };

  const calculateLeaderboard = (savedScores, dailyHandicaps, gradeSettings) => {
    const coursePar = 72;
    
    const results = savedScores.map(score => {
      const member = members.find(m => m.id === score.userId);
      if (!member) return null;
      
      const dailyHandicap = dailyHandicaps[member.phone] || 0;
      const totalScore = score.totalScore;
      const overUnder = totalScore - coursePar;
      const finalScore = overUnder - dailyHandicap;
      const grade = getGrade(dailyHandicap, gradeSettings);
      
      return {
        nickname: member.nickname || member.name,
        dailyHandicap,
        totalScore,
        overUnder,
        finalScore,
        grade
      };
    }).filter(r => r !== null);
    
    const gradeA = results.filter(r => r.grade === 'A').sort((a, b) => a.finalScore - b.finalScore);
    const gradeB = results.filter(r => r.grade === 'B').sort((a, b) => a.finalScore - b.finalScore);
    const gradeC = results.filter(r => r.grade === 'C').sort((a, b) => a.finalScore - b.finalScore);
    
    return { gradeA, gradeB, gradeC };
  };

  const handleSaveScores = async () => {
    setSaving(true);
    
    try {
      const scoresToSave = [];
      const dailyHandicaps = {};
      
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
          
          const currentHandicap = parseFloat(member.handicap) || 0;
          dailyHandicaps[member.phone] = currentHandicap;
          
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
      
      await apiService.updateBooking(bookingId, {
        dailyHandicaps: dailyHandicaps
      });
      
      const gradeSettings = booking.gradeSettings;
      const leaderboardData = calculateLeaderboard(scoresToSave, dailyHandicaps, gradeSettings);
      setLeaderboard(leaderboardData);
      
      alert(`${scoresToSave.length}명의 스코어가 저장되었습니다!`);
      
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

        {!leaderboard && (() => {
          const teams = parseTeams(booking.teams);
          return teams && teams.length > 0 ? (
            teams.map((team, teamIndex) => (
              <div key={teamIndex} className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '700',
                  marginBottom: '16px',
                  color: 'var(--primary-green)'
                }}>
                  🏌️ {team.teamNumber}조
                </h3>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '12px' 
                }}>
                  {team.members.map((member, index) => {
                    if (!member) return null;
                    const memberPhone = member.phone || member;
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
          );
        })()}

        {!leaderboard && (
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
        )}

        {leaderboard && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              marginBottom: '20px',
              color: 'var(--primary-green)',
              textAlign: 'center'
            }}>
              🏆 라운딩 결과
            </h3>

            {leaderboard.gradeA.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#2d5f3f',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'var(--bg-green)',
                  borderRadius: '6px'
                }}>
                  🏆 그레이드 A
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeA.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #eee', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.dailyHandicap}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontWeight: '700', color: '#2d5f3f' }}>
                            {player.finalScore > 0 ? `+${player.finalScore}` : player.finalScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {leaderboard.gradeB.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#2d5f3f',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'var(--bg-green)',
                  borderRadius: '6px'
                }}>
                  🥈 그레이드 B
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeB.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #eee', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.dailyHandicap}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontWeight: '700', color: '#2d5f3f' }}>
                            {player.finalScore > 0 ? `+${player.finalScore}` : player.finalScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {leaderboard.gradeC.length > 0 && (
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#2d5f3f',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'var(--bg-green)',
                  borderRadius: '6px'
                }}>
                  🥉 그레이드 C
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeC.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #eee', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.dailyHandicap}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontWeight: '700', color: '#2d5f3f' }}>
                            {player.finalScore > 0 ? `+${player.finalScore}` : player.finalScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setLeaderboard(null)}
              className="btn-primary"
              style={{
                width: '100%',
                marginTop: '20px',
                background: '#666',
                borderColor: '#666'
              }}
            >
              📝 다시 입력하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberScoreEntry;
