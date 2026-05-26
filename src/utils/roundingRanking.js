import { calculateStableford } from './stableford';

// 리더보드(Leaderboard.jsx)의 순위 계산을 그대로 옮긴 공용 함수.
// 라운딩 페이지에서 "우승자"(리더보드 맨 위 이름)를 동일하게 뽑기 위함.
// ⚠️ Leaderboard.jsx의 계산/정렬 로직과 반드시 동일하게 유지할 것.
export function computeRoundingRanking(bookingScores, { booking, members = [], courses = [] }) {
  const dailyHandicaps = booking.dailyHandicaps
    ? (typeof booking.dailyHandicaps === 'string' ? JSON.parse(booking.dailyHandicaps) : booking.dailyHandicaps)
    : {};
  const gradeSettings = booking.gradeSettings
    ? (typeof booking.gradeSettings === 'string' ? JSON.parse(booking.gradeSettings) : booking.gradeSettings)
    : null;
  const gameMode = gradeSettings?.mode || 'stroke';

  const course = courses.find((c) => c.name === booking.courseName);
  const holePars = course?.holePars?.male || Array(18).fill(4);
  const siAvailable = !!(
    (course?.holeIndexes?.male && course.holeIndexes.male.length === 18)
    || (course?.holeIndexes?.female && course.holeIndexes.female.length === 18)
  );

  const participants = (booking.participants || []).map((p) => {
    if (typeof p === 'string') { try { return JSON.parse(p); } catch { return null; } }
    return p;
  }).filter(Boolean);

  const processedScores = (bookingScores || []).map((score) => {
    const member = score.user || members.find((m) => m.id === score.userId || m.phone === score.userId);
    const participant = participants.find((p) => p.phone === score.userId || p.id === score.userId);
    const guestHandicap = participant?.gaHandy || participant?.houseHandy || participant?.handicap;
    const nickname = member?.nickname || member?.name || participant?.nickname || participant?.name || score.userId;
    const isGuestPlayer = member?.isGuest || participant?.isGuest || false;
    const memberHandicap = member ? (parseFloat(member.gaHandy) || parseFloat(member.houseHandy) || parseFloat(member.handicap) || null) : null;
    const handicap = dailyHandicaps[score.userId] ?? memberHandicap ?? guestHandicap ?? 0;

    let grade = 'ALL';
    if (gradeSettings) {
      const hcp = Number(handicap) || 0;
      const gradeA = gradeSettings.gradeA || { type: 'below', value: '' };
      const gradeB = gradeSettings.gradeB || { min: '', max: '' };
      const gradeC = gradeSettings.gradeC || { min: '', max: '' };
      const gradeD = gradeSettings.gradeD || { type: 'above', value: '' };

      if (gradeA.value !== '' && gradeA.value !== null) {
        if ((gradeA.type === 'below' && hcp <= gradeA.value) || (gradeA.type === 'above' && hcp >= gradeA.value)) grade = 'A';
      }
      if (grade === 'ALL' && gradeB.min !== '' && gradeB.max !== '' && gradeB.min !== null && gradeB.max !== null) {
        if (hcp >= gradeB.min && hcp <= gradeB.max) grade = 'B';
      }
      if (grade === 'ALL' && gradeC.min !== '' && gradeC.min !== null) {
        const cMin = parseFloat(gradeC.min);
        const cMax = (gradeC.max !== '' && gradeC.max !== null) ? parseFloat(gradeC.max) : null;
        if (!Number.isNaN(cMin) && hcp >= cMin && (cMax === null || hcp <= cMax)) grade = 'C';
      }
      if (grade === 'ALL' && gradeD.value !== '' && gradeD.value !== null) {
        if ((gradeD.type === 'below' && hcp <= gradeD.value) || (gradeD.type === 'above' && hcp >= gradeD.value)) grade = 'D';
      }
    }

    const holesArray = typeof score.holes === 'string' ? JSON.parse(score.holes) : score.holes;

    let currentTotalScore = 0;
    let playedPar = 0;
    let hasHoleData = false;
    if (holesArray && holesArray.length > 0) {
      holesArray.forEach((holeScore, idx) => {
        if (holeScore > 0) { currentTotalScore += holeScore; playedPar += (holePars[idx] || 4); hasHoleData = true; }
      });
    }
    const totalScore = currentTotalScore || (score.totalScore || 0);
    if (!hasHoleData && score.totalScore > 0) playedPar = 72;

    const hcp = Math.round(Number(handicap) || 0);
    const netScore = totalScore - hcp;

    const playerGender = member?.gender === 'female' ? 'female' : 'male';
    const playerSI = course?.holeIndexes?.[playerGender] || course?.holeIndexes?.male || null;
    const playerPars = course?.holePars?.[playerGender] || holePars;
    const stableford = siAvailable && playerSI?.length === 18 && holesArray?.some((h) => h > 0)
      ? calculateStableford(holesArray, playerPars, playerSI, hcp)
      : null;

    return {
      odId: score.userId,
      phone: member?.phone || score.userId,
      nickname,
      isGuest: isGuestPlayer,
      handicap,
      grade,
      totalScore,
      netScore,
      stablefordTotal: stableford?.total ?? null,
    };
  });

  // 리더보드 기본 정렬: 스코어 없는 사람 뒤로, 네트 오름차순
  processedScores.sort((a, b) => {
    if (a.totalScore === 0 && b.totalScore === 0) return 0;
    if (a.totalScore === 0) return 1;
    if (b.totalScore === 0) return -1;
    return a.netScore - b.netScore;
  });

  return { processedScores, gradeSettings, gameMode };
}

// 정렬된 순위에서 우승자 추출 (맨 위 이름).
export function deriveWinners(processedScores) {
  const played = (processedScores || []).filter((s) => s.totalScore > 0);
  if (played.length === 0) return { overall: null, gradeWinners: [] };
  const overall = played[0];
  const grades = [...new Set(played.map((s) => s.grade))].filter((g) => g && g !== 'ALL').sort();
  const gradeWinners = grades.map((g) => ({ grade: g, winner: played.find((s) => s.grade === g) }));
  return { overall, gradeWinners };
}
