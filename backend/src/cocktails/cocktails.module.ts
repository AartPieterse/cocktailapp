import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { CocktailsController } from './cocktails.controller';
import { CocktailsService } from './cocktails.service';
import { Cocktail, CocktailSchema } from './schemas/cocktail.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cocktail.name, schema: CocktailSchema },
    ]),
    IngredientsModule,
  ],
  controllers: [CocktailsController],
  providers: [CocktailsService],
})
export class CocktailsModule {}
