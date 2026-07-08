import type {
  Difficulty,
  Glassware,
  Method,
  UpdateCocktail,
} from '@cocktailapp/shared';
import { DIFFICULTIES, GLASSWARE, METHODS } from '@cocktailapp/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CocktailIngredientDto } from './cocktail-ingredient.dto';

export class UpdateCocktailDto implements UpdateCocktail {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CocktailIngredientDto)
  ingredients?: CocktailIngredientDto[];

  @IsOptional()
  @IsIn(GLASSWARE)
  glass?: Glassware;

  @IsOptional()
  @IsIn(METHODS)
  method?: Method;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: Difficulty;

  @IsOptional()
  @IsString()
  garnish?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
