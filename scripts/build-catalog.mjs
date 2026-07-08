/**
 * build-catalog.mjs — generate the static catalog the frontend ships.
 *
 * Reads the curated source of truth (iba-cocktails-seed.json) and emits
 * frontend/public/catalog.json, the single file the production (static-first) app
 * fetches at runtime. Every ingredient gets a deterministic slug id derived from its
 * name; cocktail ingredient lines are rewired to reference those ids. No database is
 * involved, so this runs anywhere (local, CI, Netlify) with zero credentials.
 *
 * Output is deterministic (sorted, no timestamps) so a regenerated catalog only shows a
 * git diff when the underlying data actually changed.
 *
 * Usage: node scripts/build-catalog.mjs   (or: npm run build:catalog)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SRC = join(root, 'iba-cocktails-seed.json');
const OUT = join(root, 'frontend', 'public', 'catalog.json');

/** Turn a display name into a stable, url-safe slug (accent-folded). */
function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (Bénédictine -> Benedictine)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // collapse runs
}

/** Assign a unique slug id, disambiguating rare collisions with a numeric suffix. */
function makeUniqueId(name, used) {
  const base = slugify(name) || 'item';
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const srcIngredients = raw.ingredients ?? [];
const srcCocktails = raw.cocktails ?? [];

// --- Ingredients: assign ids, build a name -> {id,name} lookup (case-insensitive). ---
const usedIds = new Set();
const byName = new Map();
const ingredients = srcIngredients
  .map((ing) => {
    const name = ing.name.trim();
    const id = makeUniqueId(name, usedIds);
    const entry = {
      id,
      name,
      ...(ing.category ? { category: ing.category } : {}),
      isStaple: ing.isStaple ?? false,
    };
    byName.set(name.toLowerCase(), entry);
    return entry;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// --- Cocktails: assign ids, resolve ingredient lines to ingredient ids. ---
const usedCocktailIds = new Set();
const cocktails = srcCocktails
  .map((c) => {
    const lines = (c.ingredients ?? []).map((line) => {
      const found = byName.get(line.name.trim().toLowerCase());
      if (!found) {
        throw new Error(
          `Cocktail "${c.name}" references unknown ingredient "${line.name}". ` +
            `Add it to the ingredients list in iba-cocktails-seed.json.`,
        );
      }
      return {
        ingredientId: found.id,
        name: found.name,
        amount: line.amount,
        unit: line.unit,
        ...(line.note ? { note: line.note } : {}),
        ...(line.optional ? { optional: true } : {}),
      };
    });

    return {
      id: makeUniqueId(c.name, usedCocktailIds),
      name: c.name,
      ...(c.category ? { category: c.category } : {}),
      description: c.description ?? '',
      instructions: c.instructions ?? [],
      ingredients: lines,
      ...(c.glass ? { glass: c.glass } : {}),
      ...(c.method ? { method: c.method } : {}),
      ...(c.difficulty ? { difficulty: c.difficulty } : {}),
      ...(c.garnish ? { garnish: c.garnish } : {}),
      ...(c.notes ? { notes: c.notes } : {}),
      servings: c.servings ?? 1,
      ...(c.tags?.length ? { tags: c.tags } : {}),
      ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const catalog = {
  generatedFrom: 'iba-cocktails-seed.json',
  counts: { ingredients: ingredients.length, cocktails: cocktails.length },
  ingredients,
  cocktails,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

const staples = ingredients.filter((i) => i.isStaple).length;
console.log('Catalog written to frontend/public/catalog.json');
console.log(`  ingredients: ${ingredients.length} (${staples} staples)`);
console.log(`  cocktails:   ${cocktails.length}`);
