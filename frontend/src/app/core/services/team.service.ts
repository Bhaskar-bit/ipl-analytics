import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Team, TeamStats, HomeAwayRecord, SeasonRecord } from '../models';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private _teams = signal<Team[]>([]);
  readonly teams = this._teams.asReadonly();

  constructor(private sb: SupabaseService, private cache: CacheService) {}

  getAllTeams(): Observable<Team[]> {
    return this.cache.cacheable<Team[]>(
      'all_teams',
      this.sb.query<Team>('teams', { order: { column: 'short_name' } }),
      30 * 60 * 1000
    ).pipe(tap((teams) => this._teams.set(teams)));
  }

  getTeamById(id: string): Observable<Team[]> {
    return this.cache.cacheable<Team[]>(
      `team_${id}`,
      this.sb.query<Team>('teams', { filters: { id }, limit: 1 }),
      30 * 60 * 1000
    );
  }

  getTeamStats(teamId: string, season?: number): Observable<TeamStats> {
    const key = `team_stats_${teamId}_${season ?? 'all'}`;
    return this.cache.cacheable<TeamStats>(
      key,
      this.sb.rpc<TeamStats>('get_team_stats', { p_team_id: teamId, p_season: season ?? null })
    );
  }

  getHomeAwayRecord(teamId: string): Observable<HomeAwayRecord> {
    return this.cache.cacheable<HomeAwayRecord>(
      `home_away_${teamId}`,
      this.sb.rpc<HomeAwayRecord>('get_home_away_record', { p_team_id: teamId }),
      30 * 60 * 1000
    );
  }

  getSeasonWiseRecord(teamId: string): Observable<SeasonRecord[]> {
    return this.cache.cacheable<SeasonRecord[]>(
      `season_record_${teamId}`,
      this.sb.query<SeasonRecord>('team_season_stats', {
        filters: { team_id: teamId },
        order: { column: 'season', ascending: true },
      }),
      30 * 60 * 1000
    );
  }
}
