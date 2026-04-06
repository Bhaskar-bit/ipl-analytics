"""
Vercel Serverless Entry Point — IPL Predictor API
===================================================
Handles all /api/* routes. Model is bundled at 1.7MB
and loaded once per warm instance (cached globally).
"""
import os
import math
import logging
import numpy as np
import joblib
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from typing import Optional

from ml.feature_config import FEATURE_COLUMNS, FEATURE_LABELS, STAGE_ENCODING, SEASON_BASE

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="IPL Predictor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model (loaded once, cached across warm invocations) ───────────────────────
_MODEL_PATH = Path(__file__).parent / "ml" / "models" / "xgb_win_predictor.joblib"
_model = None

def get_model():
    global _model
    if _model is None:
        _model = joblib.load(_MODEL_PATH)
        log.info("Model loaded from %s", _MODEL_PATH)
    return _model


# ── Supabase client ───────────────────────────────────────────────────────────
def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_ANON_KEY"],
    )


# ── Schemas ───────────────────────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    team_a_id: str
    team_b_id: str
    venue_id: str
    toss_winner: str        # "team_a" | "team_b"
    toss_decision: str      # "bat" | "field"
    season: int
    stage: str              # "group" | "qualifier1" | "eliminator" | "qualifier2" | "final"


# ── Feature helpers ───────────────────────────────────────────────────────────
def _safe_rpc(sb: Client, fn: str, params: dict, default):
    try:
        r = sb.rpc(fn, params).execute()
        return r.data or default
    except Exception:
        return default


def build_features(sb: Client, req: PredictionRequest) -> np.ndarray:
    team_a_stats = _safe_rpc(sb, "get_team_overall_stats", {"p_team_id": req.team_a_id}, {})
    team_b_stats = _safe_rpc(sb, "get_team_overall_stats", {"p_team_id": req.team_b_id}, {})
    h2h          = _safe_rpc(sb, "get_h2h_stats", {"p_team_a_id": req.team_a_id, "p_team_b_id": req.team_b_id, "p_venue_id": req.venue_id}, {})
    venue        = _safe_rpc(sb, "get_venue_stats_for_teams", {"p_venue_id": req.venue_id, "p_team_a_id": req.team_a_id, "p_team_b_id": req.team_b_id}, {})
    recent_a     = _safe_rpc(sb, "get_team_recent_form", {"p_team_id": req.team_a_id, "p_last_n": 5}, {})
    recent_b     = _safe_rpc(sb, "get_team_recent_form", {"p_team_id": req.team_b_id, "p_last_n": 5}, {})

    # Season win rate
    def season_wr(team_id: str) -> float:
        try:
            r = sb.table("team_season_stats").select("wins,matches_played").eq("team_id", team_id).eq("season", req.season).execute()
            rows = r.data or []
            if rows and rows[0]["matches_played"] > 0:
                return rows[0]["wins"] / rows[0]["matches_played"]
        except Exception:
            pass
        return 0.5

    fv = {
        "team_a_win_rate_overall":          team_a_stats.get("overall_win_rate", 0.5),
        "team_b_win_rate_overall":          team_b_stats.get("overall_win_rate", 0.5),
        "team_a_win_rate_last_3_seasons":   team_a_stats.get("win_rate_last_3", 0.5),
        "team_b_win_rate_last_3_seasons":   team_b_stats.get("win_rate_last_3", 0.5),
        "team_a_win_rate_current_season":   season_wr(req.team_a_id),
        "team_b_win_rate_current_season":   season_wr(req.team_b_id),
        "team_a_home_win_rate":             team_a_stats.get("home_win_rate", 0.5),
        "team_b_home_win_rate":             team_b_stats.get("home_win_rate", 0.5),
        "h2h_win_rate_team_a":              h2h.get("win_rate_a", 0.5),
        "h2h_total_matches":                math.log1p(h2h.get("total_matches", 0)),
        "h2h_win_rate_team_a_at_venue":     h2h.get("win_rate_a_at_venue", 0.5),
        "venue_avg_first_innings_score":    venue.get("avg_first_innings_score", 160) / 200.0,
        "venue_team_a_win_rate":            venue.get("team_a_win_rate", 0.5),
        "venue_team_b_win_rate":            venue.get("team_b_win_rate", 0.5),
        "venue_is_neutral":                 float(venue.get("is_neutral", False)),
        "venue_toss_advantage":             venue.get("toss_win_advantage", 0.5),
        "toss_winner_is_team_a":            1.0 if req.toss_winner == "team_a" else 0.0,
        "toss_decision_bat_first":          1.0 if req.toss_decision == "bat" else 0.0,
        "team_a_avg_score_last_5_matches":  recent_a.get("avg_score", 160) / 200.0,
        "team_b_avg_score_last_5_matches":  recent_b.get("avg_score", 160) / 200.0,
        "team_a_top3_batsmen_avg_strike_rate": recent_a.get("top3_sr", 130) / 200.0,
        "team_b_top3_batsmen_avg_strike_rate": recent_b.get("top3_sr", 130) / 200.0,
        "team_a_bowling_economy_last_5":    recent_a.get("bowling_economy", 8.5) / 15.0,
        "team_b_bowling_economy_last_5":    recent_b.get("bowling_economy", 8.5) / 15.0,
        "team_a_top3_bowlers_avg_economy":  recent_a.get("top3_economy", 7.5) / 15.0,
        "team_b_top3_bowlers_avg_economy":  recent_b.get("top3_economy", 7.5) / 15.0,
        "season_encoded":                   float(req.season - SEASON_BASE) / 20.0,
        "match_stage_encoded":              float(STAGE_ENCODING.get(req.stage, 0)) / 4.0,
    }
    return np.array([[fv[col] for col in FEATURE_COLUMNS]], dtype=np.float32)


