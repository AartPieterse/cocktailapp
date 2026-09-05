import { describe, expect, it } from 'vitest';
import type { Cocktail, Ingredient, IngredientCategory } from '@cocktailapp/shared';
import { CATEGORY_HINTS, CATEGORY_LABELS_PLURAL } from '@cocktailapp/shared';
import catalog from '../../../../public/catalog.json';
import {
  buildWizardSteps,
  recipeUseCount,
  reachableIngredientIds,
  searchChips,
  visibleChips,
  type BuildStepsInput,
} from './wizard-steps';

const CATALOG = catalog as unknown as { cocktails: Cocktail[]; ingredients: Ingredient[] };

function build(selection: string[] = [], over: Partial<BuildStepsInput> = {}) {
  return buildWizardSteps({
    ingredients: CATALOG.ingredients,
    cocktails: CATALOG.cocktails,
    selection: new Set(selection),
    labels: CATEGORY_LABELS_PLURAL.nl,
    hints: CATEGORY_HINTS.nl,
    staplesTitle: 'staples',
    staplesHint: '',
    spiritsTitle: 'spirits',
    spiritsHint: '',
    ...over,
  });
}

/**
 * The wizard's whole claim is that it only asks questions whose answer can change what you can
 * make, and that answering the spirits question shortens everything after it. Both are properties
 * of the catalog as much as of the code, so they are asserted against the real catalog: a seed
 * change that breaks them should break a test, not a user's first five minutes.
 */
describe('wizard steps', () => {
  it('never asks about an ingredient that cannot change an answer', () => {
    const uses = recipeUseCount(CATALOG.cocktails);
    const asked = build().flatMap((s) => s.allChips.map((c) => c.ingredient.id));
    const pointless = asked.filter((id) => !uses.get(id));
    expect(pointless, 'chips that appear only on optional/garnish/seasoning lines').toEqual([]);
  });

  it('drops the steps that consist entirely of such ingredients', () => {
    // Kruiderij is the case that exists today: every seasoning appears only on seasoning lines,
    // which `missingLines` ignores, so the step was seven taps that changed nothing.
    expect(build().map((s) => s.key)).not.toContain('seasoning');
  });

  it('asks about the spirits first, then the staples', () => {
    expect(
      build()
        .slice(0, 2)
        .map((s) => s.key),
    ).toEqual(['spirit', 'staples']);
  });

  it('the spirits step itself is never filtered by the spirits chosen', () => {
    const none = build().find((s) => s.key === 'spirit');
    const gin = build(['gin']).find((s) => s.key === 'spirit');
    expect(none?.chips.length).toBe(gin?.chips.length);
    expect(none?.chips.length).toBe(none?.allChips.length);
  });

  it('a chosen spirit shortens every later step', () => {
    const count = (selection: string[]) =>
      build(selection)
        .filter((s) => s.key !== 'spirit')
        .reduce((n, s) => n + s.chips.length, 0);
    const everything = build()
      .filter((s) => s.key !== 'spirit')
      .reduce((n, s) => n + s.allChips.length, 0);

    expect(count(['gin'])).toBeLessThan(count(['gin', 'vodka', 'white-rum']));
    expect(count(['gin', 'vodka', 'white-rum'])).toBeLessThan(everything);
  });

  it('keeps a ticked ingredient visible even when the spirits rule would drop it', () => {
    // Drambuie belongs to the Rusty Nail (Scotch), so choosing gin alone makes it irrelevant.
    const gin = build(['gin']);
    const liqueurs = () => gin.find((s) => s.key === 'liqueur');
    expect(liqueurs()?.chips.some((c) => c.ingredient.id === 'drambuie')).toBe(false);

    const owned = build(['gin', 'drambuie']).find((s) => s.key === 'liqueur');
    expect(owned?.chips.some((c) => c.ingredient.id === 'drambuie')).toBe(true);
  });

  it('choosing no spirit at all leaves the drinks that need none', () => {
    const spirits = new Set(
      CATALOG.ingredients.filter((i) => i.category === 'spirit').map((i) => i.id),
    );
    const reachable = reachableIngredientIds(CATALOG.cocktails, spirits, new Set());
    expect(reachable.size).toBeGreaterThan(0);
    expect([...reachable].some((id) => spirits.has(id))).toBe(false);
  });

  it('orders chips by how many recipes call for them', () => {
    const liqueurs = build().find((s) => s.key === 'liqueur');
    const uses = liqueurs!.allChips.map((c) => c.uses);
    expect(uses).toEqual([...uses].sort((a, b) => b - a));
    expect(liqueurs!.allChips[0].ingredient.id).toBe('triple-sec');
  });

  it('caps a long step but never hides something already ticked', () => {
    const steps = build(['yellow-chartreuse']);
    const liqueurs = steps.find((s) => s.key === 'liqueur')!;
    const visible = visibleChips(liqueurs, new Set(['yellow-chartreuse']), false, 6);

    expect(visible.length).toBeLessThan(liqueurs.allChips.length);
    expect(visible.some((c) => c.ingredient.id === 'yellow-chartreuse')).toBe(true);
    expect(visibleChips(liqueurs, new Set(), true, 6)).toEqual(liqueurs.allChips);
  });

  it('search reaches across categories and through aliases and accents', () => {
    const steps = build();
    expect(searchChips(steps, 'aperol')[0].ingredient.id).toBe('aperol');
    expect(searchChips(steps, 'creme de cacao')[0].ingredient.id).toBe('creme-de-cacao');
    // An alias, not a name: "Cointreau" is one of the ways a recipe calls for triple sec.
    expect(searchChips(steps, 'cointreau')[0].ingredient.id).toBe('triple-sec');
    expect(searchChips(steps, 'zzzz')).toEqual([]);
  });

  it('is empty until the catalog arrives', () => {
    expect(build([], { ingredients: [] })).toEqual([]);
  });
});
