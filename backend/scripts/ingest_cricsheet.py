#!/usr/bin/env python3
"""
Cricsheet IPL Data Ingestion Script
=====================================
Downloads the IPL JSON archive from Cricsheet and ingests it into Supabase.

Usage:
    python scripts/ingest_cricsheet.py [--data-dir ./data/raw] [--force]

Requirements: pip install supabase requests rapidfuzz python-dotenv
"""
import os
import sys
import json
import time
import zipfile
import logging
import argparse
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from rapidfuzz import process as fuzz_process

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

CRICSHEET_URL = "https://cricsheet.org/downloads/ipl_json.zip"

# ─── Supabase client ─────────────────────────────────────────────────────────
def _make_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )

sb: Client = _make_client()


def _retry(fn, retries: int = 4, delay: float = 2.0):
    """Call fn(), retrying on RemoteProtocolError / connection errors with reconnect."""
    global sb
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            err = str(e)
            if "RemoteProtocolError" in err or "Server disconnected" in err or "Connection" in err:
                log.warning(f"Connection error (attempt {attempt + 1}/{retries}): {e}. Reconnecting...")
                time.sleep(delay * (attempt + 1))
                sb = _make_client()  # fresh client
            else:
                raise  # non-connection errors bubble up immediately
    raise RuntimeError(f"Failed after {retries} retries")

# ─── Caches (loaded once) ─────────────────────────────────────────────────────
_teams_cache: dict[str, str] = {}     # cricsheet_name → id
_venues_cache: dict[str, str] = {}    # name → id
_players_cache: dict[str, str] = {}   # cricsheet_name → id


def load_caches():
    global _teams_cache, _venues_cache, _players_cache
    teams = _retry(lambda: sb.table("teams").select("id,cricsheet_name").execute()).data or []
    _teams_cache = {t["cricsheet_name"]: t["id"] for t in teams}

    venues = _retry(lambda: sb.table("venues").select("id,name").execute()).data or []
    _venues_cache = {v["name"]: v["id"] for v in venues}

    players = _retry(lambda: sb.table("players").select("id,cricsheet_name").execute()).data or []
    _players_cache = {p["cricsheet_name"]: p["id"] for p in players}

    log.info(f"Loaded caches: {len(_teams_cache)} teams, {len(_venues_cache)} venues, {len(_players_cache)} players")


def get_or_create_venue(name: str, city: str = "") -> str:
    if name in _venues_cache:
        return _venues_cache[name]
    result = _retry(lambda: sb.table("venues").insert({"name": name, "city": city}).execute())
    vid = result.data[0]["id"]
    _venues_cache[name] = vid
    log.info(f"Created venue: {name}")
    return vid


def resolve_team(cricsheet_name: str) -> str | None:
    if cricsheet_name in _teams_cache:
        return _teams_cache[cricsheet_name]
    # Fuzzy match against known team names
    match = fuzz_process.extractOne(cricsheet_name, list(_teams_cache.keys()), score_cutoff=80)
    if match:
        log.warning(f"Team fuzzy match: '{cricsheet_name}' → '{match[0]}'")
        return _teams_cache[match[0]]
    log.error(f"Could not resolve team: '{cricsheet_name}'")
    return None


def get_or_create_player(name: str) -> str:
    if name in _players_cache:
        return _players_cache[name]
    # Fuzzy match first
    match = fuzz_process.extractOne(name, list(_players_cache.keys()), score_cutoff=85)
    if match:
        return _players_cache[match[0]]
    # Create new player
    result = _retry(lambda: sb.table("players").insert({
        "cricsheet_name": name,
        "display_name": name,
        "nationality": "Unknown",
        "batting_style": "Unknown",
        "primary_role": "batsman",
    }).execute())
    pid = result.data[0]["id"]
    _players_cache[name] = pid
    log.info(f"Created player: {name}")
    return pid


def is_already_ingested(cricsheet_match_id: str) -> bool:
    result = _retry(lambda: sb.table("ingestion_log")
        .select("filename")
        .eq("filename", cricsheet_match_id)
        .eq("status", "success")
        .execute())
    return len(result.data or []) > 0


