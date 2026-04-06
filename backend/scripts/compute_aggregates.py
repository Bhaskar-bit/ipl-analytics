#!/usr/bin/env python3
"""
Compute Aggregate Statistics
=============================
Refreshes the team_season_stats and player_season_stats precomputed tables.
Run this after ingest_cricsheet.py completes.

Usage:
    python scripts/compute_aggregates.py
"""
import os
import logging
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def main():
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    log.info("Refreshing team_season_stats...")
    sb.rpc("refresh_team_season_stats").execute()

    log.info("Refreshing player_season_stats...")
    sb.rpc("refresh_player_season_stats").execute()

    log.info("Computing match scores into matches table...")
    sb.rpc("refresh_match_scores").execute()

    log.info("All aggregates refreshed successfully!")


if __name__ == "__main__":
    main()
