import { describe, expect, it } from 'vitest';
import {
  applyCatalogTranslations,
  buildCatalog,
  type Catalog,
  type CatalogTranslations,
} from './catalog';
import { computeMakeable } from './makeable';

function makeCatalog(): Catalog {
  const content = buildCatalog(
    [
      { id: 'gin', name: 'Gin', category: 'spirit' },
      { id: 'lime-juice', name: 'Fresh Lime Juice', category: 'juice' },
      { id: 'bourbon', name: 'Bourbon', category: 'spirit' },
      { id: 'rye-whiskey', name: 'Rye Whiskey', category: 'spirit' },
    ],
    [
      {
        id: 'gimlet',
        name: 'Gimlet',
        ingredients: [
          { name: 'Gin', amount: 60, unit: 'ml' },
          { name: 'Fresh Lime Juice', amount: 20, unit: 'ml' },
        ],
      },
      {
        name: 'Old Fashioned',
        ingredients: [
          {
            name: 'Bourbon',
            call: 'Bourbon or Rye Whiskey',
            amount: 45,
            unit: 'ml',
            alternatives: ['Rye Whiskey'],
          },
        ],
      },
    ],
  );
  return { version: 'v1', schemaVersion: 1, generatedFrom: 'test', locale: 'en', ...content };
}

describe('buildCatalog', () => {
  it('honours authored ingredient + cocktail ids and resolves alternatives to ids', () => {
    const cat = makeCatalog();
    expect(cat.ingredients.map((i) => i.id).sort()).toEqual([
      'bourbon',
      'gin',
      'lime-juice',
      'rye-whiskey',
    ]);
    expect(cat.cocktails.find((c) => c.name === 'Gimlet')!.id).toBe('gimlet');
    const of = cat.cocktails.find((c) => c.name === 'Old Fashioned')!;
    expect(of.ingredients[0].alternativeIds).toEqual(['rye-whiskey']);
    expect(of.ingredients[0].call).toBe('Bourbon or Rye Whiskey');
  });

  it('throws on an unknown line ingredient', () => {
    expect(() =>
      buildCatalog(
        [{ id: 'gin', name: 'Gin' }],
        [{ name: 'X', ingredients: [{ name: 'Vodka', amount: 1, unit: 'ml' }] }],
      ),
    ).toThrow(/unknown ingredient/i);
  });
});

describe('applyCatalogTranslations', () => {
  const translations: CatalogTranslations = {
    version: 'v1',
    ingredients: { gin: { name: 'Gin' }, 'lime-juice': { name: 'Vers limoensap' } },
    cocktails: { gimlet: { name: 'Gimlet', description: 'Fris en scherp' } },
  };

  it('overlays ingredient names, cocktail fields, and denormalized line names', () => {
    const out = applyCatalogTranslations(makeCatalog(), translations);
    expect(out.locale).toBe('nl');
    expect(out.ingredients.find((i) => i.id === 'lime-juice')!.name).toBe('Vers limoensap');
    const gimlet = out.cocktails.find((c) => c.id === 'gimlet')!;
    expect(gimlet.description).toBe('Fris en scherp');
    // The line's denormalized name follows the ingredient overlay so missing[] reads in Dutch…
    expect(gimlet.ingredients.find((l) => l.ingredientId === 'lime-juice')!.name).toBe('Vers limoensap');
  });

  it('propagates translated names into computeMakeable missing[]', () => {
    const out = applyCatalogTranslations(makeCatalog(), translations);
    const [gimlet] = computeMakeable(out.cocktails, ['gin'], 1);
    expect(gimlet.missing).toEqual([{ ingredientId: 'lime-juice', name: 'Vers limoensap' }]);
  });

  it('ignores a version-mismatched overlay (English fallback)', () => {
    const stale = { ...translations, version: 'nope' };
    const out = applyCatalogTranslations(makeCatalog(), stale);
    expect(out.locale).toBe('en');
    expect(out.ingredients.find((i) => i.id === 'lime-juice')!.name).toBe('Fresh Lime Juice');
  });

  it('is a no-op when no overlay is given', () => {
    const cat = makeCatalog();
    expect(applyCatalogTranslations(cat, null)).toBe(cat);
  });
});
