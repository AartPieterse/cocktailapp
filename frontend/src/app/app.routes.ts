import { Routes } from '@angular/router';
import { Layout } from './core/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ontdek' },
      {
        path: 'ontdek',
        title: 'discover',
        loadComponent: () => import('./bar/bar').then((m) => m.Bar),
      },
      {
        path: 'bar/wizard',
        title: 'buildBar',
        loadComponent: () => import('./bar/wizard/wizard').then((m) => m.Wizard),
      },
      {
        path: 'bar',
        title: 'myBar',
        loadComponent: () => import('./bar/cabinet/cabinet').then((m) => m.Cabinet),
      },
      // Back-compat: the stock editor used to live at /kast.
      { path: 'kast', pathMatch: 'full', redirectTo: 'bar' },
      {
        path: 'cocktails',
        loadChildren: () => import('./cocktails/cocktails.routes').then((m) => m.COCKTAIL_ROUTES),
      },
      {
        path: 'ingredienten',
        title: 'ingredients',
        loadComponent: () =>
          import('./ingredients/ingredient-list/ingredient-list').then((m) => m.IngredientList),
      },
    ],
  },
  { path: '**', redirectTo: 'ontdek' },
];
