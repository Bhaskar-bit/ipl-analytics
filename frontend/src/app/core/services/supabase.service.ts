import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  query<T>(
    table: string,
    options?: {
      columns?: string;
      filters?: Record<string, unknown>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    }
  ): Observable<T[]> {
    let query = this.client.from(table).select(options?.columns ?? '*');

    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value) as typeof query;
      });
    }

    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      }) as typeof query;
    }

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit ?? 20) - 1
      ) as typeof query;
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as T[];
      }),
      catchError((err) => throwError(() => new Error(err.message ?? 'Supabase error')))
    );
  }

  rpc<T>(functionName: string, params?: Record<string, unknown>): Observable<T> {
    return from(this.client.rpc(functionName, params ?? {})).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as T;
      }),
      catchError((err) => throwError(() => new Error(err.message ?? 'RPC error')))
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
