import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'teams',
    loadChildren: () =>
      import('./features/teams/teams.routes').then((m) => m.TEAMS_ROUTES),
  },
  {
    path: 'players',
    loadChildren: () =>
      import('./features/players/players.routes').then((m) => m.PLAYERS_ROUTES),
  },
  {
    path: 'head-to-head',
    loadChildren: () =>
      import('./features/head-to-head/head-to-head.routes').then((m) => m.H2H_ROUTES),
  },
  {
    path: 'predictor',
    loadChildren: () =>
      import('./features/match-predictor/match-predictor.routes').then((m) => m.PREDICTOR_ROUTES),
  },
  {
    path: 'seasons',
    loadChildren: () =>
      import('./features/season-explorer/season-explorer.routes').then((m) => m.SEASON_ROUTES),
  },
  { path: '**', redirectTo: 'dashboard' },
];
