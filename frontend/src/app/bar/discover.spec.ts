import { describe, expect, it } from 'vitest';
import { type Cocktail, DRINK_FAMILIES } from '@cocktailapp/shared';
import catalog from '../../../public/catalog.json';
import {
  dayIndex,
  familyExamples,
  familyOfTheDay,
  ingredientNames,
  pickOfTheDay,
} from './discover';

const COCKTAILS = (catalog as unknown as { cocktails: Cocktail[] }).cocktails;
const byId = (id: string) => COCKTAILS.find((c) => c.id === id)!;
const id = (c: Cocktail) => c.id;

describe('dayIndex', () => {
  it('is the same all day and steps by one at local midnight', () => {
    const morning = dayIndex(new Date(2026, 10, 26, 0, 5));
    expect(dayIndex(new Date(2026, 10, 26, 23, 55))).toBe(morning);
    expect(dayIndex(new Date(2026, 10, 27, 0, 5))).toBe(morning + 1);
  });
});

describe('pickOfTheDay', () => {
  it('returns null for an empty pool', () => {
    expect(pickOfTheDay([], id, 100)).toBeNull();
  });

  it('does not depend on the order the pool arrives in', () => {
    const pool = COCKTAILS.slice(0, 20);
    const reversed = [...pool].reverse();
    for (const day of [1, 2, 3, 500, 20_000]) {
      expect(pickOfTheDay(reversed, id, day)).toBe(pickOfTheDay(pool, id, day));
    }
  });

  it('"something else" walks the whole pool before repeating', () => {
    const pool = COCKTAILS.slice(0, 7);
    const seen = new Set(pool.map((_, i) => pickOfTheDay(pool, id, 42, i)!.id));
    expect(seen.size).toBe(pool.length);
  });

  it('does not walk the alphabet one name per day', () => {
    const pool = COCKTAILS;
    const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    const idx = (day: number) => sorted.indexOf(pickOfTheDay(pool, id, day)!);
    const steps = [1, 2, 3, 4, 5].map((d) => Math.abs(idx(d + 1) - idx(d)));
    expect(steps.some((s) => s > 1)).toBe(true);
  });
});

describe('familyOfTheDay', () => {
  it('visits every family once in as many days as there are families', () => {
    const n = DRINK_FAMILIES.length;
    const seen = new Set(Array.from({ length: n }, (_, d) => familyOfTheDay(20_000 + d)));
    expect(seen.size).toBe(n);
  });
});

describe('ingredientNames', () => {
  it('lists what makes the drink and leaves the garnish out', () => {
    const negroni = byId('negroni');
    const names = ingredientNames(negroni);
    expect(names).toHaveLength(3);
    const garnishes = negroni.ingredients.filter((l) => l.role === 'garnish').map((l) => l.name);
    for (const g of garnishes) expect(names).not.toContain(g);
  });
});

describe('familyExamples', () => {
  it('puts drinks from the bar first, then fills from the menu', () => {
    const daiquiri = byId('daiquiri');
    const family = daiquiri.family!;
    const examples = familyExamples(family, [daiquiri], COCKTAILS, 3);
    expect(examples[0].id).toBe('daiquiri');
    expect(examples).toHaveLength(3);
    expect(new Set(examples.map(id)).size).toBe(3);
    expect(examples.every((c) => c.family === family)).toBe(true);
  });
});
