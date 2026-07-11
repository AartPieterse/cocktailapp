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
 * to the committed offline bundle (same authored slug ids, same version) whenever both are seeded
 * from the same source — which is what lets a client switch between the bundled catalog and this
 * endpoint without invalidating a user's cabinet (stored as ingredient ids).
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

    // Feed buildCatalog the AUTHORED slug ids so it reproduces the bundle's ids (and therefore
    // hash) exactly, instead of re-slugging names. Alternatives are stored as ids but buildCatalog
    // resolves them by name, so map ids → names first.
    const nameById = new Map(ingDocs.map((d) => [d.id, d.name]));
    // Variations link to other cocktails by id; buildCatalog re-resolves them by name, so map back.
    const cocktailNameById = new Map(cktDocs.map((d) => [d.id, d.name]));

    const rawIngredients = ingDocs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      isStaple: d.isStaple,
      parentId: d.parentId,
      substitutes: d.substitutes,
      aliases: d.aliases,
    }));
    const rawCocktails = cktDocs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      baseSpirit: d.baseSpirit,
      description: d.description,
      instructions: d.instructions,
      ingredients: (d.ingredients ?? []).map((l) => ({
        name: l.name,
        call: l.call,
        amount: l.amount,
        amountMax: l.amountMax,
        unit: l.unit,
        note: l.note,
        optional: l.optional,
        role: l.role,
        alternatives: l.alternativeIds
          ?.map((id) => nameById.get(id))
          .filter((n): n is string => Boolean(n)),
      })),
      glass: d.glass,
      method: d.method,
      difficulty: d.difficulty,
      garnish: d.garnish,
      notes: d.notes,
      servings: d.servings,
      tags: d.tags,
      // Reverse-map variations to their raw (name-based) form so buildCatalog re-resolves to the
      // identical ids — same treatment as line `alternativeIds` above (keeps version parity).
      variations: d.variations?.map((v) => ({
        name: v.name,
        description: v.description,
        swaps: v.swaps?.map((s) => ({
          // ids are authored and always resolve to a base name (asserted, like alternatives above).
          from: nameById.get(s.fromId) as string,
          to: nameById.get(s.toId) as string,
        })),
        makesCocktail: v.makesCocktailId
          ? cocktailNameById.get(v.makesCocktailId)
          : undefined,
      })),
      imageUrl: d.imageUrl,
    }));

    const { counts, ingredients, cocktails } = buildCatalog(
      rawIngredients,
      rawCocktails,
    );

    // IMPORTANT: keep this hash recipe identical to scripts/build-catalog.mjs so
    // bundle.version === /api/catalog.version for the same seed.
    const version = createHash('sha256')
      .update(JSON.stringify({ ingredients, cocktails }))
      .digest('hex')
      .slice(0, 12);

    return { version, counts, ingredients, cocktails };
  }
}
