import type { IngredientCategory, UpdateIngredient } from '@cocktailapp/shared';
import { INGREDIENT_CATEGORIES } from '@cocktailapp/shared';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateIngredientDto implements UpdateIngredient {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(INGREDIENT_CATEGORIES as unknown as string[])
  category?: IngredientCategory;
}
