/**
 * Bases whose name is a brand or carries a proper noun, so it keeps its capitals mid-sentence
 * ("met Pernod", "met Grand Marnier"). Every other base reads lowercase there ("met jenever").
 */
const PROPER_NAMES = new Set([
  'angostura-bitters',
  'aperol',
  'benedictine',
  'campari',
  'cynar',
  'donns-mix',
  'drambuie',
  'fernet-branca',
  'frangelico',
  'grand-marnier',
  'green-chartreuse',
  'irish-cream',
  'irish-whiskey',
  'jagermeister',
  'licor-43',
  'lillet-blanc',
  'pernod',
  'peychauds-bitters',
  'tabasco',
  'yellow-chartreuse',
]);

/** An ingredient's display name as it reads inside a sentence: "met jenever", "met Pernod". */
export function inSentence(ingredient: { ingredientId: string; name: string }): string {
  return PROPER_NAMES.has(ingredient.ingredientId)
    ? ingredient.name
    : ingredient.name.toLocaleLowerCase();
}
