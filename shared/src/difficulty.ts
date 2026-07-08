/** How hard a cocktail is to make. Stable key; Dutch label rendered in the UI. */
export type Difficulty = 'easy' | 'medium' | 'advanced';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'advanced'];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Makkelijk',
  medium: 'Gemiddeld',
  advanced: 'Gevorderd',
};
