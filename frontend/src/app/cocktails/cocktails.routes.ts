import { Routes } from '@angular/router';
import { environment } from '../../environments/environment';

/** Authoring routes — only registered when the admin UI is enabled (dev). */
const ADMIN_ROUTES: Routes = [
  {
    path: 'add',
    title: 'newCocktail',
    loadComponent: () => import('./cocktail-form/cocktail-form').then((m) => m.CocktailForm),
  },
  {
    path: ':id/edit',
    title: 'editCocktail',
    loadComponent: () => import('./cocktail-form/cocktail-form').then((m) => m.CocktailForm),
  },
];

export const COCKTAIL_ROUTES: Routes = [
  {
    path: '',
    title: 'cocktails',
    loadComponent: () => import('./cocktail-list/cocktail-list').then((m) => m.CocktailList),
  },
  ...(environment.admin ? ADMIN_ROUTES : []),
  {
    path: ':id',
    loadComponent: () => import('./cocktail-detail/cocktail-detail').then((m) => m.CocktailDetail),
  },
];