def log_ingestion(filename: str, status: str, error: str = ""):
    _retry(lambda: sb.table("ingestion_log").upsert({
        "filename": filename,
        "status": status,
        "error_message": error,
        "ingested_at": datetime.utcnow().isoformat(),
    }).execute())


def ingest_match_file(filepath: Path, force: bool = False) -> bool:
    match_id = filepath.stem
    if not force and is_already_ingested(match_id):
        return True

    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)

        info = data.get("info", {})
        innings_data = data.get("innings", [])

        # ── Parse info ────────────────────────────────────────────────────────
        dates = info.get("dates", [])
        match_date = dates[0] if dates else "2008-01-01"
        season_raw = info.get("season", "2008")
        season = int(str(season_raw).split("/")[0])
        teams = info.get("teams", [])
        if len(teams) < 2:
            raise ValueError("Less than 2 teams in match")

        team1_name, team2_name = teams[0], teams[1]
        team1_id = resolve_team(team1_name)
        team2_id = resolve_team(team2_name)
        if not team1_id or not team2_id:
            raise ValueError(f"Could not resolve teams: {team1_name}, {team2_name}")

        venue_name = info.get("venue", "Unknown Venue")
        venue_id = get_or_create_venue(venue_name, info.get("city", ""))

        toss = info.get("toss", {})
        toss_winner_name = toss.get("winner", team1_name)
        toss_winner_id = resolve_team(toss_winner_name) or team1_id
        toss_decision = toss.get("decision", "bat")

        outcome = info.get("outcome", {})
        winner_name = outcome.get("winner")
        winner_id = resolve_team(winner_name) if winner_name else None
        win_by_dict = outcome.get("by", {})
        win_margin = list(win_by_dict.values())[0] if win_by_dict else None
        win_by = list(win_by_dict.keys())[0] if win_by_dict else None

        event = info.get("event", {})
        stage_raw = event.get("stage", "group stage").lower()
        stage_map = {
            "group stage": "group",
            "qualifier 1": "qualifier1",
            "eliminator": "eliminator",
            "qualifier 2": "qualifier2",
            "final": "final",
        }
        stage = "group"
        for k, v in stage_map.items():
            if k in stage_raw:
                stage = v
                break

        pom_list = info.get("player_of_match", [])
        pom_id = get_or_create_player(pom_list[0]) if pom_list else None

        # ── Upsert match ──────────────────────────────────────────────────────
        match_result = _retry(lambda: sb.table("matches").upsert({
            "cricsheet_match_id": match_id,
            "season": season,
            "date": match_date,
            "venue_id": venue_id,
            "team1_id": team1_id,
            "team2_id": team2_id,
            "toss_winner_id": toss_winner_id,
            "toss_decision": toss_decision,
            "winner_id": winner_id,
            "win_margin": win_margin,
            "win_by": win_by,
            "stage": stage,
            "player_of_match_id": pom_id,
            "dl_applied": "method" in outcome,
        }, on_conflict="cricsheet_match_id").execute())

        match_db_id = match_result.data[0]["id"]

        # ── Insert innings & deliveries ───────────────────────────────────────
        for idx, innings in enumerate(innings_data):
            innings_number = idx + 1

            # Cricsheet marks super overs with innings_data[n].get("super_over")
            # We allow up to innings 6 in the DB; skip anything beyond that
            if innings_number > 6:
                log.warning(f"Skipping innings {innings_number} for match {match_id} (too many innings)")
                continue

            batting_team_name = innings.get("team", "")
            batting_team_id = resolve_team(batting_team_name) or team1_id
            bowling_team_id = team2_id if batting_team_id == team1_id else team1_id

            overs_data = innings.get("overs", [])
            deliveries_flat = [
                (over_obj["over"], ball_idx, d)
                for over_obj in overs_data
                for ball_idx, d in enumerate(over_obj.get("deliveries", []))
            ]

            total_runs = sum(d["runs"]["total"] for _, _, d in deliveries_flat)
            total_wickets = sum(1 for _, _, d in deliveries_flat if d.get("wickets"))
            total_overs = overs_data[-1]["over"] + 1 if overs_data else 0
            extras = sum(d["runs"].get("extras", 0) for _, _, d in deliveries_flat)

            # Upsert innings (handles retries / partial previous runs gracefully)
            innings_result = _retry(lambda n=innings_number, bt=batting_team_id, bw=bowling_team_id: sb.table("innings").upsert({
                "match_id": match_db_id,
                "innings_number": n,
                "batting_team_id": bt,
                "bowling_team_id": bw,
                "total_runs": total_runs,
                "total_wickets": total_wickets,
                "total_overs": total_overs,
                "extras": extras,
            }, on_conflict="match_id,innings_number").execute())
            innings_db_id = innings_result.data[0]["id"]

            # Batch-insert deliveries
            batch = []
            for over_num, ball_num, d in deliveries_flat:
                batter_id = get_or_create_player(d.get("batter", "Unknown"))
                bowler_id = get_or_create_player(d.get("bowler", "Unknown"))
                non_striker_id = get_or_create_player(d.get("non_striker", "Unknown"))

                wickets = d.get("wickets", [])
                is_wicket = len(wickets) > 0
                wicket_kind = wickets[0].get("kind") if is_wicket else None
                player_out = wickets[0].get("player_out") if is_wicket else None
                player_out_id = get_or_create_player(player_out) if player_out else None
                fielders = wickets[0].get("fielders", []) if is_wicket else []
                fielder_id = get_or_create_player(fielders[0].get("name", "Unknown")) if fielders else None

                extras_type = list(d.get("extras", {}).keys())[0] if d.get("extras") else None

                batch.append({
                    "innings_id": innings_db_id,
                    "match_id": match_db_id,
                    "over_number": over_num,
                    "ball_number": ball_num,
                    "batter_id": batter_id,
                    "bowler_id": bowler_id,
                    "non_striker_id": non_striker_id,
                    "runs_batter": d["runs"].get("batter", 0),
                    "runs_extras": d["runs"].get("extras", 0),
                    "runs_total": d["runs"].get("total", 0),
                    "extras_type": extras_type,
                    "is_wicket": is_wicket,
                    "wicket_kind": wicket_kind,
                    "player_out_id": player_out_id,
                    "dismissal_fielder_id": fielder_id,
                })

                if len(batch) >= 500:
                    _retry(lambda b=batch[:]: sb.table("deliveries").insert(b).execute())
                    batch.clear()

            if batch:
                _retry(lambda b=batch[:]: sb.table("deliveries").insert(b).execute())

        log_ingestion(match_id, "success")
        return True

    except Exception as e:
        log.error(f"Failed to ingest {match_id}: {e}")
        log_ingestion(match_id, "error", str(e))
        return False


