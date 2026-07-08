/** Unit of measure for a cocktail ingredient line. Stored as a stable key; label is rendered in the UI. */
export type MeasureUnit =
  | 'part'
  | 'ml'
  | 'cl'
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

/** Human-readable Dutch labels. Keys are stable; labels are what the UI renders. */
export const MEASURE_LABELS: Record<MeasureUnit, string> = {
  part: 'deel',
  ml: 'ml',
  cl: 'cl',
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
};
