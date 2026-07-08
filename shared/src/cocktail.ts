import { Difficulty } from './difficulty';
import { Glassware } from './glassware';
import { MeasureUnit } from './measure-unit';
import { Method } from './method';

/** One ingredient line embedded in a cocktail. `ingredientId` references the catalog; `name` is denormalized. */
export interface CocktailIngredient {
  ingredientId: string;
  name: string;
  amount: number;
  unit: MeasureUnit;
  /** Optional note, e.g. "vers geperst" or "goed gekoeld". */
  note?: string;
  /** If true, the line is optional / to taste and doesn't count against "makeable". */
  optional?: boolean;
}

export interface Cocktail {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  ingredients: CocktailIngredient[];
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  /** Base number of servings the amounts are written for (default 1). */
  servings?: number;
  tags?: string[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Ingredient line as sent by the client. `ingredientId` is optional and resolved by name server-side. */
export interface CreateCocktailIngredient {
  ingredientId?: string;
  name: string;
  amount: number;
  unit: MeasureUnit;
  note?: string;
  optional?: boolean;
}

export interface CreateCocktail {
  name: string;
  description?: string;
  instructions?: string[];
  ingredients?: CreateCocktailIngredient[];
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  servings?: number;
  tags?: string[];
  imageUrl?: string;
}

export type UpdateCocktail = Partial<CreateCocktail>;

/**
 * Body for the "what can I make with what I have" search.
 * `maxMissing` (default 0) lets the UI also fetch "almost makeable" cocktails
 * (e.g. 1) so it can show "je mist nog 1 ingrediënt".
 */
export interface MakeableSearch {
  availableIngredientIds: string[];
  maxMissing?: number;
}

/** A cocktail plus how far the user is from being able to make it. */
export interface MakeableResult {
  cocktail: Cocktail;
  /** Required ingredients the user does not have. Empty ⇒ makeable right now. */
  missing: { ingredientId: string; name: string }[];
  missingCount: number;
}
