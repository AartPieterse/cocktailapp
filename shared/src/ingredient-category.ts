/** Optional grouping for catalog ingredients (used to group the availability filter). */
export type IngredientCategory =
  | 'spirit'
  | 'liqueur'
  | 'mixer'
  | 'juice'
  | 'syrup'
  | 'bitters'
  | 'garnish'
  | 'other';

export const INGREDIENT_CATEGORIES: readonly IngredientCategory[] = [
  'spirit',
  'liqueur',
  'mixer',
  'juice',
  'syrup',
  'bitters',
  'garnish',
  'other',
];
