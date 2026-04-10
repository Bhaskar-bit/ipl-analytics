import { Injectable, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Season, SeasonSummary, PointsTableRow, RunTrendPoint } from '../models';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private _seasons = signal<Season[]>([]);
  private _currentSeason = signal<number>(new Date().getFullYear());

  readonly seasons = this._seasons.asReadonly();
  readonly currentSeason = this._currentSeason.asReadonly();
  readonly seasonYears = computed(() => this._seasons().map((s) => s.year).sort((a, b) => b - a));

  constructor(private sb: SupabaseService, private cache: CacheService) {}

  setCurrentSeason(year: number): void {
    this._currentSeason.set(year);
  }

  getAllSeasons(): Observable<Season[]> {
    return this.cache.cacheable<Season[]>(
      'all_seasons',
      this.sb.rpc<Season[]>('get_all_seasons'),
      60 * 60 * 1000
    ).pipe(tap((seasons) => {
      this._seasons.set(seasons);
      if (seasons.length) this._currentSeason.set(seasons[0].year);
    }));
  }

  getSeasonSummary(year: number): Observable<SeasonSummary> {
    return this.cache.cacheable<SeasonSummary>(
      `season_summary_${year}`,
      this.sb.rpc<SeasonSummary>('get_season_summary', { p_season: year }),
      30 * 60 * 1000
    );
  }

  getPointsTable(year: number): Observable<PointsTableRow[]> {
    return this.cache.cacheable<PointsTableRow[]>(
      `points_table_${year}`,
      this.sb.rpc<PointsTableRow[]>('get_points_table', { p_season: year }),
      30 * 60 * 1000
    );
  }

  getSeasonRunTrend(): Observable<RunTrendPoint[]> {
    return this.cache.cacheable<RunTrendPoint[]>(
      'run_trend_all',
      this.sb.rpc<RunTrendPoint[]>('get_season_run_trend'),
      60 * 60 * 1000
    );
  }
}
