import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useSocket } from '../contexts/SocketContext';
import PageHeader from '../components/common/PageHeader';
import { stablefordPoints, allocateStrokes, calculateStableford } from '../utils/stableford';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bookings, courses, members, refreshBookings, featureSettings } = useApp();
  const socket = useSocket();
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
  const [peerScores, setPeerScores] = useState({ teammateSelf: null, myByTeammate: null });
  const [screenSize, setScreenSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));
  const skipAutoSaveRef = useRef(false);
  const lastRestoredBookingRef = useRef(null);
  const serverSaveTimerRef = useRef(null);
  const lastSavedScoresRef = useRef(null);
  const saveQueueRef = useRef([]);         // 오프라인 큐 (메모리)
  const bookingSetupDoneRef = useRef(null); // booking setup 중복 실행 방지
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const swipeBlockedRef = useRef(false);
  const swipeModalsRef = useRef(false);
  const cardContainerRef = useRef(null);
  const scorecardRootRef = useRef(null);
  const [slideX, setSlideX] = useState(0);
  const [slideAnimating, setSlideAnimating] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle'|'saving'|'saved'|'failed'|'queued'

  // 큐 localStorage 영속화 헬퍼 — 앱 재시작 후에도 큐 복구 가능
  const queueStorageKey = bookingId ? `score_queue_${bookingId}` : null;
  const persistQueue = useCallback((queue) => {
    if (!queueStorageKey) return;
    if (queue.length > 0) {
      localStorage.setItem(queueStorageKey, JSON.stringify(queue));
    } else {
      localStorage.removeItem(queueStorageKey);
    }
  }, [queueStorageKey]);

  // 게스트 세션 (비로그인 게스트용)
  const guestSession = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('guestSession') || 'null'); } catch { return null; }
  }, []);

  // 실제 사용할 memberId / phone (로그인 회원 우선, 없으면 게스트)
  const effectiveUserId = user?.id || guestSession?.guestMemberId || null;
  const effectiveUserPhone = user?.phone || guestSession?.phone || null;
  const isGuestMode = !user && !!guestSession?.guestMemberId;

  // 앱 재시작 후 오프라인 큐 복원
  useEffect(() => {
    if (!queueStorageKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(queueStorageKey) || '[]');
      if (saved.length > 0) {
        saveQueueRef.current = saved;
        setSaveStatus('queued');
        console.log('📦 오프라인 큐 복원:', saved.length, '건');
      }
    } catch {}
  }, [queueStorageKey]);

  // 인증 헤더 헬퍼
  const getAuthHeaders = useCallback((extra = {}) => {
    const memberId = effectiveUserId;
    return {
      'Content-Type': 'application/json',
      ...(memberId ? { 'X-Member-Id': memberId } : {}),
      ...extra,
    };
  }, [effectiveUserId]);
  
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
  // 기준: iPhone 14 (390×844) — 현재 가장 일반적인 폰
  const baseWidth = 390;
  const baseHeight = 844;
  const widthScale = screenSize.width / baseWidth;
  const heightScale = screenSize.height / baseHeight;
  // 너비와 높이 중 더 작은 비율 사용, 0.82~1.15 범위 제한
  // 0.82 = iPhone SE(375px) 기준 최소 → 최대 15% 축소로 제한
  const rawScale = Math.min(widthScale, heightScale);
  const scale = Math.max(0.82, Math.min(1.15, rawScale));

  // 스케일된 값 계산 헬퍼
  // min 기본값: base의 80% 또는 12px 중 큰 값 (폰트가 너무 작아지지 않도록)
  const s = (base, min = Math.max(12, Math.round(base * 0.80))) => Math.max(min, Math.round(base * scale));

  // 터치 타겟은 최소 44px 보장
  const touchSize = (base) => Math.max(44, s(base));
  
  // 기존 플래그도 유지 (호환성)
  const screenHeight = screenSize.height;
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;
  const isTinyScreen = screenHeight < 550;

  const serverRestoreAttemptedRef = useRef(null);

  // Play 페이지 진입 시 저장된 상태 복원 또는 서버에서 불러오기
  useEffect(() => {
    if (!bookingId) return;
    
    // 1단계: localStorage에서 복원 시도 (앱 재시작 후에도 유지됨)
    const savedState = localStorage.getItem(`play_state_${bookingId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('🔄 localStorage에서 스코어 복원:', parsed);
        if (parsed.holeScores) setHoleScores(parsed.holeScores);
        if (parsed.currentHole) setCurrentHole(parsed.currentHole);
        if (parsed.selectedTeammate) setSelectedTeammate(parsed.selectedTeammate);
        if (parsed.step) setStep(parsed.step);
        if (parsed.roundStartTime) setRoundStartTime(parsed.roundStartTime);
        if (parsed.foursomeData) setFoursomeData(parsed.foursomeData);
        lastRestoredBookingRef.current = bookingId;
        return;
      } catch (e) {
        console.error('localStorage 복원 오류:', e);
      }
    }
    
    // 2단계: 아직 데이터가 로드되지 않았으면 대기 (초기화하지 않음)
    if (!effectiveUserId || !bookings || bookings.length === 0) return;
    
    const foundBooking = bookings.find(b => b.id === bookingId);
    if (!foundBooking) return;
    
    // 이미 이 bookingId에 대해 서버 복원을 시도했으면 스킵
    if (serverRestoreAttemptedRef.current === bookingId) return;

    // 3단계: 서버에서 기존 스코어 복원 시도
    const restoreFromServer = async () => {
      serverRestoreAttemptedRef.current = bookingId;
      
      try {
        // 같은 라운딩의 모든 스코어 불러오기
        const allScoresRes = await fetch(`/api/scores/by-rounding/${encodeURIComponent(foundBooking.title)}`);
        if (!allScoresRes.ok) throw new Error('Failed to fetch scores');
        const allScores = await allScoresRes.json();
        
        // 내 스코어 찾기
        const myScore = allScores.find(s => s.userId === effectiveUserId);
        
        if (myScore && myScore.holes) {
          const holesData = typeof myScore.holes === 'string' ? JSON.parse(myScore.holes) : myScore.holes;
          const hasAnyScore = holesData.some(s => s > 0);
          
          if (hasAnyScore) {
            console.log('🌐 서버에서 내 스코어 복원:', holesData);
            
            // 팀원 스코어 복원 시도 (여러 경우 처리)
            let teammateHoles = Array(18).fill(0);
            let restoredTeammate = null;
            
            // 경우 1: 내가 마커인 스코어 찾기 (내가 다른 사람을 마크한 경우)
            const markedByMe = allScores.find(s => s.markerId === effectiveUserId && s.userId !== user.id);
            if (markedByMe) {
              if (markedByMe.holes) {
                teammateHoles = typeof markedByMe.holes === 'string' ? JSON.parse(markedByMe.holes) : markedByMe.holes;
              }
              const teammateMember = members?.find(m => m.id === markedByMe.userId);
              if (teammateMember) restoredTeammate = teammateMember;
            }
            
            // 경우 2: 내가 마커인 스코어가 없으면, 조편성에서 팀원 찾기
            if (!restoredTeammate && foundBooking.teams) {
              try {
                const teams = typeof foundBooking.teams === 'string' ? JSON.parse(foundBooking.teams) : foundBooking.teams;
                const userTeam = teams.find(t => t.members?.some(m => m?.phone === effectiveUserPhone));
                if (userTeam) {
                  const teamMembers = userTeam.members.filter(m => m && m.phone !== effectiveUserPhone);
                  for (const tm of teamMembers) {
                    const tmMember = members?.find(m => m.phone === tm.phone);
                    if (tmMember) {
                      const tmScore = allScores.find(s => s.userId === tmMember.id);
                      if (tmScore && tmScore.holes) {
                        teammateHoles = typeof tmScore.holes === 'string' ? JSON.parse(tmScore.holes) : tmScore.holes;
                        restoredTeammate = tmMember;
                        break;
                      }
                    }
                  }
                  // 팀원 스코어가 없더라도 첫번째 팀원을 선택
                  if (!restoredTeammate && teamMembers.length > 0) {
                    const firstTm = members?.find(m => m.phone === teamMembers[0]?.phone);
                    if (firstTm) restoredTeammate = firstTm;
                  }
                }
              } catch (e) {
                console.error('조편성 파싱 오류:', e);
              }
            }
            
            setHoleScores({ me: holesData, teammate: teammateHoles });
            const lastPlayedHole = holesData.reduce((last, score, idx) => score > 0 ? idx + 1 : last, 1);
            setCurrentHole(Math.min(lastPlayedHole + 1, 18));
            
            if (restoredTeammate) {
              setSelectedTeammate(restoredTeammate);
              setStep('scoring');
            } else {
              // 팀원 정보는 없지만 스코어는 복원 - 마커 선택 화면으로
              setStep('selectMember');
            }
            
            lastRestoredBookingRef.current = bookingId;
            console.log('✅ 서버에서 스코어 복원 완료, 팀원:', restoredTeammate?.nickname || '없음');
            return;
          }
        }
      } catch (e) {
        console.error('서버 스코어 복원 오류:', e);
      }
      
      // 서버에도 없으면 초기화
      if (lastRestoredBookingRef.current !== bookingId) {
        setSelectedTeammate(null);
        setStep('selectMember');
        setCurrentHole(1);
        setHoleScores({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
        setRoundStartTime(null);
        lastRestoredBookingRef.current = bookingId;
        console.log('🔄 Play 페이지 초기화:', bookingId);
      }
    };
    
    restoreFromServer();
  }, [bookingId, effectiveUserId, bookings, members]);

  // 스코어 변경 시 localStorage에 자동 저장 (앱 종료/폰 재시작 후에도 유지)
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
    localStorage.setItem(`play_state_${bookingId}`, JSON.stringify(stateToSave));
    console.log('💾 스코어 localStorage 저장:', currentHole, holeScores);
  }, [bookingId, holeScores, currentHole, selectedTeammate, step, roundStartTime, foursomeData]);

  // 스코어 변경 시 서버에 실시간 자동 저장 (debounced)
  useEffect(() => {
    if (!bookingId || !booking || !effectiveUserId || !selectedTeammate || step === 'selectMember' || skipAutoSaveRef.current) return;
    
    // 스코어가 모두 0이면 저장하지 않음
    const hasAnyScore = holeScores.me.some(s => s > 0) || holeScores.teammate.some(s => s > 0);
    if (!hasAnyScore) return;

    // 이전 저장과 동일하면 저장하지 않음
    const currentScoresKey = JSON.stringify({ me: holeScores.me, teammate: holeScores.teammate });
    if (lastSavedScoresRef.current === currentScoresKey) return;

    // 디바운스: 500ms 후에 서버에 저장
    if (serverSaveTimerRef.current) {
      clearTimeout(serverSaveTimerRef.current);
    }
    
    serverSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const teammateMemberId = members?.find(m => m.phone === selectedTeammate?.phone)?.id || selectedTeammate?.id;
        const userParArr = courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male'] || Array(18).fill(4);
        const teammateParArr = courseData?.holePars?.[selectedTeammate?.gender === 'F' ? 'female' : 'male'] || userParArr;
        const totalMe = holeScores.me.reduce((a, b) => a + b, 0);
        const totalTeammate = holeScores.teammate.reduce((a, b) => a + b, 0);
        const coursePar = userParArr.reduce((a, b) => a + b, 0);

        const myGameMetadata = gameMode === 'foursome' && foursomeData ? {
          partner: { name: foursomeData.partner?.nickname || foursomeData.partner?.name, phone: foursomeData.partner?.phone },
          opponents: foursomeData.opponents?.map(o => ({ name: o?.nickname || o?.name, phone: o?.phone })) || [],
          recordedBy: user?.nickname || user?.name,
        } : null;

        const teammateGameMetadata = myGameMetadata;

        const myPayload = {
          memberId: effectiveUserId,
          markerId: effectiveUserId,
          roundingName: booking.title,
          date: scoreDate,
          courseName: courseData?.name || booking.courseName,
          totalScore: totalMe,
          coursePar,
          holes: holeScores.me,
          gameMode: gameMode === 'foursome' ? 'foursome' : null,
          gameMetadata: myGameMetadata,
        };
        const teammatePayload = {
          memberId: teammateMemberId,
          markerId: effectiveUserId,
          roundingName: booking.title,
          date: scoreDate,
          courseName: courseData?.name || booking.courseName,
          totalScore: totalTeammate,
          coursePar: teammateParArr.reduce((a, b) => a + b, 0),
          holes: holeScores.teammate,
          gameMode: gameMode === 'foursome' ? 'foursome' : null,
          gameMetadata: teammateGameMetadata,
        };

        if (!isOnlineRef.current) {
          // 오프라인: 큐에 보관 + localStorage 영속화
          saveQueueRef.current.push(myPayload, teammatePayload);
          persistQueue(saveQueueRef.current);
          setSaveStatus('queued');
          console.log('📴 오프라인 — 스코어 큐 보관 + localStorage 저장');
          return;
        }

        // 내 스코어 / 팀원 스코어 개별 저장 — 실패 건만 재큐
        const failedPayloads = [];

        try {
          const r1 = await fetch('/api/scores', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(myPayload),
          });
          if (!r1.ok) {
            console.warn('내 스코어 저장 실패:', r1.status);
            failedPayloads.push(myPayload);
          }
        } catch (e) {
          console.warn('내 스코어 네트워크 오류:', e);
          failedPayloads.push(myPayload);
        }

        try {
          const r2 = await fetch('/api/scores', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(teammatePayload),
          });
          if (!r2.ok) {
            console.warn('팀원 스코어 저장 실패:', r2.status);
            failedPayloads.push(teammatePayload);
          }
        } catch (e) {
          console.warn('팀원 스코어 네트워크 오류:', e);
          failedPayloads.push(teammatePayload);
        }

        if (failedPayloads.length > 0) {
          // 실패한 건만 큐에 추가 + 영속화
          saveQueueRef.current.push(...failedPayloads);
          persistQueue(saveQueueRef.current);
          setSaveStatus(failedPayloads.length === 2 ? 'failed' : 'queued');
          console.warn('⚠️ 일부 저장 실패, 큐 보관:', failedPayloads.length, '건');
        } else {
          // 전체 성공: 큐 비우기 + localStorage 큐 제거
          saveQueueRef.current = [];
          persistQueue([]);
          lastSavedScoresRef.current = currentScoresKey;
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
          console.log('🌐 서버에 스코어 실시간 저장 완료');
        }
      } catch (e) {
        // 예외 처리 (payload 빌드 실패 등)
        console.error('서버 저장 예외:', e);
        setSaveStatus('failed');
      }
    }, 500);

    return () => {
      if (serverSaveTimerRef.current) {
        clearTimeout(serverSaveTimerRef.current);
      }
    };
  }, [bookingId, booking, user, selectedTeammate, holeScores, step, courseData, gameMode, foursomeData, members]);

  useEffect(() => {
    if (!bookingId || bookings.length === 0) return;

    // 소켓/visibilitychange로 bookings가 갱신될 때마다 게임 상태가 리셋되지 않도록
    // 동일한 bookingId에 대해 setup은 한 번만 실행
    if (bookingSetupDoneRef.current === bookingId) return;
    bookingSetupDoneRef.current = bookingId;

    console.log('🎯 Play 페이지 로드:', bookingId);
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
        const userTeam = teams.find(t => t.members?.some(m => m?.phone === effectiveUserPhone));
        console.log('👤 사용자 팀:', userTeam);
        if (userTeam && userTeam.members) {
          // 사용자 슬롯 인덱스 찾기
          const userSlotIndex = userTeam.members.findIndex(m => m?.phone === effectiveUserPhone);
          console.log('👤 사용자 슬롯:', userSlotIndex);
          
          if (detectedGameMode === 'foursome' && userSlotIndex >= 0) {
            // 포썸 모드: 파트너와 상대 팀 식별
            const partnerSlotIndex = userSlotIndex % 2 === 0 ? userSlotIndex + 1 : userSlotIndex - 1;
            const isTeamA = userSlotIndex < 2;
            const opponentSlots = isTeamA ? [2, 3] : [0, 1];
            
            const partner = userTeam.members[partnerSlotIndex];
            const opponent1 = userTeam.members[opponentSlots[0]];
            const opponent2 = userTeam.members[opponentSlots[1]];
            
            // 멤버 정보 보강 (게스트는 members 배열에 없으므로 participants에서 핸디 보완)
            const enrichMember = (tm) => {
              if (!tm) return null;
              const fullMember = members?.find(m => m.phone === tm.phone);
              if (fullMember) return { ...tm, ...fullMember };
              if (tm.phone?.startsWith('guest_')) {
                const parsed = (foundBooking.participants || []).map(p => {
                  try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
                }).filter(Boolean).find(p => p.phone === tm.phone);
                if (parsed) return { ...tm, ...parsed };
              }
              return tm;
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
            
            const enrichedUser = enrichMember({ phone: effectiveUserPhone });
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
            const teamMembers = userTeam.members.filter(m => m && m.phone !== effectiveUserPhone);
            const enrichedTeammates = teamMembers.map(tm => {
              const fullMember = members?.find(m => m.phone === tm.phone);
              if (fullMember) return { ...tm, ...fullMember };
              // 게스트: participants에서 핸디 보완
              if (tm.phone?.startsWith('guest_')) {
                const parsed = (foundBooking.participants || []).map(p => {
                  try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
                }).filter(Boolean).find(p => p.phone === tm.phone);
                if (parsed) return { ...tm, ...parsed };
              }
              return tm;
            });

            // 팀에 없는 게스트 보완 (팀편성 전에 추가된 게스트 등)
            const parsedParticipants = (foundBooking.participants || []).map(p => {
              try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
            }).filter(Boolean);
            const assignedPhones = new Set([
              effectiveUserPhone,
              ...userTeam.members.filter(Boolean).map(m => m.phone),
            ]);
            // 이름 중복 방지: 조편성에 이미 같은 이름 게스트가 있으면 제외
            const assignedGuestNames = new Set(
              userTeam.members.filter(m => m?.isGuest).map(m => (m.name || '').trim().toLowerCase())
            );
            const extraGuests = parsedParticipants.filter(
              p => p.isGuest && p.phone && !assignedPhones.has(p.phone)
                && !assignedGuestNames.has((p.name || '').trim().toLowerCase())
            );

            const allTeammates = [...enrichedTeammates, ...extraGuests];
            console.log('🤝 팀원:', allTeammates);
            setTeammates(allTeammates);
          }
        } else {
          // 팀 있지만 내 phone이 없음 (뒤늦게 추가된 게스트 등) → 4명 이하이면 자동 구성
          console.log('⚠️ 팀 정보 없음, 팀원 배열 초기화');
          const fallbackRaw = (foundBooking.participants || []).map(p => {
            try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
          }).filter(Boolean);
          const fallbackMap = new Map();
          for (const p of fallbackRaw) {
            const key = (p.name || '').trim().toLowerCase();
            if (!key) continue;
            if (!fallbackMap.has(key) || p.phone) fallbackMap.set(key, p);
          }
          const parsedFallback = Array.from(fallbackMap.values());
          if (parsedFallback.length > 0) {
            const myTeammates = parsedFallback.filter(p => p.phone !== effectiveUserPhone);
            const enriched = myTeammates.map(tm => {
              const fullMember = members?.find(m => m.phone === tm.phone);
              return fullMember ? { ...tm, ...fullMember } : tm;
            });
            setTeammates(enriched);
            if (enriched.length === 1) setSelectedTeammate(enriched[0]);
          } else {
            setTeammates([]);
          }
          setFoursomeData(null);
        }
      } catch (e) {
        console.error('팀 파싱 에러:', e);
        setTeammates([]);
        setFoursomeData(null);
      }
    } else {
      // teams 없음 → 참가자 이름 기준 중복 제거 후 4명 이하이면 1조 자동 구성
      const parsedRaw = (foundBooking.participants || []).map(p => {
        try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
      }).filter(Boolean);

      // 이름 기준 dedup: phone 있는 항목 우선 보존
      const nameMap = new Map();
      for (const p of parsedRaw) {
        const key = (p.name || '').trim().toLowerCase();
        if (!key) continue;
        if (!nameMap.has(key) || p.phone) nameMap.set(key, p);
      }
      const parsedAll = Array.from(nameMap.values());

      // teams 없음 → 인원수 무관하게 전원 팀원으로 설정 (조편성 불필요)
      if (parsedAll.length > 0) {
        console.log('👥 teams 없음 → 전원 자동 구성:', parsedAll.length, '명');
        const myTeammates = parsedAll.filter(p => p.phone !== effectiveUserPhone);
        const enriched = myTeammates.map(tm => {
          const fullMember = members?.find(m => m.phone === tm.phone);
          return fullMember ? { ...tm, ...fullMember } : tm;
        });
        setTeammates(enriched);
        setFoursomeData(null);
        if (enriched.length === 1) setSelectedTeammate(enriched[0]);
      } else {
        console.log('⚠️ teams 없음, participants도 비어있음');
        setTeammates([]);
        setFoursomeData(null);
      }
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
  }, [bookingId, bookings, effectiveUserPhone, courses, members]);

  // ─── 오프라인 큐 플러시: 네트워크 복구 시 밀린 저장 처리 ─────────────
  const flushSaveQueue = useCallback(async () => {
    if (saveQueueRef.current.length === 0) return;
    const queue = [...saveQueueRef.current];
    saveQueueRef.current = [];
    setSaveStatus('saving');

    const failed = [];
    for (const payload of queue) {
      try {
        const res = await fetch('/api/scores', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) failed.push(payload);
      } catch {
        failed.push(payload);
      }
    }

    if (failed.length === 0) {
      // 전체 성공: localStorage 큐 제거
      persistQueue([]);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      console.log('📡 오프라인 큐 플러시 완료:', queue.length, '건');
    } else {
      // 실패 건만 재보관 + 영속화
      saveQueueRef.current = [...failed, ...saveQueueRef.current];
      persistQueue(saveQueueRef.current);
      setSaveStatus('queued');
      console.warn('큐 플러시 부분 실패:', failed.length, '건 재보관');
    }
  }, [getAuthHeaders, persistQueue]);

  // ─── 네트워크 / 앱 생명주기 이벤트 ───────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      console.log('🌐 네트워크 복구 — 저장 큐 플러시');
      flushSaveQueue();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setSaveStatus('queued');
      console.log('📴 네트워크 오프라인');
    };

    // iOS: 앱 전환 시 pagehide 발생 → localStorage 즉시 동기화 확인
    const handlePageHide = () => {
      if (!bookingId || step === 'selectMember') return;
      const stateToSave = { holeScores, currentHole, selectedTeammate, step, roundStartTime, foursomeData };
      localStorage.setItem(`play_state_${bookingId}`, JSON.stringify(stateToSave));
      console.log('📲 pagehide: localStorage 긴급 저장');
    };

    // 앱 복귀 시: localStorage와 서버 버전 비교 후 최신으로 덮어씀
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!bookingId || !effectiveUserId || step === 'selectMember') return;

      // 오프라인 큐가 있으면 플러시 시도
      if (saveQueueRef.current.length > 0 && isOnlineRef.current) {
        flushSaveQueue();
        return;
      }

      try {
        const res = await fetch(`/api/scores/by-rounding/${encodeURIComponent(booking?.title || '')}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const allScores = await res.json();
        const myServerScore = allScores.find(s => s.userId === effectiveUserId);
        if (!myServerScore?.holes) return;

        const serverHoles = typeof myServerScore.holes === 'string'
          ? JSON.parse(myServerScore.holes)
          : myServerScore.holes;

        // 서버 vs 로컬 홀별 정밀 비교 (합계 대신 JSON 비교 — 같은 합계라도 분포가 다를 수 있음)
        const serverFilled = serverHoles.filter(s => s > 0).length;
        const localFilled = holeScores.me.filter(s => s > 0).length;
        const serverJson = JSON.stringify(serverHoles);
        const localJson = JSON.stringify(holeScores.me);

        if (serverFilled > localFilled && serverJson !== localJson) {
          // 서버가 더 많은 홀 기록 (다른 기기에서 수정됨) → 서버로 복원
          setHoleScores(prev => ({ ...prev, me: serverHoles }));
          lastSavedScoresRef.current = null; // 복원된 값으로 재저장 허용
          console.log('🔄 앱 복귀: 서버 스코어가 더 최신 → 복원');
        } else if ((localFilled > serverFilled || (localFilled === serverFilled && localJson !== serverJson)) && saveQueueRef.current.length === 0 && localJson !== serverJson) {
          // 로컬이 더 최신 (오프라인 중 변경됨) → 직접 저장 트리거
          console.log('🔄 앱 복귀: 로컬 스코어가 더 최신 → 서버 동기화');
          lastSavedScoresRef.current = null; // 중복 방지 키 초기화
          // holeScores는 변하지 않았으므로 useEffect가 재실행되지 않음 → 직접 저장
          setSaveStatus('saving');
          const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const myPayload = {
            memberId: effectiveUserId,
            markerId: effectiveUserId,
            roundingName: booking?.title,
            date: scoreDate,
            courseName: courseData?.name || booking?.courseName,
            totalScore: holeScores.me.reduce((a, b) => a + b, 0),
            holes: holeScores.me,
          };
          try {
            const r = await fetch('/api/scores', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(myPayload),
            });
            if (r.ok) {
              lastSavedScoresRef.current = localJson;
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
              console.log('✅ 앱 복귀 강제 저장 완료');
            } else {
              saveQueueRef.current.push(myPayload);
              persistQueue(saveQueueRef.current);
              setSaveStatus('queued');
            }
          } catch {
            saveQueueRef.current.push(myPayload);
            persistQueue(saveQueueRef.current);
            setSaveStatus('queued');
          }
        }
      } catch (e) {
        console.log('앱 복귀 sync 스킵:', e.message);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bookingId, booking, user, step, holeScores, currentHole, selectedTeammate, roundStartTime, foursomeData, getAuthHeaders, flushSaveQueue, persistQueue, courseData, effectiveUserId, effectiveUserPhone, members]);

  // 실시간 저장 - localStorage + 서버에 자동 저장
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
      
      const userMember = members?.find(m => m.phone === effectiveUserPhone);
      if (userMember) {
        const uh = parseFloat(userMember.gaHandy) || parseFloat(userMember.houseHandy) || parseFloat(userMember.handicap) || 0;
        dailyHandicaps[userMember.phone] = uh;
      }

      const teammateMember = members?.find(m => m.phone === selectedTeammate?.phone);
      if (teammateMember) {
        const th = parseFloat(teammateMember.gaHandy) || parseFloat(teammateMember.houseHandy) || parseFloat(teammateMember.handicap) || 0;
        dailyHandicaps[teammateMember.phone] = th;
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
    // phone으로 members에서 정식 id 찾기 (가장 정확)
    if (selectedTeammate?.phone && members) {
      const member = members.find(m => m.phone === selectedTeammate.phone);
      if (member?.id) return member.id;
    }
    // 버그 수정 4: selectedTeammate.id 우선 (게스트 포함), phone은 최후 폴백
    return selectedTeammate?.id || selectedTeammate?.phone || null;
  }, [selectedTeammate, members]);

  const checkTeammateScores = useCallback(async () => {
    if (!booking || !effectiveUserId) return false;
    try {
      const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const teammateMemberId = getTeammateMemberId();
      
      const res = await fetch('/api/scores/verify-round', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roundingName: booking.title,
          date: scoreDate,
          myId: effectiveUserId,
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

  // Socket.IO 실시간: 스코어 업데이트 수신 시 즉시 재검증 (3초 polling 대기 없이)
  useEffect(() => {
    if (!socket || step !== 'scoreCheck') return;
    const onScoresUpdated = () => { checkTeammateScores(); };
    socket.on('scores:updated', onScoresUpdated);
    return () => { socket.off('scores:updated', onScoresUpdated); };
  }, [socket, step, checkTeammateScores]);

  // 라운딩 중 상대 스코어 주기 fetch (홀별 불일치 실시간 감지용)
  // - 소켓 이벤트로 즉시 재호출
  // - 15초 polling을 백업으로 병행 (소켓 연결 끊김 대비)
  const fetchPeerScores = useCallback(async () => {
    if (!booking?.title || !selectedTeammate) return;
    const teammateMemberId = getTeammateMemberId();
    if (!teammateMemberId || !effectiveUserId) return;
    try {
      const res = await fetch(`/api/scores/by-rounding/${encodeURIComponent(booking.title)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const all = await res.json();
      const myRow = all.find(s => s.userId === effectiveUserId);
      const tmRow = all.find(s => s.userId === teammateMemberId);
      const parse = (v) => {
        if (!v) return null;
        try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; }
      };
      // teammateSelf: 팀메이트 본인이 기록한 자기 점수 (markerId === userId인 경우만 유효)
      const teammateSelf = tmRow && tmRow.markerId === tmRow.userId ? parse(tmRow.holes) : null;
      // myByTeammate: 팀메이트가 기록한 내 점수 (markerHoles 필드)
      const myByTeammate = parse(myRow?.markerHoles);
      setPeerScores({ teammateSelf, myByTeammate });
    } catch (e) {
      // 네트워크 오류는 조용히 무시 (다음 polling에서 재시도)
    }
  }, [booking, selectedTeammate, getTeammateMemberId, effectiveUserId]);

  useEffect(() => {
    if (!booking || !selectedTeammate || step === 'selectMember') return;
    fetchPeerScores();
    const interval = setInterval(fetchPeerScores, 15000);
    return () => clearInterval(interval);
  }, [booking, selectedTeammate, step, fetchPeerScores]);

  useEffect(() => {
    if (!socket) return;
    const onScoresUpdated = () => { fetchPeerScores(); };
    socket.on('scores:updated', onScoresUpdated);
    return () => { socket.off('scores:updated', onScoresUpdated); };
  }, [socket, fetchPeerScores]);

  // 홀별 불일치 판정
  // 규칙: 한 홀에 대해 두 쌍(내 self ↔ 팀메이트가 본 나 / 팀메이트 self ↔ 내가 본 팀메이트)
  // 중 어느 하나라도 "양쪽 모두 >0이고 값이 다름"이면 불일치.
  // 한쪽이 미입력(0)인 쌍은 대기 상태로 취급 (판정 제외).
  const mismatchHoles = useMemo(() => {
    const result = [];
    const { teammateSelf, myByTeammate } = peerScores;
    const mySelf = holeScores.me;
    const teammateByMe = holeScores.teammate;
    for (let i = 0; i < 18; i++) {
      let bad = false;
      // 방향 1: 내 self vs 팀메이트가 본 나
      if (myByTeammate) {
        const a = mySelf?.[i] || 0;
        const b = myByTeammate[i] || 0;
        if (a > 0 && b > 0 && a !== b) bad = true;
      }
      // 방향 2: 팀메이트 self vs 내가 본 팀메이트
      if (!bad && teammateSelf) {
        const c = teammateSelf[i] || 0;
        const d = teammateByMe?.[i] || 0;
        if (c > 0 && d > 0 && c !== d) bad = true;
      }
      if (bad) result.push(i + 1);
    }
    return result;
  }, [peerScores, holeScores]);

  // 모달 상태 ref 동기화 (스와이프 핸들러에서 사용)
  useEffect(() => {
    swipeModalsRef.current = showHoleSelector || showEndRoundModal || showNtpModal || showMismatches;
  }, [showHoleSelector, showEndRoundModal, showNtpModal, showMismatches]);

  // ── 스와이프: document-level touch listeners (크로스플랫폼) ──
  useEffect(() => {
    let startX = null;

    const onStart = (e) => {
      if (!e.touches || !e.touches.length) return;
      if (!cardContainerRef.current) return;
      startX = e.touches[0].clientX;
      const c = cardContainerRef.current;
      c.style.transition = 'none';
      c.style.transform = 'none';
    };

    const onMove = (e) => {
      try { e.preventDefault(); } catch (_) {}
      if (startX === null) return;
      const dx = e.touches[0].clientX - startX;
      const c = cardContainerRef.current;
      if (c) { c.style.transition = 'none'; c.style.transform = `translateX(${dx}px)`; }
    };

    const onEnd = (e) => {
      if (startX === null) return;
      if (!e.changedTouches || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      const c = cardContainerRef.current;

      if (Math.abs(dx) < 40) {
        if (c) { c.style.transition = 'transform 200ms ease-out'; c.style.transform = 'none'; }
        return;
      }

      const dir = dx < 0 ? -1 : 1;
      const w = window.innerWidth;

      setCurrentHole(prev => dir < 0 ? (prev < 18 ? prev + 1 : 1) : (prev > 1 ? prev - 1 : 18));
      if (c) { c.style.transition = 'none'; c.style.transform = `translateX(${-dir * w}px)`; }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (c) { c.style.transition = 'transform 200ms ease-out'; c.style.transform = 'none'; }
      }));
    };

    document.addEventListener('touchstart', onStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onMove, { passive: false, capture: true });
    document.addEventListener('touchend', onEnd, { passive: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', onStart, { capture: true });
      document.removeEventListener('touchmove', onMove, { capture: true });
      document.removeEventListener('touchend', onEnd, { capture: true });
    };
  }, []);

  if (!bookingId || !booking || !courseData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1a45' }}>
        <PageHeader title="플레이하기" onBack={() => navigate(-1)} />
        <div style={{ padding: '32px 16px', textAlign: 'center', opacity: 0.6, color: 'white' }}>로딩 중...</div>
      </div>
    );
  }

  if (step === 'selectMember') {
    // ── 4인 조편성 규칙 게이트 ──────────────────────────────────────────────
    const squadRules = featureSettings?.squadFormationRules || {};
    const ruleEnabled = squadRules[booking.type] ?? false;
    const participantCount = (booking?.participants || []).length;
    const hasTeamFormation = (() => {
      if (!booking?.teams) return false;
      try {
        const t = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
        if (!Array.isArray(t) || t.length === 0) return false;
        const assignedCount = t.reduce((sum, team) => sum + (Array.isArray(team.members) ? team.members.filter(m => m !== null).length : 0), 0);
        return assignedCount >= participantCount;
      } catch { return false; }
    })();

    if (ruleEnabled && participantCount >= 4 && !hasTeamFormation) {
      return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', fontSize: '20px', color: '#1E293B' }}>←</button>
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#1E293B' }}>플레이하기</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: '16px' }}>
            <div style={{ fontSize: '48px' }}>⛳</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>조편을 해야합니다</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6 }}>
                참가 인원이 4명 이상입니다.{'\n'}조편성을 완료한 후 플레이를 시작해주세요.
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>{participantCount}명 참가 중</div>
            </div>
            <button
              onClick={() => navigate(`/team-formation?id=${bookingId}`)}
              style={{ marginTop: '8px', padding: '14px 32px', borderRadius: '14px', background: '#0047AB', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              📋 조편성 하러 가기
            </button>
            <button
              onClick={() => navigate(-1)}
              style={{ padding: '10px 24px', borderRadius: '12px', background: '#F1F5F9', color: '#64748B', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              돌아가기
            </button>
          </div>
        </div>
      );
    }
    // ── 기존 teammates 체크 ───────────────────────────────────────────────────

    if (teammates.length === 0) {
      return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', fontSize: '20px', color: '#1E293B' }}>←</button>
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#1E293B' }}>플레이하기</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: '16px' }}>
            <div style={{ fontSize: '56px', marginBottom: 4 }}>⏳</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginBottom: '10px', letterSpacing: '-0.02em' }}>
                조편성이 아직 안됐습니다
              </div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.7 }}>
                {isGuestMode
                  ? '운영진이 조편성을 완료한 후\n다시 이 링크를 열어주세요.'
                  : '조편성이 완료된 후\n플레이를 시작할 수 있습니다.'}
              </div>
            </div>
            {!isGuestMode && (
              <button
                onClick={() => navigate(`/team-formation?id=${bookingId}`)}
                style={{ marginTop: '8px', padding: '14px 28px', borderRadius: '14px', background: '#0047AB', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
              >
                조편성 하러 가기
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              style={{ padding: '12px 24px', borderRadius: '12px', background: '#F1F5F9', color: '#64748B', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              돌아가기
            </button>
          </div>
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
        <div style={{ minHeight: '100vh', background: '#0d1a45' }}>
          <PageHeader title="마커 선택" onBack={() => navigate(-1)} />
          <div style={{ padding: '16px', paddingBottom: '80px' }}>
          <div className="card">
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
        </div>
      );
    }

    // 스트로크 모드: 기존 UI
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', overflowY: 'auto' }}>
        <PageHeader title="마커 선택" onBack={() => navigate(-1)} />
        <div style={{ padding: '20px 16px 120px' }}>

          {/* 라운딩 정보 */}
          <div style={{ background: 'linear-gradient(145deg, #08183A 0%, #003780 100%)', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,55,128,0.3)', padding: '18px 20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>{booking?.courseName}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
              {booking?.date ? new Date(booking.date).toLocaleDateString('ko-KR') : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', background: 'rgba(255,255,255,0.18)', borderRadius: '6px', padding: '3px 10px' }}>
                {booking?.type === '컴페티션' ? '컴페티션' : '소셜'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', background: 'rgba(255,255,255,0.18)', borderRadius: '6px', padding: '3px 10px' }}>
                {gameMode === 'stableford' ? '스테이블포드' : gameMode === 'foursome' ? '포썸' : '스트로크'}
              </span>
            </div>
          </div>

          {/* 안내 */}
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', marginBottom: '12px', paddingLeft: '2px' }}>
            내가 마크할 회원을 선택하세요
          </div>

          {/* 2BB 배지 */}
          {(() => {
            let my2BBPartnerPhone = null;
            let my2BBTeamName = null;
            const is2BB = booking?.is2BB || false;
            const squadSize = teammates.length + 1;

            if (is2BB && booking?.twoBallTeams) {
              try {
                const twoBallTeams = typeof booking.twoBallTeams === 'string'
                  ? JSON.parse(booking.twoBallTeams) : booking.twoBallTeams;
                for (const team of twoBallTeams) {
                  const teamMembers = team.members || [];
                  const myIndex = teamMembers.findIndex(m => m?.phone === effectiveUserPhone);
                  if (myIndex !== -1) {
                    my2BBPartnerPhone = teamMembers[myIndex === 0 ? 1 : 0]?.phone;
                    my2BBTeamName = team.teamName;
                    break;
                  }
                }
              } catch (e) { console.error('2BB 파싱 오류:', e); }
            }

            return (
              <>
                {is2BB && (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>🤝</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#C2410C' }}>Net 2-Ball Best Ball 모드</div>
                      <div style={{ fontSize: '12px', color: '#EA580C', marginTop: '2px' }}>
                        {my2BBTeamName ? `${my2BBTeamName} · 4인조에서는 파트너 마크 불가` : '파트너 정보 없음 (조편성 후 2BB 재활성화 필요)'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 멤버 카드 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {teammates.map(teammate => {
                    const isSelected = selectedTeammate?.phone === teammate.phone;
                    const is2BBPartner = my2BBPartnerPhone === teammate.phone;
                    const isDisabled = is2BB && is2BBPartner && squadSize === 4;
                    const handicapLabel = teammate.gaHandy ? `GA ${teammate.gaHandy}` : teammate.houseHandy ? `HH ${teammate.houseHandy}` : teammate.handicap || '-';
                    return (
                      <div
                        key={teammate.phone}
                        onClick={() => !isDisabled && setSelectedTeammate(teammate)}
                        style={{
                          padding: '16px',
                          borderRadius: '14px',
                          border: isSelected ? `2px solid #0047AB` : '1px solid #E8ECF0',
                          background: isDisabled ? '#F8FAFC' : isSelected ? '#EBF2FF' : '#FFFFFF',
                          boxShadow: isSelected ? '0 2px 12px rgba(0,71,171,0.12)' : '0 2px 8px rgba(0,0,0,0.07)',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          opacity: isDisabled ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: isSelected ? '#0047AB' : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: '700',
                            color: isSelected ? '#FFFFFF' : '#64748B', flexShrink: 0,
                          }}>
                            {(teammate.nickname || teammate.name || '?')[0]}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: '700', color: isSelected ? '#0047AB' : '#1E293B' }}>
                                {teammate.nickname || teammate.name}
                              </span>
                              {is2BBPartner && (
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#C2410C', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '6px', padding: '2px 6px' }}>
                                  2BB 파트너
                                </span>
                              )}
                              {isDisabled && (
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>마크 불가</span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: isSelected ? '#0047AB' : '#64748B', marginTop: '2px' }}>
                              핸디캡 {handicapLabel}
                            </div>
                          </div>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#0047AB' : '#CBD5E1'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

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
              } catch (e) { console.error('점수 확인 오류:', e); }
              setRoundStartTime(Date.now());
              setCurrentHole(1);
              setHoleScores({ teammate: Array(18).fill(0), me: Array(18).fill(0) });
              setShowMismatches(false);
              setStep('scorecard');
              setIsStartingRound(false);
            }}
            disabled={!selectedTeammate || isStartingRound}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: (selectedTeammate && !isStartingRound) ? '#0047AB' : '#E2E8F0',
              border: 'none', color: (selectedTeammate && !isStartingRound) ? '#FFFFFF' : '#94A3B8',
              fontWeight: '700', fontSize: '16px', letterSpacing: '-0.01em',
              cursor: (selectedTeammate && !isStartingRound) ? 'pointer' : 'not-allowed',
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
      <div style={{ minHeight: '100vh', background: '#0d1a45' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top) + 8px) 8px 8px', background: '#0d1a45', position: 'sticky', top: 0, zIndex: 200 }}>
          <button onClick={() => setStep('scorecard')} style={{ background: 'transparent', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
            ← 돌아가기
          </button>
        </div>

        <div style={{ padding: '0 16px', textAlign: 'center', color: 'white', marginTop: '20px', marginBottom: '32px' }}>
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
          <div style={{ textAlign: 'center', color: 'white', fontSize: '14px' }}>
            <div style={{ opacity: 0.6, marginBottom: '20px' }}>
              팀메이트가 점수 입력을 완료하면<br/>자동으로 비교가 시작됩니다
            </div>
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
      <div style={{ minHeight: '100vh', padding: '16px', background: '#0d1a45', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div style={{ textAlign: 'center', color: 'white', marginTop: '20px', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>🏌️ 라운드 종료!</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>{booking?.title} - {courseData?.name}</div>
        </div>
        
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-green)' }}>
              {selectedTeammate?.nickname || selectedTeammate?.name}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>HC: {selectedTeammate?.gaHandy || selectedTeammate?.handicap || '-'}</div>
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
              {user?.nickname || user?.name || guestSession?.guestName}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>HC: {user?.handicap || guestSession?.handicap || '-'}</div>
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
        background: '#0d1a45', 
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

  // 스코어 라벨 (PAR/BIRDIE/BOGEY 등)
  const getScoreLabel = (score, par) => {
    if (!score || score === 0 || !par) return null;
    const diff = score - par;
    if (diff <= -3) return { text: 'ALBATROSS', color: '#7C3AED' };
    if (diff === -2) return { text: 'EAGLE', color: '#0047AB' };
    if (diff === -1) return { text: 'BIRDIE', color: '#16a34a' };
    if (diff === 0) return { text: 'PAR', color: '#374151' };
    if (diff === 1) return { text: 'BOGEY', color: '#dc2626' };
    if (diff === 2) return { text: 'DBL BOGEY', color: '#991b1b' };
    return { text: 'TRIPLE+', color: '#7f1d1d' };
  };

  const ScoreSection = ({ isTeammate }) => {
    const score = isTeammate ? holeScores.teammate[currentHole - 1] : holeScores.me[currentHole - 1];
    const par = isTeammate
      ? courseData?.holePars?.[selectedTeammate?.gender === 'F' ? 'female' : 'male']?.[currentHole - 1]
      : courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male']?.[currentHole - 1];

    const parArrForCalc = isTeammate ? parArr : userParArr;
    const scoreArr = isTeammate ? holeScores.teammate : holeScores.me;

    let totalScore = 0, totalPar = 0;
    for (let i = 0; i < currentHole; i++) {
      if (scoreArr[i] > 0) { totalScore += scoreArr[i]; totalPar += (parArrForCalc[i] || 0); }
    }
    const ouDiff = totalScore - totalPar;
    const ouText = ouDiff > 0 ? `+${ouDiff}` : ouDiff === 0 ? 'E' : String(ouDiff);
    const ouColor = ouDiff > 0 ? '#dc2626' : ouDiff < 0 ? '#0047AB' : '#374151';

    const scoreLabel = getScoreLabel(score, par);
    const isNtp = !isTeammate && courseData?.nearHoles?.[currentHole - 1];

    // 선수명 및 핸디 (포썸 모드 포함)
    let playerName, handicap;
    if (gameMode === 'foursome' && foursomeData) {
      if (isTeammate) {
        playerName = foursomeData.opponents?.map(o => o?.nickname || o?.name).filter(Boolean).join(' & ') || '상대팀';
        handicap = foursomeData.isTeamA ? foursomeData.teamBHandicap : foursomeData.teamAHandicap;
      } else {
        const myName = user?.nickname || user?.name || '나';
        const partnerName = foursomeData.partner?.nickname || foursomeData.partner?.name || '파트너';
        playerName = `${myName} & ${partnerName}`;
        handicap = foursomeData.isTeamA ? foursomeData.teamAHandicap : foursomeData.teamBHandicap;
      }
    } else {
      playerName = isTeammate
        ? (selectedTeammate?.nickname || selectedTeammate?.name || '-')
        : (user?.nickname || user?.name || guestSession?.guestName || '-');
      const m = isTeammate ? null : members?.find(me => me.phone === effectiveUserPhone);
      handicap = isTeammate
        ? (selectedTeammate?.gaHandy || selectedTeammate?.houseHandy || selectedTeammate?.handicap || '-')
        : (m?.gaHandy || m?.houseHandy || m?.handicap || user?.handicap || guestSession?.handicap || '-');
    }

    const siArr = courseData?.holeIndexes?.[isTeammate ? (selectedTeammate?.gender === 'F' ? 'female' : 'male') : (user?.gender === 'F' ? 'female' : 'male')]
      || courseData?.holeIndexes?.male || null;
    const hasSI = siArr && siArr.length === 18;
    let holeStblPts = null;
    let cumulativeStbl = null;
    if (hasSI) {
      const hcp = Math.round(Number(handicap) || 0);
      const strokes = allocateStrokes(hcp, siArr);
      if (score > 0 && par) {
        holeStblPts = stablefordPoints(score, par, strokes[currentHole - 1]);
      }
      const stblResult = calculateStableford(scoreArr, parArrForCalc, siArr, hcp);
      cumulativeStbl = stblResult?.total ?? null;
    }

    const handleParClick = () => {
      if (!par) return;
      setScoreValue(isTeammate, score === par ? 0 : par);
    };

    const btnBase = {
      WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
      touchAction: 'none', userSelect: 'none', cursor: 'pointer',
    };
    const btnSize = s(68, 56);

    // 여성 회원 스코어 버튼은 Azure Blue 대신 깊은 red(#B91C1C)로 표시
    // selectedTeammate 객체에는 gender가 없을 수 있으므로 members 배열에서도 조회
    const teammateMemberRecord = isTeammate
      ? members?.find(m => m.phone === selectedTeammate?.phone || m.id === selectedTeammate?.id)
      : null;
    const rawGender = isTeammate
      ? (teammateMemberRecord?.gender ?? selectedTeammate?.gender)
      : user?.gender;
    // 'F', 'female', 'Female', '여', '여성' 등 가능한 모든 여성 표기 대응
    const genderNorm = String(rawGender ?? '').trim().toLowerCase();
    const isFemale = ['f', 'female', '여', '여성', 'w', 'woman'].includes(genderNorm);
    const accent = isFemale ? '#B91C1C' : '#0047AB';
    const accentShadowSm = isFemale ? 'rgba(185,28,28,0.10)' : 'rgba(0,71,171,0.10)';
    const accentShadowLg = isFemale ? 'rgba(185,28,28,0.35)' : 'rgba(0,71,171,0.35)';

    // 흰색 박스 공통 스타일
    const whiteBox = {
      background: '#fff',
      borderRadius: s(12,10),
      border: '1px solid #E8ECF0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    };

    return (
      <div style={{
        flex: 1, minHeight: 0,
        background: '#fff',
        borderRadius: s(20, 16),
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
        border: '1px solid #EEF2F6',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* 상단: 이름 + HC 배지 */}
        <div style={{ padding: `${s(35,28)}px ${s(45,36)}px ${s(6,5)}px`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: s(8,6) }}>
            <div style={{ fontSize: s(20,17), fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {playerName}
            </div>
            <div style={{
              background: '#EFF6FF', color: '#0047AB',
              fontSize: s(12,11), fontWeight: 700,
              padding: `${s(3,2)}px ${s(10,8)}px`, borderRadius: 20,
              flexShrink: 0,
            }}>
              HC {handicap}
            </div>
          </div>
        </div>

        {/* 중앙: 스코어 입력 */}
        <div style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: `${s(24,20)}px ${s(45,36)}px ${s(12,10)}px`,
          gap: s(6,4),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: s(32,24) }}>
            {/* 마이너스 버튼 - 아웃라인 */}
            <button
              onClick={() => updateScore(isTeammate, -1)}
              style={{
                ...btnBase,
                width: btnSize, height: btnSize, border: 'none',
                borderRadius: s(18, 15),
                background: '#fff',
                outline: `2.5px solid #0047AB`,
                color: '#0047AB',
                fontSize: s(28, 24), fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,71,171,0.10)',
              }}
            >
              −
            </button>

            {/* 스코어 숫자 */}
            <div style={{
              fontSize: s(56, 46), fontWeight: 800,
              color: score > 0 ? '#111827' : '#D1D5DB',
              lineHeight: 1, minWidth: s(68, 56), textAlign: 'center',
              letterSpacing: '-0.03em',
            }}>
              {score}
            </div>

            {/* 플러스 버튼 - 솔리드 블루 */}
            <button
              onClick={() => updateScore(isTeammate, 1)}
              style={{
                ...btnBase,
                width: btnSize, height: btnSize, border: 'none',
                borderRadius: s(18, 15),
                background: '#0047AB',
                color: '#fff',
                fontSize: s(28, 24), fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,71,171,0.35)',
              }}
            >
              +
            </button>
          </div>

          {/* 스코어 라벨 + 스테이블포드 배지 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: s(8, 6),
            minHeight: s(16, 14),
          }}>
            <div style={{
              fontSize: s(11, 10), fontWeight: 800,
              color: scoreLabel ? scoreLabel.color : '#D1D5DB',
              letterSpacing: '0.10em',
            }}>
              {scoreLabel ? scoreLabel.text : (par ? 'PAR' : '—')}
            </div>
            {hasSI && holeStblPts != null && (
              <div style={{
                background: holeStblPts >= 3 ? '#16a34a' : holeStblPts === 2 ? '#6B7280' : holeStblPts === 1 ? '#F19E38' : '#dc2626',
                color: '#fff',
                fontSize: s(9, 8), fontWeight: 800,
                padding: `${s(2,1)}px ${s(6,5)}px`,
                borderRadius: 10,
                letterSpacing: '0.02em',
              }}>
                {holeStblPts}pts
              </div>
            )}
          </div>
        </div>

        {/* 하단: 회색 배경 + 흰색 독립 박스들 */}
        <div style={{
          flexShrink: 0,
          background: '#F3F6F9',
          padding: `${s(14,11)}px ${s(12,10)}px`,
          display: 'flex', alignItems: 'center',
          gap: s(7,5),
        }}>
          {/* PAR 흰색 박스 */}
          <button
            onClick={handleParClick}
            style={{
              ...btnBase,
              ...whiteBox,
              flex: 1.4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${s(8,6)}px ${s(10,8)}px`,
              height: s(82,70),
            }}
          >
            <div style={{
              background: accent, borderRadius: s(10,8),
              width: '100%', height: s(58,50), flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: s(10,8), fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em', lineHeight: 1 }}>PAR</div>
              <div style={{ fontSize: s(22,18), fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{par || '—'}</div>
            </div>
          </button>

          {/* NTP 흰색 박스 */}
          {isNtp ? (
            <button
              onClick={() => { setNtpDistance(''); setShowNtpModal(true); }}
              style={{
                ...btnBase,
                ...whiteBox,
                width: s(72,60), height: s(82,70),
                gap: s(4,3),
                flexShrink: 0,
              }}
            >
              <div style={{
                width: s(30,26), height: s(30,26), borderRadius: 7,
                background: '#38bdf8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'ntpBlink 1.2s ease-in-out infinite',
              }}>
                <svg width={s(16,13)} height={s(16,13)} viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                </svg>
              </div>
              <div style={{ fontSize: s(10,9), fontWeight: 700, color: '#0369a1', letterSpacing: '0.05em' }}>NTP</div>
            </button>
          ) : (
            // NTP 홀 아닐때: 빈 자리 유지 (레이아웃 일관성)
            <div style={{ ...whiteBox, width: s(72,60), height: s(82,70), flexShrink: 0, opacity: 0 }} />
          )}

          {/* TOTAL 흰색 박스 */}
          <div style={{ ...whiteBox, flex: 1, height: s(82,70), gap: s(3,2) }}>
            <div style={{ fontSize: s(11,9), fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' }}>TOTAL</div>
            <div style={{ fontSize: s(23,19), fontWeight: 900, color: '#111827', lineHeight: 1 }}>
              {totalScore > 0 ? totalScore : '—'}
            </div>
          </div>

          {/* O/U 흰색 박스 */}
          <div style={{ ...whiteBox, flex: 1, height: s(82,70), gap: s(3,2) }}>
            <div style={{ fontSize: s(11,9), fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' }}>O/U</div>
            <div style={{ fontSize: s(23,19), fontWeight: 900, color: totalScore > 0 ? ouColor : '#94A3B8', lineHeight: 1 }}>
              {totalScore > 0 ? ouText : '—'}
            </div>
          </div>

          {/* STBL 흰색 박스 (SI 데이터 있을 때만) */}
          {hasSI && (
            <div style={{ ...whiteBox, flex: 1, height: s(82,70), gap: s(3,2) }}>
              <div style={{ fontSize: s(11,9), fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' }}>STBL</div>
              <div style={{ fontSize: s(23,19), fontWeight: 900, color: cumulativeStbl != null ? '#16a34a' : '#94A3B8', lineHeight: 1 }}>
                {cumulativeStbl != null ? cumulativeStbl : '—'}
              </div>
            </div>
          )}
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
    // 버그 수정 1: 미완성 홀 경고
    const myEmptyHoles = holeScores.me.map((s, i) => s === 0 ? i + 1 : null).filter(Boolean);
    const tmEmptyHoles = holeScores.teammate.map((s, i) => s === 0 ? i + 1 : null).filter(Boolean);
    if (myEmptyHoles.length > 0 || tmEmptyHoles.length > 0) {
      const lines = [];
      if (myEmptyHoles.length > 0) lines.push(`내 스코어 미입력: ${myEmptyHoles.join(', ')}홀`);
      if (tmEmptyHoles.length > 0) lines.push(`팀메이트 스코어 미입력: ${tmEmptyHoles.join(', ')}홀`);
      const ok = window.confirm(`아직 입력되지 않은 홀이 있습니다.\n${lines.join('\n')}\n\n그래도 점수확인을 진행하시겠습니까?`);
      if (!ok) return;
    }

    if (!effectiveUserId || !booking?.title) {
      alert('로그인 정보 또는 라운딩 정보가 없습니다.');
      return;
    }

    try {
      const userParArr = courseData?.holePars?.[user?.gender === 'F' ? 'female' : 'male'] || [];
      const scoreDate = booking?.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const totalMe = holeScores.me.reduce((a, b) => a + b, 0);
      const coursePar = userParArr.reduce((a, b) => a + b, 0);

      const myGameMetadata = gameMode === 'foursome' && foursomeData ? {
        partner: { name: foursomeData.partner?.nickname || foursomeData.partner?.name, phone: foursomeData.partner?.phone },
        opponents: foursomeData.opponents?.map(o => ({ name: o?.nickname || o?.name, phone: o?.phone })) || [],
        recordedBy: user?.nickname || user?.name,
      } : null;

      const scoreData = {
        markerId: effectiveUserId,
        roundingName: booking.title,
        date: scoreDate,
        courseName: courseData?.name,
        totalScore: totalMe,
        coursePar,
        holes: holeScores.me,
        gameMode: gameMode === 'foursome' ? 'foursome' : null,
        gameMetadata: myGameMetadata,
      };

      // 버그 수정 2: 저장 실패 시 진행 차단
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...scoreData, memberId: effectiveUserId })
      });

      if (!res.ok) {
        alert('스코어 저장에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
        return;
      }
    } catch (e) {
      console.error('점수 저장 오류:', e);
      alert('네트워크 오류로 스코어를 저장하지 못했습니다. 인터넷 연결을 확인해주세요.');
      return;
    }

    setTeammateReady(false);
    setServerMismatches([]);
    setStep('scoreCheck');
  };
  
  return (
    <div
      ref={scorecardRootRef}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#F1F5F9',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitTextSizeAdjust: 'none',
        textSizeAdjust: 'none',
      }}>
      {/* ── 홀 네비게이션 헤더 ── */}
      <div style={{ background: '#1B2D5E', flexShrink: 0, padding: `${s(27,21)}px ${s(16,14)}px`, touchAction: 'none' }}>
        {/* 라운드종료 | HOLE X | Leaderboard — 한 줄 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 좌: 라운드 종료 */}
          <button
            onClick={() => setShowEndRoundModal(true)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: s(13,12), fontWeight: 600, cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent', minWidth: s(70,60), textAlign: 'left' }}
          >
            라운드 종료
          </button>

          {/* 중앙: 홀 번호 (클릭 → 드롭다운) */}
          <div
            onClick={() => setShowHoleSelector(true)}
            style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s(2,1) }}
          >
            <div style={{ fontSize: s(9,8), fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', lineHeight: 1 }}>
              CURRENT HOLE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: s(4,3) }}>
              <div style={{ fontSize: s(22,19), fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                HOLE {currentHole}
              </div>
              <svg width={s(11,10)} height={s(11,10)} viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* 우: 저장상태 + Leaderboard + (18홀) 점수확인 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: s(70,60) }}>
            {/* 저장 상태 라벨 제거 — 헤더 높이 흔들림 방지 (내부 저장 로직은 그대로) */}
            <button
              onClick={() => navigate(`/leaderboard?id=${bookingId}`)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: s(13,12), fontWeight: 700, cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent', textAlign: 'right' }}
            >
              Leaderboard
            </button>
            {currentHole === 18 && (
              <button
                onClick={handleScoreCheck}
                style={{
                  background: '#3B82F6', border: 'none', color: '#fff',
                  fontSize: s(11,10), fontWeight: 700, cursor: 'pointer',
                  padding: `${s(4,3)}px ${s(8,6)}px`, borderRadius: 6,
                  WebkitTapHighlightColor: 'transparent', lineHeight: 1.2,
                }}
              >
                점수확인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 플레이어 카드 2개 ── */}
      <div ref={cardContainerRef} style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        gap: s(22,18), paddingTop: s(20,16), paddingLeft: s(22,18), paddingRight: s(22,18), paddingBottom: s(32,26),
        overflow: 'hidden',
        willChange: 'transform',
        touchAction: 'none',
      }}>
        <ScoreSection isTeammate={true} />
        <ScoreSection isTeammate={false} />
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
              {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
                const isCurrent = currentHole === hole;
                const isMismatch = mismatchHoles.includes(hole);
                // 현재 홀은 기존 초록 스타일 유지. 불일치 홀은 배경 빨강.
                const bg = isCurrent
                  ? '#4a9d6a'
                  : isMismatch
                    ? '#e74c3c'
                    : 'rgba(255,255,255,0.1)';
                const borderColor = isCurrent
                  ? '#4a9d6a'
                  : isMismatch
                    ? '#e74c3c'
                    : 'rgba(255,255,255,0.2)';
                return (
                  <button
                    key={hole}
                    onClick={() => {
                      setCurrentHole(hole);
                      setShowHoleSelector(false);
                    }}
                    style={{
                      padding: '12px 8px',
                      background: bg,
                      color: 'white',
                      border: `2px solid ${borderColor}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {hole}
                  </button>
                );
              })}
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
                  
                  // 자동저장 타이머 취소
                  if (serverSaveTimerRef.current) {
                    clearTimeout(serverSaveTimerRef.current);
                    serverSaveTimerRef.current = null;
                  }
                  
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
                      headers: getAuthHeaders(),
                      body: JSON.stringify({
                        memberId: effectiveUserId,
                        markerId: effectiveUserId,
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
                      headers: getAuthHeaders(),
                      body: JSON.stringify({
                        memberId: teammateMemberId,
                        markerId: effectiveUserId,
                        date: scoreDate,
                        roundingName: booking?.title
                      })
                    });
                    
                    // 서버 저장 상태 초기화
                    lastSavedScoresRef.current = null;
                    localStorage.removeItem(`play_state_${bookingId}`);
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
                onClick={() => {
                  if (!confirm('입력 화면을 나가시겠습니까? 이미 저장된 스코어는 유지됩니다.')) {
                    return;
                  }
                  localStorage.removeItem(`play_state_${bookingId}`);
                  setShowEndRoundModal(false);
                  navigate(-1);
                }}
                style={{
                  padding: '14px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                종료하기
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
                touchAction: 'auto', // touch-action:none 자식 상속에서 input 제외 (안드로이드 키보드)
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
                      headers: getAuthHeaders(),
                      body: JSON.stringify({
                        bookingId: bookingId,
                        memberId: effectiveUserId,
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

      <style>{`
        @keyframes ntpBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

export default Play;
