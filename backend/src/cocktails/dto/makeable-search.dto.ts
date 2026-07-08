import type { MakeableSearch } from '@cocktailapp/shared';
import {
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class MakeableSearchDto implements MakeableSearch {
  @IsArray()
  @IsMongoId({ each: true })
  availableIngredientIds: string[];

  /** 0 = only fully makeable; up to 3 = also show "almost there" cocktails. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  maxMissing?: number;
}
