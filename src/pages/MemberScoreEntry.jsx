import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';

function MemberScoreEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, members, courses } = useApp();
  const [booking, setBooking] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [ntpRecords, setNtpRecords] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);

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
        
        if (foundBooking.dailyHandicaps) {
          loadExistingScores(foundBooking);
        } else {
          setLoadingScores(false);
        }
        
        loadNtpRecords();
      } else {
        setLoadingScores(false);
      }
    } else if (bookings.length > 0) {
      setLoadingScores(false);
    }
  }, [bookingId, bookings]);

  const loadNtpRecords = async () => {
    try {
      const res = await fetch(`/api/ntp/${bookingId}`);
      const data = await res.json();
      setNtpRecords(data);
    } catch (error) {
      console.error('NTP 데이터 로드 실패:', error);
    }
  };

  const loadExistingScores = async (booking) => {
    try {
      let bookingScores = await apiService.fetchBookingScores(booking.date, booking.courseName);
      
      if ((!bookingScores || bookingScores.length === 0) && booking.title) {
        const res = await fetch(`/api/scores/by-rounding/${encodeURIComponent(booking.title)}`);
        if (res.ok) {
          bookingScores = await res.json();
        }
      }
      
      if (bookingScores && bookingScores.length > 0) {
        const dailyHandicaps = typeof booking.dailyHandicaps === 'string' 
          ? JSON.parse(booking.dailyHandicaps) 
          : booking.dailyHandicaps;
        const gradeSettings = typeof booking.gradeSettings === 'string'
          ? JSON.parse(booking.gradeSettings)
          : booking.gradeSettings;
        
        const scoresToSave = bookingScores.map(score => ({
          userId: score.userId,
          totalScore: score.totalScore
        }));
        
        const leaderboardData = calculateLeaderboard(scoresToSave, dailyHandicaps, gradeSettings);
        setLeaderboard(leaderboardData);
      }
    } catch (error) {
      console.error('기존 스코어 로드 실패:', error);
    } finally {
      setLoadingScores(false);
    }
  };

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
    
    const gradeA = gradeSettings.gradeA || { type: 'below', value: '' };
    const gradeB = gradeSettings.gradeB || { min: '', max: '' };
    const gradeC = gradeSettings.gradeC || { min: '', max: '' };
    const gradeD = gradeSettings.gradeD || { type: 'above', value: '' };
    
    if (gradeA.value !== '' && gradeA.value !== null) {
      if (gradeA.type === 'below' && hc <= gradeA.value) return 'A';
      if (gradeA.type === 'above' && hc >= gradeA.value) return 'A';
    }
    
    if (gradeB.min !== '' && gradeB.max !== '' && gradeB.min !== null && gradeB.max !== null) {
      if (hc >= gradeB.min && hc <= gradeB.max) return 'B';
    }
    
    if (gradeC.min !== '' && gradeC.max !== '' && gradeC.min !== null && gradeC.max !== null) {
      if (hc >= gradeC.min && hc <= gradeC.max) return 'C';
    }
    
    if (gradeD.value !== '' && gradeD.value !== null) {
      if (gradeD.type === 'below' && hc <= gradeD.value) return 'D';
      if (gradeD.type === 'above' && hc >= gradeD.value) return 'D';
    }
    
    return 'C';
  };

  const getMemberHandicap = (member) => {
    if (!member) return { value: 0, type: '', display: '0' };
    
    if (member.golflinkNumber && member.golflinkNumber.trim()) {
      const gaValue = parseFloat(member.gaHandy) || parseFloat(member.handicap) || 0;
      return { value: gaValue, type: 'GA', display: `GA${gaValue}` };
    } else {
      const hhValue = parseFloat(member.handicap) || 0;
      return { value: hhValue, type: 'HH', display: `HH${hhValue}` };
    }
  };

  const getCoursePar = () => {
    if (!booking) return 72;
    const course = courses.find(c => c.name === booking.courseName);
    if (course?.holePars?.male) {
      return course.holePars.male.reduce((a, b) => a + b, 0);
    }
    return 72;
  };

  const calculateLeaderboard = (savedScores, dailyHandicaps, gradeSettings) => {
    const coursePar = getCoursePar();
    
    const results = savedScores.map(score => {
      const member = members.find(m => m.id === score.userId);
      if (!member) return null;
      
      let dailyHandicap = 0;
      let handicapDisplay = '0';
      
      if (dailyHandicaps && dailyHandicaps[member.phone]) {
        dailyHandicap = parseFloat(dailyHandicaps[member.phone]) || 0;
        handicapDisplay = String(dailyHandicap);
      } else {
        const hcData = getMemberHandicap(member);
        dailyHandicap = hcData.value;
        handicapDisplay = hcData.display;
      }
      
      const totalScore = score.totalScore;
      const overUnder = totalScore - coursePar;
      const finalScore = overUnder - dailyHandicap;
      const grade = getGrade(dailyHandicap, gradeSettings);
      
      return {
        nickname: member.nickname || member.name,
        dailyHandicap,
        handicapDisplay,
        totalScore,
        overUnder,
        finalScore,
        grade
      };
    }).filter(r => r !== null);
    
    const gradeA = results.filter(r => r.grade === 'A').sort((a, b) => a.finalScore - b.finalScore);
    const gradeB = results.filter(r => r.grade === 'B').sort((a, b) => a.finalScore - b.finalScore);
    const gradeC = results.filter(r => r.grade === 'C').sort((a, b) => a.finalScore - b.finalScore);
    const gradeD = results.filter(r => r.grade === 'D').sort((a, b) => a.finalScore - b.finalScore);
    
    return { gradeA, gradeB, gradeC, gradeD };
  };

  const handleDeleteAllScores = async () => {
    if (!window.confirm('정말 모든 스코어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setSaving(true);
    
    try {
      await apiService.deleteBookingScores(booking.date, booking.courseName);
      
      alert('모든 스코어가 삭제되었습니다.');
      
      setLeaderboard(null);
      
      const initialScores = {};
      participants.forEach(p => {
        initialScores[p.phone] = '';
      });
      setScores(initialScores);
    } catch (error) {
      console.error('스코어 삭제 실패:', error);
      alert('스코어 삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
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
            memberId: member.id,
            markerId: user.id,
            roundingName: booking.title || '',
            date: new Date(booking.date).toISOString().split('T')[0],
            courseName: booking.courseName,
            totalScore: totalScore,
            coursePar: getCoursePar(),
            holes: []
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

  const hasAdminAccess = user?.role === '관리자' || user?.role === '방장' || user?.role === '운영진' || user?.role === '클럽운영진' || user?.isAdmin;
  
  if (!hasAdminAccess) {
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
          onClick={() => navigate(`/rounding-management?id=${bookingId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-light)',
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
              ◆ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '4px' }}>
              ● 총 {participants.length}명
            </div>
          </div>
        </div>

        {loadingScores && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>결과를 불러오는 중...</div>
          </div>
        )}

        {!loadingScores && !leaderboard && (() => {
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
                  ▪ {team.teamNumber}조
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
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }}>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '700',
                          color: 'var(--primary-green)',
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
              ▪ 참가자별 총 타수 입력
            </h3>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '12px' 
            }}>
              {participants.map((participant, index) => (
                <div key={index} style={{
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--primary-green)',
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

        {!loadingScores && !leaderboard && (
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
            {saving ? '저장 중...' : '■ 저장하기'}
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
              ★ 라운딩 결과
            </h3>

            {leaderboard.gradeA.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--primary-green)',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  ▲ 그레이드 A
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeA.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--text-light)' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.handicapDisplay}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--primary-green)' }}>
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
                  color: 'var(--primary-green)',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  ▲ 그레이드 B
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeB.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--text-light)' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.handicapDisplay}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--primary-green)' }}>
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
                  color: 'var(--primary-green)',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  ▲ 그레이드 C
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeC.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--text-light)' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.handicapDisplay}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--primary-green)' }}>
                            {player.finalScore > 0 ? `+${player.finalScore}` : player.finalScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {leaderboard.gradeD && leaderboard.gradeD.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--primary-green)',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  ▲ 그레이드 D
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>순위</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>이름</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>데일리 핸디</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>총타수</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>오버/언더</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.gradeD.map((player, index) => (
                        <tr key={index} style={{ background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--text-light)' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                            {player.nickname}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.handicapDisplay}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.totalScore}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            {player.overUnder > 0 ? `+${player.overUnder}` : player.overUnder}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--primary-green)' }}>
                            {player.finalScore > 0 ? `+${player.finalScore}` : player.finalScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ntpRecords.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#6399CF',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  🏳️ NTP (Near The Pin)
                </div>
                {(() => {
                  const groupedByHole = ntpRecords.reduce((acc, record) => {
                    if (!acc[record.holeNumber]) {
                      acc[record.holeNumber] = [];
                    }
                    acc[record.holeNumber].push(record);
                    return acc;
                  }, {});

                  return Object.entries(groupedByHole)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([holeNumber, records]) => {
                      const sortedRecords = [...records].sort((a, b) => a.distance - b.distance);
                      return (
                        <div key={holeNumber} style={{ marginBottom: '16px' }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            marginBottom: '8px',
                            paddingLeft: '4px'
                          }}>
                            홀 {holeNumber}
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ 
                              width: '100%', 
                              borderCollapse: 'collapse',
                              fontSize: '13px'
                            }}>
                              <thead>
                                <tr style={{ background: '#f5f5f5' }}>
                                  <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700', width: '60px' }}>순위</th>
                                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>이름</th>
                                  <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '700' }}>거리 (cm)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedRecords.map((record, index) => (
                                  <tr key={record.id} style={{ background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--text-light)' }}>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: index === 0 ? '700' : '400', color: index === 0 ? '#6399CF' : 'inherit' }}>
                                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                                      {record.memberName}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: index === 0 ? '700' : '400', color: index === 0 ? '#6399CF' : 'inherit' }}>
                                      {record.distance}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setLeaderboard(null)}
                className="btn-primary"
                style={{
                  flex: 1,
                  background: '#666',
                  borderColor: '#666'
                }}
              >
                ◀ 다시 입력하기
              </button>
              <button
                onClick={handleDeleteAllScores}
                className="btn-primary"
                style={{
                  flex: 1,
                  background: 'var(--alert-red)',
                  borderColor: 'var(--alert-red)'
                }}
              >
                × 결과 모두 지우기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberScoreEntry;
