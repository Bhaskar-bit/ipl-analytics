import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [style.--accent]="accentColor">
      <div class="stat-card__icon" *ngIf="icon">
        <ng-container [ngSwitch]="icon">
          <svg *ngSwitchCase="'trophy'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 6 2 6 2 18 8 18"/><path d="M22 6h-6v12h6V6z"/><path d="M8 11h8"/></svg>
          <svg *ngSwitchCase="'zap'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <svg *ngSwitchCase="'users'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <svg *ngSwitchDefault width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        </ng-container>
      </div>
      <div class="stat-card__body">
        <p class="stat-card__label">{{ label }}</p>
        <p class="stat-card__value">{{ value }}</p>
        <p class="stat-card__sub" *ngIf="sub">{{ sub }}</p>
      </div>
      <div class="stat-card__trend" *ngIf="trend !== null">
        <span [class.trend--up]="trend! >= 0" [class.trend--down]="trend! < 0">
          {{ trend! >= 0 ? '+' : '' }}{{ trend }}%
        </span>
      </div>
    </div>
  `,
  styleUrls: ['./stat-card.component.scss'],
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() sub = '';
  @Input() icon = '';
  @Input() accentColor = 'var(--color-primary)';
  @Input() trend: number | null = null;
}
