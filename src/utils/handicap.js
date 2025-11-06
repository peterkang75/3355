export function calculateHandicap(rounds) {
  if (!rounds || rounds.length === 0) {
    return 18;
  }

  const validRounds = rounds.filter(round => round.totalScore && round.totalScore > 0);
  
  if (validRounds.length === 0) {
    return 18;
  }

  const sortedRounds = validRounds
    .map(round => {
      const differential = round.totalScore - round.coursePar;
      return { ...round, differential };
    })
    .sort((a, b) => a.differential - b.differential);

  let numberOfRoundsToUse;
  if (sortedRounds.length >= 20) {
    numberOfRoundsToUse = 10;
  } else if (sortedRounds.length >= 10) {
    numberOfRoundsToUse = 5;
  } else if (sortedRounds.length >= 5) {
    numberOfRoundsToUse = 3;
  } else {
    numberOfRoundsToUse = 1;
  }

  const bestRounds = sortedRounds.slice(0, numberOfRoundsToUse);
  const averageDifferential = bestRounds.reduce((sum, round) => sum + round.differential, 0) / bestRounds.length;

  const handicap = Math.round(averageDifferential * 0.96);

  return Math.max(0, Math.min(54, handicap));
}

export function getHandicapIndex(totalScore, coursePar = 72) {
  const differential = totalScore - coursePar;
  return Math.round(differential * 0.96);
}

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
