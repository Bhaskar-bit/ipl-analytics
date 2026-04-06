import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamService } from '../../../core/services/team.service';
import { Team } from '../../../core/models';
import { getTeamColor } from '../../../core/utils/color-palette.util';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>IPL Teams</h1>
        <p class="text-secondary">All {{ teams().length }} franchise teams</p>
      </header>
      <div class="teams-grid">
        @for (team of teams(); track team.id) {
          <a [routerLink]="['/teams', team.id]" class="team-card" [style.--team-color]="getColor(team.short_name)">
            <div class="team-card__color-bar"></div>
            <div class="team-card__body">
              <div class="team-card__badge">{{ team.short_name }}</div>
              <h3 class="team-card__name">{{ team.full_name }}</h3>
              <p class="team-card__venue">{{ team.home_venue }}</p>
              <p class="team-card__since">Since {{ team.active_from }}</p>
            </div>
          </a>
        } @empty {
          <p class="empty-state">Loading teams...</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); } }
    .teams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
    .team-card {
      background: var(--surface-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
      display: block;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
      &__color-bar { height: 4px; background: var(--team-color, var(--color-primary)); }
      &__body { padding: 1.25rem; }
      &__badge { display: inline-block; background: var(--team-color, var(--color-primary)); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; }
      &__name { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.25rem; }
      &__venue { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem; }
      &__since { font-size: 0.7rem; color: var(--text-muted); margin: 0; }
    }
    .text-secondary { color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0 0; }
    .empty-state { color: var(--text-muted); }
  `],
})
export class TeamsListComponent implements OnInit {
  teams = signal<Team[]>([]);

  constructor(private teamService: TeamService) {}

  ngOnInit(): void {
    this.teamService.getAllTeams().subscribe((t) => this.teams.set(t));
  }

  getColor(shortName: string): string {
    return getTeamColor(shortName);
  }
}
