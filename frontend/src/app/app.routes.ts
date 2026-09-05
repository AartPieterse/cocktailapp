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
      // The wizard's step is a route param, so the browser's back button walks the wizard a step
      // at a time instead of leaving it and dropping everything ticked so far. Every step shares
      // ONE route config on purpose: Angular then reuses the component across steps (a second
      // config for the bare path would tear it down and rebuild it on the first "Next"), and the
      // redirect keeps the many existing `/bar/wizard` links working without a history entry.
      { path: 'bar/wizard', pathMatch: 'full', redirectTo: 'bar/wizard/1' },
      {
        path: 'bar/wizard/:step',
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
        path: 'techniek',
        loadChildren: () => import('./techniek/techniek.routes').then((m) => m.TECHNIQUE_ROUTES),
      },
      {
        path: 'families',
        loadChildren: () => import('./families/families.routes').then((m) => m.FAMILY_ROUTES),
      },
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
      {
        path: 'account',
        title: 'Account — Barkast',
        loadComponent: () => import('./account/account').then((m) => m.Account),
      },
    ],
  },
  { path: '**', redirectTo: 'ontdek' },
];
