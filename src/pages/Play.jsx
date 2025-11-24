import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bookings, courses, saveScore } = useApp();
  const bookingId = searchParams.get('id');
  
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('selectMember'); // selectMember -> scorecard
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [holeScores, setHoleScores] = useState(Array(18).fill(0));
  const [courseData, setCourseData] = useState(null);

  useEffect(() => {
    if (bookingId && bookings.length > 0) {
      const foundBooking = bookings.find(b => b.id === bookingId);
      setBooking(foundBooking);
      
      if (foundBooking?.teams) {
        try {
          const teams = JSON.parse(foundBooking.teams);
          const userTeam = teams.find(t => t.members?.some(m => m.phone === user?.phone));
          if (userTeam) {
            const members = userTeam.members.filter(m => m.phone !== user?.phone);
            setTeammates(members || []);
          }
        } catch (e) {
          console.error('팀 정보 파싱 오류:', e);
        }
      }

      // 골프장 정보 가져오기
      const course = courses.find(c => c.name === foundBooking?.courseName);
      if (course) setCourseData(course);
    }
  }, [bookingId, bookings, user, courses]);

  const handleSelectTeammate = (teammate) => {
    setSelectedTeammate(teammate);
  };

  const handleStartScoring = () => {
    if (!selectedTeammate) {
      alert('마크할 회원을 선택해주세요.');
      return;
    }
    setRoundStartTime(Date.now());
    setStep('scorecard');
  };

  const getElapsedTime = () => {
    if (!roundStartTime) return '00:00:00';
    const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getMemberPar = () => {
    if (!courseData?.holePars || !selectedTeammate) return null;
    const gender = selectedTeammate.gender || 'M';
    const parArray = gender === 'F' ? courseData.holePars.female : courseData.holePars.male;
    return parArray ? parArray[currentHole - 1] : null;
  };

  const handleSetScore = (value) => {
    const newScores = [...holeScores];
    newScores[currentHole - 1] = value;
    setHoleScores(newScores);
  };

  const handleParClick = () => {
    const par = getMemberPar();
    if (par) handleSetScore(par);
  };

  const handleDPClick = () => {
    const par = getMemberPar();
    if (par) handleSetScore(par * 2);
  };

  const nextHole = () => {
    if (currentHole < 18) setCurrentHole(currentHole + 1);
  };

  const prevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const calculateUnderOver = () => {
    let total = 0;
    let parTotal = 0;
    for (let i = 0; i < currentHole; i++) {
      const score = holeScores[i];
      const par = getMemberPar();
      if (score > 0) {
        total += score;
        parTotal += (courseData?.holePars[selectedTeammate.gender === 'F' ? 'female' : 'male'][i] || 0);
      }
    }
    return total - parTotal;
  };

  const handleSaveRound = async () => {
    if (!window.confirm('라운드를 저장하시겠습니까?')) return;

    const totalScore = holeScores.reduce((sum, score) => sum + score, 0);
    const coursePar = (courseData?.holePars[selectedTeammate.gender === 'F' ? 'female' : 'male'] || []).reduce((sum, par) => sum + par, 0);

    await saveScore({
      roundingName: booking?.title,
      courseName: courseData?.name,
      totalScore,
      coursePar,
      holes: holeScores
    });

    alert('스코어가 저장되었습니다!');
    navigate(-1);
  };

  if (step === 'selectMember') {
    return (
      <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px' }}>
        <div className="header">
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              color: 'var(--text-light)',
              fontSize: '16px',
              padding: '8px 16px'
            }}
          >
            ← Back
          </button>
        </div>

        <div className="card" style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            내가 마크할 회원을 선택하세요
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {teammates.map(teammate => (
              <div
                key={teammate.phone}
                onClick={() => handleSelectTeammate(teammate)}
                style={{
                  padding: '16px',
                  border: selectedTeammate?.phone === teammate.phone ? '2px solid var(--primary-green)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: selectedTeammate?.phone === teammate.phone ? 'var(--bg-green)' : 'var(--text-light)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {teammate.nickname || teammate.name}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-dark)', marginTop: '4px' }}>
                  HC: {teammate.handicap || '-'}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartScoring}
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

  const par = getMemberPar();
  const currentScore = holeScores[currentHole - 1];
  const underOver = calculateUnderOver();

  return (
    <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px' }}>
      <div className="header">
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            color: 'var(--text-light)',
            fontSize: '16px',
            padding: '8px 16px'
          }}
        >
          ← Back
        </button>
        <button 
          onClick={handleSaveRound}
          style={{
            background: 'transparent',
            color: 'var(--primary-green)',
            fontSize: '16px',
            padding: '8px 16px',
            fontWeight: '600'
          }}
        >
          💾 저장
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginTop: '16px',
        marginBottom: '16px'
      }}>
        <div style={{
          border: '2px solid var(--primary-green)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          background: 'var(--bg-card)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>ROUND TIME</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{getElapsedTime()}</div>
        </div>
        <div style={{
          border: '2px solid var(--primary-green)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          background: 'var(--bg-card)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>HOLE</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{currentHole}</div>
        </div>
        <div style={{
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          background: 'var(--bg-card)',
          opacity: 0.5
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>TO MID</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>-</div>
        </div>
      </div>

      <div style={{
        background: 'var(--primary-green)',
        color: 'white',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>
          {selectedTeammate?.nickname || selectedTeammate?.name} (HC: {selectedTeammate?.handicap || '-'})
        </div>
      </div>

      <div style={{
        background: 'var(--text-light)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>점수</div>
          <div style={{ fontSize: '48px', fontWeight: '700' }}>{currentScore}</div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>포인트</div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => handleSetScore(Math.max(0, currentScore - 1))}
            style={{
              width: '56px',
              height: '56px',
              border: '1px solid var(--border-color)',
              background: 'white',
              borderRadius: '8px',
              fontSize: '24px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            −
          </button>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>점수 조정</div>
          <button
            onClick={() => handleSetScore(currentScore + 1)}
            style={{
              width: '56px',
              height: '56px',
              border: '1px solid var(--border-color)',
              background: 'white',
              borderRadius: '8px',
              fontSize: '24px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <button
          onClick={handleParClick}
          style={{
            padding: '12px',
            border: '1px solid var(--border-color)',
            background: selectedTeammate?.gender === 'F' ? '#e74c3c' : 'var(--primary-green)',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          PAR
          <div style={{ fontSize: '20px', marginTop: '4px' }}>{par || '-'}</div>
        </button>
        <button
          disabled
          style={{
            padding: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-dark)',
            borderRadius: '8px',
            fontWeight: '700',
            opacity: 0.5,
            cursor: 'not-allowed'
          }}
        >
          SHOTS
          <div style={{ fontSize: '20px', marginTop: '4px' }}>-</div>
        </button>
        <button
          onClick={handleDPClick}
          style={{
            padding: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--primary-green)',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          양파
          <div style={{ fontSize: '16px', marginTop: '4px' }}>DP</div>
        </button>
        <div
          style={{
            padding: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            fontWeight: '700',
            textAlign: 'center'
          }}
        >
          TOTAL
          <div style={{ fontSize: '20px', marginTop: '4px' }}>
            {underOver >= 0 ? '+' : ''}{underOver}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <button
          onClick={prevHole}
          disabled={currentHole === 1}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid var(--border-color)',
            background: currentHole === 1 ? 'var(--bg-card)' : 'var(--text-light)',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: currentHole === 1 ? 'not-allowed' : 'pointer',
            opacity: currentHole === 1 ? 0.5 : 1
          }}
        >
          ← 이전
        </button>
        <button
          onClick={nextHole}
          disabled={currentHole === 18}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid var(--border-color)',
            background: currentHole === 18 ? 'var(--bg-card)' : 'var(--primary-green)',
            color: currentHole === 18 ? 'var(--text-dark)' : 'white',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: currentHole === 18 ? 'not-allowed' : 'pointer',
            opacity: currentHole === 18 ? 0.5 : 1
          }}
        >
          다음 →
        </button>
      </div>

      <button
        onClick={handleSaveRound}
        style={{
          width: '100%',
          padding: '16px',
          background: 'var(--primary-green)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        라운드 저장
      </button>
    </div>
  );
}

export default Play;
