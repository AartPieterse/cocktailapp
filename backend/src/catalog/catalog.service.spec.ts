import { buildCatalog } from '@cocktailapp/shared';
import { createHash } from 'node:crypto';
import { CatalogService } from './catalog.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

const RAW_INGREDIENTS = [
  { name: 'Gin', category: 'spirit', isStaple: false },
  { name: 'Tonic', category: 'mixer', isStaple: false },
  { name: 'Lime', category: 'fruit', isStaple: true },
];

const RAW_COCKTAILS = [
  {
    name: 'Gin & Tonic',
    description: 'Classic',
    instructions: ['Build over ice'],
    ingredients: [
      { name: 'Gin', amount: 5, unit: 'cl' },
      { name: 'Tonic', amount: 10, unit: 'cl' },
      { name: 'Lime', amount: 1, unit: 'wedge', optional: true },
    ],
    servings: 1,
    tags: [],
  },
];

function expectedVersion() {
  const { ingredients, cocktails } = buildCatalog(
    RAW_INGREDIENTS as any,
    RAW_COCKTAILS as any,
  );
  return createHash('sha256')
    .update(JSON.stringify({ ingredients, cocktails }))
    .digest('hex')
    .slice(0, 12);
}

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    const ingredientsService = {
      findAll: jest.fn().mockResolvedValue(RAW_INGREDIENTS),
    } as any;
    const cocktailsService = {
      findAll: jest.fn().mockResolvedValue(RAW_COCKTAILS),
    } as any;
    service = new CatalogService(ingredientsService, cocktailsService);
  });

  it('returns counts, slug-id ingredients, and resolved cocktail lines', async () => {
    const payload = await service.getCatalog();
    expect(payload.counts).toEqual({ ingredients: 3, cocktails: 1 });
    // Slug ids derived from names (not Mongo ObjectIds) — the shared, stable id space.
    expect(payload.ingredients.map((i) => i.id).sort()).toEqual(['gin', 'lime', 'tonic']);
    const gt = payload.cocktails.find((c) => c.name === 'Gin & Tonic')!;
    expect(gt.id).toBe('gin-tonic');
    expect(gt.ingredients.map((l) => l.ingredientId)).toEqual(['gin', 'tonic', 'lime']);
    expect(gt.ingredients[2].optional).toBe(true);
  });

  it('stamps a version that matches the shared buildCatalog + bundle hash recipe', async () => {
    const payload = await service.getCatalog();
    expect(payload.version).toBe(expectedVersion());
    expect(payload.version).toMatch(/^[0-9a-f]{12}$/);
  });

  it('is deterministic across calls (same data ⇒ same version)', async () => {
    const a = await service.getCatalog();
    const b = await service.getCatalog();
    expect(a.version).toBe(b.version);
  });
});
