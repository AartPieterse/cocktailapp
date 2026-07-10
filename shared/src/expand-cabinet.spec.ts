import { describe, expect, it } from 'vitest';
import type { Ingredient } from './ingredient';
import { expandCabinet } from './makeable';

/**
 * `expandCabinet` is the opt-in substitution pass that runs *before* `computeMakeable`. It never
 * mutates its inputs and, with substitutes off, is a plain de-dupe so callers can wire it always.
 */

function ing(id: string, extra: Partial<Ingredient> = {}): Ingredient {
  return { id, name: id, ...extra };
}

// A tiny gin/rum catalog: Old Tom & London Dry are children of the generic `gin`.
const catalog: Ingredient[] = [
  ing('gin'),
  ing('old-tom-gin', { parentId: 'gin' }),
  ing('london-dry-gin', { parentId: 'gin' }),
  ing('white-rum'),
  ing('dark-rum', { substitutes: ['white-rum'] }),
];

describe('expandCabinet', () => {
  it('is a no-op de-dupe when substitutes are off (default)', () => {
    const out = expandCabinet(['gin', 'gin', 'white-rum'], catalog);
    expect(out.sort()).toEqual(['gin', 'white-rum']);
  });

  it('adds a parent when a child is stocked', () => {
    const out = expandCabinet(['old-tom-gin'], catalog, { substitutes: true });
    expect(out).toContain('gin'); // stocking Old Tom satisfies a generic "Gin" call
    expect(out).toContain('old-tom-gin');
  });

  it('adds every child when the generic parent is stocked', () => {
    const out = expandCabinet(['gin'], catalog, { substitutes: true });
    expect(out).toEqual(expect.arrayContaining(['gin', 'old-tom-gin', 'london-dry-gin']));
  });

  it('applies explicit substitutes', () => {
    const out = expandCabinet(['dark-rum'], catalog, { substitutes: true });
    expect(out).toContain('white-rum');
  });

  it('passes unknown ids through untouched', () => {
    const out = expandCabinet(['mystery-amaro'], catalog, { substitutes: true });
    expect(out).toEqual(['mystery-amaro']);
  });

  it('does not mutate its inputs', () => {
    const cabinet = ['old-tom-gin'];
    const snapshot = JSON.stringify({ cabinet, catalog });
    expandCabinet(cabinet, catalog, { substitutes: true });
    expect(JSON.stringify({ cabinet, catalog })).toBe(snapshot);
  });
});
