import type { Locale } from './i18n';

/** Unit of measure for a cocktail ingredient line. Stored as a stable key; label is rendered in the UI. */
export type MeasureUnit =
  | 'part'
  | 'ml'
  | 'cl'
  | 'oz'
  | 'piece'
  | 'cube'
  | 'drop'
  | 'dash'
  | 'splash'
  | 'pinch'
  | 'teaspoon'
  | 'tablespoon'
  | 'barspoon'
  | 'slice'
  | 'wedge'
  | 'sprig'
  | 'topup';

export const MEASURE_UNITS: readonly MeasureUnit[] = [
  'part',
  'ml',
  'cl',
  'oz',
  'piece',
  'cube',
  'drop',
  'dash',
  'splash',
  'pinch',
  'teaspoon',
  'tablespoon',
  'barspoon',
  'slice',
  'wedge',
  'sprig',
  'topup',
];

/** Human-readable labels per locale. Keys are stable; labels are what the UI renders. */
export const MEASURE_LABELS: Record<Locale, Record<MeasureUnit, string>> = {
  nl: {
    part: 'deel',
    ml: 'ml',
    cl: 'cl',
    oz: 'oz',
    piece: 'stuk',
    cube: 'blokje',
    drop: 'druppel',
    dash: 'scheutje',
    splash: 'scheut',
    pinch: 'snufje',
    teaspoon: 'tl',
    tablespoon: 'el',
    barspoon: 'barlepel',
    slice: 'schijf',
    wedge: 'partje',
    sprig: 'takje',
    topup: 'aanvullen met',
  },
  en: {
    part: 'part',
    ml: 'ml',
    cl: 'cl',
    oz: 'oz',
    piece: 'piece',
    cube: 'cube',
    drop: 'drop',
    dash: 'dash',
    splash: 'splash',
    pinch: 'pinch',
    teaspoon: 'tsp',
    tablespoon: 'tbsp',
    barspoon: 'bar spoon',
    slice: 'slice',
    wedge: 'wedge',
    sprig: 'sprig',
    topup: 'top up with',
  },
};
