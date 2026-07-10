import type { Locale } from './i18n';

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

/** Category labels (singular), per locale. */
export const CATEGORY_LABELS: Record<Locale, Record<IngredientCategory, string>> = {
  nl: {
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
  },
  en: {
    spirit: 'spirit',
    liqueur: 'liqueur',
    wine: 'wine',
    mixer: 'mixer',
    juice: 'juice',
    syrup: 'syrup',
    bitters: 'bitters',
    dairy: 'dairy',
    seasoning: 'seasoning',
    garnish: 'garnish',
    other: 'other',
  },
};

/** Plural labels, used for section headings in the wizard / my bar. */
export const CATEGORY_LABELS_PLURAL: Record<Locale, Record<IngredientCategory, string>> = {
  nl: {
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
  },
  en: {
    spirit: 'Spirits',
    liqueur: 'Liqueurs',
    wine: 'Wine & vermouth',
    mixer: 'Mixers & sodas',
    juice: 'Juices',
    syrup: 'Syrups',
    bitters: 'Bitters',
    dairy: 'Dairy & egg',
    seasoning: 'Seasoning',
    garnish: 'Garnish',
    other: 'Other',
  },
};

/** A short helper line shown under each wizard section heading, per locale. */
export const CATEGORY_HINTS: Record<Locale, Record<IngredientCategory, string>> = {
  nl: {
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
  },
  en: {
    spirit: 'The base of every cocktail — gin, vodka, rum, whisky…',
    liqueur: 'Sweet or spiced liqueurs that add flavour and colour.',
    wine: 'Wine, vermouth and sparkling — dry to sweet.',
    mixer: 'Sodas and fizz to top things up.',
    juice: 'Fresh or from a carton — lemon, lime, orange…',
    syrup: 'Sugar syrup and flavoured syrups for balance.',
    bitters: 'A few drops for depth and complexity.',
    dairy: 'Cream, coconut cream and egg for rich, silky drinks.',
    seasoning: 'Salt, pepper and sauces that season the drink.',
    garnish: 'The finishing touch: slices, sprigs, olives…',
    other: "Anything that doesn't fit a category.",
  },
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
