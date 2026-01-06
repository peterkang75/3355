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
  const [isEditing, setIsEditing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedVoterId, setSelectedVoterId] = useState(null);
  const [adminPredictions, setAdminPredictions] = useState({});

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
      const editMode = searchParams.get('edit') === 'true';
      const adminMode = searchParams.get('admin') === 'true';
      if (editMode) {
        setIsEditing(true);
      }
      if (adminMode && user?.isAdmin) {
        setIsAdminMode(true);
      }
    }
    setLoading(false);
  }, [bookingId, bookings, searchParams, user]);

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
          const editMode = searchParams.get('edit') === 'true';
          if (editMode) {
            setPredictions(votesMap);
          }
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
    if (hasVoted && !isEditing) return;
    setPredictions(prev => ({
      ...prev,
      [grade]: prev[grade] === memberId ? null : memberId
    }));
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setPredictions({ ...myVotes });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPredictions({ ...myVotes });
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
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch('/api/winner-predictions', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundingId: selectedBooking.id,
          voterId: user.id,
          predictions: predictions
        })
      });

      if (response.ok) {
        setHasVoted(true);
        setIsEditing(false);
        setMyVotes(predictions);
        await loadPredictions(selectedBooking.id);
        alert(isEditing ? '투표가 수정되었습니다!' : '투표가 완료되었습니다!');
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

  const getVotersList = () => {
    const voterIds = [...new Set(allVotes.map(v => v.voterId))];
    return voterIds.map(voterId => {
      const member = members.find(m => m.id === voterId);
      const votes = allVotes.filter(v => v.voterId === voterId);
      return {
        voterId,
        name: member?.nickname || member?.name || '알수없음',
        votes
      };
    });
  };

  const handleAdminSelectVoter = (voterId) => {
    setSelectedVoterId(voterId);
    const voterVotes = allVotes.filter(v => v.voterId === voterId);
    const votesMap = {};
    voterVotes.forEach(v => {
      votesMap[v.grade] = v.predictedWinnerId;
    });
    setAdminPredictions(votesMap);
  };

  const handleAdminSelect = (grade, memberId) => {
    setAdminPredictions(prev => ({
      ...prev,
      [grade]: prev[grade] === memberId ? null : memberId
    }));
  };

  const handleAdminUpdate = async () => {
    const grades = ['A', 'B', 'C', 'D'];
    const missingGrades = grades.filter(g => !adminPredictions[g]);
    
    if (missingGrades.length > 0) {
      alert(`모든 그레이드에서 우승자를 선택해주세요. (누락: ${missingGrades.join(', ')})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/winner-predictions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundingId: selectedBooking.id,
          voterId: selectedVoterId,
          predictions: adminPredictions
        })
      });

      if (response.ok) {
        await loadPredictions(selectedBooking.id);
        setSelectedVoterId(null);
        setAdminPredictions({});
        alert('투표가 수정되었습니다!');
      } else {
        const error = await response.text();
        alert(`수정 실패: ${error}`);
      }
    } catch (error) {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDelete = async (voterId) => {
    if (!confirm('해당 회원의 투표를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/winner-predictions/${selectedBooking.id}/${voterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadPredictions(selectedBooking.id);
        setSelectedVoterId(null);
        setAdminPredictions({});
        alert('투표가 삭제되었습니다.');
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
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
              const userVotedForThis = allVotes.some(v => v.roundingId === booking.id && v.voterId === user?.id);
              return (
                <div
                  key={booking.id}
                  className="card"
                  style={{ marginBottom: '12px', padding: '16px', position: 'relative' }}
                >
                  <div 
                    onClick={() => navigate(`/games/pick-winner?id=${booking.id}`)}
                    style={{ cursor: 'pointer' }}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  </div>
                  
                  {phaseInfo.phase === 'voting' && user?.isAdmin && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === booking.id ? null : booking.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '16px',
                          color: '#666'
                        }}
                      >
                        ⋮
                      </button>
                      {openMenuId === booking.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 100,
                          minWidth: '120px'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              navigate(`/games/pick-winner?id=${booking.id}&admin=true`);
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '12px 16px',
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            👥 투표 관리
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

  if (isAdminMode && user?.isAdmin) {
    const votersList = getVotersList();
    
    return (
      <div className="page-content">
        <PageHeader 
          title="투표 관리" 
          onBack={() => {
            setIsAdminMode(false);
            setSelectedVoterId(null);
            navigate(`/games/pick-winner?id=${selectedBooking.id}`);
          }} 
        />
        
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: '16px', padding: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {selectedBooking.title || selectedBooking.courseName}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              총 {votersList.length}명 투표
            </div>
          </div>

          {!selectedVoterId ? (
            <>
              {votersList.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  아직 투표한 회원이 없습니다
                </div>
              ) : (
                votersList.map(voter => (
                  <div
                    key={voter.voterId}
                    className="card"
                    style={{ marginBottom: '8px', padding: '12px', cursor: 'pointer' }}
                    onClick={() => handleAdminSelectVoter(voter.voterId)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '500' }}>{voter.name}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {grades.map(g => {
                          const vote = voter.votes.find(v => v.grade === g);
                          const predicted = vote ? members.find(m => m.id === vote.predictedWinnerId) : null;
                          return (
                            <div
                              key={g}
                              style={{
                                background: gradeColors[g],
                                color: g === 'A' ? '#333' : 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}
                              title={predicted?.nickname || predicted?.name || '-'}
                            >
                              {g}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '16px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600' }}>
                    {members.find(m => m.id === selectedVoterId)?.nickname || 
                     members.find(m => m.id === selectedVoterId)?.name || '알수없음'}의 투표
                  </div>
                  <button
                    onClick={() => handleAdminDelete(selectedVoterId)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {grades.map(grade => {
                const participants = gradedParticipants[grade] || [];
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
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {participants.map(p => {
                        const isSelected = adminPredictions[grade] === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleAdminSelect(grade, p.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '20px',
                              border: isSelected ? '2px solid var(--primary-green)' : '1px solid #ddd',
                              background: isSelected ? 'var(--bg-green)' : 'white',
                              color: isSelected ? 'var(--primary-green)' : '#333',
                              fontWeight: isSelected ? '600' : '400',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            {p.nickname || p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  onClick={() => {
                    setSelectedVoterId(null);
                    setAdminPredictions({});
                  }}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: 'white',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleAdminUpdate}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: isSubmitting ? '#ccc' : 'var(--primary-green)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
          {hasVoted && !isEditing && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#D1E7DD',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0A5C36',
              fontWeight: '500',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>✓ 투표 완료!</span>
              {phaseInfo.phase === 'voting' && (
                <button
                  onClick={handleStartEdit}
                  style={{
                    background: 'white',
                    color: '#0A5C36',
                    border: '1px solid #0A5C36',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  다시 투표하기
                </button>
              )}
            </div>
          )}
          {isEditing && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#FFF3CD',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#856404',
              fontWeight: '500'
            }}>
              ✏️ 투표 수정 중입니다. 변경 후 아래 수정하기 버튼을 눌러주세요.
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
                      disabled={(hasVoted && !isEditing) || phaseInfo.phase === 'voting_closed'}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid var(--primary-green)' : '1px solid #ddd',
                        background: isSelected ? 'var(--bg-green)' : 'white',
                        color: isSelected ? 'var(--primary-green)' : '#333',
                        fontWeight: isSelected || isMyVote ? '600' : '400',
                        cursor: (hasVoted && !isEditing) || phaseInfo.phase === 'voting_closed' ? 'default' : 'pointer',
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

        {(phaseInfo.canVote || isEditing) && (
          <div style={{ marginBottom: '20px' }}>
            {isEditing && (
              <button
                onClick={handleCancelEdit}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'white',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
              >
                취소
              </button>
            )}
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
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? '제출 중...' : (isEditing ? '수정하기' : '투표하기')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PickWinner;
