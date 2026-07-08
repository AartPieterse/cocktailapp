import { Routes } from '@angular/router';

export const COCKTAIL_ROUTES: Routes = [
  {
    path: '',
    title: 'Cocktails — Barkast',
    loadComponent: () => import('./cocktail-list/cocktail-list').then((m) => m.CocktailList),
  },
  {
    path: 'add',
    title: 'Nieuwe cocktail — Barkast',
    loadComponent: () => import('./cocktail-form/cocktail-form').then((m) => m.CocktailForm),
  },
  {
    path: ':id/edit',
    title: 'Cocktail bewerken — Barkast',
    loadComponent: () => import('./cocktail-form/cocktail-form').then((m) => m.CocktailForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./cocktail-detail/cocktail-detail').then((m) => m.CocktailDetail),
  },
];
