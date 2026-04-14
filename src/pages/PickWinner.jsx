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
    const isVotingEnabled = booking.votingEnabled !== false;
    
    if (hasResults) {
      return { phase: 'results', canVote: false };
    } else if (now >= roundingDate) {
      return { phase: 'voting_closed', canVote: false };
    } else if (!isVotingEnabled) {
      return { phase: 'voting_disabled', canVote: false };
    } else {
      return { phase: 'voting', canVote: !hasVoted };
    }
  };

  const getHandicapValue = (member, participant, booking) => {
    const dailyHandicaps = booking?.dailyHandicaps 
      ? (typeof booking.dailyHandicaps === 'string' ? JSON.parse(booking.dailyHandicaps) : booking.dailyHandicaps)
      : {};
    
    const phone = member?.phone || participant?.phone;
    if (phone && dailyHandicaps[phone] != null) {
      const dhValue = dailyHandicaps[phone];
      if (typeof dhValue === 'object' && dhValue.handicap != null) {
        return parseFloat(dhValue.handicap);
      }
      return parseFloat(dhValue);
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

      const rawHandicap = getHandicapValue(member, p, booking);
      const handicap = Math.round(rawHandicap);
      
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
        const cMaxRaw = gradeSettings.gradeC.max;
        const cMax = (cMaxRaw !== '' && cMaxRaw !== null && cMaxRaw !== undefined) ? parseFloat(cMaxRaw) : null;
        if (!isNaN(cMin) && handicap >= cMin && (cMax === null || handicap <= cMax)) {
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

  const getGradeRangeLabel = (grade) => {
    if (!selectedBooking || !selectedBooking.gradeSettings) return '';
    const gs = typeof selectedBooking.gradeSettings === 'string'
      ? (() => { try { return JSON.parse(selectedBooking.gradeSettings); } catch { return null; } })()
      : selectedBooking.gradeSettings;
    if (!gs) return '';
    const fmtBound = (g) => {
      if (!g) return '';
      if (g.value !== '' && g.value !== null && g.value !== undefined) {
        const v = g.value;
        return g.type === 'below' ? `~${v}` : `${v}~`;
      }
      return '';
    };
    const fmtRange = (g) => {
      if (!g) return '';
      const minOk = g.min !== '' && g.min !== null && g.min !== undefined;
      const maxOk = g.max !== '' && g.max !== null && g.max !== undefined;
      if (minOk && maxOk) return `${g.min}-${g.max}`;
      if (minOk) return `${g.min}~`;
      if (maxOk) return `~${g.max}`;
      return '';
    };
    if (grade === 'A') return fmtBound(gs.gradeA);
    if (grade === 'B') return fmtRange(gs.gradeB);
    if (grade === 'C') return fmtRange(gs.gradeC);
    if (grade === 'D') return fmtBound(gs.gradeD);
    return '';
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
    const gradedParticipants = getGradedParticipants(selectedBooking);
    const activeGrades = grades.filter(g => (gradedParticipants[g] || []).length > 0);
    const missingGrades = activeGrades.filter(g => !predictions[g]);

    if (missingGrades.length > 0) {
      alert(`모든 그레이드에서 우승자를 선택해주세요. (누락: ${missingGrades.join(', ')})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch('/api/winner-predictions', {
        method: method,
        headers: { 'Content-Type': 'application/json', 'X-Member-Id': user.id },
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
    const gradedParticipants = getGradedParticipants(selectedBooking);
    const activeGrades = grades.filter(g => (gradedParticipants[g] || []).length > 0);
    const missingGrades = activeGrades.filter(g => !adminPredictions[g]);
    
    if (missingGrades.length > 0) {
      alert(`모든 그레이드에서 우승자를 선택해주세요. (누락: ${missingGrades.join(', ')})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/winner-predictions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Member-Id': user.id },
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
        method: 'DELETE',
        headers: { 'X-Member-Id': user.id }
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
    
    // 먼저 모든 투표자의 점수를 0으로 초기화
    const uniqueVoters = [...new Set(allVotes.map(v => v.voterId))];
    uniqueVoters.forEach(voterId => {
      voterScores[voterId] = 0;
    });
    
    // 맞춘 예측 개수 계산
    allVotes.forEach(v => {
      if (actualWinners[v.grade] === v.predictedWinnerId) {
        voterScores[v.voterId] = (voterScores[v.voterId] || 0) + 1;
      }
    });
    
    // 점수 순으로 정렬하여 모든 참가자 반환
    return Object.entries(voterScores)
      .map(([voterId, score]) => {
        const member = members.find(m => m.id === voterId);
        return {
          voterId,
          name: member?.nickname || member?.name || '알수없음',
          score
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  if (loading) {
    return (
      <>
        <PageHeader title="우승자 맞추기" onBack={() => navigate('/menu')} />
        <div className="page-content" style={{ paddingTop: '12px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            로딩 중...
          </div>
        </div>
      </>
    );
  }

  if (!bookingId) {
    return (
      <>
        <PageHeader title="우승자 맞추기" onBack={() => navigate('/menu')} />
        <div className="page-content" style={{ paddingTop: '12px' }}>

          {/* 안내 카드 */}
          <div style={{ padding: '4px 4px 12px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', marginBottom: 6, letterSpacing: '-0.02em' }}>
              🏆 이번 라운딩의 주인공은 누구?!
            </div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              당신의 예측 본능을 발휘해 보세요! 각 그레이드별 우승할 것 같은 선수를 선택하고 투표하세요. 적중하신 분께는 소정의 상품이 지급됩니다! 🎁
            </div>
          </div>

          {activeBookings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              진행 중인 정기모임이 없습니다
            </div>
          ) : (
            activeBookings.map(booking => {
              const phaseInfo = getPhaseInfo(booking);
              const isVotingEnabled = booking.votingEnabled !== false;
              const participantCount = booking.participants?.length || booking.participantCount || 0;
              const dateObj = new Date(booking.date);
              const dateStr = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
              const phaseColor = {
                voting: { bg: '#D1FAE5', color: '#065F46', label: '투표 중' },
                voting_disabled: { bg: '#F3F4F6', color: '#6B7280', label: '투표 비활성' },
                voting_closed: { bg: '#FEF3C7', color: '#92400E', label: '투표 마감' },
                results: { bg: '#FEF3C7', color: '#92400E', label: '결과 확인' },
              }[phaseInfo.phase] || { bg: '#F3F4F6', color: '#6B7280', label: '-' };

              const handleToggleVoting = async (e) => {
                e.stopPropagation();
                try {
                  await fetch(`/api/bookings/${booking.id}/toggle-voting`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' }
                  });
                } catch (error) {
                  console.error('Failed to toggle voting:', error);
                }
              };

              return (
                <div
                  key={booking.id}
                  onClick={() => navigate(`/games/pick-winner?id=${booking.id}`)}
                  style={{
                    position: 'relative',
                    background: 'linear-gradient(135deg, #0047AB 0%, #1565c0 60%, #1976d2 100%)',
                    borderRadius: 18,
                    boxShadow: '0 4px 20px rgba(0,71,171,0.30)',
                    marginBottom: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  {/* 트로피 SVG 데코레이션 */}
                  <svg style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', opacity: 0.15, pointerEvents: 'none' }} width="130" height="140" viewBox="0 0 130 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* 컵 본체 */}
                    <path d="M35 10 H95 V60 Q95 95 65 105 Q35 95 35 60 Z" stroke="white" strokeWidth="5" strokeLinejoin="round" fill="none"/>
                    {/* 왼쪽 손잡이 */}
                    <path d="M35 20 H18 Q8 20 8 35 Q8 50 22 52 Q28 53 35 50" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none"/>
                    {/* 오른쪽 손잡이 */}
                    <path d="M95 20 H112 Q122 20 122 35 Q122 50 108 52 Q102 53 95 50" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none"/>
                    {/* 기둥 */}
                    <line x1="65" y1="105" x2="65" y2="122" stroke="white" strokeWidth="5" strokeLinecap="round"/>
                    {/* 받침대 */}
                    <rect x="40" y="122" width="50" height="11" rx="5" stroke="white" strokeWidth="5" fill="none"/>
                    {/* 별 장식 */}
                    <line x1="65" y1="32" x2="65" y2="52" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="55" y1="35" x2="75" y2="49" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="75" y1="35" x2="55" y2="49" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>

                  {/* 타이틀 + 상태 */}
                  <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, flex: 1, marginRight: 12 }}>
                      {booking.title || booking.courseName}
                    </div>
                    <div style={{ background: phaseColor.bg, color: phaseColor.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>
                      {phaseColor.label}
                    </div>
                  </div>

                  {/* 라운딩 정보 */}
                  <div style={{ padding: '0 18px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* 날짜 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 1 }}>날짜</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dateStr}</div>
                        </div>
                      </div>

                      {/* 시간 */}
                      {booking.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 1 }}>시간</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{booking.time}</div>
                          </div>
                        </div>
                      )}

                      {/* 장소 */}
                      {booking.courseName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 1 }}>장소</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{booking.courseName}</div>
                          </div>
                        </div>
                      )}

                      {/* 참가자 */}
                      {participantCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 1 }}>참가자</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{participantCount}명</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 관리자 토글 */}
                    {user?.isAdmin && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>투표 활성화</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            disabled={phaseInfo.phase !== 'voting' && phaseInfo.phase !== 'voting_disabled'}
                            style={{ position: 'relative', width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: isVotingEnabled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)', transition: 'background 0.2s' }}
                            onClick={(e) => { e.stopPropagation(); handleToggleVoting(e); }}
                          >
                            <div style={{ position: 'absolute', top: 2, left: isVotingEnabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === booking.id ? null : booking.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: 18, color: 'rgba(255,255,255,0.7)' }}
                          >⋮</button>
                          {openMenuId === booking.id && (
                            <div style={{ position: 'absolute', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 130, right: 16 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate(`/games/pick-winner?id=${booking.id}&admin=true`); }}
                                style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                              >👥 투표 관리</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    );
  }

  if (!selectedBooking) {
    return (
      <>
        <PageHeader title="우승자 맞추기" onBack={() => navigate('/games/pick-winner')} />
        <div className="page-content" style={{ paddingTop: '12px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            라운딩을 찾을 수 없습니다
          </div>
        </div>
      </>
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
      <>
        <PageHeader
          title="투표 관리"
          onBack={() => {
            setIsAdminMode(false);
            setSelectedVoterId(null);
            navigate(`/games/pick-winner?id=${selectedBooking.id}`);
          }}
        />
        <div className="page-content" style={{ paddingTop: '12px' }}>
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
                      {getGradeRangeLabel(grade) && (
                        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>({getGradeRangeLabel(grade)})</span>
                      )}
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
      </>
    );
  }

  if (phaseInfo.phase === 'results') {
    const actualWinners = getActualWinners(selectedBooking);
    const gameWinners = getGameWinners();

    return (
      <>
        <PageHeader
          title="게임 결과"
          onBack={() => navigate('/games/pick-winner')}
        />
        <div className="page-content" style={{ paddingTop: '12px' }}>
        <div style={{ padding: '0 16px' }}>
          {gameWinners.length > 0 && (
            <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎯 예측 순위
              </div>
              {gameWinners.map((w, idx) => (
                <div key={w.voterId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: idx === 0 && w.score > 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : '#f5f5f5',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  color: idx === 0 && w.score > 0 ? 'white' : '#333'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      fontWeight: '700', 
                      fontSize: '16px',
                      width: '24px'
                    }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                    </span>
                    <span style={{ fontWeight: '600' }}>{w.name}</span>
                  </div>
                  <span style={{ 
                    fontWeight: '700',
                    background: idx === 0 && w.score > 0 ? 'rgba(255,255,255,0.3)' : '#e0e0e0',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '13px'
                  }}>
                    {w.score}개 적중
                  </span>
                </div>
              ))}
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
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={selectedBooking.title || selectedBooking.courseName}
        onBack={() => navigate('/games/pick-winner')}
      />
      <div className="page-content" style={{ paddingTop: '12px' }}>
      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: '#E8F0FE',
          borderRadius: '999px',
          marginBottom: '16px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0047AB">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0047AB' }}>
            {new Date(selectedBooking.date).toLocaleDateString('ko-KR')} {selectedBooking.time}
          </span>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            참석자 명단
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            라운딩 그룹별 배정 현황입니다.
          </p>
        </div>

        {hasVoted && !isEditing && (
          <div style={{
            marginBottom: '12px',
            padding: '10px 12px',
            background: '#D1E7DD',
            borderRadius: '8px',
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
            marginBottom: '12px',
            padding: '10px 12px',
            background: '#FFF3CD',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#856404',
            fontWeight: '500'
          }}>
            ✏️ 투표 수정 중입니다. 변경 후 아래 수정하기 버튼을 눌러주세요.
          </div>
        )}
        {phaseInfo.phase === 'voting_closed' && !hasVoted && (
          <div style={{
            marginBottom: '12px',
            padding: '10px 12px',
            background: '#FFF3CD',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#856404',
            fontWeight: '500'
          }}>
            투표가 마감되었습니다.
          </div>
        )}

        {grades.map(grade => {
          const participants = gradedParticipants[grade] || [];
          const voteCounts = getVoteCounts(grade);

          if (participants.length === 0) return null;

          const badgeStyle = {
            A: { bg: '#FEF3C7', color: '#B45309' },
            B: { bg: '#E5E7EB', color: '#4B5563' },
            C: { bg: '#FFE4D6', color: '#C2410C' },
            D: { bg: '#D1FAE5', color: '#047857' }
          }[grade] || { bg: '#E5E7EB', color: '#4B5563' };

          return (
            <div key={grade} style={{
              background: 'white',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: badgeStyle.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  color: badgeStyle.color,
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {grade}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                      그레이드 {grade}
                    </span>
                    {getGradeRangeLabel(grade) && (
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
                        ({getGradeRangeLabel(grade)})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
                    {participants.length}명 참여 중
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {participants.map(p => {
                  const isSelected = predictions[grade] === p.id;
                  const voteCount = voteCounts[p.id] || 0;
                  const isMyVote = myVotes[grade] === p.id;
                  const disabled = (hasVoted && !isEditing) || phaseInfo.phase === 'voting_closed';

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(grade, p.id)}
                      disabled={disabled}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '999px',
                        border: isSelected ? '2px solid #0047AB' : '1px solid #E2E8F0',
                        background: isSelected ? '#EFF4FB' : '#F8FAFC',
                        color: isSelected ? '#0047AB' : '#334155',
                        fontWeight: isSelected || isMyVote ? '700' : '500',
                        cursor: disabled ? 'default' : 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isMyVote && <span style={{ color: '#0047AB' }}>✓</span>}
                      {p.nickname || p.name}
                      {(hasVoted || phaseInfo.phase === 'voting_closed') && voteCount > 0 && (
                        <span style={{
                          background: 'rgba(0,71,171,0.1)',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#0047AB',
                          fontWeight: '600'
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
    </>
  );
}

export default PickWinner;
