export const TEAM_COLORS: Record<string, string> = {
  MI:  '#004BA0',
  CSK: '#F5A623',
  RCB: '#EC1C24',
  KKR: '#3A225D',
  DC:  '#00368D',
  PBKS:'#ED1B24',
  RR:  '#EA1A85',
  SRH: '#FF822A',
  LSG: '#A9DEFF',
  GT:  '#1B2133',
};

export function getTeamColor(shortName: string): string {
  return TEAM_COLORS[shortName] ?? '#6c757d';
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const CHART_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316',
];
