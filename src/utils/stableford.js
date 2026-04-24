export function allocateStrokes(hcp, siArray) {
  const strokes = new Array(18).fill(0);
  if (!siArray || siArray.length !== 18) return strokes;

  const absHcp = Math.abs(hcp);
  const base = Math.floor(absHcp / 18);
  const extra = absHcp % 18;

  for (let i = 0; i < 18; i++) {
    const si = siArray[i];
    const s = base + (si <= extra ? 1 : 0);
    strokes[i] = hcp >= 0 ? s : -s;
  }
  return strokes;
}

export function stablefordPoints(grossScore, par, extraStrokes) {
  if (!grossScore || grossScore <= 0) return 0;
  const netScore = grossScore - extraStrokes;
  const diff = netScore - par;
  if (diff >= 2) return 0;
  if (diff === 1) return 1;
  if (diff === 0) return 2;
  if (diff === -1) return 3;
  if (diff === -2) return 4;
  return 5;
}

export function calculateStableford(holesArray, parsArray, siArray, hcp) {
  if (!siArray || siArray.length !== 18) return null;
  if (!holesArray || !parsArray) return null;
  if (!holesArray.some(h => h > 0)) return null;

  const strokes = allocateStrokes(Math.round(hcp), siArray);
  const perHole = new Array(18).fill(0);
  let total = 0;

  for (let i = 0; i < 18; i++) {
    if (holesArray[i] > 0) {
      const pts = stablefordPoints(holesArray[i], parsArray[i] || 4, strokes[i]);
      perHole[i] = pts;
      total += pts;
    }
  }

  return { total, perHole };
}
