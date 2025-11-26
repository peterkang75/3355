import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Leaderboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { bookings, members, courses } = useApp();
  
  const [booking, setBooking] = useState(null);
  const [scores, setScores] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

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
      fetchScores(booking);
    }, 10000);
    return () => clearInterval(interval);
  }, [booking]);

  const fetchScores = async (booking) => {
    try {
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
      const coursePar = course?.holePars?.male?.reduce((a, b) => a + b, 0) || 72;

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

        return {
          odId: score.userId,
          nickname,
          handicap,
          grade,
          thru,
          totalScore,
          overUnder,
          completedHoles
        };
      });

      processedScores.sort((a, b) => {
        if (a.completedHoles === 0 && b.completedHoles === 0) return 0;
        if (a.completedHoles === 0) return 1;
        if (b.completedHoles === 0) return -1;
        return b.totalScore - a.totalScore;
      });

      setScores(processedScores);
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
        gap: '8px', 
        padding: '16px',
        flexWrap: 'wrap'
      }}>
        {gradeFilters.map(g => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: filter === g ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
              background: filter === g ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              fontSize: '13px',
              fontWeight: filter === g ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            {g}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50px 1fr 60px 60px 70px',
          gap: '8px',
          padding: '12px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          <div>순위</div>
          <div>대화명</div>
          <div style={{ textAlign: 'center' }}>핸디</div>
          <div style={{ textAlign: 'center' }}>총타수</div>
          <div style={{ textAlign: 'center' }}>+/-</div>
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
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 60px 60px 70px',
                gap: '8px',
                padding: '16px 8px',
                background: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                alignItems: 'center'
              }}
            >
              <div style={{ 
                color: 'white', 
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {index + 1}
              </div>
              <div>
                <div style={{ color: 'white', fontSize: '15px', fontWeight: '500' }}>
                  {score.nickname}
                </div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px'
              }}>
                {score.handicap || '-'}
              </div>
              <div style={{ 
                textAlign: 'center', 
                color: 'white',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {score.totalScore || '-'}
              </div>
              <div style={{ 
                textAlign: 'center', 
                color: score.overUnder > 0 ? '#ff6b6b' : score.overUnder < 0 ? '#51cf66' : 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {score.totalScore ? (score.overUnder > 0 ? `+${score.overUnder}` : score.overUnder) : '-'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
