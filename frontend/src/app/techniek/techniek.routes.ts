import { Routes } from '@angular/router';

/** The technique lessons: an index and one page per lesson. Lazy, so ~3,000 words of copy stay out of the initial bundle. */
export const TECHNIQUE_ROUTES: Routes = [
  {
    path: '',
    title: 'technique',
    loadComponent: () => import('./technique-list').then((m) => m.TechniqueList),
  },
  {
    path: ':id',
    title: 'technique',
    loadComponent: () => import('./technique-page').then((m) => m.TechniquePage),
  },
];
