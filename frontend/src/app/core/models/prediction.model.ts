import { MatchStage } from './match.model';

export interface PredictionRequest {
  team_a_id: string;
  team_b_id: string;
  venue_id: string;
  toss_winner: 'team_a' | 'team_b';
  toss_decision: 'bat' | 'field';
  season: number;
  stage: MatchStage;
}

export interface PredictionTeamResult {
  id: string;
  short_name: string;
  full_name: string;
  win_probability: number;
  brand_color: string;
}

export interface FeatureContribution {
  name: string;
  label: string;
  value: number;
}

export interface PredictionResult {
  team_a: PredictionTeamResult;
  team_b: PredictionTeamResult;
  confidence: 'low' | 'medium' | 'high';
  model_version: string;
  feature_contributions: FeatureContribution[];
  historical_context: {
    h2h_total_matches: number;
    team_a_h2h_wins: number;
    team_b_h2h_wins: number;
  };
}

export interface FeatureImportanceItem {
  name: string;
  label: string;
  importance: number;
}
