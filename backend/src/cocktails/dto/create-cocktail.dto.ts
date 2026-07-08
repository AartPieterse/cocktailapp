import type { CreateCocktail } from '@cocktailapp/shared';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CocktailIngredientDto } from './cocktail-ingredient.dto';

export class CreateCocktailDto implements CreateCocktail {
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
