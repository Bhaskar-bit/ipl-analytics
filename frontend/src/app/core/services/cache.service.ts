import { Injectable, signal, Signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }

  cacheable<T>(key: string, source$: Observable<T>, ttlMs?: number): Observable<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return new Observable((observer) => {
        observer.next(cached);
        observer.complete();
      });
    }
    return source$.pipe(tap((value) => this.set(key, value, ttlMs)));
  }
}
