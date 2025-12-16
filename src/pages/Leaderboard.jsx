import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Leaderboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const autoSelectUserId = searchParams.get('userId');
  const openScorecard = searchParams.get('openScorecard') === 'true';
  const { bookings, members, courses } = useApp();
  
  const [booking, setBooking] = useState(null);
  const [scores, setScores] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedScore, setSelectedScore] = useState(null);
  const [coursePars, setCoursePars] = useState([]);
  const [autoSelectApplied, setAutoSelectApplied] = useState(false);
  const [bookingGradeSettings, setBookingGradeSettings] = useState(null);
  const [gameMode, setGameMode] = useState('stroke');
  const [foursomeTeams, setFoursomeTeams] = useState([]);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      if (foundBooking) {
        fetchScores(foundBooking);
      }
    }
  }, [bookingId, bookings]);

  useEffect(() => {
    if (!booking) return;
    const interval = setInterval(() => {
      fetchScores(booking, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [booking]);

  const fetchScores = async (booking, silent = false) => {
    try {
      if (!silent) setLoading(true);
      let bookingScores = [];
      const res = await fetch(`/api/scores/by-rounding/${encodeURIComponent(booking.title)}`);
      if (res.ok) {
        bookingScores = await res.json();
      }

      const dailyHandicaps = booking.dailyHandicaps 
        ? (typeof booking.dailyHandicaps === 'string' ? JSON.parse(booking.dailyHandicaps) : booking.dailyHandicaps)
        : {};
      
      const gradeSettings = booking.gradeSettings
        ? (typeof booking.gradeSettings === 'string' ? JSON.parse(booking.gradeSettings) : booking.gradeSettings)
        : null;
      
      setBookingGradeSettings(gradeSettings);
      
      // 게임 모드 파싱
      const detectedGameMode = gradeSettings?.mode || 'stroke';
      setGameMode(detectedGameMode);

      const course = courses.find(c => c.name === booking.courseName);
      const holePars = course?.holePars?.male || Array(18).fill(4);
      setCoursePars(holePars);
      const calculatedCoursePar = holePars.reduce((a, b) => a + b, 0) || 72;

      const processedScores = bookingScores.map(score => {
        const member = score.user || members.find(m => m.id === score.userId || m.phone === score.userId);
        const nickname = member?.nickname || member?.name || score.userId;
        const handicap = dailyHandicaps[score.userId] || member?.handicap || 0;
        
        let grade = 'ALL';
        if (gradeSettings) {
          const hcp = Number(handicap) || 0;
          const gradeA = gradeSettings.gradeA || { type: 'below', value: '' };
          const gradeB = gradeSettings.gradeB || { min: '', max: '' };
          const gradeC = gradeSettings.gradeC || { min: '', max: '' };
          const gradeD = gradeSettings.gradeD || { type: 'above', value: '' };
          
          if (gradeA.value !== '' && gradeA.value !== null) {
            if ((gradeA.type === 'below' && hcp <= gradeA.value) || 
                (gradeA.type === 'above' && hcp >= gradeA.value)) {
              grade = 'A';
            }
          }
          if (grade === 'ALL' && gradeB.min !== '' && gradeB.max !== '' && gradeB.min !== null && gradeB.max !== null) {
            if (hcp >= gradeB.min && hcp <= gradeB.max) grade = 'B';
          }
          if (grade === 'ALL' && gradeC.min !== '' && gradeC.max !== '' && gradeC.min !== null && gradeC.max !== null) {
            if (hcp >= gradeC.min && hcp <= gradeC.max) grade = 'C';
          }
          if (grade === 'ALL' && gradeD.value !== '' && gradeD.value !== null) {
            if ((gradeD.type === 'below' && hcp <= gradeD.value) || 
                (gradeD.type === 'above' && hcp >= gradeD.value)) {
              grade = 'D';
            }
          }
        }

        const holesArray = typeof score.holes === 'string' ? JSON.parse(score.holes) : score.holes;
        const completedHoles = holesArray?.filter(h => h > 0).length || 0;
        const thru = completedHoles === 18 ? 'F' : completedHoles.toString();
        
        // 플레이한 홀의 점수 합계와 해당 홀의 파 합계 계산
        let currentTotalScore = 0;
        let playedPar = 0;
        if (holesArray && holesArray.length > 0) {
          holesArray.forEach((holeScore, idx) => {
            if (holeScore > 0) {
              currentTotalScore += holeScore;
              playedPar += (holePars[idx] || 4);
            }
          });
        }
        
        const totalScore = currentTotalScore || (score.totalScore || 0);
        const overUnder = totalScore - playedPar;
        
        const outScore = holesArray?.slice(0, 9).reduce((a, b) => a + b, 0) || 0;
        const inScore = holesArray?.slice(9, 18).reduce((a, b) => a + b, 0) || 0;

        return {
          odId: score.userId,
          nickname,
          handicap,
          grade,
          thru,
          totalScore,
          overUnder,
          completedHoles,
          holes: holesArray || [],
          outScore,
          inScore,
          playedPar
        };
      });

      processedScores.sort((a, b) => {
        if (a.completedHoles === 0 && b.completedHoles === 0) return 0;
        if (a.completedHoles === 0) return 1;
        if (b.completedHoles === 0) return -1;
        return a.overUnder - b.overUnder;
      });

      setScores(processedScores);
      
      // 포썸 모드 팀 랭킹 계산
      if (detectedGameMode === 'foursome' && booking.teams) {
        const teamsData = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
        const teamPairs = [];
        
        teamsData.forEach((team, teamIdx) => {
          if (!team.members || team.members.length < 4) return;
          
          // Pair A: slots 0, 1 - 팀 핸디캡 포함
          const pairA = {
            teamNumber: team.teamNumber,
            pairLabel: 'A',
            members: [team.members[0], team.members[1]].filter(Boolean),
            teamHandicap: team.pairAHandicap || null,
            score: null,
            netScore: null,
            overUnder: null,
            coursePar: calculatedCoursePar
          };
          
          // Pair B: slots 2, 3 - 팀 핸디캡 포함
          const pairB = {
            teamNumber: team.teamNumber,
            pairLabel: 'B',
            members: [team.members[2], team.members[3]].filter(Boolean),
            teamHandicap: team.pairBHandicap || null,
            score: null,
            netScore: null,
            overUnder: null,
            coursePar: calculatedCoursePar
          };
          
          // 각 페어의 점수 찾기 (어느 멤버든 점수가 있으면 사용)
          [pairA, pairB].forEach(pair => {
            for (const member of pair.members) {
              if (!member) continue;
              const memberScore = processedScores.find(s => {
                const memberObj = members.find(m => m.phone === member.phone);
                return s.odId === memberObj?.id || s.odId === member.phone;
              });
              if (memberScore && memberScore.totalScore > 0) {
                pair.score = memberScore.totalScore;
                pair.overUnder = memberScore.overUnder;
                pair.playedPar = memberScore.playedPar;
                pair.outScore = memberScore.outScore;
                pair.inScore = memberScore.inScore;
                // Net Score 계산: Gross Score - Team Handicap
                if (pair.teamHandicap != null) {
                  pair.netScore = parseFloat((memberScore.totalScore - pair.teamHandicap).toFixed(1));
                } else {
                  pair.netScore = memberScore.totalScore;
                }
                break;
              }
            }
            
            // 멤버 이름 보강
            pair.memberNames = pair.members.map(m => {
              if (!m) return '미정';
              const fullMember = members.find(fm => fm.phone === m.phone);
              return fullMember?.nickname || fullMember?.name || m.nickname || m.name || '미정';
            }).join(' & ');
          });
          
          teamPairs.push(pairA, pairB);
        });
        
        // Net Score 기준 정렬 (낮을수록 좋음)
        teamPairs.sort((a, b) => {
          if (a.netScore === null && b.netScore === null) return 0;
          if (a.netScore === null) return 1;
          if (b.netScore === null) return -1;
          return a.netScore - b.netScore;
        });
        
        setFoursomeTeams(teamPairs);
      } else {
        setFoursomeTeams([]);
      }
      
      if (autoSelectUserId && openScorecard && !autoSelectApplied) {
        const userScore = processedScores.find(s => s.odId === autoSelectUserId);
        if (userScore) {
          setSelectedScore(userScore);
          setAutoSelectApplied(true);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('openScorecard');
          setSearchParams(newParams, { replace: true });
        }
      }
    } catch (error) {
      console.error('스코어 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = filter === 'ALL' 
    ? scores 
    : scores.filter(s => s.grade === filter.replace('Grade ', ''));

  const getAvailableGradeFilters = () => {
    const filters = ['ALL'];
    if (!bookingGradeSettings) return filters;
    
    const gradeA = bookingGradeSettings.gradeA || { type: 'below', value: '' };
    const gradeB = bookingGradeSettings.gradeB || { min: '', max: '' };
    const gradeC = bookingGradeSettings.gradeC || { min: '', max: '' };
    const gradeD = bookingGradeSettings.gradeD || { type: 'above', value: '' };
    
    if (gradeA.value !== '' && gradeA.value !== null) {
      filters.push('Grade A');
    }
    if (gradeB.min !== '' && gradeB.max !== '' && gradeB.min !== null && gradeB.max !== null) {
      filters.push('Grade B');
    }
    if (gradeC.min !== '' && gradeC.max !== '' && gradeC.min !== null && gradeC.max !== null) {
      filters.push('Grade C');
    }
    if (gradeD.value !== '' && gradeD.value !== null) {
      filters.push('Grade D');
    }
    
    return filters;
  };
  
  const gradeFilters = getAvailableGradeFilters();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a2e', padding: '16px' }}>
        <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', paddingBottom: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'transparent', 
            color: 'white', 
            border: 'none', 
            fontSize: '16px',
            cursor: 'pointer',
            padding: '8px 0'
          }}
        >
          ‹ Back
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: booking?.title || 'Leaderboard',
                text: `${booking?.title} 리더보드`,
                url: window.location.href
              });
            }
          }}
          style={{
            background: 'transparent',
            color: 'white',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '8px 0'
          }}
        >
          Share ➚
        </button>
      </div>

      <div style={{ 
        textAlign: 'center', 
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '10px'
        }}>
          <h1 style={{ 
            color: 'white', 
            fontSize: '18px', 
            fontWeight: '700',
            margin: 0
          }}>
            {booking?.title || 'LEADERBOARD'}
          </h1>
          <button style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            ⋯
          </button>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '8px' }}>
          {booking?.type || 'Stableford'}
        </div>
      </div>

      {/* 포썸 모드: 팀 랭킹 표시 */}
      {gameMode === 'foursome' ? (
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏆</div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>
              포썸 팀 랭킹
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px' }}>
              2인 1팀 대결
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 32px 32px 44px 40px 44px',
            gap: '4px',
            padding: '12px 4px',
            borderBottom: '2px solid rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            <div>순위</div>
            <div>팀원</div>
            <div style={{ textAlign: 'center' }}>OUT</div>
            <div style={{ textAlign: 'center' }}>IN</div>
            <div style={{ textAlign: 'center' }}>총타</div>
            <div style={{ textAlign: 'center' }}>핸디</div>
            <div style={{ textAlign: 'center' }}>NET</div>
          </div>

          {foursomeTeams.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: 'rgba(255,255,255,0.5)', 
              padding: '40px 0' 
            }}>
              아직 스코어가 없습니다
            </div>
          ) : (
            foursomeTeams.map((team, index) => (
              <div
                key={`${team.teamNumber}-${team.pairLabel}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 32px 32px 44px 40px 44px',
                  gap: '4px',
                  padding: '12px 4px',
                  background: index === 0 && team.netScore != null
                    ? 'linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.05) 100%)' 
                    : index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  borderLeft: index === 0 && team.netScore != null ? '3px solid #FFD700' : 'none'
                }}
              >
                <div style={{ 
                  color: index === 0 && team.netScore != null ? '#FFD700' : 'white', 
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  {index === 0 && team.netScore != null && <span>🥇</span>}
                  {index === 1 && team.netScore != null && <span style={{ opacity: 0.8 }}>🥈</span>}
                  {index === 2 && team.netScore != null && <span style={{ opacity: 0.6 }}>🥉</span>}
                  {(index > 2 || team.netScore == null) && <span>{index + 1}</span>}
                </div>
                <div>
                  <div style={{ 
                    color: 'white', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <span>{team.memberNames || '미정'}</span>
                    <span style={{ 
                      fontSize: '10px', 
                      color: team.pairLabel === 'A' ? '#3B82F6' : '#EF4444',
                      fontWeight: '600'
                    }}>
                      {team.teamNumber}조 {team.pairLabel}팀
                    </span>
                  </div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '11px'
                }}>
                  {team.outScore || '-'}
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '11px'
                }}>
                  {team.inScore || '-'}
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {team.score || '-'}
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  color: '#60a5fa',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {team.teamHandicap != null ? team.teamHandicap : '-'}
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  color: '#fbbf24',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {team.netScore != null ? team.netScore : '-'}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* 스트로크 모드: 기존 그레이드 탭 표시 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '4px', 
            padding: '12px 8px'
          }}>
            {gradeFilters.map(g => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                style={{
                  flex: '1',
                  maxWidth: '70px',
                  padding: '8px 4px',
                  borderRadius: '4px',
                  border: filter === g ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                  background: filter === g ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: filter === g ? '600' : '400',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 40px 36px 36px 60px 44px',
              gap: '4px',
              padding: '12px 4px',
              borderBottom: '2px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              <div>순위</div>
              <div>대화명</div>
              <div style={{ textAlign: 'center' }}>핸디</div>
              <div style={{ textAlign: 'center' }}>OUT</div>
              <div style={{ textAlign: 'center' }}>IN</div>
              <div style={{ textAlign: 'center' }}>총타수</div>
              <div style={{ textAlign: 'center' }}>+-</div>
            </div>

            {filteredScores.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255,255,255,0.5)', 
                padding: '40px 0' 
              }}>
                아직 스코어가 없습니다
              </div>
            ) : (
              filteredScores.map((score, index) => {
                const rankIcon = index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '';
                const isTopRank = index < 3;
                
                return (
                <div
                  key={`${score.odId}-${index}`}
                  onClick={() => setSelectedScore(score)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 40px 36px 36px 60px 44px',
                    gap: '4px',
                    padding: '12px 4px',
                    background: index === 0 
                      ? 'linear-gradient(90deg, rgba(255,215,0,0.25) 0%, rgba(255,215,0,0.05) 100%)'
                      : index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderLeft: index === 0 ? '3px solid #FFD700' : 'none'
                  }}
                >
                  <div style={{ 
                    color: 'white', 
                    fontSize: '14px',
                    fontWeight: isTopRank ? '700' : '600'
                  }}>
                    {rankIcon}{index + 1}
                  </div>
                  <div>
                    <div style={{ 
                      color: 'white', 
                      fontSize: '13px', 
                      fontWeight: isTopRank ? '600' : '500'
                    }}>
                      {score.nickname}
                    </div>
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '12px'
                  }}>
                    {score.handicap || '-'}
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '12px'
                  }}>
                    {score.outScore || '-'}
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '12px'
                  }}>
                    {score.inScore || '-'}
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {score.totalScore || '-'}
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    color: score.overUnder > 0 ? '#ff6b6b' : score.overUnder < 0 ? '#51cf66' : 'white',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {score.totalScore ? (score.overUnder > 0 ? `+${score.overUnder}` : score.overUnder === 0 ? 'E' : score.overUnder) : '-'}
                  </div>
                </div>
              );})
            )}
          </div>
        </>
      )}

      {/* 스코어카드 모달 - Admin 페이지와 동일한 UI */}
      {selectedScore && (() => {
        const holes = selectedScore.holes || [];
        const hasHoleData = Array.isArray(holes) && holes.some(h => h > 0);
        const parArr = coursePars.length > 0 ? coursePars : Array(18).fill(4);
        const rank = filteredScores.findIndex(s => s.odId === selectedScore.odId) + 1;

        const getScoreColor = (score, par) => {
          if (!score || score === 0) return 'transparent';
          const diff = score - par;
          if (diff <= -3) return '#133464';
          if (diff === -2) return '#60B0DF';
          if (diff === -1) return '#a7d6e5';
          if (diff === 0) return 'transparent';
          if (diff === 1) return '#F19E38';
          return '#BC411E';
        };

        const renderHoleRow = (startHole, endHole, label) => {
          const holeNumbers = [];
          const pars = [];
          const scoreArr = [];
          const diffs = [];

          for (let i = startHole; i <= endHole; i++) {
            holeNumbers.push(i);
            pars.push(parArr[i - 1] || 4);
            scoreArr.push(holes[i - 1] || 0);
            diffs.push((holes[i - 1] || 0) - (parArr[i - 1] || 4));
          }

          const totalPar = pars.reduce((a, b) => a + b, 0);
          const totalScore = scoreArr.reduce((a, b) => a + b, 0);
          const totalDiff = scoreArr.filter(s => s > 0).length > 0 
            ? scoreArr.reduce((a, b, idx) => a + (b > 0 ? b - pars[idx] : 0), 0)
            : 0;

          return (
            <div style={{ 
              marginBottom: '12px',
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${endHole - startHole + 2}, 1fr)`,
                fontSize: '13px'
              }}>
                {holeNumbers.map(h => (
                  <div key={`hole-${h}`} style={{ 
                    textAlign: 'center', 
                    padding: '10px 4px',
                    background: '#e8f5e9',
                    color: '#2d5f3f',
                    fontWeight: '600',
                    borderBottom: '1px solid #c8e6c9'
                  }}>
                    {h}
                  </div>
                ))}
                <div style={{ 
                  textAlign: 'center', 
                  padding: '10px 4px', 
                  background: '#e8f5e9',
                  color: '#2d5f3f', 
                  fontWeight: '700',
                  borderBottom: '1px solid #c8e6c9'
                }}>
                  {label}
                </div>

                {pars.map((p, idx) => (
                  <div key={`par-${idx}`} style={{ 
                    textAlign: 'center', 
                    padding: '8px 4px',
                    color: '#666',
                    fontSize: '12px',
                    borderBottom: '1px solid #eee'
                  }}>
                    {p}
                  </div>
                ))}
                <div style={{ 
                  textAlign: 'center', 
                  padding: '8px 4px', 
                  color: '#666', 
                  fontWeight: '600',
                  fontSize: '12px',
                  borderBottom: '1px solid #eee'
                }}>
                  {totalPar}
                </div>

                {scoreArr.map((s, idx) => {
                  const bgColor = s > 0 ? getScoreColor(s, pars[idx]) : 'transparent';
                  const hasColor = bgColor !== 'transparent';
                  return (
                    <div key={`score-${idx}`} style={{ 
                      textAlign: 'center', 
                      padding: '8px 2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: bgColor,
                        borderRadius: '4px',
                        color: hasColor ? 'white' : '#333',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {hasHoleData ? (s > 0 ? s : '-') : '-'}
                      </span>
                    </div>
                  );
                })}
                <div style={{ 
                  textAlign: 'center', 
                  padding: '8px 2px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    color: '#333', 
                    fontWeight: '700',
                    fontSize: '15px'
                  }}>
                    {hasHoleData ? totalScore : '-'}
                  </span>
                </div>

                {diffs.map((d, idx) => (
                  <div key={`diff-${idx}`} style={{ 
                    textAlign: 'center', 
                    padding: '6px 4px',
                    color: d < 0 ? '#e74c3c' : d > 0 ? '#3498db' : '#999',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {hasHoleData && scoreArr[idx] > 0 ? (d > 0 ? `+${d}` : d) : ''}
                  </div>
                ))}
                <div style={{ 
                  textAlign: 'center', 
                  padding: '6px 4px', 
                  color: totalDiff < 0 ? '#e74c3c' : totalDiff > 0 ? '#3498db' : '#999',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {hasHoleData && totalScore > 0 ? (totalDiff > 0 ? `+${totalDiff}` : totalDiff) : ''}
                </div>
              </div>
            </div>
          );
        };

        return (
          <div 
            onClick={() => setSelectedScore(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              zIndex: 1000,
              padding: '16px',
              overflowY: 'auto'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#1a1a2e',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '500px',
                marginTop: '20px',
                marginBottom: '20px'
              }}
            >
              {/* 헤더 - Back 버튼 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <button
                  onClick={() => setSelectedScore(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 0'
                  }}
                >
                  ‹ Back
                </button>
              </div>

              {/* 회원 정보 헤더 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div>
                  <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
                    {selectedScore.nickname}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'white'
                    }}>
                      HCP: {selectedScore.handicap || '-'}
                    </span>
                  </div>
                </div>
                {(() => {
                  const totalPar = parArr.reduce((a, b) => a + b, 0);
                  const diff = selectedScore.totalScore - totalPar;
                  const diffText = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : String(diff);
                  return (
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>
                          {selectedScore.totalScore}
                        </span>
                        <span style={{ color: '#60B0DF', fontSize: '14px', fontWeight: '600' }}>
                          {diffText}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                        RANK {rank}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 스코어카드 */}
              <div style={{ padding: '16px' }}>
                {renderHoleRow(1, 9, 'Out')}
                {renderHoleRow(10, 18, 'In')}

                {/* Legend */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginTop: '20px',
                  padding: '16px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '6px 10px',
                    background: '#133464',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Ace/Albatross</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '6px 10px',
                    background: '#60B0DF',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Eagle</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '6px 10px',
                    background: '#a7d6e5',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: '#333', fontSize: '11px', fontWeight: '600' }}>Birdie</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '6px 10px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}>
                    <span style={{ color: '#333', fontSize: '11px', fontWeight: '600' }}>Par</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '6px 10px',
                    background: '#F19E38',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Bogey</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '6px 10px',
                    background: '#BC411E',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>D. Bogey +</span>
                  </div>
                </div>

                {!hasHoleData && (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '14px'
                  }}>
                    홀별 타수 정보가 없습니다 (총 타수만 입력됨)
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Leaderboard;
