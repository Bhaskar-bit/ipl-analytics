import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [style.background]="bgColor" [style.color]="textColor">
      {{ text }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
  `],
})
export class BadgeComponent {
  @Input() text = '';
  @Input() bgColor = 'var(--color-primary-muted)';
  @Input() textColor = 'var(--color-primary)';
}
