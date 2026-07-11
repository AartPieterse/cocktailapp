import type { Locale } from './i18n';

/** How hard a cocktail is to make. Stable key; localized label rendered in the UI. */
export type Difficulty = 'easy' | 'medium' | 'advanced';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'advanced'];

export const DIFFICULTY_LABELS: Record<Locale, Record<Difficulty, string>> = {
  nl: {
    easy: 'Makkelijk',
    medium: 'Gemiddeld',
    advanced: 'Gevorderd',
  },
  en: {
    easy: 'Easy',
    medium: 'Medium',
    advanced: 'Advanced',
  },
};
