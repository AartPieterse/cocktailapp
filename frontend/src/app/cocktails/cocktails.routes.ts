import { Routes } from '@angular/router';

export const COCKTAIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cocktail-list/cocktail-list').then((m) => m.CocktailList),
  },
  {
    path: 'add',
    loadComponent: () => import('./cocktail-form/cocktail-form').then((m) => m.CocktailForm),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./cocktail-form/cocktail-form').then((m) => m.CocktailForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./cocktail-detail/cocktail-detail').then((m) => m.CocktailDetail),
  },
];
