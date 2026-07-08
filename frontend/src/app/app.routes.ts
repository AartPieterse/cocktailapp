import { Routes } from '@angular/router';
import { Layout } from './core/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'cocktails',
        loadChildren: () => import('./cocktails/cocktails.routes').then((m) => m.COCKTAIL_ROUTES),
      },
      {
        path: 'ingredients',
        loadChildren: () =>
          import('./ingredients/ingredients.routes').then((m) => m.INGREDIENT_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
