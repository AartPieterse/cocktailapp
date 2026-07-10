import { MEASURE_LABELS, type CocktailIngredient } from '@cocktailapp/shared';

/**
 * Render an ingredient line's amount, scaled for the chosen number of servings. Mirrors the web
 * detail screen: a plain amount, an authored range (`amount`–`amountMax`), or nothing for
 * top-up / decorative lines that carry no number.
 */
export function scaledAmount(line: CocktailIngredient, servings: number): string {
  const factor = Math.max(1, servings);
  const fmt = (n: number) => {
    const v = n * factor;
    return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');
  };
  if (line.amount === undefined) return '';
  if (line.amountMax !== undefined) return `${fmt(line.amount)}–${fmt(line.amountMax)}`;
  return fmt(line.amount);
}

/** Dutch unit label for a line (empty for `topup`-style lines where the amount already reads full). */
export function unitLabel(line: CocktailIngredient): string {
  return MEASURE_LABELS[line.unit] ?? line.unit;
}
