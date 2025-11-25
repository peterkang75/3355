import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bookings, courses } = useApp();
  const bookingId = searchParams.get('id');
  
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('selectMember');
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [holeScores, setHoleScores] = useState({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
  const [courseData, setCourseData] = useState(null);
  const [touchStart, setTouchStart] = useState(0);
  const [showMismatches, setShowMismatches] = useState(false);
  const [slideDirection, setSlideDirection] = useState(''); // 'left', 'right', ''
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setSelectedTeammate(null);
    setStep('selectMember');
  }, [bookingId]);

  useEffect(() => {
    console.log('🎯 Play 페이지 로드:', bookingId);
    if (!bookingId || bookings.length === 0) return;
    
    const foundBooking = bookings.find(b => b.id === bookingId);
    console.log('📌 Booking 찾음:', foundBooking?.title);
    setBooking(foundBooking);
    
    if (foundBooking?.teams) {
      try {
        const teams = typeof foundBooking.teams === 'string' ? JSON.parse(foundBooking.teams) : foundBooking.teams;
        console.log('👥 팀 데이터:', teams);
        const userTeam = teams.find(t => t.members?.some(m => m?.phone === user?.phone));
        console.log('👤 사용자 팀:', userTeam);
        if (userTeam && userTeam.members) {
          const members = userTeam.members.filter(m => m && m.phone !== user?.phone);
          console.log('🤝 팀원:', members);
          setTeammates(members);
        } else {
          console.log('⚠️ 팀 정보 없음, 팀원 배열 초기화');
          setTeammates([]);
        }
      } catch (e) {
        console.error('팀 파싱 에러:', e);
        setTeammates([]);
      }
    } else {
      console.log('⚠️ Booking에 teams 정보 없음');
      setTeammates([]);
    }

    const course = courses.find(c => c.name === foundBooking?.courseName);
    if (course) setCourseData(course);
  }, [bookingId, bookings, user?.phone, courses]);

  // 실시간 저장
  useEffect(() => {
    if (step !== 'scorecard' || !booking || !selectedTeammate || !courseData) return;

    const saveScore = async () => {
      try {
        const parArr = courseData?.holePars[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || [];
        const userParArr = courseData?.holePars[user?.gender === 'F' ? 'female' : 'male'] || [];
        const today = new Date().toISOString().split('T')[0];

        const totalMe = holeScores.me.reduce((a, b) => a + b, 0);
        const coursePar = userParArr.reduce((a, b) => a + b, 0);
        const totalTeammate = holeScores.teammate.reduce((a, b) => a + b, 0);
        const courseParTeammate = parArr.reduce((a, b) => a + b, 0);

        await Promise.all([
          fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: user.id,
              roundingName: booking?.title,
              date: today,
              courseName: courseData?.name,
              totalScore: totalMe,
              coursePar,
              holes: holeScores.me
            })
          }),
          fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: selectedTeammate.phone,
              roundingName: booking?.title,
              date: today,
              courseName: courseData?.name,
              totalScore: totalTeammate,
              coursePar: courseParTeammate,
              holes: holeScores.teammate
            })
          })
        ]);
      } catch (e) {
        console.error('저장 오류:', e);
      }
    };

    const timer = setTimeout(saveScore, 500);
    return () => clearTimeout(timer);
  }, [holeScores]);

  // 모든 hooks은 조건 없이 먼저 호출되어야 함
  const mismatchedHoles = useMemo(() => {
    const mismatches = [];
    for (let i = 0; i < 18; i++) {
      if (holeScores.me[i] !== holeScores.teammate[i]) {
        mismatches.push(i + 1);
      }
    }
    return mismatches;
  }, [holeScores]);

  const isAllHolesComplete = () => {
    return holeScores.me.every(score => score > 0) && holeScores.teammate.every(score => score > 0);
  };

  useEffect(() => {
    if (step === 'scorecard' && isAllHolesComplete() && mismatchedHoles.length > 0) {
      setShowMismatches(true);
    }
  }, [step, mismatchedHoles.length]);

  if (!bookingId || !booking || !courseData) {
    return (
      <div style={{ minHeight: '100vh', padding: '16px', background: '#223B3F' }}>
        <div className="header">
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
        </div>
        <div style={{ marginTop: '32px', textAlign: 'center', opacity: 0.6 }}>로딩 중...</div>
      </div>
    );
  }

  if (step === 'selectMember') {
    if (teammates.length === 0) {
      return (
        <div style={{ minHeight: '100vh', padding: '16px', background: '#223B3F' }}>
          <div className="header">
            <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
          </div>
          <div style={{ marginTop: '32px', textAlign: 'center', color: 'white', opacity: 0.7 }}>팀원이 없습니다</div>
        </div>
      );
    }
    
    return (
      <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px', background: '#223B3F' }}>
        <div className="header">
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
        </div>
        <div className="card" style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>내가 마크할 회원을 선택하세요</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {teammates.map(teammate => (
              <div
                key={teammate.phone}
                onClick={() => setSelectedTeammate(teammate)}
                style={{
                  padding: '16px',
                  border: selectedTeammate?.phone === teammate.phone ? '2px solid var(--primary-green)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: selectedTeammate?.phone === teammate.phone ? 'var(--bg-green)' : 'var(--text-light)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '16px' }}>{teammate.nickname || teammate.name}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-dark)', marginTop: '4px' }}>HC: {teammate.handicap || '-'}</div>
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              if (!selectedTeammate) { alert('선택해주세요'); return; }
              
              try {
                const today = new Date().toISOString().split('T')[0];
                const res = await fetch(`/api/scores/check?memberId=${selectedTeammate.phone}&date=${today}&roundingName=${booking?.title}`);
                const data = await res.json();
                
                if (data.exists) {
                  alert('이미 점수가 저장되어있습니다.');
                  navigate(-1);
                  return;
                }
              } catch (e) {
                console.error('점수 확인 오류:', e);
              }
              
              setRoundStartTime(Date.now());
              setCurrentHole(1);
              setHoleScores({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
              setShowMismatches(false);
              setStep('scorecard');
            }}
            disabled={!selectedTeammate}
            style={{
              width: '100%',
              padding: '16px',
              background: selectedTeammate ? 'var(--primary-green)' : 'var(--bg-card)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              cursor: selectedTeammate ? 'pointer' : 'not-allowed',
              opacity: selectedTeammate ? 1 : 0.5
            }}
          >
            플레이하기
          </button>
        </div>
      </div>
    );
  }

  const getTime = () => {
    if (!roundStartTime) return '00:00:00';
    const sec = Math.floor((Date.now() - roundStartTime) / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const parArr = courseData?.holePars[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || [];
  const userParArr = courseData?.holePars[user?.gender === 'F' ? 'female' : 'male'] || [];
  
  let tmateUnder = 0, tmatePar = 0, myUnder = 0, myPar = 0;
  for (let i = 0; i < currentHole; i++) {
    if (holeScores.teammate[i] > 0) { tmateUnder += holeScores.teammate[i]; tmatePar += (parArr[i] || 0); }
    if (holeScores.me[i] > 0) { myUnder += holeScores.me[i]; myPar += (userParArr[i] || 0); }
  }

  const updateScore = (isTeammate, delta) => {
    const newScores = { ...holeScores };
    const scoreArray = isTeammate ? [...newScores.teammate] : [...newScores.me];
    scoreArray[currentHole - 1] = Math.max(0, scoreArray[currentHole - 1] + delta);
    newScores[isTeammate ? 'teammate' : 'me'] = scoreArray;
    setHoleScores(newScores);
  };

  const setScoreValue = (isTeammate, value) => {
    const newScores = { ...holeScores };
    const scoreArray = isTeammate ? [...newScores.teammate] : [...newScores.me];
    scoreArray[currentHole - 1] = value;
    newScores[isTeammate ? 'teammate' : 'me'] = scoreArray;
    setHoleScores(newScores);
  };

  const ScoreSection = ({ title, isTeammate }) => {
    const score = isTeammate ? holeScores.teammate[currentHole - 1] : holeScores.me[currentHole - 1];
    const par = isTeammate 
      ? courseData?.holePars[selectedTeammate?.gender === 'F' ? 'female' : 'male']?.[currentHole - 1]
      : courseData?.holePars[user?.gender === 'F' ? 'female' : 'male']?.[currentHole - 1];
    
    const parArrForCalc = isTeammate ? parArr : userParArr;
    let totalScore = 0, totalPar = 0;
    const scoreArr = isTeammate ? holeScores.teammate : holeScores.me;
    for (let i = 0; i < currentHole; i++) {
      if (scoreArr[i] > 0) { totalScore += scoreArr[i]; totalPar += (parArrForCalc[i] || 0); }
    }
    const diff = totalScore - totalPar;
    const diffText = diff > 0 ? '+' + diff : diff === 0 ? 'E' : String(diff);
    
    const iosButtonStyle = { WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', userSelect: 'none' };
    const boxStyle = { width: '100%', aspectRatio: '1', padding: '12px', background: 'white', border: '2px solid #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '35px', color: '#000', ...iosButtonStyle };
    const buttonStyle = { width: '100%', aspectRatio: '1', padding: '12px', border: '2px solid #ccc', background: 'white', color: '#000', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '35px', ...iosButtonStyle };
    
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '0', padding: '0', marginBottom: '6px', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ background: '#6399CF', color: 'white', padding: '12px', borderRadius: '0', textAlign: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        
        <div style={{ background: 'white', flex: 0.675, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 8px', borderBottom: '1px solid #e0e0e0', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
            <button onMouseDown={() => updateScore(isTeammate, -1)} onTouchStart={() => updateScore(isTeammate, -1)} style={{ width: '44px', height: '44px', border: '1px solid #999', background: 'white', borderRadius: '6px', fontSize: '24px', fontWeight: '700', cursor: 'pointer', color: '#666', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', flexShrink: 0 }}>−</button>
            <div style={{ fontSize: '64px', fontWeight: '600', minWidth: '70px', textAlign: 'center', color: '#000' }}>{score}</div>
            <button onMouseDown={() => updateScore(isTeammate, 1)} onTouchStart={() => updateScore(isTeammate, 1)} style={{ width: '44px', height: '44px', border: '1px solid #999', background: 'white', borderRadius: '6px', fontSize: '24px', fontWeight: '700', cursor: 'pointer', color: '#666', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', flexShrink: 0 }}>+</button>
          </div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '400' }}>{score} points</div>
        </div>

        <div style={{ background: 'white', padding: '1px', display: 'flex', flexDirection: 'column', gap: '1px', flex: 0.325, minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#666' }}>PAR</div>
              <button onMouseDown={() => setScoreValue(isTeammate, par)} onTouchStart={() => setScoreValue(isTeammate, par)} style={{ ...boxStyle, border: '2px solid #ccc', background: 'white', cursor: 'pointer', width: '100%', aspectRatio: '1', fontSize: '72px', padding: 0 }}>{par}</button>
            </div>
            
            {!isTeammate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#666' }}>NTP</div>
                <button onMouseDown={() => setScoreValue(isTeammate, par * 2)} onTouchStart={() => setScoreValue(isTeammate, par * 2)} style={{ ...buttonStyle, background: '#6399CF', color: 'white', border: 'none', width: '100%', aspectRatio: '1', fontSize: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
                  <svg width="48" height="48" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="25" cy="15" r="8" stroke="white" strokeWidth="3"/>
                    <line x1="25" y1="23" x2="25" y2="42" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#666' }}>양파</div>
              <button onMouseDown={() => setScoreValue(isTeammate, par * 2)} onTouchStart={() => setScoreValue(isTeammate, par * 2)} style={{ ...buttonStyle, width: '100%', aspectRatio: '1', fontSize: '60px', padding: 0 }}>{par * 2}</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#000' }}>TOTAL</div>
              <div style={{ ...boxStyle, width: '100%', aspectRatio: '1', fontSize: '72px', padding: 0 }}>{diffText}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || !e.changedTouches[0]) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      setIsAnimating(true);
      if (diff > 0) {
        // 왼쪽 스와이프 → 다음 홀
        console.log('🔄 왼쪽 스와이프 - 다음 홀로');
        setSlideDirection('left');
        setTimeout(() => goToNextHole(), 300);
      } else {
        // 오른쪽 스와이프 → 이전 홀 (뒤로가기 방지)
        console.log('🔄 오른쪽 스와이프 - 이전 홀로');
        e.preventDefault();
        setSlideDirection('right');
        setTimeout(() => goToPreviousHole(), 300);
      }
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection('');
      }, 300);
    }
  };

  const goToPreviousHole = () => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
    } else {
      setCurrentHole(18); // 1번에서 → 18번
    }
  };

  const goToNextHole = () => {
    if (currentHole < 18) {
      setCurrentHole(currentHole + 1);
    } else {
      setCurrentHole(1); // 18번에서 → 1번 (순환)
    }
  };

  const isPC = () => {
    return typeof window !== 'undefined' && window.innerWidth > 768;
  };

  return (
    <div 
      style={{ height: '100vh', background: '#223B3F', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', overscrollBehavior: 'none' }}
      onTouchStartCapture={handleTouchStart}
      onTouchEndCapture={handleTouchEnd}
    >
      <div className="header" style={{ background: '#223B3F', borderBottom: 'none', height: '0px' }}></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px 16px', marginBottom: '0', height: '60px', flexShrink: 0 }}>
        <div style={{ border: '2px solid white', borderRadius: '8px', padding: '6px', textAlign: 'center', fontSize: '9px', background: 'transparent', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontWeight: '700', opacity: 1, fontSize: '9px' }}>ROUND TIME</div>
          <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{getTime()}</div>
        </div>
        <div style={{ border: '2px solid white', borderRadius: '8px', padding: '6px', textAlign: 'center', fontSize: '9px', background: 'transparent', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontWeight: '700', opacity: 1, fontSize: '9px' }}>HOLE</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '2px' }}>{currentHole}</div>
        </div>
      </div>

      <div 
        onTouchStartCapture={handleTouchStart}
        onTouchEndCapture={handleTouchEnd}
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '8px 12px', 
          position: 'relative',
          transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
          transform: slideDirection === 'left' ? 'translateX(-100%)' : slideDirection === 'right' ? 'translateX(100%)' : 'translateX(0)',
          overflow: 'hidden'
        }}
      >
        <ScoreSection title={`${selectedTeammate?.nickname || selectedTeammate?.name} (HC: ${selectedTeammate?.handicap || '-'})`} isTeammate={true} />
        
        <ScoreSection title={`${user?.nickname || user?.name} (HC: ${user?.handicap || '-'})`} isTeammate={false} />

        {isPC() && (
          <>
            <button
              onClick={goToPreviousHole}
              style={{
                position: 'fixed',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#223B3F',
                border: 'none',
                fontSize: '24px',
                fontWeight: '700',
                cursor: 'pointer',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ←
            </button>

            <button
              onClick={goToNextHole}
              style={{
                position: 'fixed',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#223B3F',
                border: 'none',
                fontSize: '24px',
                fontWeight: '700',
                cursor: 'pointer',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              →
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', background: '#223B3F', flexShrink: 0, height: '50px' }}>
        <button onClick={goToPreviousHole} style={{ flex: 1, padding: '0', background: 'white', color: '#000', borderRadius: '0', fontWeight: '700', cursor: 'pointer', border: 'none', fontSize: '12px' }}>← 이전</button>
        <button onClick={goToNextHole} style={{ flex: 1, padding: '0', background: 'white', color: 'black', borderRadius: '0', fontWeight: '700', cursor: 'pointer', border: 'none', fontSize: '12px' }}>다음 →</button>
      </div>

      {showMismatches && mismatchedHoles.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
              점수 확인 필요
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', textAlign: 'center' }}>
              다음 홀에서 점수가 다릅니다:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {mismatchedHoles.map(hole => (
                <button
                  key={hole}
                  onClick={() => {
                    setCurrentHole(hole);
                    setShowMismatches(false);
                  }}
                  style={{
                    padding: '12px',
                    background: '#6399CF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {hole}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMismatches(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ddd',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Play;
