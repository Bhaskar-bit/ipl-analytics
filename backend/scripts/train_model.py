#!/usr/bin/env python3
"""
IPL Win Prediction Model — Training Script
==========================================
Fetches historical match data from Supabase, engineers features,
trains an XGBoost classifier with GroupKFold cross-validation,
and saves the calibrated model artifact.

Usage:
    python scripts/train_model.py [--output app/ml/models/]

Requirements: pip install xgboost scikit-learn pandas joblib supabase optuna python-dotenv
"""
import os
import sys
import logging
import argparse
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, accuracy_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.ml.feature_config import FEATURE_COLUMNS, STAGE_ENCODING, SEASON_BASE


def fetch_training_data(sb) -> pd.DataFrame:
    """Fetch all completed matches with team stats from Supabase."""
    log.info("Fetching training data from Supabase...")
    result = sb.rpc("get_training_dataset").execute()
    data = result.data or []
    if not data:
        raise ValueError("No training data returned. Ensure the DB has been populated with Cricsheet data.")
    df = pd.DataFrame(data)
    log.info(f"Fetched {len(df)} training samples")
    return df


def build_feature_matrix(df: pd.DataFrame):
    """
    The RPC 'get_training_dataset' should return one row per match,
    with both teams from team_a's perspective (augmented by swapping teams
    so each match contributes 2 rows — one for each team as team_a).

    Expected columns from RPC:
      - All FEATURE_COLUMNS
      - 'label': 1 if team_a wins, 0 if team_b wins
      - 'season': for GroupKFold splitting
    """
    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    y = df["label"].values.astype(int)
    groups = df["season"].values  # Used for GroupKFold (never train on future, test on past)
    return X, y, groups


def train(X, y, groups):
    """Train XGBoost with GroupKFold + calibration."""

    base_model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
        use_label_encoder=False,
    )

    # GroupKFold: each fold tests on one season, trains on the rest
    gkf = GroupKFold(n_splits=5)

    log.info("Running cross-validation (GroupKFold by season)...")
    cv_scores = cross_val_score(base_model, X, y, cv=gkf, groups=groups, scoring="roc_auc")
    log.info(f"CV ROC-AUC scores: {cv_scores.round(3)}")
    log.info(f"Mean ROC-AUC: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # Final training on all data
    log.info("Training final model on full dataset...")
    base_model.fit(X, y)

    # Calibrate for reliable probability output
    log.info("Calibrating model with isotonic regression...")
    calibrated = CalibratedClassifierCV(base_model, method="isotonic", cv=3)
    calibrated.fit(X, y)

    y_pred = calibrated.predict(X)
    y_proba = calibrated.predict_proba(X)[:, 1]

    train_acc = accuracy_score(y, y_pred)
    train_auc = roc_auc_score(y, y_proba)
    log.info(f"Training accuracy: {train_acc:.3f} | Training AUC: {train_auc:.3f}")
    log.info("Note: Use CV scores for unbiased performance estimate.")

    return calibrated


def save_artifacts(model, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "xgb_win_predictor.joblib"
    joblib.dump(model, model_path)
    log.info(f"Model saved to {model_path}")


def main():
    parser = argparse.ArgumentParser(description="Train IPL win prediction model")
    parser.add_argument("--output", default="app/ml/models/", help="Output directory for model artifacts")
    args = parser.parse_args()

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    df = fetch_training_data(sb)
    X, y, groups = build_feature_matrix(df)

    log.info(f"Feature matrix shape: {X.shape}")
    log.info(f"Class distribution: {np.bincount(y)} (0=team_b wins, 1=team_a wins)")

    model = train(X, y, groups)
    save_artifacts(model, Path(args.output))
    log.info("Training complete!")


if __name__ == "__main__":
    main()
