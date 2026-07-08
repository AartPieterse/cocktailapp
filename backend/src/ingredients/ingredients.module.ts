import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cocktail, CocktailSchema } from '../cocktails/schemas/cocktail.schema';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { Ingredient, IngredientSchema } from './schemas/ingredient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ingredient.name, schema: IngredientSchema },
      // Registered here too so the service can keep cocktail ingredient lines in sync.
      { name: Cocktail.name, schema: CocktailSchema },
    ]),
  ],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
