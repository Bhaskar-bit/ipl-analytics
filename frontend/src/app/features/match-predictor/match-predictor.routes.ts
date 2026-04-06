import { Routes } from '@angular/router';

export const PREDICTOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./match-predictor.component').then((m) => m.MatchPredictorComponent),
  },
];
