export interface Season {
  year: number;
  total_matches: number;
  winner_team_id: string;
  winner_short_name?: string;
  runner_up_team_id: string;
  runner_up_short_name?: string;
}

export interface SeasonSummary {
  year: number;
  total_matches: number;
  total_runs: number;
  total_sixes: number;
  total_fours: number;
  highest_team_score: number;
  top_scorer_name: string;
  top_scorer_runs: number;
  top_wicket_taker_name: string;
  top_wicket_taker_wickets: number;
  winner_short_name: string;
}

export interface PointsTableRow {
  position: number;
  team_id: string;
  team_short_name: string;
  team_full_name: string;
  brand_color: string;
  matches_played: number;
  wins: number;
  losses: number;
  no_results: number;
  points: number;
  nrr: number;
  qualified_for_playoffs: boolean;
}

export interface RunTrendPoint {
  season: number;
  avg_score: number;
  total_sixes: number;
  total_fours: number;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  avg_first_innings_score: number;
  pace_friendly: boolean;
}
