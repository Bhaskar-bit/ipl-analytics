"""
Orchestrates feature engineering and model inference.
"""
import numpy as np
from supabase import Client
from app.schemas.prediction import (
    PredictionRequest, PredictionResult,
    TeamProbability, FeatureContribution, HistoricalContext
)
from app.services.feature_engineering import FeatureEngineer
from app.ml.feature_config import FEATURE_LABELS, FEATURE_COLUMNS


def _get_feature_importances(model) -> np.ndarray:
    """Extract feature importances from XGBClassifier or CalibratedClassifierCV."""
    if hasattr(model, "feature_importances_"):
        return model.feature_importances_
    if hasattr(model, "calibrated_classifiers_"):
        # Average importances across all calibration folds
        importances = np.mean([
            c.estimator.feature_importances_
            for c in model.calibrated_classifiers_
            if hasattr(c.estimator, "feature_importances_")
        ], axis=0)
        return importances
    # Fallback: uniform weights
    return np.ones(len(FEATURE_COLUMNS)) / len(FEATURE_COLUMNS)


class PredictionService:
    MODEL_VERSION = "xgb-v2.1"

    def __init__(self, model, supabase: Client):
        self.model = model
        self.supabase = supabase
        self.engineer = FeatureEngineer(supabase)

    async def predict(self, request: PredictionRequest) -> PredictionResult:
        # Fetch team metadata
        team_a = self._fetch_team(request.team_a_id)
        team_b = self._fetch_team(request.team_b_id)

        # Build features
        features = await self.engineer.build_feature_vector(
            team_a_id=request.team_a_id,
            team_b_id=request.team_b_id,
            venue_id=request.venue_id,
            toss_winner=request.toss_winner,
            toss_decision=request.toss_decision,
            season=request.season,
            stage=request.stage.value,
        )

        X = self.engineer.to_numpy(features)

        # Model inference
        proba = self.model.predict_proba(X)[0]
        team_a_prob = float(proba[1])  # class 1 = team_a wins
        team_b_prob = 1.0 - team_a_prob

        # Confidence level
        max_prob = max(team_a_prob, team_b_prob)
        if max_prob >= 0.70:
            confidence = "high"
        elif max_prob >= 0.58:
            confidence = "medium"
        else:
            confidence = "low"

        # Feature contributions (use model's feature importances as proxy)
        contributions = self._get_contributions(features)

        # H2H context
        h2h = self.engineer._get_h2h_stats(request.team_a_id, request.team_b_id, request.venue_id)

        return PredictionResult(
            team_a=TeamProbability(
                id=team_a["id"],
                short_name=team_a["short_name"],
                full_name=team_a["full_name"],
                win_probability=round(team_a_prob, 4),
                brand_color=team_a.get("brand_color", "#3b82f6"),
            ),
            team_b=TeamProbability(
                id=team_b["id"],
                short_name=team_b["short_name"],
                full_name=team_b["full_name"],
                win_probability=round(team_b_prob, 4),
                brand_color=team_b.get("brand_color", "#ef4444"),
            ),
            confidence=confidence,
            model_version=self.MODEL_VERSION,
            feature_contributions=contributions,
            historical_context=HistoricalContext(
                h2h_total_matches=h2h["total_matches"],
                team_a_h2h_wins=int(h2h["win_rate_a"] * h2h["total_matches"]),
                team_b_h2h_wins=int((1 - h2h["win_rate_a"]) * h2h["total_matches"]),
            ),
        )

    def _fetch_team(self, team_id: str) -> dict:
        try:
            r = self.supabase.table("teams").select("id,short_name,full_name,brand_color") \
                .eq("id", team_id).limit(1).execute()
            rows = r.data or []
            if rows:
                return rows[0]
        except Exception:
            pass
        return {"id": team_id, "short_name": "TM", "full_name": "Unknown Team", "brand_color": "#6b7280"}

    def _get_contributions(self, features: dict) -> list:
        importances = _get_feature_importances(self.model)
        contributions = []
        for i, col in enumerate(FEATURE_COLUMNS):
            contributions.append(FeatureContribution(
                name=col,
                label=FEATURE_LABELS.get(col, col),
                value=round(float(importances[i]), 4),
            ))
        return sorted(contributions, key=lambda x: x.value, reverse=True)[:8]
