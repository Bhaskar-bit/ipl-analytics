export type PlayerRole = 'batsman' | 'bowler' | 'allrounder' | 'wk-batsman';

export interface Player {
  id: string;
  cricsheet_name: string;
  display_name: string;
  nationality: string;
  batting_style: string;
  bowling_style: string | null;
  primary_role: PlayerRole;
  photo_url: string | null;
  date_of_birth: string | null;
}

export interface BattingStats {
  matches: number;
  innings: number;
  runs: number;
  balls_faced: number;
  highest_score: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  batting_average: number;
  strike_rate: number;
  not_outs: number;
}

export interface BowlingStats {
  matches: number;
  overs_bowled: number;
  wickets: number;
  runs_conceded: number;
  economy_rate: number;
  bowling_average: number;
  bowling_strike_rate: number;
  best_bowling_wickets: number;
  best_bowling_runs: number;
  maidens: number;
}

export interface FormIndex {
  player_id: string;
  last_n: number;
  form_score: number; // 0–100
  trend: 'rising' | 'falling' | 'stable';
  recent_runs: number[];
  recent_wickets: number[];
}

export interface HeatmapCell {
  over_bracket: string; // "PP (1-6)", "Middle (7-15)", "Death (16-20)"
  run_category: string; // "0", "1-2", "3-4", "6"
  count: number;
}

export interface BattingLeader {
  player_id: string;
  display_name: string;
  team_short_name: string;
  runs: number;
  innings: number;
  average: number;
  strike_rate: number;
}

export interface BowlingLeader {
  player_id: string;
  display_name: string;
  team_short_name: string;
  wickets: number;
  overs: number;
  economy: number;
  average: number;
}
