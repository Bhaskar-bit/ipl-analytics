import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Player, BattingStats, BowlingStats, FormIndex,
  HeatmapCell, BattingLeader, BowlingLeader
} from '../models';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  constructor(private sb: SupabaseService, private cache: CacheService) {}

  getPlayerById(id: string): Observable<Player[]> {
    return this.cache.cacheable<Player[]>(
      `player_${id}`,
      this.sb.query<Player>('players', { filters: { id }, limit: 1 }),
      30 * 60 * 1000
    );
  }

  getAllPlayers(role?: string): Observable<Player[]> {
    const key = `players_${role ?? 'all'}`;
    const filters = role ? { primary_role: role } : undefined;
    return this.cache.cacheable<Player[]>(
      key,
      this.sb.query<Player>('players', { filters, order: { column: 'display_name' } }),
      30 * 60 * 1000
    );
  }

  getBattingStats(playerId: string, season?: number): Observable<BattingStats> {
    const key = `batting_${playerId}_${season ?? 'all'}`;
    return this.cache.cacheable<BattingStats>(
      key,
      this.sb.rpc<BattingStats>('get_batting_stats', { p_player_id: playerId, p_season: season ?? null })
    );
  }

  getBowlingStats(playerId: string, season?: number): Observable<BowlingStats> {
    const key = `bowling_${playerId}_${season ?? 'all'}`;
    return this.cache.cacheable<BowlingStats>(
      key,
      this.sb.rpc<BowlingStats>('get_bowling_stats', { p_player_id: playerId, p_season: season ?? null })
    );
  }

  getFormIndex(playerId: string, lastN: number = 5): Observable<FormIndex> {
    return this.sb.rpc<FormIndex>('get_player_form', { p_player_id: playerId, p_last_n: lastN });
  }

  getPerformanceHeatmap(playerId: string): Observable<HeatmapCell[]> {
    return this.cache.cacheable<HeatmapCell[]>(
      `heatmap_${playerId}`,
      this.sb.rpc<HeatmapCell[]>('get_performance_heatmap', { p_player_id: playerId }),
      30 * 60 * 1000
    );
  }

  getTopBatsmen(season?: number, limit: number = 10): Observable<BattingLeader[]> {
    const key = `top_batsmen_${season ?? 'all'}_${limit}`;
    return this.cache.cacheable<BattingLeader[]>(
      key,
      this.sb.rpc<BattingLeader[]>('get_top_batsmen', { p_season: season ?? null, p_limit: limit })
    );
  }

  getTopBowlers(season?: number, limit: number = 10): Observable<BowlingLeader[]> {
    const key = `top_bowlers_${season ?? 'all'}_${limit}`;
    return this.cache.cacheable<BowlingLeader[]>(
      key,
      this.sb.rpc<BowlingLeader[]>('get_top_bowlers', { p_season: season ?? null, p_limit: limit })
    );
  }
}
