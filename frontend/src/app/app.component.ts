import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './shared/components/nav-bar/nav-bar.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { SeasonService } from './core/services/season.service';
import { TeamService } from './core/services/team.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBarComponent, LoadingSpinnerComponent],
  template: `
    <div class="app-shell">
      <app-nav-bar (themeToggle)="toggleTheme()"></app-nav-bar>
      <app-loading-spinner></app-loading-spinner>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  theme: 'light' | 'dark' = 'light';

  constructor(
    private seasonService: SeasonService,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.detectSystemTheme();
    this.seasonService.getAllSeasons().subscribe();
    this.teamService.getAllTeams().subscribe();
  }

  toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  private detectSystemTheme(): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
  }
}
