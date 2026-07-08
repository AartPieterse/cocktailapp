/** Unit of measure for a cocktail ingredient line. Stored as a stable key; label is rendered in the UI. */
export type MeasureUnit =
  | 'part'
  | 'ml'
  | 'piece'
  | 'cube'
  | 'drop'
  | 'tablespoon'
  | 'slice'
  | 'wedge';

export const MEASURE_UNITS: readonly MeasureUnit[] = [
  'part',
  'ml',
  'piece',
  'cube',
  'drop',
  'tablespoon',
  'slice',
  'wedge',
];

/** Human-readable labels (ported from the original app's measure enum). */
export const MEASURE_LABELS: Record<MeasureUnit, string> = {
  part: 'part(s)',
  ml: 'ml',
  piece: 'piece(s)',
  cube: 'cube(s)',
  drop: 'drop(s)',
  tablespoon: 'tablespoon(s)',
  slice: 'slice(s)',
  wedge: 'wedge',
};
