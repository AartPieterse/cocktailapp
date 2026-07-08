import type {
  CreateCocktailIngredient,
  MeasureUnit,
} from '@cocktailapp/shared';
import { MEASURE_UNITS } from '@cocktailapp/shared';
import {
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CocktailIngredientDto implements CreateCocktailIngredient {
  @IsOptional()
  @IsMongoId()
  ingredientId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(MEASURE_UNITS)
  unit: MeasureUnit;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}
