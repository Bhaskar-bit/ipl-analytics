import { Routes } from '@angular/router';

export const SEASON_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./season-list/season-list.component').then((m) => m.SeasonListComponent),
  },
  {
    path: ':year',
    loadComponent: () =>
      import('./season-detail/season-detail.component').then((m) => m.SeasonDetailComponent),
  },
  {
    path: ':year/match/:matchId',
    loadComponent: () =>
      import('./match-scorecard/match-scorecard.component').then((m) => m.MatchScorecardComponent),
  },
];
