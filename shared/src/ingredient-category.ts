/** Grouping for catalog ingredients. Drives the wizard sections and the availability filter. */
export type IngredientCategory =
  | 'spirit'
  | 'liqueur'
  | 'wine'
  | 'mixer'
  | 'juice'
  | 'syrup'
  | 'bitters'
  | 'dairy'
  | 'seasoning'
  | 'garnish'
  | 'other';

export const INGREDIENT_CATEGORIES: readonly IngredientCategory[] = [
  'spirit',
  'liqueur',
  'wine',
  'mixer',
  'juice',
  'syrup',
  'bitters',
  'dairy',
  'seasoning',
  'garnish',
  'other',
];

/**
 * Categories whose ingredients contain alcohol. Used to derive whether a cocktail is alcohol-free
 * (no non-optional line references an ingredient in one of these categories) for the mocktail filter.
 */
export const ALCOHOLIC_INGREDIENT_CATEGORIES: readonly IngredientCategory[] = [
  'spirit',
  'liqueur',
  'wine',
  'bitters',
];

/** Dutch labels (singular) for a category. */
export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  spirit: 'sterkedrank',
  liqueur: 'likeur',
  wine: 'wijn',
  mixer: 'mixer',
  juice: 'sap',
  syrup: 'siroop',
  bitters: 'bitters',
  dairy: 'zuivel',
  seasoning: 'kruiderij',
  garnish: 'garnering',
  other: 'overig',
};

/** Dutch plural labels, used for section headings in the wizard / cabinet. */
export const CATEGORY_LABELS_PLURAL: Record<IngredientCategory, string> = {
  spirit: 'Sterke drank',
  liqueur: 'Likeuren',
  wine: 'Wijn & vermout',
  mixer: 'Mixers & frisdrank',
  juice: 'Sappen',
  syrup: 'Siropen',
  bitters: 'Bitters',
  dairy: 'Zuivel & ei',
  seasoning: 'Kruiderij',
  garnish: 'Garnering',
  other: 'Overig',
};

/** A short helper line shown under each wizard section heading. */
export const CATEGORY_HINTS: Record<IngredientCategory, string> = {
  spirit: 'De basis van elke cocktail — gin, wodka, rum, whisky…',
  liqueur: 'Zoete of kruidige likeuren die smaak en kleur geven.',
  wine: 'Wijn, vermout en bruiswijn — droog tot zoet.',
  mixer: 'Frisdrank en bruis om mee aan te vullen.',
  juice: 'Vers of uit pak — citroen, limoen, sinaasappel…',
  syrup: 'Suikersiroop en smaaksiropen voor balans.',
  bitters: 'Een paar druppels voor diepte en complexiteit.',
  dairy: 'Room, kokosroom en ei voor volle, romige drankjes.',
  seasoning: 'Zout, peper en sausjes die op smaak brengen.',
  garnish: 'De finishing touch: schijfjes, takjes, olijven…',
  other: 'Alles wat verder niet in een hokje past.',
};

/** Fixed display order of categories throughout the app. */
export const CATEGORY_ORDER: readonly IngredientCategory[] = [
  'spirit',
  'liqueur',
  'wine',
  'mixer',
  'juice',
  'syrup',
  'bitters',
  'dairy',
  'seasoning',
  'garnish',
  'other',
];
