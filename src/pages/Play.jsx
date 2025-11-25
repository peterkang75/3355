import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bookings, courses, members } = useApp();
  const bookingId = searchParams.get('id');
  
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('selectMember');
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [holeScores, setHoleScores] = useState({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
  const [courseData, setCourseData] = useState(null);
  const [showMismatches, setShowMismatches] = useState(false);
  const [showNtpModal, setShowNtpModal] = useState(false);
  const [ntpDistance, setNtpDistance] = useState('');
  const [serverMismatches, setServerMismatches] = useState([]);
  const [isCheckingScores, setIsCheckingScores] = useState(false);
  const [teammateReady, setTeammateReady] = useState(false);
  const [checkingInterval, setCheckingInterval] = useState(null);

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

        const teammateMemberId = members?.find(m => m.phone === selectedTeammate?.phone)?.id || selectedTeammate?.phone;
        
        await Promise.all([
          fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: user.id,
              markerId: user.id,
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
              memberId: teammateMemberId,
              markerId: user.id,
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

  const isAllHolesComplete = () => {
    return holeScores.me.every(score => score > 0) && holeScores.teammate.every(score => score > 0);
  };

  const getTeammateMemberId = useCallback(() => {
    if (!selectedTeammate?.phone || !members) return selectedTeammate?.phone;
    const member = members.find(m => m.phone === selectedTeammate.phone);
    return member?.id || selectedTeammate.phone;
  }, [selectedTeammate, members]);

  const checkTeammateScores = useCallback(async () => {
    if (!booking || !user) return false;
    try {
      const today = new Date().toISOString().split('T')[0];
      const teammateMemberId = getTeammateMemberId();
      const res = await fetch(`/api/scores/round-comparison?roundingName=${encodeURIComponent(booking?.title)}&date=${today}&myId=${user.id}&teammateId=${teammateMemberId}`);
      const data = await res.json();
      
      const teammateHasData = data.myScoreByTeammate && data.teammateScoreByTeammate;
      const teammateComplete = teammateHasData && 
        data.myScoreByTeammate.every(s => s > 0) && 
        data.teammateScoreByTeammate.every(s => s > 0);
      
      if (teammateComplete) {
        setTeammateReady(true);
        
        const mismatches = [];
        for (let i = 0; i < 18; i++) {
          const myScoreByMe = holeScores.me[i];
          const myScoreByTeammate = data.myScoreByTeammate?.[i];
          const teammateScoreByMe = holeScores.teammate[i];
          const teammateScoreByTeammate = data.teammateScoreByTeammate?.[i];
          
          if (myScoreByTeammate !== null && myScoreByTeammate !== undefined && myScoreByMe !== myScoreByTeammate) {
            if (!mismatches.includes(i + 1)) mismatches.push(i + 1);
          }
          if (teammateScoreByTeammate !== null && teammateScoreByTeammate !== undefined && teammateScoreByMe !== teammateScoreByTeammate) {
            if (!mismatches.includes(i + 1)) mismatches.push(i + 1);
          }
        }
        
        mismatches.sort((a, b) => a - b);
        setServerMismatches(mismatches);
        return true;
      }
      return false;
    } catch (e) {
      console.error('점수 확인 오류:', e);
      return false;
    }
  }, [booking, user, holeScores, getTeammateMemberId]);

  useEffect(() => {
    if (step !== 'scoreCheck') {
      if (checkingInterval) {
        clearInterval(checkingInterval);
        setCheckingInterval(null);
      }
      return;
    }

    checkTeammateScores();
    
    const interval = setInterval(() => {
      checkTeammateScores();
    }, 3000);
    
    setCheckingInterval(interval);
    
    return () => {
      clearInterval(interval);
      setCheckingInterval(null);
    };
  }, [step, checkTeammateScores]);

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

  if (step === 'scoreCheck') {
    return (
      <div style={{ minHeight: '100vh', padding: '16px', background: '#223B3F' }}>
        <div className="header" style={{ background: '#223B3F', borderBottom: 'none' }}>
          <button 
            onClick={() => setStep('scorecard')} 
            style={{ background: 'transparent', color: 'white', padding: '8px 16px', border: 'none', cursor: 'pointer' }}
          >
            ← 돌아가기
          </button>
        </div>
        
        <div style={{ textAlign: 'center', color: 'white', marginTop: '60px', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>점수 점검</div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>{booking?.title}</div>
        </div>
        
        <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              {selectedTeammate?.nickname || selectedTeammate?.name}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px',
              color: teammateReady ? '#27ae60' : '#f39c12'
            }}>
              {teammateReady ? (
                <>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>점수 입력 완료</span>
                </>
              ) : (
                <>
                  <span style={{ 
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f39c12',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  <span>점수 입력 대기 중...</span>
                </>
              )}
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              {user?.nickname || user?.name}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px',
              color: '#27ae60'
            }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span>점수 입력 완료</span>
            </div>
          </div>
        </div>
        
        {teammateReady && (
          <div className="card" style={{ marginBottom: '24px' }}>
            {serverMismatches.length > 0 ? (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', textAlign: 'center', color: '#e74c3c' }}>
                  점수가 다른 홀이 있습니다
                </h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', textAlign: 'center' }}>
                  아래 홀의 점수를 확인해주세요
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {serverMismatches.map(hole => (
                    <button
                      key={hole}
                      onClick={() => {
                        setCurrentHole(hole);
                        setStep('scorecard');
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
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', textAlign: 'center', color: '#27ae60' }}>
                  모든 점수가 일치합니다!
                </h3>
                <button
                  onClick={() => setStep('roundComplete')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'var(--primary-green)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  라운드 완료하기
                </button>
              </>
            )}
          </div>
        )}
        
        {!teammateReady && (
          <div style={{ textAlign: 'center', color: 'white', opacity: 0.6, fontSize: '14px' }}>
            팀메이트가 점수 입력을 완료하면<br/>자동으로 비교가 시작됩니다
          </div>
        )}
        
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (step === 'roundComplete') {
    const totalTeammate = holeScores.teammate.reduce((a, b) => a + b, 0);
    const totalMe = holeScores.me.reduce((a, b) => a + b, 0);
    const parArrTeammate = courseData?.holePars[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || [];
    const parArrMe = courseData?.holePars[user?.gender === 'F' ? 'female' : 'male'] || [];
    const courseParTeammate = parArrTeammate.reduce((a, b) => a + b, 0);
    const courseParMe = parArrMe.reduce((a, b) => a + b, 0);
    const diffTeammate = totalTeammate - courseParTeammate;
    const diffMe = totalMe - courseParMe;
    
    return (
      <div style={{ minHeight: '100vh', padding: '16px', background: '#223B3F' }}>
        <div className="header" style={{ background: '#223B3F', borderBottom: 'none' }}></div>
        
        <div style={{ textAlign: 'center', color: 'white', marginTop: '40px', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>🏌️ 라운드 종료!</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>{booking?.title} - {courseData?.name}</div>
        </div>
        
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-green)' }}>
              {selectedTeammate?.nickname || selectedTeammate?.name}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>HC: {selectedTeammate?.handicap || '-'}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>총타수</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{totalTeammate}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>오버/언더</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: diffTeammate > 0 ? '#e74c3c' : diffTeammate < 0 ? '#27ae60' : '#333' }}>
                {diffTeammate > 0 ? `+${diffTeammate}` : diffTeammate}
              </div>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-green)' }}>
              {user?.nickname || user?.name}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>HC: {user?.handicap || '-'}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>총타수</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{totalMe}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>오버/언더</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: diffMe > 0 ? '#e74c3c' : diffMe < 0 ? '#27ae60' : '#333' }}>
                {diffMe > 0 ? `+${diffMe}` : diffMe}
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '100%',
            padding: '16px',
            background: 'var(--primary-green)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '700',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          완료
        </button>
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
    
    const isNearHole = !isTeammate && courseData?.nearHoles?.[currentHole - 1];
    
    const iosButtonStyle = { WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', userSelect: 'none' };
    const boxStyle = { width: '100%', aspectRatio: '1', padding: '12px', background: 'white', border: '2px solid #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '28px', color: '#000', ...iosButtonStyle };
    const buttonStyle = { width: '100%', aspectRatio: '1', padding: '12px', border: '2px solid #ccc', background: 'white', color: '#000', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '28px', ...iosButtonStyle };
    
    const blinkingStyle = {
      animation: 'blink 1s infinite',
      '@keyframes blink': {
        '0%, 49%': { background: '#6399CF' },
        '50%, 100%': { background: 'white', color: '#6399CF' }
      }
    };
    
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '0', padding: '0', marginBottom: '12px' }}>
        <div style={{ background: '#6399CF', color: 'white', padding: '16px', borderRadius: '0', textAlign: 'center', fontWeight: '700', fontSize: '21px' }}>
          {title}
        </div>
        
        <div style={{ background: 'white', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '20px 16px 1px 16px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => updateScore(isTeammate, -1)} style={{ width: '42px', height: '42px', border: '1px solid #999', background: 'white', borderRadius: '6px', fontSize: '22px', fontWeight: '700', cursor: 'pointer', color: '#666', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>−</button>
            <div style={{ fontSize: '58px', fontWeight: '600', minWidth: '64px', textAlign: 'center', color: '#000' }}>{score}</div>
            <button onClick={() => updateScore(isTeammate, 1)} style={{ width: '42px', height: '42px', border: '1px solid #999', background: 'white', borderRadius: '6px', fontSize: '22px', fontWeight: '700', cursor: 'pointer', color: '#666', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>+</button>
          </div>
          <div style={{ fontSize: '13px', color: '#666', fontWeight: '400' }}>{score} points</div>
        </div>

        <div style={{ background: 'white', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>PAR</div>
              <button onClick={() => setScoreValue(isTeammate, par)} style={{ ...boxStyle, border: '2px solid #ccc', background: 'white', cursor: 'pointer', width: '55px', height: '55px' }}>{par}</button>
            </div>
            
            {isNearHole && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>NTP</div>
                <button onClick={() => { setNtpDistance(''); setShowNtpModal(true); }} style={{ ...buttonStyle, background: '#6399CF', color: 'white', border: 'none', width: '55px', height: '55px', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
                  <svg width="32" height="32" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="25" cy="15" r="8" stroke="white" strokeWidth="3"/>
                    <line x1="25" y1="23" x2="25" y2="42" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>양파</div>
              <button onClick={() => setScoreValue(isTeammate, par * 2)} style={{ ...buttonStyle, width: '55px', height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{par * 2}</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>TOTAL</div>
              <div style={{ ...boxStyle, width: '55px', height: '55px' }}>{diffText}</div>
            </div>
          </div>
        </div>
      </div>
    );
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
      setCurrentHole(1);
    }
  };

  const handleScoreCheck = () => {
    setTeammateReady(false);
    setServerMismatches([]);
    setStep('scoreCheck');
  };

  return (
    <div 
      style={{ 
        height: '100vh', 
        background: '#223B3F', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '0',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%'
      }}
    >
      <div className="header" style={{ background: '#223B3F', borderBottom: 'none' }}></div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 24px', marginBottom: '0' }}>
        <button 
          onClick={goToPreviousHole}
          onTouchEnd={goToPreviousHole}
          style={{ 
            flex: 1,
            border: '2px solid white', 
            borderRadius: '8px', 
            padding: '11px 16px',
            background: 'white', 
            color: '#223B3F', 
            fontSize: '11px', 
            fontWeight: '700', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '900' }}>←</div>
          <div>이전홀</div>
        </button>
        <div style={{ border: '2px solid white', borderRadius: '8px', padding: '11px 23px', textAlign: 'center', fontSize: '11px', background: 'transparent', color: 'white' }}>
          <div style={{ fontWeight: '700', opacity: 1, fontSize: '11px' }}>HOLE</div>
          <div style={{ fontSize: '34px', fontWeight: '700', marginTop: '6px' }}>{currentHole}</div>
        </div>
        <button 
          onClick={currentHole === 18 ? handleScoreCheck : goToNextHole}
          style={{ 
            flex: 1,
            border: '2px solid white', 
            borderRadius: '8px', 
            padding: '11px 16px',
            background: currentHole === 18 ? '#6399CF' : 'white', 
            color: currentHole === 18 ? 'white' : '#223B3F', 
            fontSize: '11px', 
            fontWeight: '700', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '900' }}>{currentHole === 18 ? '✓' : '→'}</div>
          <div>{currentHole === 18 ? '점수점검' : '다음홀'}</div>
        </button>
      </div>

      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '12px 24px', 
          position: 'relative'
        }}
      >
        <ScoreSection title={`${selectedTeammate?.nickname || selectedTeammate?.name} (HC: ${selectedTeammate?.handicap || '-'})`} isTeammate={true} />
        
        <ScoreSection title={`${user?.nickname || user?.name} (HC: ${user?.handicap || '-'})`} isTeammate={false} />

      </div>


      {showMismatches && serverMismatches.length > 0 && (
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
              팀메이트와 점수가 다른 홀:
            </p>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px', textAlign: 'center' }}>
              확인할 홀을 선택하세요
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {serverMismatches.map(hole => (
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
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowMismatches(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ddd',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                돌아가기
              </button>
              <button
                onClick={() => {
                  setShowMismatches(false);
                  handleScoreCheck();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                다시 점검
              </button>
            </div>
          </div>
        </div>
      )}

      {showNtpModal && (
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
            width: '90%',
            maxWidth: '320px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
              NTP 거리 입력
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px', textAlign: 'center' }}>
              홀 {currentHole} - 핀까지의 거리 (cm)
            </p>
            <input
              type="number"
              value={ntpDistance}
              onChange={(e) => setNtpDistance(e.target.value)}
              placeholder="거리를 입력하세요 (cm)"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '18px',
                border: '2px solid #ccc',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNtpModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#ddd',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!ntpDistance || parseFloat(ntpDistance) <= 0) {
                    alert('거리를 입력해주세요');
                    return;
                  }
                  try {
                    const response = await fetch('/api/ntp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bookingId: bookingId,
                        memberId: user.id,
                        memberName: user.nickname || user.name,
                        holeNumber: currentHole,
                        distance: parseFloat(ntpDistance)
                      })
                    });
                    if (!response.ok) {
                      throw new Error('저장 실패');
                    }
                    setShowNtpModal(false);
                    alert('NTP 거리가 저장되었습니다!');
                  } catch (e) {
                    console.error('NTP 저장 오류:', e);
                    alert('저장 중 오류가 발생했습니다');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#6399CF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Play;
