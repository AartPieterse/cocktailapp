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
   * A broader base this one is a kind of (`cognac`.parentId = `brandy`). Substitution runs both ways:
   * stocking the child covers a call for the parent, and stocking the parent covers a call for the
   * child (`cabinetCoverage` in makeable.ts). A recipe line marked `exact` ignores it.
   */
  parentId?: string;
  /**
   * Bases this one may stand in for, one way (`jenever` covers a call for `gin`; list both sides for a
   * two-way swap). Used sparingly, e.g. NOT sweet/dry vermouth. Ignored by a line marked `exact`.
   */
  substitutes?: string[];
  /** Folded spellings & brand names, kept for the search box ("Sugar Syrup", "Smirnoff Vodka"). */
  aliases?: string[];
  /**
   * Alcohol by volume as a percentage (40 = 40% ABV). Authored only for ingredients that contain
   * alcohol; absent means "no alcohol". Drives the strength of the finished drink shown on a
   * recipe — bar information, the way a bottle label reads, not a health measure.
   */
  abv?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIngredient {
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;
}

export type UpdateIngredient = Partial<CreateIngredient>;
