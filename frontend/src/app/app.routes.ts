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
        title: 'Mijn bar — Welke Cocktail',
        loadComponent: () => import('./bar/bar').then((m) => m.Bar),
      },
      {
        path: 'bar/wizard',
        title: 'Stel je bar samen — Welke Cocktail',
        loadComponent: () => import('./bar/wizard/wizard').then((m) => m.Wizard),
      },
      {
        path: 'kast',
        title: 'Mijn kast — Welke Cocktail',
        loadComponent: () => import('./bar/cabinet/cabinet').then((m) => m.Cabinet),
      },
      {
        path: 'cocktails',
        loadChildren: () => import('./cocktails/cocktails.routes').then((m) => m.COCKTAIL_ROUTES),
      },
      {
        path: 'ingredienten',
        title: 'Ingrediënten — Welke Cocktail',
        loadComponent: () =>
          import('./ingredients/ingredient-list/ingredient-list').then((m) => m.IngredientList),
      },
    ],
  },
  { path: '**', redirectTo: 'bar' },
];
