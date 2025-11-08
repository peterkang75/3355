/**
 * 핸디캡 계산 유틸리티
 * GA (Golflink) vs HH (House Handicap) 구분
 */

/**
 * 회원의 추천핸디 계산
 * @param {Object} member - 회원 정보 (golflinkNumber, handicap 포함)
 * @param {Array} rounds - 스코어 기록
 * @returns {Object} { value: 핸디값, explanation: 계산설명 }
 */
export function calculateHandicap(member, rounds) {
  // GA (Golflink Number가 있는 회원)
  if (member?.golflinkNumber && member.golflinkNumber.trim()) {
    const gaHandicap = parseFloat(member.handicap) || 0;
    return {
      value: gaHandicap,
      type: 'GA',
      explanation: `GA 핸디: ${gaHandicap} (Golflink 등록 핸디)`
    };
  }

  // HH (House Handicap) 계산
  const validRounds = rounds.filter(r => r.totalScore && r.totalScore > 0);
  const count = validRounds.length;

  if (count === 0) {
    return {
      value: 18,
      type: 'HH',
      explanation: '기본 핸디: 18 (스코어 기록 없음)'
    };
  }

  // 1개 스코어
  if (count === 1) {
    const score = validRounds[0].totalScore;
    const hh = Math.round((score - 72) * 0.95);
    return {
      value: Math.max(0, hh),
      type: 'HH',
      explanation: `1개 스코어: (${score} - 72) × 0.95 = ${hh.toFixed(1)}`
    };
  }

  // 2개 스코어
  if (count === 2) {
    const scores = validRounds.map(r => r.totalScore);
    const avg = scores.reduce((sum, s) => sum + s, 0) / 2;
    const hh = Math.round((avg - 72) * 0.9);
    return {
      value: Math.max(0, hh),
      type: 'HH',
      explanation: `2개 스코어 평균: (${avg.toFixed(1)} - 72) × 0.9 = ${hh.toFixed(1)}`
    };
  }

  // 3-5개 스코어: 최고 스코어(최악) 1개 제외
  if (count >= 3 && count <= 5) {
    const scores = validRounds.map(r => r.totalScore).sort((a, b) => a - b);
    // 최고 스코어(최악) 1개 제외
    const scoresWithoutWorst = scores.slice(0, -1);
    const avg = scoresWithoutWorst.reduce((sum, s) => sum + s, 0) / scoresWithoutWorst.length;
    const hh = Math.round((avg - 72) * 0.9);
    const worstScore = scores[scores.length - 1];
    
    return {
      value: Math.max(0, hh),
      type: 'HH',
      explanation: `${count}개 중 최악(${worstScore}) 제외, 평균: (${avg.toFixed(1)} - 72) × 0.9 = ${hh.toFixed(1)}`
    };
  }

  // 6개 이상: GA Australia 공식
  return calculateGAHandicap(validRounds);
}

/**
 * GA Australia 공식 (5개 이상 스코어)
 */
function calculateGAHandicap(rounds) {
  const differentials = rounds.map(round => {
    const coursePar = round.coursePar || 72;
    return round.totalScore - coursePar;
  }).sort((a, b) => a - b);

  const count = differentials.length;
  let numberOfBest;

  // GA Australia 공식: 라운드 수에 따른 베스트 라운드 개수
  if (count >= 20) {
    numberOfBest = 10;
  } else if (count >= 10) {
    numberOfBest = 5;
  } else if (count >= 7) {
    numberOfBest = 3;
  } else {
    numberOfBest = 2;
  }

  const bestDifferentials = differentials.slice(0, numberOfBest);
  const avgDifferential = bestDifferentials.reduce((sum, d) => sum + d, 0) / numberOfBest;
  const hh = Math.round(avgDifferential * 0.93);

  return {
    value: Math.max(0, Math.min(54, hh)),
    type: 'HH',
    explanation: `GA 공식: ${count}개 라운드 중 베스트 ${numberOfBest}개 평균 × 0.93 = ${hh.toFixed(1)}`
  };
}

/**
 * 간단한 핸디 인덱스 계산 (기존 호환성)
 */
export function getHandicapIndex(totalScore, coursePar = 72) {
  const differential = totalScore - coursePar;
  return Math.round(differential * 0.96);
}

/**
 * 스코어 이력 분석
 */
export function analyzeScoreHistory(rounds) {
  if (!rounds || rounds.length === 0) {
    return {
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      improvement: 0,
      totalRounds: 0
    };
  }

  const validRounds = rounds.filter(r => r.totalScore && r.totalScore > 0);
  
  if (validRounds.length === 0) {
    return {
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      improvement: 0,
      totalRounds: 0
    };
  }

  const scores = validRounds.map(r => r.totalScore);
  const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  const bestScore = Math.min(...scores);
  const worstScore = Math.max(...scores);

  let improvement = 0;
  if (validRounds.length >= 5) {
    const recentAvg = scores.slice(-5).reduce((sum, s) => sum + s, 0) / 5;
    const olderAvg = scores.slice(0, Math.min(5, validRounds.length - 5)).reduce((sum, s) => sum + s, 0) / Math.min(5, validRounds.length - 5);
    improvement = Math.round(olderAvg - recentAvg);
  }

  return {
    averageScore,
    bestScore,
    worstScore,
    improvement,
    totalRounds: validRounds.length
  };
}
