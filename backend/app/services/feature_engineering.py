"""
Feature engineering: converts raw PredictionRequest into a model-ready
feature vector by querying historical stats from Supabase.
"""
import numpy as np
import math
from supabase import Client
from app.ml.feature_config import FEATURE_COLUMNS, STAGE_ENCODING, SEASON_BASE


class FeatureEngineer:
    def __init__(self, supabase: Client):
        self.sb = supabase

    async def build_feature_vector(
        self,
        team_a_id: str,
        team_b_id: str,
        venue_id: str,
        toss_winner: str,   # "team_a" | "team_b"
        toss_decision: str,  # "bat" | "field"
        season: int,
        stage: str,
    ) -> dict:
        """Return a dict of feature_name → float value."""

        # ── Fetch all data in parallel (sequential for simplicity) ──────────
        team_a_stats = self._get_team_overall_stats(team_a_id)
        team_b_stats = self._get_team_overall_stats(team_b_id)
        h2h = self._get_h2h_stats(team_a_id, team_b_id, venue_id)
        venue_stats = self._get_venue_stats(venue_id, team_a_id, team_b_id)
        recent_a = self._get_recent_form(team_a_id, last_n=5)
        recent_b = self._get_recent_form(team_b_id, last_n=5)

        features = {
            # ── Team strength ────────────────────────────────────────────────
            "team_a_win_rate_overall":          team_a_stats["overall_win_rate"],
            "team_b_win_rate_overall":          team_b_stats["overall_win_rate"],
            "team_a_win_rate_last_3_seasons":   team_a_stats["win_rate_last_3"],
            "team_b_win_rate_last_3_seasons":   team_b_stats["win_rate_last_3"],
            "team_a_win_rate_current_season":   self._get_current_season_win_rate(team_a_id, season),
            "team_b_win_rate_current_season":   self._get_current_season_win_rate(team_b_id, season),
            "team_a_home_win_rate":             team_a_stats["home_win_rate"],
            "team_b_home_win_rate":             team_b_stats["home_win_rate"],

            # ── Head-to-head ─────────────────────────────────────────────────
            "h2h_win_rate_team_a":              h2h["win_rate_a"],
            "h2h_total_matches":                math.log1p(h2h["total_matches"]),
            "h2h_win_rate_team_a_at_venue":     h2h["win_rate_a_at_venue"],

            # ── Venue ────────────────────────────────────────────────────────
            "venue_avg_first_innings_score":    venue_stats["avg_first_innings_score"] / 200.0,
            "venue_team_a_win_rate":            venue_stats["team_a_win_rate"],
            "venue_team_b_win_rate":            venue_stats["team_b_win_rate"],
            "venue_is_neutral":                 float(venue_stats["is_neutral"]),
            "venue_toss_advantage":             venue_stats["toss_win_advantage"],

            # ── Toss ─────────────────────────────────────────────────────────
            "toss_winner_is_team_a":            1.0 if toss_winner == "team_a" else 0.0,
            "toss_decision_bat_first":          1.0 if toss_decision == "bat" else 0.0,

            # ── Recent batting strength ──────────────────────────────────────
            "team_a_avg_score_last_5_matches":  recent_a["avg_score"] / 200.0,
            "team_b_avg_score_last_5_matches":  recent_b["avg_score"] / 200.0,
            "team_a_top3_batsmen_avg_strike_rate": recent_a["top3_sr"] / 200.0,
            "team_b_top3_batsmen_avg_strike_rate": recent_b["top3_sr"] / 200.0,

            # ── Recent bowling strength ──────────────────────────────────────
            "team_a_bowling_economy_last_5":    recent_a["bowling_economy"] / 15.0,
            "team_b_bowling_economy_last_5":    recent_b["bowling_economy"] / 15.0,
            "team_a_top3_bowlers_avg_economy":  recent_a["top3_economy"] / 15.0,
            "team_b_top3_bowlers_avg_economy":  recent_b["top3_economy"] / 15.0,

            # ── Season / stage ───────────────────────────────────────────────
            "season_encoded":                   float(season - SEASON_BASE) / 20.0,
            "match_stage_encoded":              float(STAGE_ENCODING.get(stage, 0)) / 4.0,
        }

        return features

    def to_numpy(self, features: dict) -> np.ndarray:
        return np.array([[features[col] for col in FEATURE_COLUMNS]], dtype=np.float32)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _get_team_overall_stats(self, team_id: str) -> dict:
        try:
            r = self.sb.rpc("get_team_overall_stats", {"p_team_id": team_id}).execute()
            data = r.data or {}
            return {
                "overall_win_rate": data.get("overall_win_rate", 0.5),
                "win_rate_last_3": data.get("win_rate_last_3", 0.5),
                "home_win_rate": data.get("home_win_rate", 0.5),
            }
        except Exception:
            return {"overall_win_rate": 0.5, "win_rate_last_3": 0.5, "home_win_rate": 0.5}

    def _get_current_season_win_rate(self, team_id: str, season: int) -> float:
        try:
            r = self.sb.table("team_season_stats").select("wins,matches_played") \
                .eq("team_id", team_id).eq("season", season).execute()
            rows = r.data or []
            if rows and rows[0]["matches_played"] > 0:
                return rows[0]["wins"] / rows[0]["matches_played"]
            return 0.5
        except Exception:
            return 0.5

    def _get_h2h_stats(self, team_a_id: str, team_b_id: str, venue_id: str) -> dict:
        try:
            r = self.sb.rpc("get_h2h_stats", {
                "p_team_a_id": team_a_id,
                "p_team_b_id": team_b_id,
                "p_venue_id": venue_id,
            }).execute()
            data = r.data or {}
            return {
                "win_rate_a": data.get("win_rate_a", 0.5),
                "total_matches": data.get("total_matches", 0),
                "win_rate_a_at_venue": data.get("win_rate_a_at_venue", 0.5),
            }
        except Exception:
            return {"win_rate_a": 0.5, "total_matches": 0, "win_rate_a_at_venue": 0.5}

    def _get_venue_stats(self, venue_id: str, team_a_id: str, team_b_id: str) -> dict:
        try:
            r = self.sb.rpc("get_venue_stats_for_teams", {
                "p_venue_id": venue_id,
                "p_team_a_id": team_a_id,
                "p_team_b_id": team_b_id,
            }).execute()
            data = r.data or {}
            return {
                "avg_first_innings_score": data.get("avg_first_innings_score", 160),
                "team_a_win_rate": data.get("team_a_win_rate", 0.5),
                "team_b_win_rate": data.get("team_b_win_rate", 0.5),
                "is_neutral": data.get("is_neutral", False),
                "toss_win_advantage": data.get("toss_win_advantage", 0.5),
            }
        except Exception:
            return {
                "avg_first_innings_score": 160,
                "team_a_win_rate": 0.5,
                "team_b_win_rate": 0.5,
                "is_neutral": False,
                "toss_win_advantage": 0.5,
            }

    def _get_recent_form(self, team_id: str, last_n: int = 5) -> dict:
        try:
            r = self.sb.rpc("get_team_recent_form", {
                "p_team_id": team_id,
                "p_last_n": last_n,
            }).execute()
            data = r.data or {}
            return {
                "avg_score": data.get("avg_score", 160),
                "top3_sr": data.get("top3_sr", 130),
                "bowling_economy": data.get("bowling_economy", 8.5),
                "top3_economy": data.get("top3_economy", 7.5),
            }
        except Exception:
            return {"avg_score": 160, "top3_sr": 130, "bowling_economy": 8.5, "top3_economy": 7.5}
