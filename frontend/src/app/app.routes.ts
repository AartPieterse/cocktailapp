import { Routes } from '@angular/router';
import { Layout } from './core/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bar' },
      {
        path: 'bar',
        title: 'Mijn bar — Barkast',
        loadComponent: () => import('./bar/bar').then((m) => m.Bar),
      },
      {
        path: 'bar/wizard',
        title: 'Stel je bar samen — Barkast',
        loadComponent: () => import('./bar/wizard/wizard').then((m) => m.Wizard),
      },
      {
        path: 'kast',
        title: 'Mijn kast — Barkast',
        loadComponent: () => import('./bar/cabinet/cabinet').then((m) => m.Cabinet),
      },
      {
        path: 'cocktails',
        loadChildren: () => import('./cocktails/cocktails.routes').then((m) => m.COCKTAIL_ROUTES),
      },
      {
        path: 'ingredienten',
        title: 'Ingrediënten — Barkast',
        loadComponent: () =>
          import('./ingredients/ingredient-list/ingredient-list').then((m) => m.IngredientList),
      },
      {
        path: 'account',
        title: 'Account — Barkast',
        loadComponent: () => import('./account/account').then((m) => m.Account),
      },
    ],
  },
  { path: '**', redirectTo: 'bar' },
];
