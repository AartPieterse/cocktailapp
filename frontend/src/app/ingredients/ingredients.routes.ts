import { Routes } from '@angular/router';

export const INGREDIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ingredient-list/ingredient-list').then((m) => m.IngredientList),
  },
];