def get_feature_importances(model) -> np.ndarray:
    if hasattr(model, "feature_importances_"):
        return model.feature_importances_
    if hasattr(model, "calibrated_classifiers_"):
        return np.mean([c.estimator.feature_importances_ for c in model.calibrated_classifiers_
                        if hasattr(c.estimator, "feature_importances_")], axis=0)
    return np.ones(len(FEATURE_COLUMNS)) / len(FEATURE_COLUMNS)


def fetch_team(sb: Client, team_id: str) -> dict:
    try:
        r = sb.table("teams").select("id,short_name,full_name,brand_color").eq("id", team_id).limit(1).execute()
        if r.data:
            return r.data[0]
    except Exception:
        pass
    return {"id": team_id, "short_name": "TM", "full_name": "Unknown", "brand_color": "#6b7280"}


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    model_ok = _MODEL_PATH.exists()
    return {"status": "ok", "model_loaded": model_ok, "version": "2.0.0"}


@app.post("/predict/match-winner")
def predict_match_winner(req: PredictionRequest):
    model = get_model()
    sb    = get_supabase()

    team_a = fetch_team(sb, req.team_a_id)
    team_b = fetch_team(sb, req.team_b_id)

    try:
        X = build_features(sb, req)
        proba = model.predict_proba(X)[0]
        team_a_prob = float(proba[1])
        team_b_prob = 1.0 - team_a_prob

        max_prob = max(team_a_prob, team_b_prob)
        confidence = "high" if max_prob >= 0.70 else "medium" if max_prob >= 0.58 else "low"

        importances = get_feature_importances(model)
        contributions = sorted([
            {"name": col, "label": FEATURE_LABELS.get(col, col), "value": round(float(importances[i]), 4)}
            for i, col in enumerate(FEATURE_COLUMNS)
        ], key=lambda x: x["value"], reverse=True)[:8]

        h2h = _safe_rpc(sb, "get_h2h_stats", {
            "p_team_a_id": req.team_a_id,
            "p_team_b_id": req.team_b_id,
            "p_venue_id": req.venue_id
        }, {})
        total_h2h = h2h.get("total_matches", 0)
        win_rate_a = h2h.get("win_rate_a", 0.5)

        return {
            "team_a": {
                "id": team_a["id"],
                "short_name": team_a["short_name"],
                "full_name": team_a["full_name"],
                "win_probability": round(team_a_prob, 4),
                "brand_color": team_a.get("brand_color", "#3b82f6"),
            },
            "team_b": {
                "id": team_b["id"],
                "short_name": team_b["short_name"],
                "full_name": team_b["full_name"],
                "win_probability": round(team_b_prob, 4),
                "brand_color": team_b.get("brand_color", "#ef4444"),
            },
            "confidence": confidence,
            "model_version": "xgb-v2.1",
            "feature_contributions": contributions,
            "historical_context": {
                "h2h_total_matches": total_h2h,
                "team_a_h2h_wins": int(win_rate_a * total_h2h),
                "team_b_h2h_wins": int((1 - win_rate_a) * total_h2h),
            }
        }
    except Exception as e:
        log.error("Prediction error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/predict/feature-importance")
def feature_importance():
    model = get_model()
    importances = get_feature_importances(model)
    features = sorted([
        {"name": col, "label": FEATURE_LABELS.get(col, col), "importance": round(float(importances[i]), 4)}
        for i, col in enumerate(FEATURE_COLUMNS)
    ], key=lambda x: x["importance"], reverse=True)
    return {"model_version": "xgb-v2.1", "features": features}
