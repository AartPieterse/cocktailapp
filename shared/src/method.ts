import type { Locale } from './i18n';

/** How a cocktail is prepared. Stable key; localized label rendered in the UI. */
export type Method = 'build' | 'shaken' | 'stirred' | 'blended' | 'muddled' | 'layered';

export const METHODS: readonly Method[] = [
  'build',
  'shaken',
  'stirred',
  'blended',
  'muddled',
  'layered',
];

export const METHOD_LABELS: Record<Locale, Record<Method, string>> = {
  nl: {
    build: 'Opbouwen in glas',
    shaken: 'Shaken',
    stirred: 'Roeren',
    blended: 'Blenden',
    muddled: 'Muddelen',
    layered: 'Laagjes',
  },
  en: {
    build: 'Build in glass',
    shaken: 'Shaken',
    stirred: 'Stirred',
    blended: 'Blended',
    muddled: 'Muddled',
    layered: 'Layered',
  },
};
