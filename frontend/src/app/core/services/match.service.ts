import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Match, Scorecard } from '../models';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class MatchService {
  constructor(private sb: SupabaseService, private cache: CacheService) {}

  getMatchesBySeason(year: number): Observable<Match[]> {
    return this.cache.cacheable<Match[]>(
      `matches_season_${year}`,
      this.sb.query<Match>('matches', {
        filters: { season: year },
        order: { column: 'date', ascending: false },
      }),
      10 * 60 * 1000
    );
  }

  getMatchById(id: string): Observable<Match[]> {
    return this.sb.query<Match>('matches', { filters: { id }, limit: 1 });
  }

  getRecentMatches(limit: number = 6): Observable<Match[]> {
    return this.sb.query<Match>('matches', {
      order: { column: 'date', ascending: false },
      limit,
    });
  }

  getHeadToHeadMatches(team1Id: string, team2Id: string): Observable<Match[]> {
    return this.cache.cacheable<Match[]>(
      `h2h_${team1Id}_${team2Id}`,
      this.sb.rpc<Match[]>('get_head_to_head_matches', {
        p_team1_id: team1Id,
        p_team2_id: team2Id,
      }),
      30 * 60 * 1000
    );
  }

  getMatchScorecard(matchId: string): Observable<Scorecard> {
    return this.cache.cacheable<Scorecard>(
      `scorecard_${matchId}`,
      this.sb.rpc<Scorecard>('get_match_scorecard', { p_match_id: matchId }),
      60 * 60 * 1000
    );
  }
}
