import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bookings, courses } = useApp();
  const bookingId = searchParams.get('id');
  
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('selectMember'); // 항상 selectMember로 시작
  const [selectedTeammate, setSelectedTeammate] = useState(null); // null로 시작
  const [teammates, setTeammates] = useState([]);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [holeScores, setHoleScores] = useState(Array(18).fill(0));
  const [courseData, setCourseData] = useState(null);

  // 페이지 로드 후 상태 확인
  useEffect(() => {
    setSelectedTeammate(null); // 상태 리셋
    setStep('selectMember'); // step을 다시 selectMember로
  }, [bookingId]);

  useEffect(() => {
    console.log('🎯 Play 페이지 로드:', bookingId);
    if (!bookingId || bookings.length === 0) return;
    
    const foundBooking = bookings.find(b => b.id === bookingId);
    console.log('📍 라운딩:', foundBooking?.title);
    setBooking(foundBooking);
    
    if (foundBooking?.teams) {
      try {
        const teams = typeof foundBooking.teams === 'string' ? JSON.parse(foundBooking.teams) : foundBooking.teams;
        const userTeam = teams.find(t => t.members?.some(m => m.phone === user?.phone));
        if (userTeam) {
          const members = userTeam.members.filter(m => m.phone !== user?.phone);
          console.log('👥 팀원:', members.length);
          setTeammates(members);
        }
      } catch (e) {
        console.error('팀 파싱:', e);
      }
    }

    const course = courses.find(c => c.name === foundBooking?.courseName);
    if (course) setCourseData(course);
  }, [bookingId, bookings, user?.phone, courses]);

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

  const getPar = () => {
    if (!courseData?.holePars || !selectedTeammate) return null;
    const arr = selectedTeammate.gender === 'F' ? courseData.holePars.female : courseData.holePars.male;
    return arr ? arr[currentHole - 1] : null;
  };

  const score = holeScores[currentHole - 1];
  const parArr = courseData?.holePars[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || [];
  let under = 0, par = 0;
  for (let i = 0; i < currentHole; i++) {
    if (holeScores[i] > 0) { under += holeScores[i]; par += (parArr[i] || 0); }
  }

  const handleSave = async () => {
    if (!window.confirm('저장?')) return;
    try {
      const total = holeScores.reduce((a, b) => a + b, 0);
      const coursePar = parArr.reduce((a, b) => a + b, 0);
      const today = new Date().toISOString().split('T')[0];
      
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: user.id,
          roundingName: booking?.title,
          date: today,
          courseName: courseData?.name,
          totalScore: total,
          coursePar,
          holes: holeScores
        })
      });
      alert('저장됨!');
      navigate(-1);
    } catch (e) { alert('오류'); }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px' }}>
      <div className="header">
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
        <button onClick={handleSave} style={{ background: 'transparent', color: 'var(--primary-green)', padding: '8px 16px', fontWeight: '600' }}>💾 저장</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
        <div style={{ border: '2px solid var(--primary-green)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>ROUND TIME</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{getTime()}</div>
        </div>
        <div style={{ border: '2px solid var(--primary-green)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>HOLE</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{currentHole}</div>
        </div>
        <div style={{ border: '2px solid var(--border-color)', borderRadius: '8px', padding: '12px', textAlign: 'center', opacity: 0.5 }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>TO MID</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>-</div>
        </div>
      </div>

      <div style={{ background: 'var(--primary-green)', color: 'white', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '700' }}>
        {selectedTeammate?.nickname || selectedTeammate?.name} (HC: {selectedTeammate?.handicap || '-'})
      </div>

      <div style={{ background: 'var(--text-light)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>점수</div>
          <div style={{ fontSize: '48px', fontWeight: '700' }}>{score}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
          <button onClick={() => { const s = [...holeScores]; s[currentHole - 1] = Math.max(0, score - 1); setHoleScores(s); }} style={{ width: '56px', height: '56px', border: '1px solid var(--border-color)', background: 'white', borderRadius: '8px', fontSize: '24px', fontWeight: '700', cursor: 'pointer' }}>−</button>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>조정</div>
          <button onClick={() => { const s = [...holeScores]; s[currentHole - 1] = score + 1; setHoleScores(s); }} style={{ width: '56px', height: '56px', border: '1px solid var(--border-color)', background: 'white', borderRadius: '8px', fontSize: '24px', fontWeight: '700', cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => { const p = getPar(); if (p) { const s = [...holeScores]; s[currentHole - 1] = p; setHoleScores(s); }}} style={{ padding: '12px', border: '1px solid var(--border-color)', background: selectedTeammate?.gender === 'F' ? '#e74c3c' : 'var(--primary-green)', color: 'white', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
          PAR<div style={{ fontSize: '20px', marginTop: '4px' }}>{getPar() || '-'}</div>
        </button>
        <button disabled style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-dark)', borderRadius: '8px', fontWeight: '700', opacity: 0.5 }}>
          SHOTS<div style={{ fontSize: '20px', marginTop: '4px' }}>-</div>
        </button>
        <button onClick={() => { const p = getPar(); if (p) { const s = [...holeScores]; s[currentHole - 1] = p * 2; setHoleScores(s); }}} style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--primary-green)', color: 'white', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>
          양파<div style={{ fontSize: '16px', marginTop: '4px' }}>DP</div>
        </button>
        <div style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '8px', fontWeight: '700', textAlign: 'center' }}>
          TOTAL<div style={{ fontSize: '20px', marginTop: '4px' }}>{under - par >= 0 ? '+' : ''}{under - par}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => currentHole > 1 && setCurrentHole(currentHole - 1)} disabled={currentHole === 1} style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', background: currentHole === 1 ? 'var(--bg-card)' : 'var(--text-light)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: currentHole === 1 ? 0.5 : 1 }}>← 이전</button>
        <button onClick={() => currentHole < 18 && setCurrentHole(currentHole + 1)} disabled={currentHole === 18} style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', background: currentHole === 18 ? 'var(--bg-card)' : 'var(--primary-green)', color: currentHole === 18 ? 'var(--text-dark)' : 'white', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: currentHole === 18 ? 0.5 : 1 }}>다음 →</button>
      </div>

      <button onClick={handleSave} style={{ width: '100%', padding: '16px', background: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>라운드 저장</button>
    </div>
  );
}

export default Play;
