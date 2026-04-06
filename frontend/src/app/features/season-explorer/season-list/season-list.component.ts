import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeasonService } from '../../../core/services/season.service';
import { Season } from '../../../core/models';

@Component({
  selector: 'app-season-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>IPL Seasons</h1>
        <p class="text-secondary">Explore all {{ seasons().length }} IPL seasons</p>
      </header>
      <div class="seasons-grid">
        @for (s of seasons(); track s.year) {
          <a [routerLink]="['/seasons', s.year]" class="season-card">
            <div class="season-card__year">{{ s.year }}</div>
            <div class="season-card__body">
              <p class="season-card__label">Champion</p>
              <p class="season-card__winner">{{ s.winner_short_name ?? 'TBD' }}</p>
              <p class="season-card__meta">{{ s.total_matches }} matches played</p>
            </div>
            <svg class="season-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        } @empty {
          <p class="empty-state">Loading seasons...</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 1.5rem; max-width: 1000px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); } }
    .text-secondary { color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0 0; }
    .seasons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
    .season-card {
      background: var(--surface-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.25rem;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: box-shadow 0.2s, transform 0.2s;
      &:hover { transform: translateX(2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
      &__year { font-size: 1.5rem; font-weight: 800; color: var(--color-primary); min-width: 56px; }
      &__body { flex: 1; }
      &__label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin: 0; }
      &__winner { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0.1rem 0; }
      &__meta { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
      &__arrow { color: var(--text-muted); flex-shrink: 0; }
    }
    .empty-state { color: var(--text-muted); }
  `],
})
export class SeasonListComponent implements OnInit {
  seasons = signal<Season[]>([]);

  constructor(private seasonService: SeasonService) {}

  ngOnInit(): void {
    this.seasonService.getAllSeasons().subscribe((s) => this.seasons.set(s));
  }
}
