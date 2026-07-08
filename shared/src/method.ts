/** How a cocktail is prepared. Stable key; Dutch label rendered in the UI. */
export type Method = 'build' | 'shaken' | 'stirred' | 'blended' | 'muddled' | 'layered';

export const METHODS: readonly Method[] = [
  'build',
  'shaken',
  'stirred',
  'blended',
  'muddled',
  'layered',
];

export const METHOD_LABELS: Record<Method, string> = {
  build: 'Opbouwen in glas',
  shaken: 'Shaken',
  stirred: 'Roeren',
  blended: 'Blenden',
  muddled: 'Muddelen',
  layered: 'Laagjes',
};
