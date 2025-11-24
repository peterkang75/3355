import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setSelectedTeammate(null);
    setStep('selectMember');
  }, [bookingId]);

  useEffect(() => {
    console.log('🎯 Play 페이지 로드:', bookingId);
    if (!bookingId || bookings.length === 0) return;
    
    const foundBooking = bookings.find(b => b.id === bookingId);
    setBooking(foundBooking);
    
    if (foundBooking?.teams) {
      try {
        const teams = typeof foundBooking.teams === 'string' ? JSON.parse(foundBooking.teams) : foundBooking.teams;
        const userTeam = teams.find(t => t.members?.some(m => m.phone === user?.phone));
        if (userTeam) {
          const members = userTeam.members.filter(m => m.phone !== user?.phone);
          setTeammates(members);
        }
      } catch (e) {
        console.error('팀 파싱:', e);
      }
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

  if (!bookingId || !booking || teammates.length === 0) {
    return (
      <div style={{ minHeight: '100vh', padding: '16px' }}>
        <div className="header">
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
        </div>
        <div style={{ marginTop: '32px', textAlign: 'center', opacity: 0.6 }}>로딩 중...</div>
      </div>
    );
  }

  if (step === 'selectMember') {
    return (
      <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px' }}>
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
            onClick={() => {
              if (!selectedTeammate) { alert('선택해주세요'); return; }
              setRoundStartTime(Date.now());
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
    const gender = isTeammate ? selectedTeammate?.gender : user?.gender;
    
    return (
      <div style={{ background: 'var(--text-light)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div style={{ background: '#2196F3', color: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center', marginBottom: '12px', fontWeight: '700', fontSize: '14px' }}>
          {title}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
          <button onClick={() => updateScore(isTeammate, -1)} style={{ width: '56px', height: '56px', border: '1px solid var(--border-color)', background: 'white', borderRadius: '8px', fontSize: '28px', fontWeight: '700', cursor: 'pointer' }}>−</button>
          <div style={{ fontSize: '48px', fontWeight: '700', minWidth: '50px', textAlign: 'center' }}>{score}</div>
          <button onClick={() => updateScore(isTeammate, 1)} style={{ width: '56px', height: '56px', border: '1px solid var(--border-color)', background: 'white', borderRadius: '8px', fontSize: '28px', fontWeight: '700', cursor: 'pointer' }}>+</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', fontSize: '12px' }}>
          <button onClick={() => setScoreValue(isTeammate, par)} style={{ padding: '12px', border: '1px solid var(--border-color)', background: gender === 'F' ? '#e74c3c' : 'var(--primary-green)', color: 'white', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
            PAR {par}
          </button>
          <button disabled style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', opacity: 0.5, fontWeight: '700' }}>SHOTS</button>
          <button onClick={() => setScoreValue(isTeammate, par * 2)} style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--primary-green)', color: 'white', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>DP</button>
          <div style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', textAlign: 'center', fontWeight: '700' }}>{isTeammate ? tmateUnder - tmatePar >= 0 ? '+' : '' : myUnder - myPar >= 0 ? '+' : ''}{isTeammate ? tmateUnder - tmatePar : myUnder - myPar}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px' }}>
      <div className="header">
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px', marginBottom: '12px' }}>
        <div style={{ border: '2px solid var(--primary-green)', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '13px' }}>
          <div style={{ fontWeight: '600', opacity: 0.7 }}>TIME</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{getTime()}</div>
        </div>
        <div style={{ border: '2px solid var(--primary-green)', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '13px' }}>
          <div style={{ fontWeight: '600', opacity: 0.7 }}>HOLE</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{currentHole}</div>
        </div>
        <div style={{ border: '2px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '13px', opacity: 0.5 }}>
          <div style={{ fontWeight: '600', opacity: 0.7 }}>TO MID</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>-</div>
        </div>
      </div>

      <ScoreSection title={`${selectedTeammate?.nickname || selectedTeammate?.name} (HC: ${selectedTeammate?.handicap || '-'})`} isTeammate={true} />
      
      <ScoreSection title={`${user?.nickname || user?.name} (HC: ${user?.handicap || '-'})`} isTeammate={false} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={() => currentHole > 1 && setCurrentHole(currentHole - 1)} disabled={currentHole === 1} style={{ flex: 1, padding: '12px', background: currentHole === 1 ? 'var(--bg-card)' : 'var(--text-light)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: currentHole === 1 ? 0.5 : 1 }}>← 이전</button>
        <button onClick={() => currentHole < 18 && setCurrentHole(currentHole + 1)} disabled={currentHole === 18} style={{ flex: 1, padding: '12px', background: currentHole === 18 ? 'var(--bg-card)' : 'var(--primary-green)', color: currentHole === 18 ? 'var(--text-dark)' : 'white', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: currentHole === 18 ? 0.5 : 1 }}>다음 →</button>
      </div>
    </div>
  );
}

export default Play;
