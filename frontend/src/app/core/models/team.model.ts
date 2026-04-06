export interface Team {
  id: string;
  short_name: string;
  full_name: string;
  home_venue: string;
  logo_url: string | null;
  brand_color: string;
  active_from: number;
  active_to: number | null;
  cricsheet_name: string;
}

export interface TeamStats {
  team_id: string;
  matches_played: number;
  wins: number;
  losses: number;
  no_results: number;
  win_rate: number;
  avg_score_batting_first: number;
  avg_score_bowling_first: number;
}

export interface HomeAwayRecord {
  home_matches: number;
  home_wins: number;
  home_win_rate: number;
  away_matches: number;
  away_wins: number;
  away_win_rate: number;
}

export interface SeasonRecord {
  season: number;
  matches_played: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
  position: number;
  qualified_for_playoffs: boolean;
}
