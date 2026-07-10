import { IngredientCategory } from './ingredient-category';

/**
 * A catalog ingredient — a *canonical, stockable base* the user picks from to stock their bar
 * (e.g. `Gin`, `White Rum`, `Simple Syrup`). The cabinet, the first-run wizard, and `computeMakeable`
 * all operate on this base; a recipe's specific wording ("London Dry Gin") lives on the line as
 * `CocktailIngredient.call`, so the catalog holds one gin, not four. See docs/data-model-refinement.md.
 */
export interface Ingredient {
  /**
   * Stable, url-safe identifier. Authored in the seed and immutable — a user's cabinet/favorites and
   * analytics tallies key off it, so it must survive display-name edits. `buildCatalog` uses an
   * authored `id` verbatim and only falls back to `slugify(name)` when none is given.
   */
  id: string;
  name: string;
  category?: IngredientCategory;
  /**
   * A pantry staple most people already have (sugar, ice, citrus, …).
   * Pre-checked in the first-run wizard so building your bar is fast.
   */
  isStaple?: boolean;
  /**
   * A broader base that may stand in for this one (`old-tom-gin`.parentId = `gin`). Used only by the
   * opt-in `expandCabinet` substitution pass — never by `computeMakeable` itself.
   */
  parentId?: string;
  /** Explicit acceptable swaps (used sparingly — e.g. NOT sweet↔dry vermouth). Also `expandCabinet`. */
  substitutes?: string[];
  /** Folded spellings & brand names, kept for the search box ("Sugar Syrup", "Smirnoff Vodka"). */
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIngredient {
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;
}

export type UpdateIngredient = Partial<CreateIngredient>;