def download_archive(data_dir: Path) -> Path:
    zip_path = data_dir / "ipl_json.zip"
    if zip_path.exists():
        log.info(f"Archive already exists at {zip_path}. Skipping download.")
        return zip_path
    log.info(f"Downloading IPL archive from {CRICSHEET_URL}...")
    resp = requests.get(CRICSHEET_URL, stream=True, timeout=60)
    resp.raise_for_status()
    with open(zip_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    log.info(f"Downloaded to {zip_path}")
    return zip_path


def main():
    parser = argparse.ArgumentParser(description="Ingest Cricsheet IPL data into Supabase")
    parser.add_argument("--data-dir", default="./data/raw", help="Directory for raw data")
    parser.add_argument("--force", action="store_true", help="Re-ingest already processed files")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    extract_dir = data_dir / "cricsheet"
    extract_dir.mkdir(exist_ok=True)

    # Download
    zip_path = download_archive(data_dir)

    # Extract
    log.info("Extracting archive...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    # Load caches from DB
    load_caches()

    # Ingest each file
    json_files = list(extract_dir.glob("*.json"))
    log.info(f"Found {len(json_files)} match files to process")

    success, fail = 0, 0
    for i, fpath in enumerate(sorted(json_files), 1):
        ok = ingest_match_file(fpath, force=args.force)
        if ok:
            success += 1
        else:
            fail += 1
        if i % 50 == 0:
            log.info(f"Progress: {i}/{len(json_files)} — {success} ok, {fail} failed")

    log.info(f"Ingestion complete: {success} success, {fail} failed out of {len(json_files)}")


if __name__ == "__main__":
    main()
