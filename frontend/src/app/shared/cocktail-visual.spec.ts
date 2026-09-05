import { describe, expect, it } from 'vitest';
import type { Cocktail } from '@cocktailapp/shared';
import catalog from '../../../public/catalog.json';
import { COCKTAIL_ART } from './cocktail-art.data';
import { derivedSpec, glassSpecFor, liquidFor, tintFor } from './cocktail-visual';
import { barkastGlassSVG } from './glass-art/glass-svg';

const COCKTAILS = (catalog as { cocktails: Cocktail[] }).cocktails;
const IDS = new Set(COCKTAILS.map((c) => c.id));

/**
 * These are the guarantees the artwork rests on, and none of them is obvious from
 * reading the code: the authored art table cannot drift away from the catalog, no
 * two drinks may render as the same picture, and a drink must look identical every
 * time it is drawn. Each one has been broken before.
 */
describe('cocktail art', () => {
  it('the catalog is non-trivial', () => {
    // Never assert a count — the seed is the authority and it grows.
    expect(COCKTAILS.length).toBeGreaterThan(50);
  });

  it('every authored art entry names a cocktail that exists', () => {
    const orphans = Object.keys(COCKTAIL_ART).filter((id) => !IDS.has(id));
    expect(orphans, 'art entries for drinks no longer in the catalog').toEqual([]);
  });

  it('every cocktail has authored art', () => {
    // Not strictly required — the derivation is a real fallback — but a drink
    // added to the seed without an entry silently gets the generic treatment,
    // and this is the only place that would ever say so.
    const missing = COCKTAILS.filter((c) => !COCKTAIL_ART[c.id]).map((c) => c.id);
    expect(missing, 'cocktails with no entry in cocktail-art.data.ts').toEqual([]);
  });

  it('no two cocktails render as the same picture', () => {
    const byDrawing = new Map<string, string[]>();
    for (const c of COCKTAILS) {
      // Strip the per-drink seed, so a collision means the drinks genuinely
      // describe the same drawing rather than merely differing in jitter.
      const svg = barkastGlassSVG({ ...glassSpecFor(c), seed: 'x' });
      const list = byDrawing.get(svg) ?? [];
      list.push(c.name);
      byDrawing.set(svg, list);
    }
    const collisions = [...byDrawing.values()].filter((v) => v.length > 1);
    expect(collisions, 'drinks that render identically').toEqual([]);
  });

  it('the same drink always renders byte-identically', () => {
    for (const c of COCKTAILS.slice(0, 12)) {
      expect(barkastGlassSVG(glassSpecFor(c))).toBe(barkastGlassSVG(glassSpecFor(c)));
    }
  });

  it('renders every glass, garnish and ice style in the catalog without throwing', () => {
    for (const c of COCKTAILS) {
      for (const detail of ['card', 'hero'] as const) {
        for (const motion of ['none', 'ambient', 'pour'] as const) {
          const svg = barkastGlassSVG(glassSpecFor(c, detail, motion));
          expect(svg.startsWith('<svg'), c.id).toBe(true);
          expect(svg.endsWith('</svg>'), c.id).toBe(true);
          expect(svg, c.id).not.toContain('NaN');
          expect(svg, c.id).not.toContain('undefined');
        }
      }
    }
  });

  it('hot drinks steam and never get ice; drinks served up never get ice', () => {
    for (const c of COCKTAILS) {
      const s = glassSpecFor(c);
      if (c.family === 'hot') {
        expect(s.steam, `${c.id} is hot and should steam`).toBe(true);
        expect(s.ice, `${c.id} is hot and must not be iced`).toBe('none');
      }
      if (s.steam) expect(s.ice, `${c.id} steams, so it cannot be iced`).toBe('none');
      if (c.glass === 'coupe' || c.glass === 'martini' || c.glass === 'flute')
        expect(s.ice, `${c.id} is served up`).not.toBe('cubes');
    }
  });

  it('an authored catalog colour is never overridden by a guess', () => {
    for (const c of COCKTAILS) {
      if (c.color) expect(liquidFor(c), c.id).toBe(c.color);
    }
  });

  it('every drink gets a colour, a plausible fill, and a garnish unless authored bare', () => {
    for (const c of COCKTAILS) {
      const s = glassSpecFor(c);
      // A handful of drinks genuinely go out naked (a Bellini, a Black Russian).
      // Everything else must carry something: a bare glass should be a statement,
      // not the derivation quietly failing to parse the garnish line.
      if (COCKTAIL_ART[c.id]?.garnishes?.length !== 0)
        expect(s.garnishes?.length, `${c.id} renders bare`).toBeGreaterThan(0);
      expect(s.liquid, c.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(tintFor(c), c.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(s.fill, c.id).toBeGreaterThan(0.15);
      expect(s.fill, c.id).toBeLessThanOrEqual(0.95);
    }
  });

  it('the drawing stays inside its node budget on a card', () => {
    // 126 of these render on one unpaginated grid with no virtual scrolling, so
    // the per-card cost is the whole grid's cost. Measured at ~46; the ceiling is
    // there to make a regression loud rather than to be hit.
    for (const c of COCKTAILS) {
      const nodes = (barkastGlassSVG(glassSpecFor(c, 'card')).match(/<[a-z]/g) ?? []).length;
      expect(nodes, `${c.id} emits too many nodes for a card`).toBeLessThan(90);
    }
  });

  it('cards animate only where the drink actually fizzes or steams', () => {
    const moving = COCKTAILS.filter((c) => {
      const svg = barkastGlassSVG(glassSpecFor(c, 'card', 'ambient'));
      return svg.includes('bk-bub') || svg.includes('bk-steam');
    });
    // A minority of the grid moves; the rest emits no animated node at all.
    expect(moving.length).toBeGreaterThan(0);
    expect(moving.length).toBeLessThan(COCKTAILS.length / 2);
    for (const c of moving) {
      const s = glassSpecFor(c);
      expect(s.fizz !== 'none' || s.steam === true, `${c.id} moves but is still`).toBe(true);
    }
  });

  it('every animation is switched off under prefers-reduced-motion', () => {
    for (const c of COCKTAILS) {
      const svg = barkastGlassSVG(glassSpecFor(c, 'hero', 'pour'));
      if (svg.includes('<style>')) expect(svg, c.id).toContain('prefers-reduced-motion');
    }
  });

  it('the output is self-contained: no scripts, no external references', () => {
    for (const c of COCKTAILS) {
      const svg = barkastGlassSVG(glassSpecFor(c, 'hero', 'pour'));
      expect(svg, c.id).not.toContain('<script');
      expect(svg, c.id).not.toContain('xlink:href');
      // The SVG namespace is the only URL allowed to appear.
      expect(svg.replace('http://www.w3.org/2000/svg', ''), c.id).not.toContain('http');
    }
  });
});

/**
 * Every shipped drink carries an authored art entry that overrides the whole
 * derived spec, so nothing above this line ever exercises the derivation — the
 * suite passed intact with `derivedSpec` replaced by a constant stub. These tests
 * call it directly, on drinks that are deliberately NOT in the catalog, because
 * the derivation is what a newly seeded cocktail will actually get.
 */
describe('the derivation, on drinks with no authored art', () => {
  const drink = (over: Partial<Cocktail>): Cocktail =>
    ({
      id: 'test-' + (over.name ?? 'x'),
      name: 'Test',
      category: 'New Era Drinks',
      baseSpirit: 'gin',
      description: '',
      instructions: [],
      ingredients: [],
      glass: 'coupe',
      method: 'shaken',
      difficulty: 'easy',
      servings: 1,
      tags: [],
      ...over,
    }) as Cocktail;
  const line = (ingredientId: string, amount?: number, unit = 'ml'): Cocktail['ingredients'][number] =>
    ({ ingredientId, name: ingredientId, amount, unit }) as Cocktail['ingredients'][number];

  it('reads the recipe volume, in whatever unit it is written', () => {
    const fill = (c: Cocktail): number => derivedSpec(c).fill ?? 0;
    // 60 ml and 2 oz are the same pour, so they must fill the glass the same.
    expect(fill(drink({ glass: 'rocks', ingredients: [line('gin', 2, 'oz')] }))).toBeCloseTo(
      fill(drink({ glass: 'rocks', ingredients: [line('gin', 60)] })),
      1,
    );
    expect(fill(drink({ glass: 'rocks', ingredients: [line('gin', 200)] }))).toBeGreaterThan(
      fill(drink({ glass: 'rocks', ingredients: [line('gin', 60)] })),
    );
  });

  it('never ices a hot drink or one served up, and steams the hot one', () => {
    const hot = derivedSpec(drink({ family: 'hot', glass: 'mug', ingredients: [line('coffee', 120)] }));
    expect(hot.ice).toBe('none');
    expect(hot.steam).toBe(true);
    expect(derivedSpec(drink({ glass: 'coupe', method: 'build' })).ice).toBe('none');
    expect(derivedSpec(drink({ glass: 'wine', method: 'build' })).ice).toBe('none');
  });

  it('gives a big rock to a recipe that asks for one, whatever its method', () => {
    const shaken = drink({
      glass: 'rocks',
      method: 'shaken',
      instructions: ['Shake with ice.', 'Strain over a large ice cube.'],
    });
    expect(derivedSpec(shaken).ice).toBe('big-rock');
  });

  it('treats an absinthe rinse as a rinse and a pour as a pour', () => {
    const rinse = drink({ ingredients: [line('rye-whiskey', 60), line('absinthe', 1, 'dash')] });
    expect(liquidFor(rinse)).not.toBe('#9CBE55');
    const pour = drink({ ingredients: [line('rye-whiskey', 60), line('absinthe', 30)] });
    expect(liquidFor(pour)).toBe('#9CBE55');
  });

  it('reads the garnish line without matching inside longer words', () => {
    const g = (garnish: string): string[] => derivedSpec(drink({ garnish })).garnishes!.map((x) => x.type);
    expect(g('Garnish with a grapefruit twist')).toEqual(['grapefruit-twist']);
    expect(g('Grate nutmeg over the surface')).toContain('nutmeg-dust');
    expect(g('Garnish with an orange twist and a lemon wheel')).toEqual(['orange-twist', 'lemon-wheel']);
    expect(g('Garnish with three cherries')).toEqual(['cherry']);
    expect(derivedSpec(drink({ garnish: 'Garnish with three cherries' })).garnishes![0].placement).toBe('skewer');
  });

  it('only suspends what was actually muddled, and nothing after a double strain', () => {
    const mint = drink({ method: 'muddled', ingredients: [line('mint'), line('white-rum', 45)] });
    expect(derivedSpec(mint).inclusion).toBe('mint-leaves');
    const sugarOnly = drink({ method: 'muddled', ingredients: [line('sugar-cube'), line('bourbon', 45)] });
    expect(derivedSpec(sugarOnly).inclusion).toBe('none');
    const strained = drink({
      method: 'muddled',
      instructions: ['Double-strain into a chilled coupe.'],
      ingredients: [line('mint'), line('gin', 45)],
    });
    expect(derivedSpec(strained).inclusion).toBe('none');
  });

  it('finds a rim crust however the recipe phrases it', () => {
    expect(derivedSpec(drink({ instructions: ['Salt the rim of a rocks glass.'] })).rim).toBe('salt');
    expect(
      derivedSpec(
        drink({
          garnish: 'Rub a slice of orange around the rim of the glass and dip it in pulverized white sugar.',
        }),
      ).rim,
    ).toBe('sugar');
    expect(derivedSpec(drink({ garnish: 'Garnish with a lemon twist' })).rim).toBe('none');
  });

  it('produces a drawable spec for a drink it knows nothing about', () => {
    const svg = barkastGlassSVG({ ...derivedSpec(drink({})), seed: 'unknown' });
    expect(svg).not.toContain('NaN');
    expect(svg).toContain('<svg');
  });
});
