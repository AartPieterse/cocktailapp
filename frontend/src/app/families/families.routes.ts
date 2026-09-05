import { Routes } from '@angular/router';

/** The nine structural families: an index and one page per family. Lazy, like the technique lessons. */
export const FAMILY_ROUTES: Routes = [
  {
    path: '',
    title: 'families',
    loadComponent: () => import('./family-list').then((m) => m.FamilyList),
  },
  {
    path: ':family',
    title: 'families',
    loadComponent: () => import('./family-page').then((m) => m.FamilyPage),
  },
];
