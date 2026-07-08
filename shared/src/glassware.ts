/** The glass a cocktail is traditionally served in. Stable key; Dutch label rendered in the UI. */
export type Glassware =
  | 'coupe'
  | 'martini'
  | 'rocks'
  | 'highball'
  | 'collins'
  | 'nick_and_nora'
  | 'flute'
  | 'wine'
  | 'hurricane'
  | 'mug'
  | 'shot';

export const GLASSWARE: readonly Glassware[] = [
  'coupe',
  'martini',
  'rocks',
  'highball',
  'collins',
  'nick_and_nora',
  'flute',
  'wine',
  'hurricane',
  'mug',
  'shot',
];

export const GLASSWARE_LABELS: Record<Glassware, string> = {
  coupe: 'Coupe',
  martini: 'Martiniglas',
  rocks: 'Rocksglas',
  highball: 'Longdrinkglas',
  collins: 'Collinsglas',
  nick_and_nora: 'Nick & Nora',
  flute: 'Champagneflûte',
  wine: 'Wijnglas',
  hurricane: 'Hurricaneglas',
  mug: 'Mok',
  shot: 'Shotglas',
};
