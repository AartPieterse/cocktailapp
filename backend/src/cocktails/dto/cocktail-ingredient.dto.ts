import type {
  CocktailIngredientRole,
  CreateCocktailIngredient,
  MeasureUnit,
} from '@cocktailapp/shared';
import { MEASURE_UNITS } from '@cocktailapp/shared';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const INGREDIENT_ROLES: CocktailIngredientRole[] = [
  'ingredient',
  'garnish',
  'seasoning',
];

export class CocktailIngredientDto implements CreateCocktailIngredient {
  // Base slug id (e.g. 'gin') — not a Mongo ObjectId. Usually resolved by name server-side.
  @IsOptional()
  @IsString()
  ingredientId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  call?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountMax?: number;

  @IsIn(MEASURE_UNITS)
  unit: MeasureUnit;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  optional?: boolean;

  @IsOptional()
  @IsIn(INGREDIENT_ROLES)
  role?: CocktailIngredientRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeIds?: string[];
}
