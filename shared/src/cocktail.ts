import { Difficulty } from './difficulty';
import { Glassware } from './glassware';
import type { Locale } from './i18n';
import { MeasureUnit } from './measure-unit';
import { Method } from './method';

/**
 * Role of a line within a recipe. `garnish` and `seasoning` are never counted as "missing" by
 * `computeMakeable` (like `optional`), so a decorative twist or a dash of salt never blocks a drink.
 * Defaults to `'ingredient'` when absent.
 */
export type CocktailIngredientRole = 'ingredient' | 'garnish' | 'seasoning';

/** One ingredient line embedded in a cocktail. `ingredientId` references the catalog; `name` is denormalized. */
export interface CocktailIngredient {
  /** The canonical *base* id — the only thing the cabinet and `computeMakeable` compare against. */
  ingredientId: string;
  /** The canonical *base* name — what `missing[]` surfaces ("nog te halen: Gin"). */
  name: string;
  /**
   * The recipe's verbatim wording for this line ("London Dry Gin", "Sugar Syrup"). The detail screen
   * shows `call ?? name`; matching still happens on the base `ingredientId`.
   */
  call?: string;
  /** Amount the recipe calls for. Optional — top-up / decorative lines carry no number. */
  amount?: number;
  /** Upper bound for an authored range ("6–8 ml"); `amount` holds the lower bound. */
  amountMax?: number;
  unit: MeasureUnit;
  /** Optional note, e.g. "vers geperst" or "goed gekoeld". */
  note?: string;
  /** If true, the line is optional / to taste and doesn't count against "makeable". */
  optional?: boolean;
  /** Line role; `garnish`/`seasoning` never block "makeable". Defaults to `'ingredient'`. */
  role?: CocktailIngredientRole;
  /**
   * For a recipe "X or Y" line: any of these *base* ids also satisfies the line. `computeMakeable`
   * treats the line as available if the cabinet contains `ingredientId` OR any `alternativeIds`.
   */
  alternativeIds?: string[];
}

/** Dominant spirit, used as the primary browse axis on the cocktail list. Derived from the lines. */
export type BaseSpirit =
  | 'gin'
  | 'vodka'
  | 'rum'
  | 'tequila'
  | 'whisky'
  | 'brandy'
  | 'other'
  | 'none';

export const BASE_SPIRITS: readonly BaseSpirit[] = [
  'gin',
  'vodka',
  'rum',
  'tequila',
  'whisky',
  'brandy',
  'other',
  'none',
];

/** Labels for the base-spirit browse filter, per locale. Keys are stable; labels are rendered. */
export const BASE_SPIRIT_LABELS: Record<Locale, Record<BaseSpirit, string>> = {
  nl: {
    gin: 'Gin',
    vodka: 'Wodka',
    rum: 'Rum',
    tequila: 'Tequila',
    whisky: 'Whisky',
    brandy: 'Brandy',
    other: 'Overig',
    none: 'Geen',
  },
  en: {
    gin: 'Gin',
    vodka: 'Vodka',
    rum: 'Rum',
    tequila: 'Tequila',
    whisky: 'Whisky',
    brandy: 'Brandy',
    other: 'Other',
    none: 'None',
  },
};

/** Typed vocabulary for the cocktail filter UI. Populated in a later content pass (see plan Step 5). */
export type CocktailTag =
  | 'iba-official'
  | 'classic'
  | 'refreshing'
  | 'sour'
  | 'bitter'
  | 'citrus'
  | 'creamy'
  | 'sparkling'
  | 'strong'
  | 'hot';

export const COCKTAIL_TAGS: readonly CocktailTag[] = [
  'iba-official',
  'classic',
  'refreshing',
  'sour',
  'bitter',
  'citrus',
  'creamy',
  'sparkling',
  'strong',
  'hot',
];

/** A bundled cocktail image (offline-safe). Replaces the remote `imageUrl` over time. */
export interface CocktailImage {
  assetId: string;
  blurhash?: string;
}

/**
 * A structured ingredient swap inside a variation ("use Vodka instead of Cachaça"). Both sides are
 * *base* ids (resolved from names by `buildCatalog`, mirroring `CocktailIngredient.alternativeIds`).
 * Informational only — swaps never affect `computeMakeable`.
 */
export interface CocktailVariationSwap {
  fromId: string;
  toId: string;
}

/**
 * A named variation of a cocktail (Caipirinha → Caipiroska, Kir → Kir Royal, Bellini → Puccini…).
 * `description` carries free prose; `swaps` expresses the change structurally when both ingredients
 * are catalog bases; `makesCocktailId` optionally links to another catalog cocktail (a future hook).
 * Distinct from `CocktailIngredient.alternativeIds` (an "X or Y" line within ONE recipe) and from
 * `Ingredient.substitutes`/`parentId` (cabinet makeability) — a variation is a different drink.
 */
export interface CocktailVariation {
  /** Display name of the variation (required, translatable). */
  name: string;
  /** Free-form prose describing the variation (translatable). */
  description?: string;
  /** Structured ingredient swaps (from → to), resolved to base ids. */
  swaps?: CocktailVariationSwap[];
  /** Optional link to another catalog cocktail this variation effectively produces. */
  makesCocktailId?: string;
}

export interface Cocktail {
  id: string;
  name: string;
  /** Optional grouping / family (e.g. an IBA category like "The Unforgettables"). */
  category?: string;
  /** Primary browse axis; derived from the dominant spirit line (see plan Step 5). */
  baseSpirit?: BaseSpirit;
  description: string;
  instructions: string[];
  ingredients: CocktailIngredient[];
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  /** Free-form notes and named variations, kept out of the step-by-step instructions. */
  notes?: string;
  /** Base number of servings the amounts are written for (default 1). */
  servings?: number;
  // NOTE: typed as `string[]` for now; migrates to `CocktailTag[]` when tags are populated (plan Step 5).
  tags?: string[];
  /** Named variations of this drink (swaps + prose), resolved to base ids by `buildCatalog`. */
  variations?: CocktailVariation[];
  /** Bundled, offline-safe image. Preferred over the legacy remote `imageUrl`. */
  image?: CocktailImage;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Ingredient line as sent by the client. `ingredientId` is optional and resolved by name server-side. */
export interface CreateCocktailIngredient {
  ingredientId?: string;
  name: string;
  call?: string;
  amount?: number;
  amountMax?: number;
  unit: MeasureUnit;
  note?: string;
  optional?: boolean;
  role?: CocktailIngredientRole;
  alternativeIds?: string[];
}

export interface CreateCocktail {
  name: string;
  category?: string;
  description?: string;
  instructions?: string[];
  ingredients?: CreateCocktailIngredient[];
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  notes?: string;
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
