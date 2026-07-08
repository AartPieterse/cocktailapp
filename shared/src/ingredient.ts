import { IngredientCategory } from './ingredient-category';

/** A catalog ingredient — the reusable pool users pick from to stock their bar. */
export interface Ingredient {
  id: string;
  name: string;
  category?: IngredientCategory;
  /**
   * A pantry staple most people already have (sugar, ice, citrus, …).
   * Pre-checked in the first-run wizard so building your bar is fast.
   */
  isStaple?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIngredient {
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;
}

export type UpdateIngredient = Partial<CreateIngredient>;
