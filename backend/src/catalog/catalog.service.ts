import { Injectable } from '@nestjs/common';
import { buildCatalog } from '@cocktailapp/shared';
import type { CatalogContent } from '@cocktailapp/shared';
import { createHash } from 'node:crypto';
import { CocktailsService } from '../cocktails/cocktails.service';
import { IngredientsService } from '../ingredients/ingredients.service';

/** The catalog payload served to clients: content + the version hash used for ETag/refresh. */
export type CatalogPayload = { version: string } & CatalogContent;

/**
 * Serves the read-only catalog (ingredients + cocktails) as ONE payload with a content `version`.
 * The payload is re-derived from Mongo through the shared `buildCatalog`, so it is byte-identical
 * to the committed offline bundle (same slug ids, same version) whenever both are seeded from the
 * same source — which is what lets a client switch between the bundled catalog and this endpoint
 * without invalidating a user's cabinet (stored as ingredient ids).
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly ingredientsService: IngredientsService,
    private readonly cocktailsService: CocktailsService,
  ) {}

  async getCatalog(): Promise<CatalogPayload> {
    const [ingDocs, cktDocs] = await Promise.all([
      this.ingredientsService.findAll(),
      this.cocktailsService.findAll(),
    ]);

    const rawIngredients = ingDocs.map((d) => ({
      name: d.name,
      category: d.category,
      isStaple: d.isStaple,
    }));
    const rawCocktails = cktDocs.map((d) => ({
      name: d.name,
      category: d.category,
      description: d.description,
      instructions: d.instructions,
      ingredients: (d.ingredients ?? []).map((l) => ({
        name: l.name,
        amount: l.amount,
        unit: l.unit,
        note: l.note,
        optional: l.optional,
      })),
      glass: d.glass,
      method: d.method,
      difficulty: d.difficulty,
      garnish: d.garnish,
      notes: d.notes,
      servings: d.servings,
      tags: d.tags,
      imageUrl: d.imageUrl,
    }));

    const { counts, ingredients, cocktails } = buildCatalog(rawIngredients, rawCocktails);

    // IMPORTANT: keep this hash recipe identical to scripts/build-catalog.mjs so
    // bundle.version === /api/catalog.version for the same seed.
    const version = createHash('sha256')
      .update(JSON.stringify({ ingredients, cocktails }))
      .digest('hex')
      .slice(0, 12);

    return { version, counts, ingredients, cocktails };
  }
}
