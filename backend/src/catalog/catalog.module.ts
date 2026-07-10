import { Module } from '@nestjs/common';
import { CocktailsModule } from '../cocktails/cocktails.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

/** Read-only, versioned catalog endpoint. Reuses the existing ingredient/cocktail services. */
@Module({
  imports: [IngredientsModule, CocktailsModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
