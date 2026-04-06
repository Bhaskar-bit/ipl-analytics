#!/usr/bin/env python3
"""
Nightly Data Refresh Script
============================
Runs every night after IPL matches finish:
  1. Ingests new match files from Cricsheet
  2. Recomputes team & player aggregate stats
  3. Optionally retrains the ML model (weekly)

Usage:
    python scripts/nightly_refresh.py [--retrain]
    python scripts/nightly_refresh.py --retrain    # force model retrain

Logs are written to: logs/nightly_refresh.log
"""
import os
import sys
import logging
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# ── Logging setup ─────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "nightly_refresh.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

SCRIPTS_DIR = Path(__file__).parent
PYTHON = sys.executable  # Use the same Python that's running this script


def run_step(name: str, script: str, extra_args: list = None) -> bool:
    """Run a script step, return True on success."""
    cmd = [PYTHON, str(SCRIPTS_DIR / script)] + (extra_args or [])
    log.info(f"▶ Starting: {name}")
    start = datetime.now()
    try:
        result = subprocess.run(
            cmd,
            cwd=str(SCRIPTS_DIR.parent),  # Run from backend/ dir
            capture_output=False,
            timeout=3600,  # 1-hour max per step
        )
        elapsed = (datetime.now() - start).seconds
        if result.returncode == 0:
            log.info(f"✅ {name} completed in {elapsed}s")
            return True
        else:
            log.error(f"❌ {name} failed with exit code {result.returncode}")
            return False
    except subprocess.TimeoutExpired:
        log.error(f"❌ {name} timed out after 1 hour")
        return False
    except Exception as e:
        log.error(f"❌ {name} raised exception: {e}")
        return False


def should_retrain_today() -> bool:
    """Retrain on Mondays (day 0) or if retrain flag file exists."""
    retrain_flag = SCRIPTS_DIR.parent / "logs" / "force_retrain"
    if retrain_flag.exists():
        retrain_flag.unlink()
        log.info("Force-retrain flag found — will retrain model")
        return True
    # Retrain every Monday
    return datetime.now().weekday() == 0


def main():
    parser = argparse.ArgumentParser(description="Nightly IPL data refresh")
    parser.add_argument("--retrain", action="store_true", help="Force model retrain")
    parser.add_argument("--skip-ingest", action="store_true", help="Skip ingestion (aggregates only)")
    args = parser.parse_args()

    log.info("=" * 60)
    log.info(f"Nightly refresh started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info("=" * 60)

    success_count = 0
    fail_count = 0

    # ── Step 1: Ingest new matches from Cricsheet ──────────────────────────────
    if not args.skip_ingest:
        ok = run_step("Cricsheet Ingestion", "ingest_cricsheet.py")
        if ok:
            success_count += 1
        else:
            fail_count += 1
            log.warning("Ingestion failed — continuing with aggregates using existing data")
    else:
        log.info("⏭ Skipping ingestion (--skip-ingest flag set)")

    # ── Step 2: Recompute aggregate stats ─────────────────────────────────────
    ok = run_step("Compute Aggregates", "compute_aggregates.py")
    if ok:
        success_count += 1
    else:
        fail_count += 1

    # ── Step 3: Retrain model (weekly or forced) ───────────────────────────────
    if args.retrain or should_retrain_today():
        ok = run_step("Model Retraining", "train_model.py")
        if ok:
            success_count += 1
        else:
            fail_count += 1
    else:
        log.info("⏭ Skipping model retrain (runs every Monday or with --retrain flag)")

    # ── Summary ────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info(f"Refresh complete — {success_count} steps OK, {fail_count} steps failed")
    log.info(f"Log file: {LOG_FILE}")
    log.info("=" * 60)

    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
