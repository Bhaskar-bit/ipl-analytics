export function calcStrikeRate(runs: number, balls: number): number {
  return balls === 0 ? 0 : parseFloat(((runs / balls) * 100).toFixed(2));
}

export function calcEconomy(runs: number, overs: number): number {
  return overs === 0 ? 0 : parseFloat((runs / overs).toFixed(2));
}

export function calcAverage(runs: number, dismissals: number): number {
  return dismissals === 0 ? runs : parseFloat((runs / dismissals).toFixed(2));
}

export function calcRunRate(runs: number, overs: number): number {
  return overs === 0 ? 0 : parseFloat((runs / overs).toFixed(2));
}

export function requiredRunRate(target: number, remaining: number, oversDone: number, totalOvers: number): number {
  const oversLeft = totalOvers - oversDone;
  return oversLeft <= 0 ? Infinity : parseFloat((remaining / oversLeft).toFixed(2));
}

export function oversToString(overs: number): string {
  const whole = Math.floor(overs);
  const balls = Math.round((overs - whole) * 10);
  return `${whole}.${balls}`;
}

export function winProbabilityLabel(prob: number): string {
  if (prob >= 0.7) return 'Strong Favourite';
  if (prob >= 0.55) return 'Slight Favourite';
  return 'Even Contest';
}
