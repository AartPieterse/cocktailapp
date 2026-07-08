import type { CreateIngredient, IngredientCategory } from '@cocktailapp/shared';
import { INGREDIENT_CATEGORIES } from '@cocktailapp/shared';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateIngredientDto implements CreateIngredient {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsIn(INGREDIENT_CATEGORIES)
  category?: IngredientCategory;

  @IsOptional()
  @IsBoolean()
  isStaple?: boolean;
}
