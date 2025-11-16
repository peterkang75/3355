import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import backArrow from '../assets/back-arrow.png';

function ScoreEntry() {
  const { user, saveScore } = useApp();
  const [currentHole, setCurrentHole] = useState(1);
  const [scores, setScores] = useState(
    Array(18).fill(null).map((_, idx) => ({
      hole: idx + 1,
      par: idx < 10 ? [4, 4, 3, 5, 4, 4, 3, 5, 4][idx] : [4, 5, 3, 4, 4, 5, 3, 4, 4][idx - 10],
      shots: 0,
      pickUp: false
    }))
  );
  const [roundStartTime] = useState(Date.now());

  const currentScore = scores[currentHole - 1];
  const totalShots = scores.slice(0, currentHole).reduce((sum, s) => sum + s.shots, 0);
  const totalPar = scores.slice(0, currentHole).reduce((sum, s) => sum + s.par, 0);
  const points = totalShots - totalPar;

  const updateShots = (change) => {
    setScores(scores.map((score, idx) => 
      idx === currentHole - 1 
        ? { ...score, shots: Math.max(0, score.shots + change) }
        : score
    ));
  };

  const togglePickUp = () => {
    setScores(scores.map((score, idx) => 
      idx === currentHole - 1 
        ? { ...score, pickUp: !score.pickUp }
        : score
    ));
  };

  const nextHole = () => {
    if (currentHole < 18) setCurrentHole(currentHole + 1);
  };

  const prevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const saveRound = async () => {
    if (window.confirm('라운드를 저장하시겠습니까?')) {
      const totalShots = scores.reduce((sum, s) => sum + s.shots, 0);
      const coursePar = scores.reduce((sum, s) => sum + s.par, 0);
      
      await saveScore({
        courseName: '라운드',
        totalScore: totalShots,
        coursePar: coursePar,
        holes: scores
      });
      
      alert('스코어가 저장되었습니다! 핸디캡이 업데이트되었습니다.');
    }
  };

  const elapsedTime = () => {
    const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      paddingBottom: '80px'
    }}>
      <div className="header">
        <button 
          onClick={prevHole}
          disabled={currentHole === 1}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-light)',
            padding: '8px 16px',
            opacity: currentHole === 1 ? 0.3 : 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <img src={backArrow} alt="뒤로가기" style={{ height: '16px', opacity: currentHole === 1 ? 0.3 : 1 }} />
          <span style={{ fontSize: '16px' }}>Back</span>
        </button>
        <button 
          onClick={saveRound}
          style={{
            background: 'transparent',
            color: 'var(--text-light)',
            fontSize: '16px',
            padding: '8px 16px'
          }}
        >
          Menu ≡
        </button>
      </div>

      <div style={{
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div style={{
          borderBottom: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '140px'
        }}>
          <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.7 }}>ROUND TIME</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>{elapsedTime()}</div>
        </div>

        <div style={{
          fontSize: '48px',
          fontWeight: '700',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '400', opacity: 0.7 }}>HOLE</div>
          {currentHole}
        </div>

        <div style={{
          borderBottom: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '140px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.7 }}>TO MID</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>
            {[360, 380, 165, 510, 385, 390, 175, 525, 410, 395, 495, 155, 370, 405, 520, 145, 400, 425][currentHole - 1]}m
          </div>
        </div>
      </div>

      <div style={{
        margin: '16px',
        border: '2px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'var(--primary-green)',
          padding: '16px',
          textAlign: 'center',
          color: 'var(--text-light)',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {user.name} (HC: {user.handicap})
        </div>

        <div style={{
          padding: '32px 16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '24px'
          }}>
            <button
              onClick={() => updateShots(-1)}
              style={{
                background: '#e5e5e5',
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                fontSize: '40px',
                color: 'var(--text-dark)',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              −
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '72px',
                fontWeight: '700',
                lineHeight: '1'
              }}>
                {currentScore.shots}
              </div>
              <div style={{
                fontSize: '14px',
                color: points === 0 ? 'var(--text-dark)' : points > 0 ? 'var(--alert-red)' : 'var(--success-green)',
                opacity: points === 0 ? 0.7 : 1,
                fontWeight: '600'
              }}>
                {points > 0 ? '+' : ''}{points} points
              </div>
            </div>

            <button
              onClick={() => updateShots(1)}
              style={{
                background: '#e5e5e5',
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                fontSize: '40px',
                color: 'var(--text-dark)',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}>
            <div style={{
              background: 'var(--primary-green)',
              color: 'var(--text-light)',
              padding: '16px 8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>PAR</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{currentScore.par}</div>
            </div>

            <div style={{
              background: '#f5f5f5',
              padding: '16px 8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.7 }}>SHOTS</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{currentScore.shots}</div>
            </div>

            <button
              onClick={togglePickUp}
              style={{
                background: currentScore.pickUp ? 'var(--success-green)' : '#f5f5f5',
                color: currentScore.pickUp ? 'var(--text-light)' : 'var(--text-dark)',
                padding: '16px 8px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>PICK UP</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {currentScore.pickUp ? '✓' : 'P'}
              </div>
            </button>

            <div style={{
              background: '#f5f5f5',
              padding: '16px 8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.7 }}>TOTAL</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{totalShots}</div>
            </div>
          </div>
        </div>
      </div>

      {currentHole < 18 && (
        <div style={{ padding: '0 16px' }}>
          <button 
            onClick={nextHole}
            style={{
              background: 'var(--primary-green)',
              color: 'var(--text-light)',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              width: '100%'
            }}
          >
            다음 홀 →
          </button>
        </div>
      )}

      {currentHole === 18 && (
        <div style={{ padding: '0 16px' }}>
          <button 
            onClick={saveRound}
            style={{
              background: 'var(--primary-green)',
              color: 'var(--text-light)',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              width: '100%'
            }}
          >
            라운드 저장
          </button>
        </div>
      )}
    </div>
  );
}

export default ScoreEntry;
