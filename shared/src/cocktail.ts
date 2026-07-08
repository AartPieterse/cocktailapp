import { MeasureUnit } from './measure-unit';

/** One ingredient line embedded in a cocktail. `ingredientId` references the catalog; `name` is denormalized. */
export interface CocktailIngredient {
  ingredientId: string;
  name: string;
  amount: number;
  unit: MeasureUnit;
}

export interface Cocktail {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  ingredients: CocktailIngredient[];
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
}

export interface CreateCocktail {
  name: string;
  description?: string;
  instructions?: string[];
  ingredients?: CreateCocktailIngredient[];
  tags?: string[];
  imageUrl?: string;
}

export type UpdateCocktail = Partial<CreateCocktail>;

/** Body for the "what can I make with what I have" search. */
export interface CocktailSearch {
  availableIngredientIds: string[];
}
