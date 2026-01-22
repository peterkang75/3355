import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bookings, courses, members, refreshBookings } = useApp();
  const bookingId = searchParams.get('id');
  
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('selectMember');
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [gameMode, setGameMode] = useState('stroke');
  const [foursomeData, setFoursomeData] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [holeScores, setHoleScores] = useState({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
  const [courseData, setCourseData] = useState(null);
  const [showMismatches, setShowMismatches] = useState(false);
  const [showNtpModal, setShowNtpModal] = useState(false);
  const [ntpDistance, setNtpDistance] = useState('');
  const [serverMismatches, setServerMismatches] = useState([]);
  const [isCheckingScores, setIsCheckingScores] = useState(false);
  const [teammateReady, setTeammateReady] = useState(false);
  const [isSavingNtp, setIsSavingNtp] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [checkingInterval, setCheckingInterval] = useState(null);
  const [showEndRoundModal, setShowEndRoundModal] = useState(false);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [showHoleSelector, setShowHoleSelector] = useState(false);
  const [screenSize, setScreenSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));
  const skipAutoSaveRef = useRef(false);
  const lastRestoredBookingRef = useRef(null);
  
  useEffect(() => {
    let rafId;
    const updateSize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScreenSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      });
    };
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  
  // 연속적 스케일링: 기준 뷰포트 대비 현재 뷰포트 비율 계산
  const baseWidth = 400;  // 기준 너비 (iPhone SE 수준)
  const baseHeight = 820; // 기준 높이
  const widthScale = screenSize.width / baseWidth;
  const heightScale = screenSize.height / baseHeight;
  // 너비와 높이 중 더 작은 비율을 사용하되, 0.7~1.15 범위로 제한
  const rawScale = Math.min(widthScale, heightScale);
  const scale = Math.max(0.7, Math.min(1.15, rawScale));
  
  // 스케일된 값 계산 헬퍼 (최소값 보장)
  const s = (base, min = 0) => Math.max(min, Math.round(base * scale));
  
  // 터치 타겟은 최소 44px 보장
  const touchSize = (base) => Math.max(44, s(base));
  
  // 기존 플래그도 유지 (호환성)
  const screenHeight = screenSize.height;
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;
  const isTinyScreen = screenHeight < 550;

  // Play 페이지 진입 시 저장된 상태 복원 또는 초기화
  useEffect(() => {
    if (!bookingId) return;
    
    // 저장된 상태가 있으면 복원
    const savedState = sessionStorage.getItem(`play_state_${bookingId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('🔄 저장된 스코어 복원:', parsed);
        if (parsed.holeScores) setHoleScores(parsed.holeScores);
        if (parsed.currentHole) setCurrentHole(parsed.currentHole);
        if (parsed.selectedTeammate) setSelectedTeammate(parsed.selectedTeammate);
        if (parsed.step) setStep(parsed.step);
        if (parsed.roundStartTime) setRoundStartTime(parsed.roundStartTime);
        if (parsed.foursomeData) setFoursomeData(parsed.foursomeData);
        lastRestoredBookingRef.current = bookingId;
        return;
      } catch (e) {
        console.error('저장된 상태 복원 오류:', e);
      }
    }
    
    // 새 bookingId면 초기화
    if (lastRestoredBookingRef.current !== bookingId) {
      setSelectedTeammate(null);
      setStep('selectMember');
      setCurrentHole(1);
      setHoleScores({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
      setRoundStartTime(null);
      lastRestoredBookingRef.current = bookingId;
      console.log('🔄 Play 페이지 초기화:', bookingId);
    }
  }, [bookingId]);

  // 스코어 변경 시 sessionStorage에 자동 저장
  useEffect(() => {
    if (!bookingId || step === 'selectMember') return;
    
    const stateToSave = {
      holeScores,
      currentHole,
      selectedTeammate,
      step,
      roundStartTime,
      foursomeData
    };
    sessionStorage.setItem(`play_state_${bookingId}`, JSON.stringify(stateToSave));
    console.log('💾 스코어 자동 저장:', currentHole, holeScores);
  }, [bookingId, holeScores, currentHole, selectedTeammate, step, roundStartTime, foursomeData]);

  useEffect(() => {
    console.log('🎯 Play 페이지 로드:', bookingId);
    if (!bookingId || bookings.length === 0) return;
    
    const foundBooking = bookings.find(b => b.id === bookingId);
    console.log('📌 Booking 찾음:', foundBooking?.title);
    setBooking(foundBooking);
    
    // 게임 모드 파싱
    let detectedGameMode = 'stroke';
    if (foundBooking?.gradeSettings) {
      try {
        const gradeSettings = typeof foundBooking.gradeSettings === 'string'
          ? JSON.parse(foundBooking.gradeSettings)
          : foundBooking.gradeSettings;
        if (gradeSettings.mode) {
          detectedGameMode = gradeSettings.mode;
        }
      } catch (e) {
        console.error('gradeSettings 파싱 오류:', e);
      }
    }
    setGameMode(detectedGameMode);
    console.log('🎮 게임 모드:', detectedGameMode);
    
    if (foundBooking?.teams) {
      try {
        const teams = typeof foundBooking.teams === 'string' ? JSON.parse(foundBooking.teams) : foundBooking.teams;
        console.log('👥 팀 데이터:', teams);
        const userTeam = teams.find(t => t.members?.some(m => m?.phone === user?.phone));
        console.log('👤 사용자 팀:', userTeam);
        if (userTeam && userTeam.members) {
          // 사용자 슬롯 인덱스 찾기
          const userSlotIndex = userTeam.members.findIndex(m => m?.phone === user?.phone);
          console.log('👤 사용자 슬롯:', userSlotIndex);
          
          if (detectedGameMode === 'foursome' && userSlotIndex >= 0) {
            // 포썸 모드: 파트너와 상대 팀 식별
            const partnerSlotIndex = userSlotIndex % 2 === 0 ? userSlotIndex + 1 : userSlotIndex - 1;
            const isTeamA = userSlotIndex < 2;
            const opponentSlots = isTeamA ? [2, 3] : [0, 1];
            
            const partner = userTeam.members[partnerSlotIndex];
            const opponent1 = userTeam.members[opponentSlots[0]];
            const opponent2 = userTeam.members[opponentSlots[1]];
            
            // 멤버 정보 보강
            const enrichMember = (tm) => {
              if (!tm) return null;
              const fullMember = members?.find(m => m.phone === tm.phone);
              return fullMember ? { ...tm, ...fullMember } : tm;
            };
            
            const enrichedPartner = enrichMember(partner);
            const enrichedOpponent1 = enrichMember(opponent1);
            const enrichedOpponent2 = enrichMember(opponent2);
            
            // 팀 핸디캡 계산 (저장된 값이 없으면 실시간 계산)
            const getHandicapValue = (member) => {
              if (!member) return 36;
              const hcp = parseFloat(member.gaHandy) || parseFloat(member.handicap) || parseFloat(member.houseHandy) || 36;
              return hcp;
            };
            
            const enrichedUser = enrichMember({ phone: user?.phone });
            const pairA = [userTeam.members[0], userTeam.members[1]].filter(Boolean);
            const pairB = [userTeam.members[2], userTeam.members[3]].filter(Boolean);
            
            let teamAHandicap = userTeam.pairAHandicap;
            let teamBHandicap = userTeam.pairBHandicap;
            
            if (teamAHandicap == null && pairA.length >= 2) {
              const h1 = getHandicapValue(enrichMember(pairA[0]));
              const h2 = getHandicapValue(enrichMember(pairA[1]));
              teamAHandicap = parseFloat(((h1 + h2) / 2).toFixed(1));
            }
            if (teamBHandicap == null && pairB.length >= 2) {
              const h1 = getHandicapValue(enrichMember(pairB[0]));
              const h2 = getHandicapValue(enrichMember(pairB[1]));
              teamBHandicap = parseFloat(((h1 + h2) / 2).toFixed(1));
            }
            
            setFoursomeData({
              userSlotIndex,
              isTeamA,
              partner: enrichedPartner,
              opponents: [enrichedOpponent1, enrichedOpponent2].filter(Boolean),
              teamAHandicap,
              teamBHandicap
            });
            
            console.log('🏌️ 포썸 데이터:', {
              partner: enrichedPartner?.name,
              opponents: [enrichedOpponent1?.name, enrichedOpponent2?.name]
            });
            
            // 상대 팀 첫 번째 선수를 자동 선택 (마커 로직 유지)
            if (enrichedOpponent1) {
              setSelectedTeammate(enrichedOpponent1);
            }
            
            // 전체 팀원 (파트너 + 상대 모두)
            const allTeammates = [enrichedPartner, enrichedOpponent1, enrichedOpponent2].filter(Boolean);
            setTeammates(allTeammates);
          } else {
            // 스트로크 모드: 기존 로직
            setFoursomeData(null);
            const teamMembers = userTeam.members.filter(m => m && m.phone !== user?.phone);
            const enrichedTeammates = teamMembers.map(tm => {
              const fullMember = members?.find(m => m.phone === tm.phone);
              return fullMember ? { ...tm, ...fullMember } : tm;
            });
            console.log('🤝 팀원:', enrichedTeammates);
            setTeammates(enrichedTeammates);
          }
        } else {
          console.log('⚠️ 팀 정보 없음, 팀원 배열 초기화');
          setTeammates([]);
          setFoursomeData(null);
        }
      } catch (e) {
        console.error('팀 파싱 에러:', e);
        setTeammates([]);
        setFoursomeData(null);
      }
    } else {
      console.log('⚠️ Booking에 teams 정보 없음');
      setTeammates([]);
      setFoursomeData(null);
    }

    const course = courses.find(c => c.name === foundBooking?.courseName);
    console.log('⛳ 코스 찾기:', foundBooking?.courseName, '→', course?.name || '없음');
    if (course) {
      setCourseData(course);
    } else {
      setCourseData({
        name: foundBooking?.courseName || '미등록 코스',
        holePars: {
          male: [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
          female: [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4]
        }
      });
    }
  }, [bookingId, bookings, user?.phone, courses, members]);

  // 실시간 저장 - sessionStorage에만 저장 (서버 저장은 명시적으로 완료할 때만)
  // 서버 자동 저장 비활성화: 사용자가 저장하지 않고 종료하면 데이터가 남지 않도록 함

  const isAllHolesComplete = () => {
    return holeScores.me.every(score => score > 0) && holeScores.teammate.every(score => score > 0);
  };

  const handleRoundComplete = async () => {
    try {
      const existingHandicaps = booking?.dailyHandicaps 
        ? (typeof booking.dailyHandicaps === 'string' 
            ? JSON.parse(booking.dailyHandicaps) 
            : booking.dailyHandicaps)
        : {};
      
      const dailyHandicaps = { ...existingHandicaps };
      
      const userMember = members?.find(m => m.phone === user?.phone);
      if (userMember) {
        dailyHandicaps[userMember.phone] = parseFloat(userMember.handicap) || 0;
      }
      
      const teammateMember = members?.find(m => m.phone === selectedTeammate?.phone);
      if (teammateMember) {
        dailyHandicaps[teammateMember.phone] = parseFloat(teammateMember.handicap) || 0;
      }
      
      if (Object.keys(dailyHandicaps).length > 0 && bookingId) {
        await fetch(`/api/bookings/${bookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dailyHandicaps })
        });
        
        if (refreshBookings) {
          await refreshBookings();
        }
      }
      
      setStep('roundComplete');
    } catch (e) {
      console.error('라운드 완료 처리 오류:', e);
      setStep('roundComplete');
    }
  };

  const getTeammateMemberId = useCallback(() => {
    if (!selectedTeammate?.phone || !members) return selectedTeammate?.phone;
    const member = members.find(m => m.phone === selectedTeammate.phone);
    return member?.id || selectedTeammate.phone;
  }, [selectedTeammate, members]);

  const checkTeammateScores = useCallback(async () => {
    if (!booking || !user) return false;
    try {
      const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const teammateMemberId = getTeammateMemberId();
      
      const res = await fetch('/api/scores/verify-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundingName: booking.title,
          date: scoreDate,
          myId: user.id,
          teammateId: teammateMemberId,
          myHoles: holeScores.me,
          teammateHolesRecordedByMe: holeScores.teammate
        })
      });
      const data = await res.json();
      
      if (data.error === 'TEAMMATE_NOT_READY') {
        setTeammateReady(false);
        return false;
      }
      
      setTeammateReady(true);
      
      if (data.verified) {
        setServerMismatches([]);
      } else {
        setServerMismatches(data.mismatches || []);
      }
      
      return true;
    } catch (e) {
      console.error('점수 확인 오류:', e);
      return false;
    }
  }, [booking, user, getTeammateMemberId, holeScores]);

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
    
    // 포썸 모드: 팀 대 팀 확인 UI
    if (gameMode === 'foursome' && foursomeData) {
      const partnerName = foursomeData.partner?.nickname || foursomeData.partner?.name || '파트너 없음';
      const opponentNames = foursomeData.opponents.map(o => o?.nickname || o?.name).filter(Boolean).join(' & ') || '상대 없음';
      const myName = user?.nickname || user?.name || '나';
      const teamLabel = foursomeData.isTeamA ? 'A팀' : 'B팀';
      const opponentTeamLabel = foursomeData.isTeamA ? 'B팀' : 'A팀';
      const myTeamHandicap = foursomeData.isTeamA ? foursomeData.teamAHandicap : foursomeData.teamBHandicap;
      const opponentTeamHandicap = foursomeData.isTeamA ? foursomeData.teamBHandicap : foursomeData.teamAHandicap;
      
      const handleStartFoursome = async () => {
        if (isStartingRound) return;
        
        setIsStartingRound(true);
        try {
          const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const teammateMemberId = members?.find(m => m.phone === selectedTeammate?.phone)?.id || selectedTeammate?.id;
          const res = await fetch(`/api/scores/check?memberId=${teammateMemberId}&date=${scoreDate}&roundingName=${encodeURIComponent(booking?.title || '')}`);
          const data = await res.json();
          
          if (data.exists && data.completed) {
            alert('이미 점수가 입력되었습니다.');
            setIsStartingRound(false);
            return;
          }
        } catch (e) {
          console.error('점수 확인 오류:', e);
        }
        
        console.log('🎮 포썸 스코어카드 시작:', { opponents: opponentNames, courseData: courseData?.name });
        setRoundStartTime(Date.now());
        setCurrentHole(1);
        setHoleScores({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
        setShowMismatches(false);
        setStep('scorecard');
        setIsStartingRound(false);
      };
      
      return (
        <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px', background: '#223B3F' }}>
          <div className="header">
            <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
          </div>
          <div className="card" style={{ marginTop: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                display: 'inline-block',
                padding: '6px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                marginBottom: '12px'
              }}>
                포썸 매치
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                팀 대 팀 경기를 시작합니다
              </h2>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {courseData?.name}
              </div>
            </div>
            
            {/* 우리 팀 */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '700', 
                color: '#3B82F6', 
                marginBottom: '8px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span>{teamLabel} (우리 팀)</span>
                {myTeamHandicap != null && (
                  <span style={{
                    background: '#3B82F6',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    핸디 {myTeamHandicap}
                  </span>
                )}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  background: '#3B82F6',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px'
                }}>
                  {myName}
                </div>
                <span style={{ fontWeight: '600', color: '#3B82F6' }}>&</span>
                <div style={{
                  background: '#3B82F6',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px'
                }}>
                  {partnerName}
                </div>
              </div>
            </div>
            
            {/* VS 구분선 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 0'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, transparent, #ddd, transparent)',
                height: '1px',
                flex: 1
              }} />
              <span style={{
                padding: '6px 20px',
                fontSize: '16px',
                fontWeight: '800',
                color: '#888',
                background: 'white',
                borderRadius: '16px',
                border: '2px solid #ddd'
              }}>
                VS
              </span>
              <div style={{
                background: 'linear-gradient(90deg, transparent, #ddd, transparent)',
                height: '1px',
                flex: 1
              }} />
            </div>
            
            {/* 상대 팀 */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '700', 
                color: '#EF4444', 
                marginBottom: '8px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span>{opponentTeamLabel} (상대 팀)</span>
                {opponentTeamHandicap != null && (
                  <span style={{
                    background: '#EF4444',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    핸디 {opponentTeamHandicap}
                  </span>
                )}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                {foursomeData.opponents.map((opponent, idx) => (
                  <React.Fragment key={opponent?.phone || idx}>
                    {idx > 0 && <span style={{ fontWeight: '600', color: '#EF4444' }}>&</span>}
                    <div style={{
                      background: '#EF4444',
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '15px'
                    }}>
                      {opponent?.nickname || opponent?.name || '상대'}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleStartFoursome}
              disabled={isStartingRound || !selectedTeammate}
              style={{
                width: '100%',
                padding: '16px',
                background: (!isStartingRound && selectedTeammate) ? 'var(--primary-green)' : 'var(--bg-card)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '700',
                fontSize: '16px',
                cursor: (!isStartingRound && selectedTeammate) ? 'pointer' : 'not-allowed',
                opacity: (!isStartingRound && selectedTeammate) ? 1 : 0.5
              }}
            >
              {isStartingRound ? '확인 중...' : '매치 시작'}
            </button>
          </div>
        </div>
      );
    }
    
    // 스트로크 모드: 기존 UI
    return (
      <div style={{ minHeight: '100vh', padding: '16px', paddingBottom: '80px', background: '#223B3F' }}>
        <div className="header">
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-light)', padding: '8px 16px' }}>← Back</button>
        </div>
        <div className="card" style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>내가 마크할 회원을 선택하세요</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {(() => {
              // 2BB 파트너 확인
              let my2BBPartnerPhone = null;
              const is2BB = booking?.is2BB || false;
              const squadSize = teammates.length + 1; // 나 포함
              
              if (is2BB && booking?.twoBallTeams) {
                try {
                  const twoBallTeams = typeof booking.twoBallTeams === 'string' 
                    ? JSON.parse(booking.twoBallTeams) 
                    : booking.twoBallTeams;
                  
                  for (const team of twoBallTeams) {
                    const teamMembers = team.members || [];
                    const myIndex = teamMembers.findIndex(m => m?.phone === user?.phone);
                    if (myIndex !== -1) {
                      const partnerIndex = myIndex === 0 ? 1 : 0;
                      my2BBPartnerPhone = teamMembers[partnerIndex]?.phone;
                      break;
                    }
                  }
                } catch (e) {
                  console.error('2BB 팀 파싱 오류:', e);
                }
              }
              
              return teammates.map(teammate => {
                const isSelected = selectedTeammate?.phone === teammate.phone;
                const is2BBPartner = my2BBPartnerPhone === teammate.phone;
                const isDisabled = is2BB && is2BBPartner && squadSize === 4;
                
                return (
                  <div
                    key={teammate.phone}
                    onClick={() => !isDisabled && setSelectedTeammate(teammate)}
                    style={{
                      padding: '16px',
                      border: isSelected ? '2px solid #2196F3' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: isDisabled ? '#f5f5f5' : isSelected ? '#E3F2FD' : 'var(--text-light)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: isDisabled ? 0.6 : 1
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: isSelected ? '#1565C0' : 'inherit', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {teammate.nickname || teammate.name}
                        {is2BBPartner && (
                          <span style={{
                            background: '#FF9800',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>🤝 2BB 파트너</span>
                        )}
                        {isDisabled && (
                          <span style={{ fontSize: '11px', color: '#e74c3c' }}>(파트너는 마크 불가)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: isSelected ? '#1976D2' : 'var(--text-dark)', marginTop: '4px' }}>
                        핸디캡 : {teammate.gaHandy ? `GA${teammate.gaHandy}` : teammate.golflinkNumber && teammate.handicap ? `GA${teammate.handicap}` : teammate.houseHandy ? `HH${teammate.houseHandy}` : teammate.handicap || '-'}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '20px', 
                      color: isDisabled ? '#ccc' : isSelected ? '#2196F3' : '#ccc',
                      fontWeight: '600'
                    }}>
                      ›
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <button
            onClick={async () => {
              if (isStartingRound) return;
              if (!selectedTeammate) { alert('선택해주세요'); return; }
              
              setIsStartingRound(true);
              try {
                const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                const teammateMemberId = members?.find(m => m.phone === selectedTeammate?.phone)?.id || selectedTeammate?.id;
                const res = await fetch(`/api/scores/check?memberId=${teammateMemberId}&date=${scoreDate}&roundingName=${encodeURIComponent(booking?.title || '')}`);
                const data = await res.json();
                
                if (data.exists && data.completed) {
                  alert('이미 점수가 입력되었습니다.');
                  setIsStartingRound(false);
                  return;
                }
              } catch (e) {
                console.error('점수 확인 오류:', e);
              }
              
              console.log('🎮 스코어카드 시작:', { teammate: selectedTeammate?.name, courseData: courseData?.name });
              setRoundStartTime(Date.now());
              setCurrentHole(1);
              setHoleScores({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
              setShowMismatches(false);
              setStep('scorecard');
              setIsStartingRound(false);
            }}
            disabled={!selectedTeammate || isStartingRound}
            style={{
              width: '100%',
              padding: '16px',
              background: (selectedTeammate && !isStartingRound) ? 'var(--primary-green)' : 'var(--bg-card)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              cursor: (selectedTeammate && !isStartingRound) ? 'pointer' : 'not-allowed',
              opacity: (selectedTeammate && !isStartingRound) ? 1 : 0.5
            }}
          >
            {isStartingRound ? '확인 중...' : '플레이하기'}
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
                  onClick={handleRoundComplete}
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
    const parArrTeammate = courseData?.holePars?.[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || [];
    const parArrMe = courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male'] || [];
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
          onClick={() => navigate('/')}
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

  if (step === 'scorecard' && !courseData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#223B3F', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>로딩 중...</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>코스 정보를 불러오고 있습니다</div>
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

  const parArr = courseData?.holePars?.[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || [];
  const userParArr = courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male'] || [];
  
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
      ? courseData?.holePars?.[selectedTeammate?.gender === 'F' ? 'female' : 'male']?.[currentHole - 1]
      : courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male']?.[currentHole - 1];
    
    const parArrForCalc = isTeammate ? parArr : userParArr;
    let totalScore = 0, totalPar = 0;
    const scoreArr = isTeammate ? holeScores.teammate : holeScores.me;
    for (let i = 0; i < currentHole; i++) {
      if (scoreArr[i] > 0) { totalScore += scoreArr[i]; totalPar += (parArrForCalc[i] || 0); }
    }
    const diff = totalScore - totalPar;
    const diffText = diff > 0 ? '+' + diff : diff === 0 ? 'E' : String(diff);
    
    // OUT (1-9홀) / IN (10-18홀) 계산
    let outScore = 0, inScore = 0;
    for (let i = 0; i < 9; i++) {
      if (scoreArr[i] > 0) outScore += scoreArr[i];
    }
    for (let i = 9; i < 18; i++) {
      if (scoreArr[i] > 0) inScore += scoreArr[i];
    }
    
    const isNearHole = !isTeammate && courseData?.nearHoles?.[currentHole - 1];
    
    const iosButtonStyle = { WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', userSelect: 'none' };
    const largeBoxSize = `${touchSize(60)}px`;
    const currentUserMember = members?.find(m => m.phone === user?.phone);
    const checkFemale = (gender) => gender === 'F' || gender === '여' || gender === 'female';
    
    // 포썸 모드에서는 팀 단위이므로 여성 스타일 강제 비활성화
    const isFoursome = gameMode === 'foursome';
    const isFemale = isFoursome 
      ? false 
      : (isTeammate 
          ? checkFemale(selectedTeammate?.gender) 
          : (checkFemale(user?.gender) || checkFemale(currentUserMember?.gender)));
    const boxStyle = { width: largeBoxSize, height: largeBoxSize, padding: `${s(8, 4)}px`, background: 'white', border: '2px solid #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: `${s(24, 14)}px`, color: '#000', ...iosButtonStyle };
    const buttonStyle = { width: largeBoxSize, height: largeBoxSize, padding: `${s(8, 4)}px`, border: '2px solid #ccc', background: 'white', color: '#000', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: `${s(24, 14)}px`, ...iosButtonStyle };
    
    const handleParClick = () => {
      if (score === par) {
        setScoreValue(isTeammate, par * 2);
      } else if (score === par * 2) {
        // 이미 2배인 경우 더 이상 증가하지 않음
      } else {
        setScoreValue(isTeammate, par);
      }
    };
    
    // 포썸 모드 타이틀 생성
    let displayTitle = title;
    let headerBgColor = '#6399CF';
    
    if (gameMode === 'foursome' && foursomeData) {
      const myTeamHandicap = foursomeData.isTeamA ? foursomeData.teamAHandicap : foursomeData.teamBHandicap;
      const opponentTeamHandicap = foursomeData.isTeamA ? foursomeData.teamBHandicap : foursomeData.teamAHandicap;
      
      if (isTeammate) {
        // 상대 팀 (opponent)
        const opponentNames = foursomeData.opponents.map(o => o?.nickname || o?.name).filter(Boolean).join(' & ');
        const handicapText = opponentTeamHandicap != null ? ` (팀핸디 ${opponentTeamHandicap})` : '';
        displayTitle = `상대: ${opponentNames || '상대 팀'}${handicapText}`;
        headerBgColor = '#EF4444';
      } else {
        // 우리 팀 (me + partner)
        const myName = user?.nickname || user?.name || '나';
        const partnerName = foursomeData.partner?.nickname || foursomeData.partner?.name || '파트너';
        const handicapText = myTeamHandicap != null ? ` (팀핸디 ${myTeamHandicap})` : '';
        displayTitle = `우리팀: ${myName} & ${partnerName}${handicapText}`;
        headerBgColor = '#3B82F6';
      }
    }
    
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '0', padding: '0', marginBottom: `${s(10, 4)}px`, minHeight: 0 }}>
        <div style={{ background: headerBgColor, color: 'white', padding: `${s(12, 6)}px`, borderRadius: '0', textAlign: 'center', fontWeight: '700', fontSize: `${s(18, 12)}px`, flexShrink: 0 }}>
          {displayTitle}
        </div>
        
        <div style={{ background: 'white', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: `${s(6, 1)}px`, padding: `${s(16, 4)}px ${s(16, 10)}px ${s(4, 0)}px ${s(16, 10)}px`, borderBottom: '1px solid #e0e0e0', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${s(18, 10)}px` }}>
            <button onClick={() => updateScore(isTeammate, -1)} style={{ width: `${touchSize(44)}px`, height: `${touchSize(44)}px`, border: '1px solid #999', background: 'white', borderRadius: '6px', fontSize: `${s(22, 14)}px`, fontWeight: '700', cursor: 'pointer', color: '#666', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>−</button>
            <div style={{ fontSize: `${s(52, 26)}px`, fontWeight: '600', minWidth: `${s(56, 32)}px`, textAlign: 'center', color: '#000' }}>{score}</div>
            <button onClick={() => updateScore(isTeammate, 1)} style={{ width: `${touchSize(44)}px`, height: `${touchSize(44)}px`, border: '1px solid #999', background: 'white', borderRadius: '6px', fontSize: `${s(22, 14)}px`, fontWeight: '700', cursor: 'pointer', color: '#666', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>+</button>
          </div>
          <div style={{ fontSize: `${s(12, 8)}px`, color: '#666', fontWeight: '400' }}>{score} points</div>
        </div>

        <div style={{ background: 'white', padding: `${s(10, 4)}px ${s(16, 10)}px`, display: 'flex', flexDirection: 'column', gap: `${s(10, 4)}px`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: `${s(14, 8)}px`, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${s(5, 2)}px`, alignItems: 'center' }}>
              <div style={{ fontSize: `${s(13, 9)}px`, fontWeight: '700', color: '#666' }}>PAR</div>
              <button 
                onClick={handleParClick} 
                style={{ 
                  ...boxStyle, 
                  border: score === par * 2 ? '3px solid #A62B1F' : '2px solid #ccc', 
                  background: isFemale ? '#D96941' : 'white',
                  color: isFemale ? 'white' : '#000',
                  cursor: 'pointer' 
                }}
              >
                {par}
              </button>
            </div>
            
            {isNearHole && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: `${s(5, 2)}px`, alignItems: 'center' }}>
                <div style={{ fontSize: `${s(13, 9)}px`, fontWeight: '700', color: '#666' }}>NTP</div>
                <button onClick={() => { setNtpDistance(''); setShowNtpModal(true); }} style={{ ...buttonStyle, background: '#6399CF', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
                  <svg width={s(36, 20)} height={s(36, 20)} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="25" cy="15" r="8" stroke="white" strokeWidth="3"/>
                    <line x1="25" y1="23" x2="25" y2="42" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${s(5, 2)}px`, alignItems: 'center' }}>
              <div style={{ fontSize: `${s(13, 9)}px`, fontWeight: '700', color: '#666' }}>OUT/IN</div>
              <div style={{ 
                ...boxStyle, 
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '0px',
                padding: `${s(4, 2)}px`
              }}>
                <div style={{ fontSize: `${s(16, 11)}px`, fontWeight: '700', color: '#000', lineHeight: 1.2 }}>{outScore || '-'}</div>
                <div style={{ width: '70%', height: '1px', background: '#ccc', margin: `${s(2, 1)}px 0` }}></div>
                <div style={{ fontSize: `${s(16, 11)}px`, fontWeight: '700', color: '#000', lineHeight: 1.2 }}>{inScore || '-'}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${s(5, 2)}px`, alignItems: 'center' }}>
              <div style={{ fontSize: `${s(13, 9)}px`, fontWeight: '700', color: '#000' }}>+/−</div>
              <div style={{ ...boxStyle }}>{diffText}</div>
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

  const handleScoreCheck = async () => {
    try {
      const userParArr = courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male'] || [];
      const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      const totalMe = holeScores.me.reduce((a, b) => a + b, 0);
      const coursePar = userParArr.reduce((a, b) => a + b, 0);

      if (!user?.id || !booking?.title) {
        console.log('⚠️ 스코어 체크 저장 스킵 - 필수 데이터 없음:', { userId: user?.id, bookingTitle: booking?.title });
        return;
      }

      // 포썸 메타데이터 생성
      const myGameMetadata = gameMode === 'foursome' && foursomeData ? {
        partner: { name: foursomeData.partner?.nickname || foursomeData.partner?.name, phone: foursomeData.partner?.phone },
        opponents: foursomeData.opponents?.map(o => ({ name: o?.nickname || o?.name, phone: o?.phone })) || [],
        recordedBy: user?.nickname || user?.name,
      } : null;
      
      const scoreData = {
        markerId: user.id,
        roundingName: booking.title,
        date: scoreDate,
        courseName: courseData?.name,
        totalScore: totalMe,
        coursePar,
        holes: holeScores.me,
        gameMode: gameMode === 'foursome' ? 'foursome' : null,
        gameMetadata: myGameMetadata,
      };

      // 내 스코어 저장
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scoreData, memberId: user.id })
      });
    } catch (e) {
      console.error('점수 저장 오류:', e);
    }
    
    setTeammateReady(false);
    setServerMismatches([]);
    setStep('scoreCheck');
  };
  
  return (
    <div 
      style={{ 
        height: '100dvh', 
        maxHeight: '-webkit-fill-available',
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
      <div className="header" style={{ 
        background: '#223B3F', 
        borderBottom: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `0 ${s(14, 8)}px`,
        flexShrink: 0,
        minHeight: `${s(42, 34)}px`
      }}>
        <button
          onClick={() => setShowEndRoundModal(true)}
          style={{
            background: '#e74c3c',
            border: 'none',
            borderRadius: '6px',
            padding: `${s(7, 4)}px ${s(9, 5)}px`,
            color: 'white',
            fontSize: `${s(11, 8)}px`,
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          라운드 종료
        </button>
        <div style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: `${s(14, 10)}px`, fontWeight: '600' }}>
          {booking?.title}
        </div>
        <button
          onClick={() => {
            console.log('📊 리더보드 이동 - 상태 유지');
            navigate(`/leaderboard?id=${bookingId}`);
          }}
          style={{
            background: '#d69e2e',
            border: 'none',
            borderRadius: '6px',
            padding: `${s(7, 4)}px ${s(10, 6)}px`,
            color: 'white',
            fontSize: `${s(11, 8)}px`,
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Leaderboard
        </button>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: `${s(14, 6)}px`, 
        padding: `${s(14, 5)}px ${s(20, 10)}px`, 
        marginBottom: '0',
        flexShrink: 0
      }}>
        <button 
          onClick={goToPreviousHole}
          onTouchEnd={goToPreviousHole}
          style={{ 
            flex: 1,
            border: '2px solid white', 
            borderRadius: '8px', 
            padding: `${s(10, 4)}px ${s(14, 6)}px`,
            background: 'white', 
            color: '#223B3F', 
            fontSize: `${s(11, 8)}px`, 
            fontWeight: '700', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${s(5, 1)}px`,
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div style={{ fontSize: `${s(13, 9)}px`, fontWeight: '900' }}>←</div>
          <div>이전홀</div>
        </button>
        <button 
          onClick={() => setShowHoleSelector(true)}
          style={{ 
            border: '2px solid white', 
            borderRadius: '8px', 
            padding: `${s(10, 4)}px ${s(20, 10)}px`, 
            textAlign: 'center', 
            fontSize: `${s(11, 8)}px`, 
            background: 'transparent', 
            color: 'white',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <div style={{ fontWeight: '700', opacity: 1, fontSize: `${s(11, 8)}px` }}>HOLE ▼</div>
          <div style={{ fontSize: `${s(30, 18)}px`, fontWeight: '700', marginTop: `${s(5, 1)}px` }}>{currentHole}</div>
        </button>
        <button 
          onClick={currentHole === 18 ? handleScoreCheck : goToNextHole}
          style={{ 
            flex: 1,
            border: '2px solid white', 
            borderRadius: '8px', 
            padding: `${s(10, 4)}px ${s(14, 6)}px`,
            background: currentHole === 18 ? '#6399CF' : 'white', 
            color: currentHole === 18 ? 'white' : '#223B3F', 
            fontSize: `${s(11, 8)}px`, 
            fontWeight: '700', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${s(5, 1)}px`,
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div style={{ fontSize: `${s(13, 9)}px`, fontWeight: '900' }}>{currentHole === 18 ? '✓' : '→'}</div>
          <div>{currentHole === 18 ? '점수점검' : '다음홀'}</div>
        </button>
      </div>

      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: `${s(10, 3)}px ${s(20, 8)}px`, 
          position: 'relative',
          overflow: 'auto',
          minHeight: 0
        }}
      >
        <ScoreSection title={`${selectedTeammate?.nickname || selectedTeammate?.name} (HC: ${selectedTeammate?.handicap || '-'})`} isTeammate={true} />
        
        <ScoreSection title={`${user?.nickname || user?.name} (HC: ${user?.handicap || '-'})`} isTeammate={false} />

      </div>

      {/* 홀 선택 모달 */}
      {showHoleSelector && (
        <div 
          onClick={() => setShowHoleSelector(false)}
          style={{
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
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a2e',
              borderRadius: '16px',
              padding: '20px',
              width: '90%',
              maxWidth: '320px'
            }}
          >
            <div style={{ 
              color: 'white', 
              fontSize: '16px', 
              fontWeight: '700', 
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              홀 선택
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, 1fr)', 
              gap: '8px'
            }}>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
                <button
                  key={hole}
                  onClick={() => {
                    setCurrentHole(hole);
                    setShowHoleSelector(false);
                  }}
                  style={{
                    padding: '12px 8px',
                    background: currentHole === hole ? '#4a9d6a' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: currentHole === hole ? '2px solid #4a9d6a' : '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  {hole}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowHoleSelector(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

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

      {showEndRoundModal && (
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
            maxWidth: '340px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
              라운드 종료
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>
              라운드를 어떻게 종료하시겠습니까?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={async () => {
                  if (isEndingRound) return;
                  setIsEndingRound(true);
                  try {
                    const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                    const teammateMemberId = members?.find(m => m.phone === selectedTeammate?.phone)?.id || selectedTeammate?.id;
                    const userParArr = courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male'] || [];
                    const totalMe = holeScores.me.reduce((a, b) => a + b, 0);
                    const coursePar = userParArr.reduce((a, b) => a + b, 0);
                    
                    // 포썸 메타데이터 생성
                    const myGameMetadata = gameMode === 'foursome' && foursomeData ? {
                      partner: { name: foursomeData.partner?.nickname || foursomeData.partner?.name, phone: foursomeData.partner?.phone },
                      opponents: foursomeData.opponents?.map(o => ({ name: o?.nickname || o?.name, phone: o?.phone })) || [],
                      recordedBy: user?.nickname || user?.name,
                    } : null;
                    
                    // 내 스코어 저장
                    await fetch('/api/scores', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        memberId: user.id,
                        markerId: user.id,
                        roundingName: booking.title,
                        date: scoreDate,
                        courseName: courseData?.name || booking.courseName,
                        totalScore: totalMe,
                        coursePar,
                        holes: holeScores.me,
                        gameMode: gameMode === 'foursome' ? 'foursome' : null,
                        gameMetadata: myGameMetadata,
                      })
                    });
                    
                    // 스코어 완료 처리
                    await fetch('/api/scores/complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        memberId: teammateMemberId,
                        markerId: user.id,
                        date: scoreDate,
                        roundingName: booking?.title
                      })
                    });
                    
                    sessionStorage.removeItem(`play_state_${bookingId}`);
                    setShowEndRoundModal(false);
                    navigate(-1);
                  } catch (e) {
                    console.error('라운드 완료 오류:', e);
                    alert('처리 중 오류가 발생했습니다.');
                  } finally {
                    setIsEndingRound(false);
                  }
                }}
                disabled={isEndingRound}
                style={{
                  padding: '14px',
                  background: isEndingRound ? '#999' : 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: isEndingRound ? 'not-allowed' : 'pointer',
                  opacity: isEndingRound ? 0.7 : 1
                }}
              >
                {isEndingRound ? '처리중...' : '스코어 저장하고 종료하기'}
              </button>
              <button
                onClick={async () => {
                  if (isEndingRound) return;
                  
                  if (!confirm('저장하지 않고 종료하면 현재까지 입력한 점수가 모두 삭제됩니다. 계속하시겠습니까?')) {
                    return;
                  }
                  
                  skipAutoSaveRef.current = true;
                  setIsEndingRound(true);
                  
                  try {
                    const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                    const teammateMemberId = members?.find(m => m.phone === selectedTeammate?.phone)?.id || selectedTeammate?.id;
                    
                    await new Promise(resolve => setTimeout(resolve, 600));
                    
                    await fetch(`/api/scores/member/${encodeURIComponent(teammateMemberId)}/${encodeURIComponent(user.id)}/${encodeURIComponent(scoreDate)}/${encodeURIComponent(booking?.title || '')}`, {
                      method: 'DELETE'
                    });
                    
                    sessionStorage.removeItem(`play_state_${bookingId}`);
                    setShowEndRoundModal(false);
                    navigate(-1);
                  } catch (e) {
                    console.error('스코어 삭제 오류:', e);
                    alert('처리 중 오류가 발생했습니다.');
                    skipAutoSaveRef.current = false;
                  } finally {
                    setIsEndingRound(false);
                  }
                }}
                disabled={isEndingRound}
                style={{
                  padding: '14px',
                  background: isEndingRound ? '#999' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: isEndingRound ? 'not-allowed' : 'pointer',
                  opacity: isEndingRound ? 0.7 : 1
                }}
              >
                {isEndingRound ? '처리중...' : '저장하지않고 종료하기'}
              </button>
              <button
                onClick={() => setShowEndRoundModal(false)}
                disabled={isEndingRound}
                style={{
                  padding: '14px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: isEndingRound ? 'not-allowed' : 'pointer'
                }}
              >
                취소
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
                  if (isSavingNtp) return;
                  if (!ntpDistance || parseFloat(ntpDistance) <= 0) {
                    alert('거리를 입력해주세요');
                    return;
                  }
                  setIsSavingNtp(true);
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
                  } finally {
                    setIsSavingNtp(false);
                  }
                }}
                disabled={isSavingNtp}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: isSavingNtp ? '#999' : '#6399CF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: isSavingNtp ? 'not-allowed' : 'pointer',
                  opacity: isSavingNtp ? 0.7 : 1
                }}
              >
                {isSavingNtp ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Play;
