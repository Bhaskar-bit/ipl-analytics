import { Routes } from '@angular/router';

export const H2H_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./head-to-head.component').then((m) => m.HeadToHeadComponent),
  },
];
