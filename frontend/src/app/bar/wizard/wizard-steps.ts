import {
  CATEGORY_ORDER,
  type Cocktail,
  type CocktailIngredient,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';

/** One ingredient as the wizard offers it, with the evidence for its position. */
export interface WizardChip {
  ingredient: Ingredient;
  /** Required recipe lines that call for it — the "popular first" ordering. */
  uses: number;
}

export interface WizardStep {
  /** `spirit` | `staples` | an ingredient category. */
  key: string;
  title: string;
  hint: string;
  /** What this step asks about right now: relevant to the chosen spirits, or already ticked. */
  chips: WizardChip[];
  /** Everything this step could ask about, for "toon alles". */
  allChips: WizardChip[];
}

export interface BuildStepsInput {
  ingredients: Ingredient[];
  cocktails: Cocktail[];
  selection: ReadonlySet<string>;
  labels: Record<IngredientCategory, string>;
  hints: Record<IngredientCategory, string>;
  staplesTitle: string;
  staplesHint: string;
  spiritsTitle: string;
  spiritsHint: string;
}

/** The lines that decide whether a cocktail is makeable — the same rule as `missingLines`. */
function requiredLines(cocktail: Cocktail): CocktailIngredient[] {
  return cocktail.ingredients.filter(
    (l) => !l.optional && l.role !== 'garnish' && l.role !== 'seasoning',
  );
}

/**
 * How many required recipe lines each ingredient answers. A line's `alternativeIds` (the recipe
 * "X or Y") count for every id it names, because stocking any of them satisfies the line.
 *
 * An ingredient with a count of zero can never change an answer: it appears only on lines that are
 * optional, a garnish or a seasoning, and those never block a drink. The wizard does not ask about
 * those at all — Mijn bar stays the complete editor. Today that silently removes a whole step
 * (kruiderij: all seven chips score zero) and five of the eleven pre-ticked staples.
 */
export function recipeUseCount(cocktails: Cocktail[]): Map<string, number> {
  const uses = new Map<string, number>();
  const bump = (id: string) => uses.set(id, (uses.get(id) ?? 0) + 1);
  for (const cocktail of cocktails) {
    for (const line of requiredLines(cocktail)) {
      bump(line.ingredientId);
      for (const alt of line.alternativeIds ?? []) bump(alt);
    }
  }
  return uses;
}

/**
 * The ingredients worth asking about once the spirits are known: those on a required line of a
 * cocktail whose *own* spirit calls the user can already meet.
 *
 * Asking "which spirits?" first is what makes the rest of the wizard short. Measured against the
 * current catalog: gin alone leaves 29 of 115 ingredients relevant, gin + vodka + white rum leaves
 * 50, six base spirits leave 66. Choosing no spirit is a real answer too — it leaves the drinks
 * that call for none, which is how the alcohol-free path falls out without a separate question.
 */
export function reachableIngredientIds(
  cocktails: Cocktail[],
  spiritIds: ReadonlySet<string>,
  chosenSpirits: ReadonlySet<string>,
): Set<string> {
  const reachable = new Set<string>();
  for (const cocktail of cocktails) {
    const lines = requiredLines(cocktail);
    if (!lines.length) continue;
    const spiritCalls = lines.filter((l) => spiritsOnLine(l, spiritIds).length > 0);
    const satisfiable = spiritCalls.every((l) =>
      spiritsOnLine(l, spiritIds).some((id) => chosenSpirits.has(id)),
    );
    if (!satisfiable) continue;
    for (const line of lines) reachable.add(line.ingredientId);
  }
  return reachable;
}

/** The spirit ids a line can be answered with (its own, plus any "or Y" alternative). */
function spiritsOnLine(line: CocktailIngredient, spiritIds: ReadonlySet<string>): string[] {
  return [line.ingredientId, ...(line.alternativeIds ?? [])].filter((id) => spiritIds.has(id));
}

/**
 * The wizard's steps: spirits first (the question everyone can answer instantly, and the one that
 * decides which of the remaining questions are worth asking), then the pantry staples, then the
 * rest of the bar in the app's usual reading order.
 *
 * Note the deliberate deviation from `CATEGORY_ORDER`, which the cabinet editor still follows to
 * the letter: there, kitchen-before-bottles is right because the screen is a checklist. Here the
 * order has to earn a payoff — with spirits at step nine, the "you can make N" line under the
 * buttons reads zero for two thirds of the wizard.
 */
export function buildWizardSteps(input: BuildStepsInput): WizardStep[] {
  const { ingredients, cocktails, selection } = input;
  if (!ingredients.length) return [];

  const uses = recipeUseCount(cocktails);
  const chipOf = (ingredient: Ingredient): WizardChip => ({
    ingredient,
    uses: uses.get(ingredient.id) ?? 0,
  });
  const byUse = (a: WizardChip, b: WizardChip) =>
    b.uses - a.uses || a.ingredient.name.localeCompare(b.ingredient.name);

  // Only ingredients that can change an answer are ever offered.
  const asked = ingredients.filter((i) => (uses.get(i.id) ?? 0) > 0);
  const spiritIds = new Set(ingredients.filter((i) => i.category === 'spirit').map((i) => i.id));
  const chosenSpirits = new Set([...selection].filter((id) => spiritIds.has(id)));
  const reachable = reachableIngredientIds(cocktails, spiritIds, chosenSpirits);

  const step = (
    key: string,
    title: string,
    hint: string,
    items: Ingredient[],
    filter: boolean,
  ): WizardStep | null => {
    const allChips = items.map(chipOf).sort(byUse);
    if (!allChips.length) return null;
    // A chip already ticked stays visible even when the spirits rule would drop it — a returning
    // user must be able to untick what they own.
    const chips = filter
      ? allChips.filter((c) => reachable.has(c.ingredient.id) || selection.has(c.ingredient.id))
      : allChips;
    return { key, title, hint, chips, allChips };
  };

  const steps: (WizardStep | null)[] = [
    step(
      'spirit',
      input.spiritsTitle,
      input.spiritsHint,
      asked.filter((i) => i.category === 'spirit'),
      false,
    ),
    step(
      'staples',
      input.staplesTitle,
      input.staplesHint,
      asked.filter((i) => i.isStaple),
      true,
    ),
    ...CATEGORY_ORDER.filter((cat) => cat !== 'spirit').map((cat) =>
      step(
        cat,
        input.labels[cat],
        input.hints[cat],
        asked.filter((i) => (i.category ?? 'other') === cat && !i.isStaple),
        true,
      ),
    ),
  ];

  // A step with nothing left to ask is not a step. Steps whose every chip was filtered away stay,
  // so the user still sees where they are and can reach "toon alles".
  return steps.filter((s): s is WizardStep => s !== null);
}

/**
 * What to render for a step: the most-used chips first, capped, plus anything already ticked so a
 * returning user's own bottles are never hidden behind a disclosure. `expanded` lifts both the cap
 * and the relevance filter — one control, one meaning.
 */
export function visibleChips(
  step: WizardStep,
  selection: ReadonlySet<string>,
  expanded: boolean,
  limit = 8,
): WizardChip[] {
  if (expanded) return step.allChips;
  const shown = step.chips.slice(0, limit);
  const ids = new Set(shown.map((c) => c.ingredient.id));
  const ticked = step.chips.filter(
    (c) => selection.has(c.ingredient.id) && !ids.has(c.ingredient.id),
  );
  return [...shown, ...ticked];
}

/** Lowercase + strip diacritics, so "creme" matches "Crème" and "cachaca" matches "Cachaça". */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Search every ingredient the wizard asks about, across categories — the answer to "where do I
 * find Aperol?", which a category-at-a-time wizard otherwise cannot answer.
 */
export function searchChips(steps: WizardStep[], query: string, limit = 30): WizardChip[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  const seen = new Set<string>();
  const hits: WizardChip[] = [];
  for (const step of steps) {
    for (const chip of step.allChips) {
      if (seen.has(chip.ingredient.id)) continue;
      const haystack = [chip.ingredient.name, ...(chip.ingredient.aliases ?? [])];
      if (haystack.some((h) => normalize(h).includes(needle))) {
        seen.add(chip.ingredient.id);
        hits.push(chip);
      }
    }
  }
  return hits
    .sort((a, b) => b.uses - a.uses || a.ingredient.name.localeCompare(b.ingredient.name))
    .slice(0, limit);
}
