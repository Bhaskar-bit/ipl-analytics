export type MatchStage = 'group' | 'qualifier1' | 'eliminator' | 'qualifier2' | 'final';

export interface Match {
  id: string;
  cricsheet_match_id: string;
  season: number;
  date: string;
  venue_id: string;
  venue_name?: string;
  team1_id: string;
  team1_short_name?: string;
  team2_id: string;
  team2_short_name?: string;
  toss_winner_id: string;
  toss_decision: 'bat' | 'field';
  winner_id: string | null;
  winner_short_name?: string;
  win_margin: number | null;
  win_by: 'runs' | 'wickets' | null;
  stage: MatchStage;
  player_of_match_id: string | null;
  team1_score: number | null;
  team1_wickets: number | null;
  team2_score: number | null;
  team2_wickets: number | null;
  dl_applied: boolean;
}

export interface Innings {
  id: string;
  match_id: string;
  innings_number: number;
  batting_team_id: string;
  bowling_team_id: string;
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  extras: number;
}

export interface Scorecard {
  match: Match;
  innings: InningsDetail[];
}

export interface InningsDetail extends Innings {
  batting_performances: BattingPerformance[];
  bowling_performances: BowlingPerformance[];
  fall_of_wickets: FallOfWicket[];
}

export interface BattingPerformance {
  player_id: string;
  player_name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  dismissal: string;
}

export interface BowlingPerformance {
  player_id: string;
  player_name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface FallOfWicket {
  wicket_number: number;
  score: number;
  over: number;
  player_name: string;
}
