import { IngredientCategory } from './ingredient-category';

/** A catalog ingredient (the reusable name pool, formerly "IngredientName"). */
export interface Ingredient {
  id: string;
  name: string;
  category?: IngredientCategory;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIngredient {
  name: string;
  category?: IngredientCategory;
}

export type UpdateIngredient = Partial<CreateIngredient>;
