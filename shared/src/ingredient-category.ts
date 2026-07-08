/** Grouping for catalog ingredients. Drives the wizard sections and the availability filter. */
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

/** Dutch labels (singular) for a category. */
export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  spirit: 'sterkedrank',
  liqueur: 'likeur',
  mixer: 'mixer',
  juice: 'sap',
  syrup: 'siroop',
  bitters: 'bitters',
  garnish: 'garnering',
  other: 'overig',
};

/** Dutch plural labels, used for section headings in the wizard / cabinet. */
export const CATEGORY_LABELS_PLURAL: Record<IngredientCategory, string> = {
  spirit: 'Sterke drank',
  liqueur: 'Likeuren',
  mixer: 'Mixers & frisdrank',
  juice: 'Sappen',
  syrup: 'Siropen',
  bitters: 'Bitters',
  garnish: 'Garnering',
  other: 'Overig',
};

/** A short helper line shown under each wizard section heading. */
export const CATEGORY_HINTS: Record<IngredientCategory, string> = {
  spirit: 'De basis van elke cocktail — gin, wodka, rum, whisky…',
  liqueur: 'Zoete of kruidige likeuren die smaak en kleur geven.',
  mixer: 'Frisdrank en bruis om mee aan te vullen.',
  juice: 'Vers of uit pak — citroen, limoen, sinaasappel…',
  syrup: 'Suikersiroop en smaaksiropen voor balans.',
  bitters: 'Een paar druppels voor diepte en complexiteit.',
  garnish: 'De finishing touch: schijfjes, takjes, olijven…',
  other: 'Alles wat verder niet in een hokje past.',
};

/** Fixed display order of categories throughout the app. */
export const CATEGORY_ORDER: readonly IngredientCategory[] = [
  'spirit',
  'liqueur',
  'mixer',
  'juice',
  'syrup',
  'bitters',
  'garnish',
  'other',
];
