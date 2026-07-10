import type { Locale } from './i18n';

/** The glass a cocktail is traditionally served in. Stable key; localized label rendered in the UI. */
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

export const GLASSWARE_LABELS: Record<Locale, Record<Glassware, string>> = {
  nl: {
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
  },
  en: {
    coupe: 'Coupe',
    martini: 'Martini glass',
    rocks: 'Rocks glass',
    highball: 'Highball glass',
    collins: 'Collins glass',
    nick_and_nora: 'Nick & Nora',
    flute: 'Champagne flute',
    wine: 'Wine glass',
    hurricane: 'Hurricane glass',
    mug: 'Mug',
    shot: 'Shot glass',
  },
};
