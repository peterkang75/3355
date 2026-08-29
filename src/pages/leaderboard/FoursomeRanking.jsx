import React from 'react';

// 포썸 페어 순위표. 리더보드에서 단독 표시(포썸 라운딩)와
// 조별 지정 라운딩의 한 섹션으로 함께 쓰인다.
export default function FoursomeRanking({
  teams = [],
  onSelect,
  title = '포썸 팀 순위',
  subtitle = '2인 1팀 · 팀 핸디캡 적용 넷 순위',
}) {
  return (
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
          {title}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px' }}>
          {subtitle}
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

      {teams.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.5)', 
          padding: '40px 0' 
        }}>
          아직 스코어가 없습니다
        </div>
      ) : (
        teams.map((team, index) => (
          <div
            key={`${team.teamNumber}-${team.pairLabel}-${index}`}
            onClick={() => {
              if (team.score) {
                onSelect({
                  odId: `team-${team.teamNumber}-${team.pairLabel}`,
                  nickname: team.memberNames,
                  handicap: team.teamHandicap,
                  totalScore: team.score,
                  overUnder: team.overUnder,
                  holes: team.holes || [],
                  outScore: team.outScore,
                  inScore: team.inScore,
                  isFoursomeTeam: true,
                  teamNumber: team.teamNumber,
                  pairLabel: team.pairLabel,
                  netScore: team.netScore
                });
              }
            }}
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
              borderLeft: index === 0 && team.netScore != null ? '3px solid #FFD700' : 'none',
              cursor: team.score ? 'pointer' : 'default'
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
  );
}
