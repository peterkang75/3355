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

      const course = courses.find(c => c.name === booking.courseName);
      const holePars = course?.holePars?.male || Array(18).fill(4);
      setCoursePars(holePars);
      const coursePar = holePars.reduce((a, b) => a + b, 0) || 72;

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
        const totalScore = score.totalScore || holesArray?.reduce((a, b) => a + b, 0) || 0;
        const overUnder = totalScore - coursePar;
        
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
          coursePar
        };
      });

      processedScores.sort((a, b) => {
        if (a.completedHoles === 0 && b.completedHoles === 0) return 0;
        if (a.completedHoles === 0) return 1;
        if (b.completedHoles === 0) return -1;
        return a.overUnder - b.overUnder;
      });

      setScores(processedScores);
      
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

  const gradeFilters = ['ALL', 'Grade A', 'Grade B', 'Grade C', 'Grade D'];

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
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          fontWeight: '600'
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
          filteredScores.map((score, index) => (
            <div
              key={`${score.odId}-${index}`}
              onClick={() => setSelectedScore(score)}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 40px 36px 36px 60px 44px',
                gap: '4px',
                padding: '12px 4px',
                background: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ 
                color: 'white', 
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {index + 1}
              </div>
              <div>
                <div style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
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
                {score.totalScore ? `${score.coursePar}/${score.totalScore}` : '-'}
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
          ))
        )}
      </div>

      {/* 스코어카드 모달 - Admin 페이지와 동일한 UI */}
      {selectedScore && (() => {
        const holes = selectedScore.holes || [];
        const hasHoleData = Array.isArray(holes) && holes.some(h => h > 0);
        const parArr = coursePars.length > 0 ? coursePars : Array(18).fill(4);
        const rank = filteredScores.findIndex(s => s.odId === selectedScore.odId) + 1;

        const getScoreColor = (score, par) => {
          if (!score || score === 0) return 'transparent';
          const diff = score - par;
          if (diff <= -3) return '#A62B1F';
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
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>
                    {selectedScore.totalScore}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    RANK {rank}
                  </div>
                </div>
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
                    background: '#A62B1F',
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
