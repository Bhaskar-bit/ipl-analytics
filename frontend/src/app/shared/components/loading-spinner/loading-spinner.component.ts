import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-bar">
        <div class="loading-bar__fill"></div>
      </div>
    }
  `,
  styles: [`
    .loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 9999;
      background: transparent;
    }
    .loading-bar__fill {
      height: 100%;
      background: var(--color-primary);
      animation: loading 1.2s ease-in-out infinite;
    }
    @keyframes loading {
      0%   { width: 0%; margin-left: 0%; }
      50%  { width: 60%; margin-left: 20%; }
      100% { width: 0%; margin-left: 100%; }
    }
  `],
})
export class LoadingSpinnerComponent {
  constructor(public loadingService: LoadingService) {}
}
