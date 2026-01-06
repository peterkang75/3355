import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/common/PageHeader';
import apiService from '../services/api';

function PickWinner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { user, bookings, members } = useApp();
  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [myVotes, setMyVotes] = useState({});
  const [allVotes, setAllVotes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      if (b.type !== '정기모임') return false;
      if (!b.isAnnounced) return false;
      const roundingDate = new Date(b.date);
      const dayAfter = new Date(roundingDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      return now < dayAfter;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings]);

  useEffect(() => {
    if (bookingId) {
      const booking = bookings.find(b => b.id === bookingId);
      setSelectedBooking(booking);
      if (booking) {
        loadPredictions(bookingId);
      }
    }
    setLoading(false);
  }, [bookingId, bookings]);

  const loadPredictions = async (roundingId) => {
    try {
      const response = await fetch(`/api/winner-predictions/${roundingId}`);
      if (response.ok) {
        const data = await response.json();
        setAllVotes(data.predictions || []);
        
        const userVotes = (data.predictions || []).filter(p => p.voterId === user?.id);
        if (userVotes.length > 0) {
          setHasVoted(true);
          const votesMap = {};
          userVotes.forEach(v => {
            votesMap[v.grade] = v.predictedWinnerId;
          });
          setMyVotes(votesMap);
          setPredictions(votesMap);
        }
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const getPhaseInfo = (booking) => {
    if (!booking) return { phase: 'none', canVote: false };
    
    const now = new Date();
    const roundingDate = new Date(booking.date);
    const [hours, minutes] = (booking.time || '00:00').split(':').map(Number);
    roundingDate.setHours(hours, minutes, 0, 0);
    
    const hasResults = booking.dailyHandicaps && Object.keys(booking.dailyHandicaps).length > 0;
    
    if (hasResults) {
      return { phase: 'results', canVote: false };
    } else if (now >= roundingDate) {
      return { phase: 'voting_closed', canVote: false };
    } else {
      return { phase: 'voting', canVote: !hasVoted };
    }
  };

  const getHandicapValue = (member, participant, booking) => {
    const dailyHandicaps = booking?.dailyHandicaps 
      ? (typeof booking.dailyHandicaps === 'string' ? JSON.parse(booking.dailyHandicaps) : booking.dailyHandicaps)
      : {};
    
    if (member?.id && dailyHandicaps[member.id]?.handicap != null) {
      return parseFloat(dailyHandicaps[member.id].handicap);
    }
    
    if (member?.gaHandy) return parseFloat(member.gaHandy);
    if (member?.houseHandy) return parseFloat(member.houseHandy);
    if (member?.handicap) return parseFloat(member.handicap);
    
    if (participant?.gaHandy) return parseFloat(participant.gaHandy);
    if (participant?.houseHandy) return parseFloat(participant.houseHandy);
    if (participant?.handicap) return parseFloat(participant.handicap);
    
    return 36;
  };

  const getGradedParticipants = (booking) => {
    if (!booking || !booking.gradeSettings) return {};
    
    const gradeSettings = typeof booking.gradeSettings === 'string' 
      ? JSON.parse(booking.gradeSettings) 
      : booking.gradeSettings;
    
    let participants = (booking.participants || []).map(p => {
      const parsed = typeof p === 'string' ? JSON.parse(p) : p;
      return parsed;
    });

    if (booking.useSquadWaitlist) {
      const sortedParticipants = [...participants].sort((a, b) => {
        const dateA = a.joinedAt ? new Date(a.joinedAt) : new Date(0);
        const dateB = b.joinedAt ? new Date(b.joinedAt) : new Date(0);
        return dateA - dateB;
      });
      const cutoff = Math.floor(sortedParticipants.length / 4) * 4;
      participants = sortedParticipants.slice(0, cutoff);
    }

    const graded = { A: [], B: [], C: [], D: [] };

    participants.forEach(p => {
      if (p.isGuest) return;
      
      const member = members.find(m => m.phone === p.phone);
      if (!member) return;

      const handicap = getHandicapValue(member, p, booking);
      
      let grade = 'D';
      
      if (gradeSettings.gradeA) {
        const aValue = parseFloat(gradeSettings.gradeA.value);
        if (!isNaN(aValue)) {
          if (gradeSettings.gradeA.type === 'below' && handicap <= aValue) {
            grade = 'A';
          } else if (gradeSettings.gradeA.type === 'above' && handicap >= aValue) {
            grade = 'A';
          }
        }
      }
      
      if (grade === 'D' && gradeSettings.gradeB) {
        const bMin = parseFloat(gradeSettings.gradeB.min);
        const bMax = parseFloat(gradeSettings.gradeB.max);
        if (!isNaN(bMin) && !isNaN(bMax) && handicap >= bMin && handicap <= bMax) {
          grade = 'B';
        }
      }
      
      if (grade === 'D' && gradeSettings.gradeC) {
        const cMin = parseFloat(gradeSettings.gradeC.min);
        const cMax = parseFloat(gradeSettings.gradeC.max);
        if (!isNaN(cMin) && !isNaN(cMax) && handicap >= cMin && handicap <= cMax) {
          grade = 'C';
        }
      }
      
      if (grade === 'D' && gradeSettings.gradeD) {
        const dValue = parseFloat(gradeSettings.gradeD.value);
        if (!isNaN(dValue)) {
          if (gradeSettings.gradeD.type === 'above' && handicap >= dValue) {
            grade = 'D';
          }
        }
      }

      graded[grade].push({
        ...member,
        handicap: handicap
      });
    });

    Object.keys(graded).forEach(g => {
      graded[g].sort((a, b) => a.handicap - b.handicap);
    });

    return graded;
  };

  const getVoteCounts = (grade) => {
    const counts = {};
    allVotes.filter(v => v.grade === grade).forEach(v => {
      counts[v.predictedWinnerId] = (counts[v.predictedWinnerId] || 0) + 1;
    });
    return counts;
  };

  const handleSelect = (grade, memberId) => {
    if (hasVoted) return;
    setPredictions(prev => ({
      ...prev,
      [grade]: prev[grade] === memberId ? null : memberId
    }));
  };

  const handleSubmit = async () => {
    const grades = ['A', 'B', 'C', 'D'];
    const missingGrades = grades.filter(g => !predictions[g]);
    
    if (missingGrades.length > 0) {
      alert(`모든 그레이드에서 우승자를 선택해주세요. (누락: ${missingGrades.join(', ')})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/winner-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundingId: selectedBooking.id,
          voterId: user.id,
          predictions: predictions
        })
      });

      if (response.ok) {
        setHasVoted(true);
        setMyVotes(predictions);
        await loadPredictions(selectedBooking.id);
        alert('투표가 완료되었습니다!');
      } else {
        const error = await response.text();
        alert(`투표 실패: ${error}`);
      }
    } catch (error) {
      alert('투표 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActualWinners = (booking) => {
    if (!booking?.dailyHandicaps) return {};
    
    const dailyHandicaps = typeof booking.dailyHandicaps === 'string'
      ? JSON.parse(booking.dailyHandicaps)
      : booking.dailyHandicaps;
    
    const winners = {};
    Object.entries(dailyHandicaps).forEach(([memberId, data]) => {
      if (data.rank === 1 && data.grade) {
        winners[data.grade] = memberId;
      }
    });
    return winners;
  };

  const getCorrectPickers = (grade, winnerId) => {
    return allVotes
      .filter(v => v.grade === grade && v.predictedWinnerId === winnerId)
      .map(v => {
        const voter = members.find(m => m.id === v.voterId);
        return voter?.nickname || voter?.name || '알수없음';
      });
  };

  const getGameWinners = () => {
    const actualWinners = getActualWinners(selectedBooking);
    const voterScores = {};
    
    allVotes.forEach(v => {
      if (actualWinners[v.grade] === v.predictedWinnerId) {
        voterScores[v.voterId] = (voterScores[v.voterId] || 0) + 1;
      }
    });
    
    const maxScore = Math.max(...Object.values(voterScores), 0);
    if (maxScore === 0) return [];
    
    return Object.entries(voterScores)
      .filter(([_, score]) => score === maxScore)
      .map(([voterId, score]) => {
        const member = members.find(m => m.id === voterId);
        return {
          name: member?.nickname || member?.name || '알수없음',
          score
        };
      });
  };

  if (loading) {
    return (
      <div className="page-content">
        <PageHeader title="우승자 맞추기" onBack={() => navigate('/menu')} />
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="page-content">
        <PageHeader title="우승자 맞추기" onBack={() => navigate('/menu')} />
        
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              🏆 라운딩 우승자를 예측해보세요!
            </div>
            <div style={{ fontSize: '13px', color: '#888' }}>
              각 그레이드별로 우승할 것 같은 선수를 선택하고 투표하세요.
            </div>
          </div>

          {activeBookings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              진행 중인 정기모임이 없습니다
            </div>
          ) : (
            activeBookings.map(booking => {
              const phaseInfo = getPhaseInfo(booking);
              return (
                <div
                  key={booking.id}
                  className="card"
                  onClick={() => navigate(`/games/pick-winner?id=${booking.id}`)}
                  style={{ cursor: 'pointer', marginBottom: '12px', padding: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {booking.title || booking.courseName}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: phaseInfo.phase === 'voting' ? '#D1E7DD' : 
                                  phaseInfo.phase === 'results' ? '#FFE5B4' : '#f0f0f0',
                      color: phaseInfo.phase === 'voting' ? '#0A5C36' : 
                             phaseInfo.phase === 'results' ? '#8B6914' : '#666'
                    }}>
                      {phaseInfo.phase === 'voting' ? '투표 중' : 
                       phaseInfo.phase === 'results' ? '결과 확인' : '투표 마감'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (!selectedBooking) {
    return (
      <div className="page-content">
        <PageHeader title="우승자 맞추기" onBack={() => navigate('/games/pick-winner')} />
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          라운딩을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const phaseInfo = getPhaseInfo(selectedBooking);
  const gradedParticipants = getGradedParticipants(selectedBooking);
  const grades = ['A', 'B', 'C', 'D'];
  const gradeColors = {
    A: '#FFD700',
    B: '#C0C0C0',
    C: '#CD7F32',
    D: '#4A9D6A'
  };

  if (phaseInfo.phase === 'results') {
    const actualWinners = getActualWinners(selectedBooking);
    const gameWinners = getGameWinners();

    return (
      <div className="page-content">
        <PageHeader 
          title="게임 결과" 
          onBack={() => navigate('/games/pick-winner')} 
        />
        
        <div style={{ padding: '0 16px' }}>
          {gameWinners.length > 0 && (
            <div className="card" style={{ 
              marginBottom: '16px', 
              padding: '20px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>게임 우승자</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {gameWinners.map(w => w.name).join(', ')}
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                {gameWinners[0]?.score}개 적중!
              </div>
            </div>
          )}

          {grades.map(grade => {
            const winnerId = actualWinners[grade];
            const winner = members.find(m => m.id === winnerId);
            const correctPickers = winnerId ? getCorrectPickers(grade, winnerId) : [];

            return (
              <div key={grade} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: gradeColors[grade],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: grade === 'A' ? '#333' : 'white',
                    fontSize: '14px'
                  }}>
                    {grade}
                  </div>
                  <span style={{ fontWeight: '600' }}>그레이드 {grade} 우승자</span>
                </div>

                {winner ? (
                  <>
                    <div style={{
                      padding: '12px',
                      background: '#D1E7DD',
                      borderRadius: '8px',
                      fontWeight: '600',
                      color: '#0A5C36',
                      marginBottom: '8px'
                    }}>
                      🏆 {winner.nickname || winner.name}
                    </div>
                    {correctPickers.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        <span style={{ fontWeight: '500' }}>정답자:</span> {correctPickers.join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: '#888', fontSize: '14px' }}>
                    아직 결과가 없습니다
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader 
        title={selectedBooking.title || selectedBooking.courseName}
        onBack={() => navigate('/games/pick-winner')} 
      />
      
      <div style={{ padding: '0 16px' }}>
        <div className="card" style={{ marginBottom: '16px', padding: '12px' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>
            📅 {new Date(selectedBooking.date).toLocaleDateString('ko-KR')} {selectedBooking.time}
          </div>
          {hasVoted && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#D1E7DD',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0A5C36',
              fontWeight: '500'
            }}>
              ✓ 투표 완료! 아래에서 현재 투표 현황을 확인하세요.
            </div>
          )}
          {phaseInfo.phase === 'voting_closed' && !hasVoted && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#FFF3CD',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#856404',
              fontWeight: '500'
            }}>
              투표가 마감되었습니다.
            </div>
          )}
        </div>

        {grades.map(grade => {
          const participants = gradedParticipants[grade] || [];
          const voteCounts = getVoteCounts(grade);
          
          if (participants.length === 0) return null;

          return (
            <div key={grade} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: gradeColors[grade],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  color: grade === 'A' ? '#333' : 'white',
                  fontSize: '14px'
                }}>
                  {grade}
                </div>
                <span style={{ fontWeight: '600' }}>그레이드 {grade}</span>
                <span style={{ fontSize: '12px', color: '#888' }}>({participants.length}명)</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {participants.map(p => {
                  const isSelected = predictions[grade] === p.id;
                  const voteCount = voteCounts[p.id] || 0;
                  const isMyVote = myVotes[grade] === p.id;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(grade, p.id)}
                      disabled={hasVoted || phaseInfo.phase === 'voting_closed'}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid var(--primary-green)' : '1px solid #ddd',
                        background: isSelected ? 'var(--bg-green)' : 'white',
                        color: isSelected ? 'var(--primary-green)' : '#333',
                        fontWeight: isSelected || isMyVote ? '600' : '400',
                        cursor: hasVoted || phaseInfo.phase === 'voting_closed' ? 'default' : 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isMyVote && <span style={{ color: 'var(--primary-green)' }}>✓</span>}
                      {p.nickname || p.name}
                      {(hasVoted || phaseInfo.phase === 'voting_closed') && voteCount > 0 && (
                        <span style={{
                          background: '#f0f0f0',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#666'
                        }}>
                          {voteCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {phaseInfo.canVote && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '16px',
              background: isSubmitting ? '#ccc' : 'var(--primary-green)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {isSubmitting ? '제출 중...' : '투표하기'}
          </button>
        )}
      </div>
    </div>
  );
}

export default PickWinner;
