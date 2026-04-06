import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-state">
      <div class="error-state__icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3 class="error-state__title">{{ title }}</h3>
      <p class="error-state__message">{{ message }}</p>
      <button class="btn btn--primary" *ngIf="showRetry" (click)="retry.emit()">
        Try Again
      </button>
    </div>
  `,
  styles: [`
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      gap: 1rem;
      color: var(--text-secondary);

      &__icon { color: var(--color-warning); }
      &__title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin: 0; }
      &__message { font-size: 0.875rem; margin: 0; max-width: 320px; }
    }
  `],
})
export class ErrorStateComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'Unable to load data. Please try again.';
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
