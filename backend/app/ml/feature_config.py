"""
Feature configuration for the IPL win prediction model.
Maps feature names to human-readable labels.
"""

FEATURE_COLUMNS = [
    "team_a_win_rate_overall",
    "team_b_win_rate_overall",
    "team_a_win_rate_last_3_seasons",
    "team_b_win_rate_last_3_seasons",
    "team_a_win_rate_current_season",
    "team_b_win_rate_current_season",
    "team_a_home_win_rate",
    "team_b_home_win_rate",
    "h2h_win_rate_team_a",
    "h2h_total_matches",
    "h2h_win_rate_team_a_at_venue",
    "venue_avg_first_innings_score",
    "venue_team_a_win_rate",
    "venue_team_b_win_rate",
    "venue_is_neutral",
    "toss_winner_is_team_a",
    "toss_decision_bat_first",
    "venue_toss_advantage",
    "team_a_avg_score_last_5_matches",
    "team_b_avg_score_last_5_matches",
    "team_a_top3_batsmen_avg_strike_rate",
    "team_b_top3_batsmen_avg_strike_rate",
    "team_a_bowling_economy_last_5",
    "team_b_bowling_economy_last_5",
    "team_a_top3_bowlers_avg_economy",
    "team_b_top3_bowlers_avg_economy",
    "season_encoded",
    "match_stage_encoded",
]

FEATURE_LABELS = {
    "team_a_win_rate_overall":              "Team A Overall Win Rate",
    "team_b_win_rate_overall":              "Team B Overall Win Rate",
    "team_a_win_rate_last_3_seasons":       "Team A 3-Season Win Rate",
    "team_b_win_rate_last_3_seasons":       "Team B 3-Season Win Rate",
    "team_a_win_rate_current_season":       "Team A Current Season Win%",
    "team_b_win_rate_current_season":       "Team B Current Season Win%",
    "team_a_home_win_rate":                 "Team A Home Win Rate",
    "team_b_home_win_rate":                 "Team B Home Win Rate",
    "h2h_win_rate_team_a":                  "Head-to-Head Win Rate (A)",
    "h2h_total_matches":                    "H2H Total Matches (log)",
    "h2h_win_rate_team_a_at_venue":         "H2H Win Rate at Venue (A)",
    "venue_avg_first_innings_score":        "Venue Avg 1st Innings Score",
    "venue_team_a_win_rate":                "Team A Win% at Venue",
    "venue_team_b_win_rate":                "Team B Win% at Venue",
    "venue_is_neutral":                     "Neutral Venue",
    "toss_winner_is_team_a":                "Team A Won Toss",
    "toss_decision_bat_first":              "Toss Decision: Bat First",
    "venue_toss_advantage":                 "Venue Toss Win Advantage",
    "team_a_avg_score_last_5_matches":      "Team A Avg Score (Last 5)",
    "team_b_avg_score_last_5_matches":      "Team B Avg Score (Last 5)",
    "team_a_top3_batsmen_avg_strike_rate":  "Team A Top 3 SR",
    "team_b_top3_batsmen_avg_strike_rate":  "Team B Top 3 SR",
    "team_a_bowling_economy_last_5":        "Team A Bowling Economy (Last 5)",
    "team_b_bowling_economy_last_5":        "Team B Bowling Economy (Last 5)",
    "team_a_top3_bowlers_avg_economy":      "Team A Top 3 Bowlers Economy",
    "team_b_top3_bowlers_avg_economy":      "Team B Top 3 Bowlers Economy",
    "season_encoded":                       "Season",
    "match_stage_encoded":                  "Match Stage",
}

STAGE_ENCODING = {
    "group": 0, "qualifier1": 1, "eliminator": 2, "qualifier2": 3, "final": 4
}

SEASON_BASE = 2008  # season_encoded = year - SEASON_BASE
