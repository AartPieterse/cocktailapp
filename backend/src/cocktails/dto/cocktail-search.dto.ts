import type { CocktailSearch } from '@cocktailapp/shared';
import { IsArray, IsMongoId } from 'class-validator';

export class CocktailSearchDto implements CocktailSearch {
  @IsArray()
  @IsMongoId({ each: true })
  availableIngredientIds: string[];
}
