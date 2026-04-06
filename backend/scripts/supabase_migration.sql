-- ============================================================
-- IPL Analytics & Predictor — Supabase SQL Migration
-- ============================================================
-- Run this entire file in Supabase → SQL Editor → New Query
-- Order matters: FK dependencies are respected top-to-bottom
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE 1: venues
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venues (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    TEXT UNIQUE NOT NULL,
    city                    TEXT NOT NULL DEFAULT '',
    country                 TEXT NOT NULL DEFAULT 'India',
    avg_first_innings_score NUMERIC(6,2) DEFAULT 160.00,
    pace_friendly           BOOLEAN DEFAULT false,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.venues IS 'IPL match venues / stadiums';


-- ============================================================
-- TABLE 2: teams
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_name      TEXT UNIQUE NOT NULL,       -- "MI", "CSK"
    full_name       TEXT NOT NULL,              -- "Mumbai Indians"
    home_venue      TEXT NOT NULL DEFAULT '',
    logo_url        TEXT,
    brand_color     TEXT NOT NULL DEFAULT '#3b82f6',
    active_from     INTEGER NOT NULL DEFAULT 2008,
    active_to       INTEGER,                    -- NULL = still active
    cricsheet_name  TEXT UNIQUE NOT NULL,       -- exact name in Cricsheet JSONs
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS 'IPL franchise teams';

-- Seed all 10 active + legacy teams
INSERT INTO public.teams (short_name, full_name, home_venue, brand_color, active_from, cricsheet_name) VALUES
  ('MI',   'Mumbai Indians',           'Wankhede Stadium',              '#004BA0', 2008, 'Mumbai Indians'),
  ('CSK',  'Chennai Super Kings',      'MA Chidambaram Stadium',        '#F5A623', 2008, 'Chennai Super Kings'),
  ('RCB',  'Royal Challengers Bengaluru', 'M Chinnaswamy Stadium',     '#EC1C24', 2008, 'Royal Challengers Bangalore'),
  ('KKR',  'Kolkata Knight Riders',    'Eden Gardens',                  '#3A225D', 2008, 'Kolkata Knight Riders'),
  ('DC',   'Delhi Capitals',           'Arun Jaitley Stadium',         '#00368D', 2008, 'Delhi Capitals'),
  ('PBKS', 'Punjab Kings',             'PCA Stadium Mohali',           '#ED1B24', 2008, 'Punjab Kings'),
  ('RR',   'Rajasthan Royals',         'Sawai Mansingh Stadium',       '#EA1A85', 2008, 'Rajasthan Royals'),
  ('SRH',  'Sunrisers Hyderabad',      'Rajiv Gandhi Intl. Stadium',   '#FF822A', 2013, 'Sunrisers Hyderabad'),
  ('LSG',  'Lucknow Super Giants',     'BRSABV Ekana Cricket Stadium', '#A9DEFF', 2022, 'Lucknow Super Giants'),
  ('GT',   'Gujarat Titans',           'Narendra Modi Stadium',        '#1B2133', 2022, 'Gujarat Titans'),
  -- Legacy / renamed teams (still in historical data)
  ('DD',   'Delhi Daredevils',         'Arun Jaitley Stadium',         '#00368D', 2008, 'Delhi Daredevils'),
  ('KXIP', 'Kings XI Punjab',          'PCA Stadium Mohali',           '#ED1B24', 2008, 'Kings XI Punjab'),
  ('RCB2', 'Royal Challengers Bangalore', 'M Chinnaswamy Stadium',    '#EC1C24', 2008, 'Royal Challengers Bangalore'),
  ('PWI',  'Pune Warriors India',      'Maharashtra Cricket Association Stadium', '#5B2D8E', 2011, 'Pune Warriors'),
  ('KTK',  'Kochi Tuskers Kerala',     'Jawaharlal Nehru Stadium',    '#F7941D', 2011, 'Kochi Tuskers Kerala'),
  ('RPS',  'Rising Pune Supergiant',   'Maharashtra Cricket Association Stadium', '#C8102E', 2016, 'Rising Pune Supergiants'),
  ('GL',   'Gujarat Lions',            'Saurashtra Cricket Association Stadium', '#E87722', 2016, 'Gujarat Lions')
ON CONFLICT (cricsheet_name) DO NOTHING;


-- ============================================================
-- TABLE 3: players
-- ============================================================
CREATE TABLE IF NOT EXISTS public.players (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cricsheet_name  TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    nationality     TEXT NOT NULL DEFAULT 'India',
    batting_style   TEXT NOT NULL DEFAULT 'right-hand bat',
    bowling_style   TEXT,
    primary_role    TEXT NOT NULL DEFAULT 'batsman'
                    CHECK (primary_role IN ('batsman','bowler','allrounder','wk-batsman')),
    photo_url       TEXT,
    date_of_birth   DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_display_name ON public.players(display_name);
CREATE INDEX IF NOT EXISTS idx_players_role         ON public.players(primary_role);

COMMENT ON TABLE public.players IS 'All IPL players (auto-populated by ingestion script)';


-- ============================================================
-- TABLE 4: matches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.matches (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cricsheet_match_id      TEXT UNIQUE NOT NULL,
    season                  INTEGER NOT NULL,
    date                    DATE NOT NULL,
    venue_id                UUID NOT NULL REFERENCES public.venues(id),
    team1_id                UUID NOT NULL REFERENCES public.teams(id),
    team2_id                UUID NOT NULL REFERENCES public.teams(id),
    toss_winner_id          UUID NOT NULL REFERENCES public.teams(id),
    toss_decision           TEXT NOT NULL CHECK (toss_decision IN ('bat','field')),
    winner_id               UUID REFERENCES public.teams(id),          -- NULL = no result / tie
    win_margin              INTEGER,
    win_by                  TEXT CHECK (win_by IN ('runs','wickets',NULL)),
    stage                   TEXT NOT NULL DEFAULT 'group'
                            CHECK (stage IN ('group','qualifier1','eliminator','qualifier2','final')),
    player_of_match_id      UUID REFERENCES public.players(id),
    team1_score             INTEGER,
    team1_wickets           INTEGER,
    team1_overs_faced       NUMERIC(4,1),
    team2_score             INTEGER,
    team2_wickets           INTEGER,
    team2_overs_faced       NUMERIC(4,1),
    dl_applied              BOOLEAN DEFAULT false,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_season    ON public.matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_date      ON public.matches(date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_team1     ON public.matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2     ON public.matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_matches_venue     ON public.matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner    ON public.matches(winner_id);

COMMENT ON TABLE public.matches IS 'One row per IPL match';


-- ============================================================
-- TABLE 5: innings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.innings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id        UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    innings_number  INTEGER NOT NULL CHECK (innings_number IN (1,2)),
    batting_team_id UUID NOT NULL REFERENCES public.teams(id),
    bowling_team_id UUID NOT NULL REFERENCES public.teams(id),
    total_runs      INTEGER NOT NULL DEFAULT 0,
    total_wickets   INTEGER NOT NULL DEFAULT 0,
    total_overs     NUMERIC(4,1) NOT NULL DEFAULT 0,
    extras          INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (match_id, innings_number)
);

CREATE INDEX IF NOT EXISTS idx_innings_match ON public.innings(match_id);

COMMENT ON TABLE public.innings IS 'Innings summary per match';


-- ============================================================
-- TABLE 6: deliveries  (largest table ~500K rows)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    innings_id              UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
    match_id                UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,  -- denormalized
    over_number             INTEGER NOT NULL,    -- 0-indexed
    ball_number             INTEGER NOT NULL,    -- within over
    batter_id               UUID NOT NULL REFERENCES public.players(id),
    bowler_id               UUID NOT NULL REFERENCES public.players(id),
    non_striker_id          UUID NOT NULL REFERENCES public.players(id),
    runs_batter             INTEGER NOT NULL DEFAULT 0,
    runs_extras             INTEGER NOT NULL DEFAULT 0,
    runs_total              INTEGER NOT NULL DEFAULT 0,
    extras_type             TEXT CHECK (extras_type IN ('wide','no ball','bye','leg bye',NULL)),
    is_wicket               BOOLEAN NOT NULL DEFAULT false,
    wicket_kind             TEXT,               -- "caught", "bowled", "lbw", etc.
    dismissal_fielder_id    UUID REFERENCES public.players(id),
    player_out_id           UUID REFERENCES public.players(id),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_deliveries_match_id   ON public.deliveries(match_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_innings_id ON public.deliveries(innings_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_batter_id  ON public.deliveries(batter_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_bowler_id  ON public.deliveries(bowler_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_wicket     ON public.deliveries(is_wicket) WHERE is_wicket = true;

COMMENT ON TABLE public.deliveries IS 'Ball-by-ball delivery data (~500K rows for full IPL history)';


-- ============================================================
-- TABLE 7: team_season_stats  (precomputed aggregates)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_season_stats (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id                     UUID NOT NULL REFERENCES public.teams(id),
    season                      INTEGER NOT NULL,
    matches_played              INTEGER NOT NULL DEFAULT 0,
    wins                        INTEGER NOT NULL DEFAULT 0,
    losses                      INTEGER NOT NULL DEFAULT 0,
    no_results                  INTEGER NOT NULL DEFAULT 0,
    points                      INTEGER NOT NULL DEFAULT 0,
    nrr                         NUMERIC(5,3) DEFAULT 0.000,
    position                    INTEGER,
    qualified_for_playoffs      BOOLEAN DEFAULT false,
    avg_score_batting_first     NUMERIC(6,2) DEFAULT 0,
    avg_score_bowling_first     NUMERIC(6,2) DEFAULT 0,
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, season)
);

CREATE INDEX IF NOT EXISTS idx_tss_season ON public.team_season_stats(season);
CREATE INDEX IF NOT EXISTS idx_tss_team   ON public.team_season_stats(team_id);

COMMENT ON TABLE public.team_season_stats IS 'Precomputed season stats per team — refreshed after ingestion';


-- ============================================================
-- TABLE 8: player_season_stats  (precomputed aggregates)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_season_stats (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id               UUID NOT NULL REFERENCES public.players(id),
    season                  INTEGER NOT NULL,
    team_id                 UUID REFERENCES public.teams(id),

    -- Batting
    matches_batting         INTEGER DEFAULT 0,
    innings_batting         INTEGER DEFAULT 0,
    runs                    INTEGER DEFAULT 0,
    balls_faced             INTEGER DEFAULT 0,
    highest_score           INTEGER DEFAULT 0,
    fifties                 INTEGER DEFAULT 0,
    hundreds                INTEGER DEFAULT 0,
    fours                   INTEGER DEFAULT 0,
    sixes                   INTEGER DEFAULT 0,
    batting_average         NUMERIC(6,2),
    strike_rate             NUMERIC(6,2),
    not_outs                INTEGER DEFAULT 0,

    -- Bowling
    matches_bowling         INTEGER DEFAULT 0,
    overs_bowled            NUMERIC(6,1) DEFAULT 0,
    wickets                 INTEGER DEFAULT 0,
    runs_conceded           INTEGER DEFAULT 0,
    economy_rate            NUMERIC(5,2),
    bowling_average         NUMERIC(6,2),
    bowling_strike_rate     NUMERIC(6,2),
    best_bowling_wickets    INTEGER DEFAULT 0,
    best_bowling_runs       INTEGER DEFAULT 0,
    maidens                 INTEGER DEFAULT 0,

    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, season)
);

CREATE INDEX IF NOT EXISTS idx_pss_season           ON public.player_season_stats(season);
CREATE INDEX IF NOT EXISTS idx_pss_player           ON public.player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pss_runs_desc        ON public.player_season_stats(season, runs DESC);
CREATE INDEX IF NOT EXISTS idx_pss_wickets_desc     ON public.player_season_stats(season, wickets DESC);

COMMENT ON TABLE public.player_season_stats IS 'Precomputed season stats per player — refreshed after ingestion';


-- ============================================================
-- TABLE 9: seasons  (one row per IPL season)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seasons (
    year                INTEGER PRIMARY KEY,
    total_matches       INTEGER DEFAULT 0,
    winner_team_id      UUID REFERENCES public.teams(id),
    runner_up_team_id   UUID REFERENCES public.teams(id),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.seasons IS 'One row per IPL season with winner info';


-- ============================================================
-- TABLE 10: ingestion_log  (tracks Cricsheet file processing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingestion_log (
    filename        TEXT PRIMARY KEY,
    status          TEXT NOT NULL CHECK (status IN ('success','error','skipped')),
    error_message   TEXT DEFAULT '',
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ingestion_log IS 'Tracks which Cricsheet match files have been processed';


-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- ─── 1. get_team_stats ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_team_stats(p_team_id UUID, p_season INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'team_id',                  p_team_id,
        'matches_played',           COALESCE(SUM(matches_played), 0),
        'wins',                     COALESCE(SUM(wins), 0),
        'losses',                   COALESCE(SUM(losses), 0),
        'no_results',               COALESCE(SUM(no_results), 0),
        'win_rate',                 CASE WHEN COALESCE(SUM(matches_played),0) > 0
                                        THEN ROUND(COALESCE(SUM(wins),0)::NUMERIC / SUM(matches_played), 4)
                                        ELSE 0.5 END,
        'avg_score_batting_first',  ROUND(COALESCE(AVG(avg_score_batting_first), 160), 2),
        'avg_score_bowling_first',  ROUND(COALESCE(AVG(avg_score_bowling_first), 160), 2)
    )
    INTO result
    FROM public.team_season_stats
    WHERE team_id = p_team_id
      AND (p_season IS NULL OR season = p_season);

    RETURN result;
END;
$$;


-- ─── 2. get_home_away_record ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_home_away_record(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    home_venue_name TEXT;
    home_matches    INTEGER;
    home_wins       INTEGER;
    away_matches    INTEGER;
    away_wins       INTEGER;
BEGIN
    SELECT home_venue INTO home_venue_name FROM public.teams WHERE id = p_team_id;

    -- Home matches = matches at team's home venue
    SELECT COUNT(*),
           SUM(CASE WHEN winner_id = p_team_id THEN 1 ELSE 0 END)
    INTO home_matches, home_wins
    FROM public.matches m
    JOIN public.venues v ON m.venue_id = v.id
    WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
      AND v.name = home_venue_name;

    -- Away = all other matches
    SELECT COUNT(*),
           SUM(CASE WHEN winner_id = p_team_id THEN 1 ELSE 0 END)
    INTO away_matches, away_wins
    FROM public.matches m
    JOIN public.venues v ON m.venue_id = v.id
    WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
      AND v.name != home_venue_name;

    RETURN json_build_object(
        'home_matches',     COALESCE(home_matches, 0),
        'home_wins',        COALESCE(home_wins, 0),
        'home_win_rate',    CASE WHEN COALESCE(home_matches,0) > 0
                                THEN ROUND(COALESCE(home_wins,0)::NUMERIC / home_matches, 4)
                                ELSE 0.5 END,
        'away_matches',     COALESCE(away_matches, 0),
        'away_wins',        COALESCE(away_wins, 0),
        'away_win_rate',    CASE WHEN COALESCE(away_matches,0) > 0
                                THEN ROUND(COALESCE(away_wins,0)::NUMERIC / away_matches, 4)
                                ELSE 0.5 END
    );
END;
$$;


-- ─── 3. get_season_summary ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_season_summary(p_season INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_winner_name TEXT;
BEGIN
    SELECT t.short_name INTO v_winner_name
    FROM public.seasons s
    JOIN public.teams t ON s.winner_team_id = t.id
    WHERE s.year = p_season;

    SELECT json_build_object(
        'year',                     p_season,
        'total_matches',            COUNT(DISTINCT m.id),
        'total_runs',               COALESCE(SUM(i.total_runs), 0),
        'total_sixes',              COALESCE(SUM(CASE WHEN d.runs_batter = 6 THEN 1 ELSE 0 END), 0),
        'total_fours',              COALESCE(SUM(CASE WHEN d.runs_batter = 4 THEN 1 ELSE 0 END), 0),
        'highest_team_score',       COALESCE(MAX(i.total_runs), 0),
        'winner_short_name',        COALESCE(v_winner_name, 'TBD'),
        -- Orange cap (placeholder — full impl uses player_season_stats)
        'top_scorer_name',          'See Season Detail',
        'top_scorer_runs',          0,
        'top_wicket_taker_name',    'See Season Detail',
        'top_wicket_taker_wickets', 0
    )
    INTO result
    FROM public.matches m
    JOIN public.innings i ON i.match_id = m.id
    LEFT JOIN public.deliveries d ON d.match_id = m.id
    WHERE m.season = p_season;

    RETURN result;
END;
$$;


-- ─── 4. get_points_table ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_points_table(p_season INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_order)
        FROM (
            SELECT
                tss.position,
                t.id            AS team_id,
                t.short_name    AS team_short_name,
                t.full_name     AS team_full_name,
                t.brand_color,
                tss.matches_played,
                tss.wins,
                tss.losses,
                tss.no_results,
                tss.points,
                tss.nrr,
                tss.qualified_for_playoffs
            FROM public.team_season_stats tss
            JOIN public.teams t ON tss.team_id = t.id
            WHERE tss.season = p_season
            ORDER BY tss.points DESC, tss.nrr DESC
        ) row_order
    );
END;
$$;


-- ─── 5. get_season_run_trend ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_season_run_trend()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(t ORDER BY t.season)
        FROM (
            SELECT
                m.season,
                ROUND(AVG(i.total_runs)::NUMERIC, 1)    AS avg_score,
                SUM(CASE WHEN d.runs_batter = 6 THEN 1 ELSE 0 END) AS total_sixes,
                SUM(CASE WHEN d.runs_batter = 4 THEN 1 ELSE 0 END) AS total_fours
            FROM public.matches m
            JOIN public.innings i  ON i.match_id = m.id AND i.innings_number = 1
            LEFT JOIN public.deliveries d ON d.match_id = m.id
            GROUP BY m.season
        ) t
    );
END;
$$;


-- ─── 6. get_head_to_head_matches ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_head_to_head_matches(p_team1_id UUID, p_team2_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(m ORDER BY m.date DESC)
        FROM (
            SELECT
                m.id,
                m.season,
                m.date::TEXT,
                m.stage,
                m.winner_id,
                m.win_margin,
                m.win_by,
                m.team1_score,
                m.team1_wickets,
                m.team2_score,
                m.team2_wickets,
                t1.short_name   AS team1_short_name,
                t2.short_name   AS team2_short_name,
                tw.short_name   AS winner_short_name,
                v.name          AS venue_name
            FROM public.matches m
            JOIN public.teams t1 ON m.team1_id = t1.id
            JOIN public.teams t2 ON m.team2_id = t2.id
            LEFT JOIN public.teams tw ON m.winner_id = tw.id
            JOIN public.venues v ON m.venue_id = v.id
            WHERE (m.team1_id = p_team1_id AND m.team2_id = p_team2_id)
               OR (m.team1_id = p_team2_id AND m.team2_id = p_team1_id)
        ) m
    );
END;
$$;


-- ─── 7. get_batting_stats ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_batting_stats(p_player_id UUID, p_season INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'matches',          COALESCE(SUM(matches_batting), 0),
            'innings',          COALESCE(SUM(innings_batting), 0),
            'runs',             COALESCE(SUM(runs), 0),
            'balls_faced',      COALESCE(SUM(balls_faced), 0),
            'highest_score',    COALESCE(MAX(highest_score), 0),
            'fifties',          COALESCE(SUM(fifties), 0),
            'hundreds',         COALESCE(SUM(hundreds), 0),
            'fours',            COALESCE(SUM(fours), 0),
            'sixes',            COALESCE(SUM(sixes), 0),
            'batting_average',  CASE WHEN COALESCE(SUM(innings_batting - not_outs), 0) > 0
                                    THEN ROUND(SUM(runs)::NUMERIC / SUM(innings_batting - not_outs), 2)
                                    ELSE SUM(runs) END,
            'strike_rate',      CASE WHEN COALESCE(SUM(balls_faced), 0) > 0
                                    THEN ROUND(SUM(runs)::NUMERIC * 100 / SUM(balls_faced), 2)
                                    ELSE 0 END,
            'not_outs',         COALESCE(SUM(not_outs), 0)
        )
        FROM public.player_season_stats
        WHERE player_id = p_player_id
          AND (p_season IS NULL OR season = p_season)
    );
END;
$$;


-- ─── 8. get_bowling_stats ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bowling_stats(p_player_id UUID, p_season INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'matches',              COALESCE(SUM(matches_bowling), 0),
            'overs_bowled',         COALESCE(SUM(overs_bowled), 0),
            'wickets',              COALESCE(SUM(wickets), 0),
            'runs_conceded',        COALESCE(SUM(runs_conceded), 0),
            'economy_rate',         CASE WHEN COALESCE(SUM(overs_bowled), 0) > 0
                                        THEN ROUND(SUM(runs_conceded)::NUMERIC / SUM(overs_bowled), 2)
                                        ELSE NULL END,
            'bowling_average',      CASE WHEN COALESCE(SUM(wickets), 0) > 0
                                        THEN ROUND(SUM(runs_conceded)::NUMERIC / SUM(wickets), 2)
                                        ELSE NULL END,
            'bowling_strike_rate',  CASE WHEN COALESCE(SUM(wickets), 0) > 0
                                        THEN ROUND((SUM(overs_bowled) * 6)::NUMERIC / SUM(wickets), 2)
                                        ELSE NULL END,
            'best_bowling_wickets', COALESCE(MAX(best_bowling_wickets), 0),
            'best_bowling_runs',    COALESCE(MIN(best_bowling_runs), 0),
            'maidens',              COALESCE(SUM(maidens), 0)
        )
        FROM public.player_season_stats
        WHERE player_id = p_player_id
          AND (p_season IS NULL OR season = p_season)
    );
END;
$$;


-- ─── 9. get_top_batsmen ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_batsmen(p_season INTEGER DEFAULT NULL, p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(r)
        FROM (
            SELECT
                p.id            AS player_id,
                p.display_name,
                t.short_name    AS team_short_name,
                SUM(pss.runs)   AS runs,
                SUM(pss.innings_batting) AS innings,
                CASE WHEN SUM(pss.innings_batting - pss.not_outs) > 0
                    THEN ROUND(SUM(pss.runs)::NUMERIC / SUM(pss.innings_batting - pss.not_outs), 2)
                    ELSE SUM(pss.runs) END AS average,
                CASE WHEN SUM(pss.balls_faced) > 0
                    THEN ROUND(SUM(pss.runs)::NUMERIC * 100 / SUM(pss.balls_faced), 2)
                    ELSE 0 END  AS strike_rate
            FROM public.player_season_stats pss
            JOIN public.players p ON pss.player_id = p.id
            LEFT JOIN public.teams t ON pss.team_id = t.id
            WHERE (p_season IS NULL OR pss.season = p_season)
              AND pss.runs > 0
            GROUP BY p.id, p.display_name, t.short_name
            ORDER BY SUM(pss.runs) DESC
            LIMIT p_limit
        ) r
    );
END;
$$;


-- ─── 10. get_top_bowlers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_bowlers(p_season INTEGER DEFAULT NULL, p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(r)
        FROM (
            SELECT
                p.id                AS player_id,
                p.display_name,
                t.short_name        AS team_short_name,
                SUM(pss.wickets)    AS wickets,
                SUM(pss.overs_bowled) AS overs,
                CASE WHEN SUM(pss.overs_bowled) > 0
                    THEN ROUND(SUM(pss.runs_conceded)::NUMERIC / SUM(pss.overs_bowled), 2)
                    ELSE 0 END AS economy,
                CASE WHEN SUM(pss.wickets) > 0
                    THEN ROUND(SUM(pss.runs_conceded)::NUMERIC / SUM(pss.wickets), 2)
                    ELSE NULL END AS average
            FROM public.player_season_stats pss
            JOIN public.players p ON pss.player_id = p.id
            LEFT JOIN public.teams t ON pss.team_id = t.id
            WHERE (p_season IS NULL OR pss.season = p_season)
              AND pss.wickets > 0
            GROUP BY p.id, p.display_name, t.short_name
            ORDER BY SUM(pss.wickets) DESC
            LIMIT p_limit
        ) r
    );
END;
$$;


-- ─── 11. get_player_form ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_player_form(p_player_id UUID, p_last_n INTEGER DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recent_runs     INTEGER[];
    recent_wickets  INTEGER[];
    form_score      NUMERIC;
    trend           TEXT;
    avg_recent      NUMERIC;
    avg_older       NUMERIC;
BEGIN
    -- Last N innings batting runs
    SELECT ARRAY_AGG(runs_batter_total ORDER BY match_date DESC)
    INTO recent_runs
    FROM (
        SELECT
            m.date AS match_date,
            SUM(d.runs_batter) AS runs_batter_total
        FROM public.deliveries d
        JOIN public.innings i ON d.innings_id = i.id
        JOIN public.matches m ON d.match_id = m.id
        WHERE d.batter_id = p_player_id
        GROUP BY m.id, m.date
        ORDER BY m.date DESC
        LIMIT p_last_n
    ) sub;

    -- Last N bowling figures
    SELECT ARRAY_AGG(wicket_count ORDER BY match_date DESC)
    INTO recent_wickets
    FROM (
        SELECT
            m.date AS match_date,
            COUNT(*) FILTER (WHERE d.is_wicket AND d.bowler_id = p_player_id) AS wicket_count
        FROM public.deliveries d
        JOIN public.innings i ON d.innings_id = i.id
        JOIN public.matches m ON d.match_id = m.id
        WHERE d.bowler_id = p_player_id
        GROUP BY m.id, m.date
        ORDER BY m.date DESC
        LIMIT p_last_n
    ) sub;

    -- Simple form score (0-100) based on recent runs normalized
    form_score := LEAST(100, COALESCE(
        (SELECT AVG(v) * 2.5 FROM UNNEST(recent_runs) AS v),
        50
    ));

    -- Trend: compare first half vs second half of recent matches
    IF array_length(recent_runs, 1) >= 4 THEN
        avg_recent := (recent_runs[1] + recent_runs[2])::NUMERIC / 2;
        avg_older  := (recent_runs[array_length(recent_runs,1)-1] + recent_runs[array_length(recent_runs,1)])::NUMERIC / 2;
        trend := CASE
            WHEN avg_recent > avg_older * 1.15 THEN 'rising'
            WHEN avg_recent < avg_older * 0.85 THEN 'falling'
            ELSE 'stable'
        END;
    ELSE
        trend := 'stable';
    END IF;

    RETURN json_build_object(
        'player_id',        p_player_id,
        'last_n',           p_last_n,
        'form_score',       ROUND(form_score),
        'trend',            trend,
        'recent_runs',      COALESCE(recent_runs, ARRAY[]::INTEGER[]),
        'recent_wickets',   COALESCE(recent_wickets, ARRAY[]::INTEGER[])
    );
END;
$$;


-- ─── 12. get_performance_heatmap ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_performance_heatmap(p_player_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(r)
        FROM (
            SELECT
                CASE
                    WHEN d.over_number BETWEEN 0 AND 5  THEN 'PP (1-6)'
                    WHEN d.over_number BETWEEN 6 AND 14 THEN 'Middle (7-15)'
                    ELSE 'Death (16-20)'
                END AS over_bracket,
                CASE
                    WHEN d.runs_batter = 0                              THEN 'Dot'
                    WHEN d.runs_batter BETWEEN 1 AND 2                  THEN '1-2 runs'
                    WHEN d.runs_batter BETWEEN 3 AND 5                  THEN '3-4 runs'
                    ELSE '6+'
                END AS run_category,
                COUNT(*) AS count
            FROM public.deliveries d
            WHERE d.batter_id = p_player_id
            GROUP BY over_bracket, run_category
            ORDER BY over_bracket, run_category
        ) r
    );
END;
$$;


-- ─── 13. get_match_scorecard ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_match_scorecard(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match JSON;
    v_innings JSON;
BEGIN
    -- Match info
    SELECT json_build_object(
        'id',               m.id,
        'season',           m.season,
        'date',             m.date,
        'stage',            m.stage,
        'venue_name',       v.name,
        'team1_short_name', t1.short_name,
        'team2_short_name', t2.short_name,
        'winner_short_name',tw.short_name,
        'win_margin',       m.win_margin,
        'win_by',           m.win_by,
        'dl_applied',       m.dl_applied
    )
    INTO v_match
    FROM public.matches m
    JOIN public.venues v  ON m.venue_id  = v.id
    JOIN public.teams  t1 ON m.team1_id  = t1.id
    JOIN public.teams  t2 ON m.team2_id  = t2.id
    LEFT JOIN public.teams tw ON m.winner_id = tw.id
    WHERE m.id = p_match_id;

    -- Innings with batting + bowling
    SELECT json_agg(inn_data ORDER BY inn_data->>'innings_number')
    INTO v_innings
    FROM (
        SELECT json_build_object(
            'id',               i.id,
            'innings_number',   i.innings_number,
            'batting_team_id',  i.batting_team_id,
            'bowling_team_id',  i.bowling_team_id,
            'total_runs',       i.total_runs,
            'total_wickets',    i.total_wickets,
            'total_overs',      i.total_overs,
            'extras',           i.extras,
            'batting_performances', (
                SELECT json_agg(bp ORDER BY bp->>'runs' DESC)
                FROM (
                    SELECT json_build_object(
                        'player_id',    d.batter_id,
                        'player_name',  p.display_name,
                        'runs',         SUM(d.runs_batter),
                        'balls',        COUNT(*) FILTER (WHERE d.extras_type IS NULL OR d.extras_type NOT IN ('wide','no ball')),
                        'fours',        COUNT(*) FILTER (WHERE d.runs_batter = 4),
                        'sixes',        COUNT(*) FILTER (WHERE d.runs_batter = 6),
                        'strike_rate',  CASE WHEN COUNT(*) FILTER (WHERE d.extras_type IS NULL OR d.extras_type NOT IN ('wide','no ball')) > 0
                                            THEN ROUND(SUM(d.runs_batter)::NUMERIC * 100 /
                                                COUNT(*) FILTER (WHERE d.extras_type IS NULL OR d.extras_type NOT IN ('wide','no ball')), 1)
                                            ELSE 0 END,
                        'dismissal',    MAX(d.wicket_kind)
                    )
                    FROM public.deliveries d
                    JOIN public.players p ON d.batter_id = p.id
                    WHERE d.innings_id = i.id
                    GROUP BY d.batter_id, p.display_name
                ) bp
            ),
            'bowling_performances', (
                SELECT json_agg(bowl ORDER BY bowl->>'wickets' DESC)
                FROM (
                    SELECT json_build_object(
                        'player_id',    d.bowler_id,
                        'player_name',  p.display_name,
                        'overs',        ROUND(COUNT(*)::NUMERIC / 6, 1),
                        'maidens',      0,
                        'runs',         SUM(d.runs_total),
                        'wickets',      COUNT(*) FILTER (WHERE d.is_wicket),
                        'economy',      CASE WHEN COUNT(*) > 0
                                            THEN ROUND(SUM(d.runs_total)::NUMERIC * 6 / COUNT(*), 2)
                                            ELSE 0 END
                    )
                    FROM public.deliveries d
                    JOIN public.players p ON d.bowler_id = p.id
                    WHERE d.innings_id = i.id
                    GROUP BY d.bowler_id, p.display_name
                ) bowl
            )
        ) AS inn_data
        FROM public.innings i
        WHERE i.match_id = p_match_id
    ) sub;

    RETURN json_build_object('match', v_match, 'innings', v_innings);
END;
$$;


-- ─── 14. refresh_team_season_stats ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_team_season_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Truncate and rebuild from raw matches
    DELETE FROM public.team_season_stats;

    INSERT INTO public.team_season_stats (team_id, season, matches_played, wins, losses, no_results, points)
    SELECT
        t.id                                            AS team_id,
        m.season,
        COUNT(*)                                        AS matches_played,
        COUNT(*) FILTER (WHERE m.winner_id = t.id)     AS wins,
        COUNT(*) FILTER (WHERE m.winner_id IS NOT NULL AND m.winner_id != t.id) AS losses,
        COUNT(*) FILTER (WHERE m.winner_id IS NULL)    AS no_results,
        COUNT(*) FILTER (WHERE m.winner_id = t.id) * 2 AS points
    FROM public.matches m
    JOIN public.teams t ON (m.team1_id = t.id OR m.team2_id = t.id)
    GROUP BY t.id, m.season
    ON CONFLICT (team_id, season) DO UPDATE
        SET matches_played = EXCLUDED.matches_played,
            wins           = EXCLUDED.wins,
            losses         = EXCLUDED.losses,
            no_results     = EXCLUDED.no_results,
            points         = EXCLUDED.points,
            updated_at     = NOW();

    -- Refresh seasons table winners
    INSERT INTO public.seasons (year, total_matches)
    SELECT season, COUNT(*) FROM public.matches GROUP BY season
    ON CONFLICT (year) DO UPDATE SET total_matches = EXCLUDED.total_matches, updated_at = NOW();

    RAISE NOTICE 'team_season_stats refreshed';
END;
$$;


-- ─── 15. refresh_player_season_stats ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_player_season_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.player_season_stats;

    -- Batting aggregation from deliveries
    INSERT INTO public.player_season_stats (
        player_id, season,
        matches_batting, innings_batting,
        runs, balls_faced, fours, sixes,
        highest_score, fifties, hundreds, not_outs,
        batting_average, strike_rate
    )
    SELECT
        d.batter_id                             AS player_id,
        m.season,
        COUNT(DISTINCT m.id)                    AS matches_batting,
        COUNT(DISTINCT i.id)                    AS innings_batting,
        SUM(d.runs_batter)                      AS runs,
        COUNT(*) FILTER (WHERE d.extras_type IS NULL OR d.extras_type NOT IN ('wide','no ball')) AS balls_faced,
        COUNT(*) FILTER (WHERE d.runs_batter = 4)   AS fours,
        COUNT(*) FILTER (WHERE d.runs_batter = 6)   AS sixes,
        MAX(innings_runs.innings_total)             AS highest_score,
        COUNT(*) FILTER (WHERE innings_runs.innings_total >= 50 AND innings_runs.innings_total < 100) AS fifties,
        COUNT(*) FILTER (WHERE innings_runs.innings_total >= 100) AS hundreds,
        0                                           AS not_outs,
        CASE WHEN COUNT(DISTINCT i.id) > 0
            THEN ROUND(SUM(d.runs_batter)::NUMERIC / COUNT(DISTINCT i.id), 2)
            ELSE 0 END                              AS batting_average,
        CASE WHEN COUNT(*) FILTER (WHERE d.extras_type IS NULL OR d.extras_type NOT IN ('wide','no ball')) > 0
            THEN ROUND(SUM(d.runs_batter)::NUMERIC * 100 /
                COUNT(*) FILTER (WHERE d.extras_type IS NULL OR d.extras_type NOT IN ('wide','no ball')), 2)
            ELSE 0 END                              AS strike_rate
    FROM public.deliveries d
    JOIN public.innings i ON d.innings_id = i.id
    JOIN public.matches m ON d.match_id = m.id
    -- Subquery for per-innings totals (needed for highest score / 50s / 100s)
    JOIN (
        SELECT innings_id, batter_id, SUM(runs_batter) AS innings_total
        FROM public.deliveries
        GROUP BY innings_id, batter_id
    ) innings_runs ON innings_runs.innings_id = i.id AND innings_runs.batter_id = d.batter_id
    GROUP BY d.batter_id, m.season
    ON CONFLICT (player_id, season) DO UPDATE
        SET matches_batting  = EXCLUDED.matches_batting,
            innings_batting  = EXCLUDED.innings_batting,
            runs             = EXCLUDED.runs,
            balls_faced      = EXCLUDED.balls_faced,
            fours            = EXCLUDED.fours,
            sixes            = EXCLUDED.sixes,
            highest_score    = EXCLUDED.highest_score,
            fifties          = EXCLUDED.fifties,
            hundreds         = EXCLUDED.hundreds,
            batting_average  = EXCLUDED.batting_average,
            strike_rate      = EXCLUDED.strike_rate,
            updated_at       = NOW();

    -- Bowling aggregation
    UPDATE public.player_season_stats pss
    SET
        matches_bowling     = bowl.matches_bowling,
        overs_bowled        = bowl.overs_bowled,
        wickets             = bowl.wickets,
        runs_conceded       = bowl.runs_conceded,
        economy_rate        = bowl.economy_rate,
        bowling_average     = bowl.bowling_average,
        bowling_strike_rate = bowl.bsr,
        updated_at          = NOW()
    FROM (
        SELECT
            d.bowler_id                         AS player_id,
            m.season,
            COUNT(DISTINCT m.id)                AS matches_bowling,
            ROUND(COUNT(*)::NUMERIC / 6, 1)     AS overs_bowled,
            COUNT(*) FILTER (WHERE d.is_wicket) AS wickets,
            SUM(d.runs_total)                   AS runs_conceded,
            CASE WHEN COUNT(*) > 0
                THEN ROUND(SUM(d.runs_total)::NUMERIC * 6 / COUNT(*), 2)
                ELSE 0 END                      AS economy_rate,
            CASE WHEN COUNT(*) FILTER (WHERE d.is_wicket) > 0
                THEN ROUND(SUM(d.runs_total)::NUMERIC / COUNT(*) FILTER (WHERE d.is_wicket), 2)
                ELSE NULL END                   AS bowling_average,
            CASE WHEN COUNT(*) FILTER (WHERE d.is_wicket) > 0
                THEN ROUND(COUNT(*)::NUMERIC / COUNT(*) FILTER (WHERE d.is_wicket), 1)
                ELSE NULL END                   AS bsr
        FROM public.deliveries d
        JOIN public.matches m ON d.match_id = m.id
        GROUP BY d.bowler_id, m.season
    ) bowl
    WHERE pss.player_id = bowl.player_id AND pss.season = bowl.season;

    RAISE NOTICE 'player_season_stats refreshed';
END;
$$;


-- ─── 16. get_team_overall_stats (used by ML feature engineering) ─────────────
CREATE OR REPLACE FUNCTION public.get_team_overall_stats(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_matches     INTEGER;
    v_total_wins        INTEGER;
    v_last3_matches     INTEGER;
    v_last3_wins        INTEGER;
    v_home_venue        TEXT;
    v_home_matches      INTEGER;
    v_home_wins         INTEGER;
    v_current_season    INTEGER;
BEGIN
    SELECT home_venue INTO v_home_venue FROM public.teams WHERE id = p_team_id;
    SELECT MAX(season) INTO v_current_season FROM public.matches;

    -- Overall
    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_id)
    INTO v_total_matches, v_total_wins
    FROM public.matches
    WHERE team1_id = p_team_id OR team2_id = p_team_id;

    -- Last 3 seasons
    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_id)
    INTO v_last3_matches, v_last3_wins
    FROM public.matches
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
      AND season >= v_current_season - 2;

    -- Home
    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_id)
    INTO v_home_matches, v_home_wins
    FROM public.matches m
    JOIN public.venues v ON m.venue_id = v.id
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
      AND v.name = v_home_venue;

    RETURN json_build_object(
        'overall_win_rate',   CASE WHEN v_total_matches > 0
                                  THEN ROUND(v_total_wins::NUMERIC / v_total_matches, 4)
                                  ELSE 0.5 END,
        'win_rate_last_3',    CASE WHEN v_last3_matches > 0
                                  THEN ROUND(v_last3_wins::NUMERIC / v_last3_matches, 4)
                                  ELSE 0.5 END,
        'home_win_rate',      CASE WHEN v_home_matches > 0
                                  THEN ROUND(v_home_wins::NUMERIC / v_home_matches, 4)
                                  ELSE 0.5 END
    );
END;
$$;


-- ─── 17. get_h2h_stats (used by ML feature engineering) ─────────────────────
CREATE OR REPLACE FUNCTION public.get_h2h_stats(p_team_a_id UUID, p_team_b_id UUID, p_venue_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total     INTEGER;
    v_a_wins    INTEGER;
    v_v_total   INTEGER;
    v_v_a_wins  INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_a_id)
    INTO v_total, v_a_wins
    FROM public.matches
    WHERE (team1_id = p_team_a_id AND team2_id = p_team_b_id)
       OR (team1_id = p_team_b_id AND team2_id = p_team_a_id);

    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_a_id)
    INTO v_v_total, v_v_a_wins
    FROM public.matches
    WHERE ((team1_id = p_team_a_id AND team2_id = p_team_b_id)
        OR (team1_id = p_team_b_id AND team2_id = p_team_a_id))
      AND venue_id = p_venue_id;

    RETURN json_build_object(
        'total_matches',        COALESCE(v_total, 0),
        'win_rate_a',           CASE WHEN COALESCE(v_total, 0) > 0
                                    THEN ROUND(COALESCE(v_a_wins,0)::NUMERIC / v_total, 4)
                                    ELSE 0.5 END,
        'win_rate_a_at_venue',  CASE WHEN COALESCE(v_v_total, 0) > 0
                                    THEN ROUND(COALESCE(v_v_a_wins,0)::NUMERIC / v_v_total, 4)
                                    ELSE 0.5 END
    );
END;
$$;


-- ─── 18. get_venue_stats_for_teams (used by ML feature engineering) ──────────
CREATE OR REPLACE FUNCTION public.get_venue_stats_for_teams(
    p_venue_id UUID, p_team_a_id UUID, p_team_b_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_avg_score         NUMERIC;
    v_a_total           INTEGER;
    v_a_wins            INTEGER;
    v_b_total           INTEGER;
    v_b_wins            INTEGER;
    v_toss_total        INTEGER;
    v_toss_wins         INTEGER;
BEGIN
    -- Average first innings score at venue
    SELECT ROUND(AVG(i.total_runs), 2) INTO v_avg_score
    FROM public.innings i
    JOIN public.matches m ON i.match_id = m.id
    WHERE m.venue_id = p_venue_id AND i.innings_number = 1;

    -- Team A win rate at venue
    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_a_id)
    INTO v_a_total, v_a_wins
    FROM public.matches
    WHERE venue_id = p_venue_id
      AND (team1_id = p_team_a_id OR team2_id = p_team_a_id);

    -- Team B win rate at venue
    SELECT COUNT(*), COUNT(*) FILTER (WHERE winner_id = p_team_b_id)
    INTO v_b_total, v_b_wins
    FROM public.matches
    WHERE venue_id = p_venue_id
      AND (team1_id = p_team_b_id OR team2_id = p_team_b_id);

    -- Toss advantage at venue
    SELECT COUNT(*), COUNT(*) FILTER (WHERE toss_winner_id = winner_id)
    INTO v_toss_total, v_toss_wins
    FROM public.matches
    WHERE venue_id = p_venue_id;

    RETURN json_build_object(
        'avg_first_innings_score',  COALESCE(v_avg_score, 160),
        'team_a_win_rate',          CASE WHEN COALESCE(v_a_total,0) > 0
                                        THEN ROUND(COALESCE(v_a_wins,0)::NUMERIC / v_a_total, 4)
                                        ELSE 0.5 END,
        'team_b_win_rate',          CASE WHEN COALESCE(v_b_total,0) > 0
                                        THEN ROUND(COALESCE(v_b_wins,0)::NUMERIC / v_b_total, 4)
                                        ELSE 0.5 END,
        'is_neutral',               false,
        'toss_win_advantage',       CASE WHEN COALESCE(v_toss_total,0) > 0
                                        THEN ROUND(COALESCE(v_toss_wins,0)::NUMERIC / v_toss_total, 4)
                                        ELSE 0.5 END
    );
END;
$$;


-- ─── 19. get_team_recent_form (used by ML feature engineering) ───────────────
CREATE OR REPLACE FUNCTION public.get_team_recent_form(p_team_id UUID, p_last_n INTEGER DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_avg_score     NUMERIC;
    v_economy       NUMERIC;
BEGIN
    -- Average batting score in last N matches
    SELECT ROUND(AVG(i.total_runs), 2) INTO v_avg_score
    FROM (
        SELECT m.id FROM public.matches m
        WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
          AND m.winner_id IS NOT NULL
        ORDER BY m.date DESC LIMIT p_last_n
    ) recent
    JOIN public.innings i ON i.match_id = recent.id AND i.batting_team_id = p_team_id;

    -- Average bowling economy in last N matches
    SELECT ROUND(SUM(d.runs_total)::NUMERIC * 6 / NULLIF(COUNT(*), 0), 2) INTO v_economy
    FROM (
        SELECT m.id FROM public.matches m
        WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
          AND m.winner_id IS NOT NULL
        ORDER BY m.date DESC LIMIT p_last_n
    ) recent
    JOIN public.innings i ON i.match_id = recent.id AND i.bowling_team_id = p_team_id
    JOIN public.deliveries d ON d.innings_id = i.id;

    RETURN json_build_object(
        'avg_score',        COALESCE(v_avg_score, 160),
        'top3_sr',          130,       -- placeholder: extend with actual top-3 batsmen SR
        'bowling_economy',  COALESCE(v_economy, 8.5),
        'top3_economy',     COALESCE(v_economy * 0.9, 7.5)
    );
END;
$$;


-- ─── 20. get_training_dataset (for ML model training) ────────────────────────
CREATE OR REPLACE FUNCTION public.get_training_dataset()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Returns one row per match (team1 as team_a perspective)
    -- The Python training script should augment by also flipping team_a/team_b
    -- to get 2× the training data and label symmetry
    RETURN (
        SELECT json_agg(r)
        FROM (
            SELECT
                m.id            AS match_id,
                m.season,
                m.stage,
                -- Label: 1 = team1 (team_a) wins
                CASE WHEN m.winner_id = m.team1_id THEN 1 ELSE 0 END AS label,
                -- Features (direct from precomputed stats)
                COALESCE(tss1.wins::NUMERIC / NULLIF(tss1.matches_played, 0), 0.5) AS team_a_win_rate_overall,
                COALESCE(tss2.wins::NUMERIC / NULLIF(tss2.matches_played, 0), 0.5) AS team_b_win_rate_overall,
                CASE WHEN m.toss_winner_id = m.team1_id THEN 1 ELSE 0 END           AS toss_winner_is_team_a,
                CASE WHEN m.toss_decision = 'bat' THEN 1 ELSE 0 END                 AS toss_decision_bat_first,
                m.season - 2008                                                      AS season_encoded,
                CASE m.stage WHEN 'group' THEN 0 WHEN 'qualifier1' THEN 1
                             WHEN 'eliminator' THEN 2 WHEN 'qualifier2' THEN 3
                             WHEN 'final' THEN 4 ELSE 0 END                          AS match_stage_encoded,
                COALESCE(v.avg_first_innings_score / 200.0, 0.8)                     AS venue_avg_first_innings_score,
                0.5 AS h2h_win_rate_team_a,         -- simplified; extend for full implementation
                0   AS h2h_total_matches,
                0.5 AS h2h_win_rate_team_a_at_venue,
                COALESCE(tss1.wins::NUMERIC / NULLIF(tss1.matches_played, 0), 0.5) AS team_a_win_rate_last_3_seasons,
                COALESCE(tss2.wins::NUMERIC / NULLIF(tss2.matches_played, 0), 0.5) AS team_b_win_rate_last_3_seasons,
                COALESCE(tss1.wins::NUMERIC / NULLIF(tss1.matches_played, 0), 0.5) AS team_a_win_rate_current_season,
                COALESCE(tss2.wins::NUMERIC / NULLIF(tss2.matches_played, 0), 0.5) AS team_b_win_rate_current_season,
                0.5 AS team_a_home_win_rate,
                0.5 AS team_b_home_win_rate,
                0.5 AS venue_team_a_win_rate,
                0.5 AS venue_team_b_win_rate,
                0   AS venue_is_neutral,
                0.5 AS venue_toss_advantage,
                COALESCE(i1.total_runs / 200.0, 0.8) AS team_a_avg_score_last_5_matches,
                COALESCE(i2.total_runs / 200.0, 0.8) AS team_b_avg_score_last_5_matches,
                0.65 AS team_a_top3_batsmen_avg_strike_rate,
                0.65 AS team_b_top3_batsmen_avg_strike_rate,
                0.57 AS team_a_bowling_economy_last_5,
                0.57 AS team_b_bowling_economy_last_5,
                0.5  AS team_a_top3_bowlers_avg_economy,
                0.5  AS team_b_top3_bowlers_avg_economy
            FROM public.matches m
            LEFT JOIN public.team_season_stats tss1
                ON tss1.team_id = m.team1_id AND tss1.season = m.season
            LEFT JOIN public.team_season_stats tss2
                ON tss2.team_id = m.team2_id AND tss2.season = m.season
            LEFT JOIN public.venues v ON m.venue_id = v.id
            LEFT JOIN public.innings i1 ON i1.match_id = m.id AND i1.innings_number = 1 AND i1.batting_team_id = m.team1_id
            LEFT JOIN public.innings i2 ON i2.match_id = m.id AND i2.innings_number = 1 AND i2.batting_team_id = m.team2_id
            WHERE m.winner_id IS NOT NULL  -- Only completed matches
        ) r
    );
END;
$$;


-- ─── 21. refresh_match_scores ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_match_scores()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.matches m
    SET
        team1_score   = scores.t1_runs,
        team1_wickets = scores.t1_wickets,
        team2_score   = scores.t2_runs,
        team2_wickets = scores.t2_wickets
    FROM (
        SELECT
            match_id,
            MAX(CASE WHEN innings_number = 1 THEN total_runs END)    AS t1_runs,
            MAX(CASE WHEN innings_number = 1 THEN total_wickets END)  AS t1_wickets,
            MAX(CASE WHEN innings_number = 2 THEN total_runs END)    AS t2_runs,
            MAX(CASE WHEN innings_number = 2 THEN total_wickets END)  AS t2_wickets
        FROM public.innings
        GROUP BY match_id
    ) scores
    WHERE m.id = scores.match_id;

    RAISE NOTICE 'match scores refreshed';
END;
$$;


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables and allow public read access
-- (this is a public analytics dashboard — no auth needed)

ALTER TABLE public.venues              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_season_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_log       ENABLE ROW LEVEL SECURITY;

-- Public READ for all tables
CREATE POLICY "Public read venues"              ON public.venues              FOR SELECT USING (true);
CREATE POLICY "Public read teams"               ON public.teams               FOR SELECT USING (true);
CREATE POLICY "Public read players"             ON public.players             FOR SELECT USING (true);
CREATE POLICY "Public read matches"             ON public.matches             FOR SELECT USING (true);
CREATE POLICY "Public read innings"             ON public.innings             FOR SELECT USING (true);
CREATE POLICY "Public read deliveries"          ON public.deliveries          FOR SELECT USING (true);
CREATE POLICY "Public read team_season_stats"   ON public.team_season_stats   FOR SELECT USING (true);
CREATE POLICY "Public read player_season_stats" ON public.player_season_stats FOR SELECT USING (true);
CREATE POLICY "Public read seasons"             ON public.seasons             FOR SELECT USING (true);

-- Service role can do everything (used by ingestion script)
CREATE POLICY "Service write venues"              ON public.venues              FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write teams"               ON public.teams               FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write players"             ON public.players             FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write matches"             ON public.matches             FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write innings"             ON public.innings             FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write deliveries"          ON public.deliveries          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write team_season_stats"   ON public.team_season_stats   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write player_season_stats" ON public.player_season_stats FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write seasons"             ON public.seasons             FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write ingestion_log"       ON public.ingestion_log       FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- DONE
-- ============================================================
-- After running this migration:
-- 1. Copy your Supabase URL + anon key → frontend/src/environments/environment.ts
-- 2. Copy your Supabase URL + service key → backend/.env
-- 3. Run: python scripts/ingest_cricsheet.py
-- 4. Run: python scripts/compute_aggregates.py
-- 5. Run: python scripts/train_model.py
-- 6. Start backend: uvicorn app.main:app --reload
-- 7. Start frontend: ng serve
-- ============================================================
