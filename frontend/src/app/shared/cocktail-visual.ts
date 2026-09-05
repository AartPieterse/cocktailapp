import type { Cocktail } from '@cocktailapp/shared';
import { COCKTAIL_ART } from './cocktail-art.data';
import type {
  Clarity,
  DetailLevel,
  FizzLevel,
  FoamKind,
  GarnishSpec,
  GarnishType,
  GlassCut,
  GlassName,
  GlassSpec,
  IceStyle,
  Inclusion,
  Motion,
  RimCrust,
} from './glass-art/glass-svg';

/**
 * What a cocktail looks like, in two layers.
 *
 * The bottom layer DERIVES a drawing from what the catalog states — the glass,
 * the ingredient ids, the method and the free-text garnish line. It has to exist
 * and it has to be good, because it is what a newly-seeded drink gets.
 *
 * The top layer is `COCKTAIL_ART`: one authored entry per shipped drink, merged
 * over the derived one. Rules cannot know that the absinthe in a Sazerac is a
 * rinse that gets thrown away, that a Mojito is packed with pebble ice, or that
 * an Irish Coffee's cream must stay a separate band; the table can.
 *
 * Everything here is pure and deterministic — it runs inside Angular `computed()`
 * on every render — so a drink always looks the same.
 */

function parseHex(h: string): [number, number, number] {
  h = h.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const s = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return s.length < 2 ? '0' + s : s;
      })
      .join('')
  );
}
/** Blend two hex colours; t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
}

const CLEAR_SPIRITS = [
  'gin', 'vodka', 'white-rum', 'tequila', 'mezcal', 'pisco', 'cachaca', 'grappa', 'aquavit',
];
const AMBER = [
  'bourbon', 'rye-whiskey', 'scotch', 'irish-whiskey', 'cognac', 'brandy', 'dark-rum', 'aged-rum',
  'amaro', 'amaretto', 'drambuie', 'benedictine', 'calvados', 'apricot-brandy', 'grand-marnier',
];
/** Anything that arrives with a bead on it. `tonic-water` was the one that got away. */
const FIZZY = [
  'cola', 'ginger-ale', 'ginger-beer', 'grapefruit-soda', 'soda-water', 'tonic-water',
  'sparkling-wine', 'lemonade', 'sparkling-water',
];
/** Clear liqueurs that must never drag a drink into the dark-red group. */
const CLEAR_LIQUEURS = ['maraschino', 'triple-sec', 'cointreau', 'kirsch'];

/**
 * Derive the drink's liquid colour from its ingredients, ordered by how strongly
 * each signals. An authored `color` on the catalog entry always wins — the
 * alcohol-free range carries one for every drink and it is a deliberate choice,
 * not a guess.
 */
export function liquidFor(c: Cocktail): string {
  if (c.color) return c.color;

  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  const has = (id: string): boolean => ids.has(id);
  const hasAny = (arr: string[]): boolean => arr.some(has);
  const creamy = hasAny(['cream', 'coconut-cream', 'egg-yolk']);
  const juicy = hasAny(['orange-juice', 'pineapple-juice', 'grapefruit-juice', 'cranberry-juice']);

  if (hasAny(['coffee-liqueur', 'espresso', 'coffee']) && !hasAny(['aperol', 'campari'])) return '#3A2116';
  if (has('cola')) return '#3E2318';
  if (has('fernet-branca')) return '#3A2018';
  // Juice outranks the bitter: a Garibaldi is orange with Campari in it, not a
  // tall Negroni, and a Sunrise is orange juice with grenadine at the bottom.
  if (has('campari')) return juicy ? '#E2571F' : '#C8402A';
  if (has('aperol')) return juicy ? '#EE7A2C' : '#E8712A';
  if (has('tomato-juice')) return '#BC3A24';
  if (has('orange-juice')) return '#EE8A2A';
  if (hasAny(['grenadine', 'raspberry-syrup', 'raspberry-liqueur'])) return '#C0243A';
  if (has('cranberry-juice')) return '#C2456A';
  if (has('creme-de-violette')) return '#7A5A9E';
  if (hasAny(['green-chartreuse', 'creme-de-menthe'])) return '#7FA83A';
  if (
    hasAny(['sweet-vermouth', 'red-wine', 'port', 'cherry-liqueur', 'creme-de-cassis', 'creme-de-mure']) &&
    !creamy
  )
    return '#7A1F2A';
  if (has('pineapple-juice')) return '#E6C24A';
  if (has('creme-de-cacao') && creamy) return '#7A5638';
  if (creamy) return '#EDE3CB';
  // An absinthe or pastis RINSE is discarded before the drink is built, so it
  // colours nothing — only a measured pour of it turns a drink green. This has to
  // be tested BEFORE the amber fallback: every absinthe drink in the catalog also
  // carries a whiskey or a brandy, so behind AMBER the rule can never fire.
  if (c.ingredients.some((i) => isAbsinthe(i.ingredientId) && toMl(i.amount, i.unit) >= 15)) return '#9CBE55';
  if (hasAny(AMBER)) {
    return c.method === 'stirred' || c.method === 'build' ? '#B36A26' : '#C98A4A';
  }
  if (hasAny(CLEAR_LIQUEURS) && hasAny(['lemon-juice', 'lime-juice'])) return '#EFE7C4';
  if (hasAny(['lemon-juice', 'lime-juice', 'grapefruit-juice']) && hasAny(CLEAR_SPIRITS)) return '#ECE7CF';
  if (hasAny(CLEAR_SPIRITS)) return '#EDEAD6';
  return '#D9A441';
}
function isAbsinthe(id: string): boolean {
  return id === 'absinthe' || id === 'pernod';
}

/**
 * A recipe line in millilitres. `MeasureUnit` has far more members than the
 * volumetric ones, and counting only `ml` silently pinned any oz- or part-seeded
 * recipe to the bottom of its fill band with no error anywhere.
 */
function toMl(amount: number | undefined, unit: string): number {
  const a = amount ?? 0;
  switch (unit) {
    case 'ml': return a;
    case 'cl': return a * 10;
    case 'oz': return a * 30;
    case 'part': return a * 25;
    case 'tablespoon': return a * 15;
    case 'teaspoon':
    case 'barspoon': return a * 5;
    case 'cube':
    case 'piece':
    case 'slice':
    case 'wedge':
    case 'sprig':
    case 'leaf': return 3;
    case 'dash':
    case 'drop':
    case 'pinch': return 1;
    case 'topup': return 90;
    default: return 0;
  }
}

/** A soft, pale wash of the liquid colour — the tinted background behind a glass on a card. */
export function tintFor(c: Cocktail): string {
  return mix(liquidFor(c), '#F6EEDD', 0.82);
}

/* ======================================================================
   Deriving the rest of the drawing from the recipe
   ==================================================================== */

/** Glasses a drink is served *up* in — never iced, whatever the method says. */
const UP_GLASSES: readonly GlassName[] = ['coupe', 'martini', 'nick_and_nora', 'flute', 'shot', 'wine'];

/** Bar convention, applied from the family the catalog already records. */
const CUT_BY_FAMILY: Readonly<Record<string, GlassCut>> = {
  sour: 'wide',
  fizz: 'wide',
  tiki: 'wide',
  sparkling: 'deep',
  'spirit-forward': 'deep',
};

/**
 * A mug is not enough on its own — a Mint Julep is served in one and is the
 * coldest drink in the book. The family is what actually says "hot".
 */
function isHot(c: Cocktail): boolean {
  return c.family === 'hot';
}

function iceFor(c: Cocktail, glass: GlassName): IceStyle {
  if (isHot(c)) return 'none';
  if (c.method === 'blended') return 'frozen-slush';
  if (UP_GLASSES.includes(glass)) return 'none';
  const steps = (c.instructions || []).join(' ').toLowerCase();
  if (/crushed ice|swizzle|mound/.test(steps)) return 'crushed';
  // A recipe that says "strain over a large ice cube" means it, whatever its
  // method. Only reading the method got this right for stirred drinks and
  // dropped a scatter of cubes into every shaken-then-rocked one.
  if (/large (ice )?cube|king cube|single (large )?cube|one big/.test(steps)) return 'big-rock';
  if (c.family === 'tiki' || c.method === 'muddled') return 'crushed';
  if (glass === 'rocks' && c.method === 'stirred') return 'big-rock';
  return 'cubes';
}

function fizzFor(c: Cocktail): FizzLevel {
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  if (ids.has('sparkling-wine') || ids.has('champagne')) return 'gentle';
  if (FIZZY.some((f) => ids.has(f))) return 'lively';
  return c.ingredients.some((i) => i.unit === 'topup') ? 'gentle' : 'none';
}

function foamFor(c: Cocktail, glass: GlassName): FoamKind {
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  if (isHot(c) && ids.has('cream')) return 'cream-float';
  if (ids.has('egg-white')) return 'egg-white';
  if (ids.has('espresso') && !UP_GLASSES.includes(glass)) return 'none';
  if (ids.has('espresso')) return 'espresso-crema';
  if (ids.has('cream') && c.method === 'blended') return 'whipped-cream';
  return 'none';
}

function clarityFor(c: Cocktail): Clarity {
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  if (['cream', 'coconut-cream', 'tomato-juice', 'egg-yolk', 'coffee-liqueur'].some((i) => ids.has(i)))
    return 'opaque';
  if (c.method === 'blended') return 'cloudy';
  if (['orange-juice', 'pineapple-juice', 'cranberry-juice', 'egg-white'].some((i) => ids.has(i)))
    return 'cloudy';
  if (c.method === 'shaken' || c.method === 'muddled') return 'hazy';
  return 'crystal';
}

/**
 * How full the glass is, from the recipe's own millilitres against the glass's
 * real capacity. Remapped through a flattering band per glass — a linear mapping
 * makes half the catalog look like dregs — but the ORDER is real, so a 45 ml Old
 * Fashioned still sits visibly lower than a 120 ml Corpse Reviver.
 */
const CAPACITY: Readonly<Record<GlassName, number>> = {
  rocks: 250, highball: 300, collins: 350, coupe: 180, martini: 150, nick_and_nora: 140,
  flute: 180, wine: 350, hurricane: 440, mug: 250, shot: 45,
};
const FILL_BAND: Readonly<Record<GlassName, [number, number]>> = {
  rocks: [0.34, 0.72], highball: [0.62, 0.92], collins: [0.66, 0.94], coupe: [0.45, 0.9],
  martini: [0.45, 0.88], nick_and_nora: [0.45, 0.88], flute: [0.6, 0.9], wine: [0.4, 0.78],
  hurricane: [0.5, 0.9], mug: [0.6, 0.92], shot: [0.7, 0.92],
};

function fillFor(c: Cocktail, glass: GlassName): number {
  let ml = 0;
  for (const i of c.ingredients) {
    if (i.role === 'garnish') continue;
    ml += toMl(i.amount, i.unit);
  }
  // Shaking and stirring add water; a build over ice does too, once it sits.
  if (c.method === 'shaken' || c.method === 'blended') ml *= 1.28;
  else if (c.method === 'stirred') ml *= 1.2;
  const band = FILL_BAND[glass];
  const t = Math.max(0, Math.min(1, ml / CAPACITY[glass]));
  return Math.round((band[0] + (band[1] - band[0]) * t) * 100) / 100;
}

/**
 * Read the garnish line. Authored prose, so it is matched on whole words at BOTH
 * ends: `round` used to match inside `ground`, and a left-only boundary matched
 * `grape` inside `grapefruit` — which handed a bunch of purple grapes to every
 * drink garnished with a grapefruit twist. Plurals and the catalog's own typos
 * ("mint springs") are listed rather than stemmed: the input is small and the
 * failure mode is silent.
 */
function garnishesFor(c: Cocktail): GarnishSpec[] {
  const text = ' ' + (c.garnish || '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/ +/g, ' ') + ' ';
  const has = (...words: string[]): boolean => words.some((w) => text.includes(' ' + w + ' '));
  const fruitColor: Record<string, string> = {
    orange: '#E8862B', lemon: '#E9C84A', lime: '#8FB63C', grapefruit: '#E8896F',
  };
  const found: GarnishSpec[] = [];
  const add = (type: GarnishType, placement: GarnishSpec['placement'], color: string): void => {
    if (found.length < 2 && !found.some((g) => g.type === type)) found.push({ type, placement, color });
  };

  if (has('coffee', 'bean', 'beans', 'espresso')) add('coffee-beans', 'surface', '#3A241A');
  if (has('nutmeg', 'grate', 'grated', 'dust', 'dusting', 'cocoa')) add('nutmeg-dust', 'dust', '#A9754A');
  if (has('celery')) add('celery', 'in-glass', '#7FA84A');
  if (has('olive', 'olives')) add(has('olives') ? 'olive-pick' : 'olive', 'in-glass', '#8FA23C');
  if (has('chili', 'chilli', 'chile', 'pepper')) add('chilli', 'rim', '#CE2B22');
  // Several cherries go on a pick — a Three Dots and a Dash spells its own name
  // with them — and a single one sinks into the drink.
  if (has('cherry', 'cherries')) add('cherry', has('cherries') ? 'skewer' : 'in-glass', '#B11B2A');
  if (has('mint', 'mints', 'sprig', 'sprigs', 'springs')) add('mint-sprig', 'in-glass', '#3E7D34');
  if (has('basil')) add('basil-leaf', 'surface', '#3B7A3A');
  if (has('rosemary')) add('rosemary-sprig', 'in-glass', '#4F7A4A');
  if (has('pineapple')) add('pineapple-wedge', 'rim', '#F2C94C');
  if (has('cinnamon') && has('stick')) add('cinnamon-stick', 'in-glass', '#A5642C');
  if (has('anise')) add('star-anise', 'surface', '#6B4022');
  if (has('cucumber')) add('cucumber-ribbon', 'in-glass', '#9FC46B');
  if (has('strawberry', 'strawberries')) add('strawberry', 'rim', '#D8324A');
  if (has('raspberry', 'raspberries', 'blackberry', 'blackberries', 'berry', 'berries'))
    add('raspberries', 'surface', '#C22348');
  if (has('grape', 'grapes')) add('grapes', 'rim', '#7A4E86');
  if (has('apple')) add('apple-fan', 'rim', '#EFE6C8');
  if (has('orchid', 'flower')) add('orchid', 'rim', '#E67FA8');
  // Fruit and shape are read as PAIRS. Pooling every shape word in the line meant
  // "an orange twist and a lemon wheel" produced one orange twist, and the shape
  // could come from a phrase about a different fruit entirely.
  for (const fruit of ['orange', 'lemon', 'lime', 'grapefruit']) {
    if (!has(fruit, fruit + 's')) continue;
    // "lemon twist" and "twist of lemon" are both English, but only the words
    // AFTER the fruit are unambiguously about it: in "an orange twist and a lemon
    // wheel", the three words before `lemon` belong to the orange.
    const grab = (re: string): string => (text.match(new RegExp(re, 'g')) || []).join(' ');
    const after = grab(fruit + 's?(?: [a-z]+){0,3}');
    const before = grab('(?:[a-z]+ ){0,3}' + fruit + 's?');
    const shaped = (...w: string[]): boolean =>
      w.some((x) => after.includes(x)) || (!/twist|peel|zest|spiral|coil|wedge|wheel|slice|round|disc|half/.test(after) && w.some((x) => before.includes(x)));
    const col = fruitColor[fruit];
    // There is no grapefruit wheel or wedge in the vocabulary; an orange one is
    // the closest shape, and the colour still carries the fruit.
    const base = fruit === 'grapefruit' ? 'orange' : fruit;
    const twist = (fruit === 'grapefruit' ? 'grapefruit-twist' : fruit + '-twist') as GarnishType;
    if (shaped('twist', 'peel', 'zest', 'spiral', 'coil')) add(twist, 'rim', col);
    else if (shaped('wedge')) add((base + '-wedge') as GarnishType, 'rim', col);
    else if (shaped('half')) add('orange-half-wheel', 'rim', col);
    else if (shaped('wheel', 'slice', 'round', 'disc')) add((base + '-wheel') as GarnishType, 'rim', col);
    else add(twist, 'rim', col);
  }

  if (found.length) return found;

  // Nothing usable in the prose: fall back to what the drink is conventionally
  // served with, so no glass ever goes out completely bare.
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  if (ids.has('dry-vermouth') && ids.has('gin')) return [{ type: 'olive', placement: 'in-glass', color: '#8FA23C' }];
  if (ids.has('lime-juice')) return [{ type: 'lime-wheel', placement: 'rim', color: '#8FB63C' }];
  if (ids.has('lemon-juice')) return [{ type: 'lemon-twist', placement: 'rim', color: '#E9C84A' }];
  if (ids.has('sweet-vermouth')) return [{ type: 'cherry', placement: 'in-glass', color: '#B11B2A' }];
  return [{ type: 'orange-twist', placement: 'rim', color: '#E8862B' }];
}

/**
 * What is left floating in the glass. Only a muddled drink has anything, and what
 * it has depends on what went under the muddler — every muddled drink used to get
 * mint leaves, including the ones muddling lime or a sugar cube. A double-strain
 * removes the lot, which is the whole reason the step exists.
 */
function inclusionFor(c: Cocktail): Inclusion {
  if (c.method !== 'muddled') return 'none';
  if (/double[- ]?strain/i.test((c.instructions || []).join(' '))) return 'none';
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  if (ids.has('mint')) return 'mint-leaves';
  if (ids.has('lime') || ids.has('lime-juice')) return 'lime-chunks';
  if (ids.has('raspberry') || ids.has('strawberry') || ids.has('blackberry')) return 'berries';
  if (ids.has('cucumber')) return 'cucumber-slices';
  if (ids.has('orange') || ids.has('lemon')) return 'citrus-slices';
  return 'none';
}

function rimFor(c: Cocktail): RimCrust {
  const text = ((c.garnish || '') + ' ' + (c.instructions || []).join(' ')).toLowerCase();
  if (/salt(ed)?[- ]?rim|salt the rim|rim.{0,24}salt|dip.{0,24}salt/.test(text)) return 'salt';
  if (/cinnamon[- ]sugar/.test(text)) return 'cinnamon-sugar';
  // "Rub a slice of orange around the rim of the glass and dip it in pulverized
  // white sugar" is a Crusta, and no shorter window reaches from `rim` to `sugar`.
  if (/sugar(ed)?[- ]?rim|sugar the rim|rim.{0,60}sugar|dip.{0,40}sugar/.test(text)) return 'sugar';
  return 'none';
}

/**
 * The derived drawing — what a drink with no authored entry falls back to.
 *
 * Exported for `cocktail-visual.spec.ts` only. Every shipped drink has an entry
 * in `COCKTAIL_ART` that overrides all of this, so nothing else can reach these
 * rules and no test that reads the merged spec can tell whether they still work.
 */
export function derivedSpec(c: Cocktail): GlassSpec {
  const glass = (c.glass ?? 'coupe') as GlassName;
  const ice = iceFor(c, glass);
  return {
    glass,
    cut: CUT_BY_FAMILY[c.family ?? ''] ?? 'classic',
    liquid: liquidFor(c),
    fill: fillFor(c, glass),
    ice,
    fizz: fizzFor(c),
    foam: foamFor(c, glass),
    rim: rimFor(c),
    clarity: clarityFor(c),
    inclusion: inclusionFor(c),
    straw: ice === 'crushed' || glass === 'highball' || glass === 'collins' ? 'straw' : 'none',
    steam: isHot(c),
    garnishes: garnishesFor(c),
  };
}

/**
 * Full glass spec used by `<app-glass-art>`: the derived drawing with this
 * drink's authored art merged over it.
 *
 * @param detail  `'card'` on the catalog grid, where sub-pixel detail is pure
 *                cost — 126 of these render at 96×120 with no virtual scrolling.
 * @param motion  `'ambient'` keeps the bubbles rising and the steam moving;
 *                `'pour'` adds the one-shot build, for the recipe just opened.
 */
export function glassSpecFor(c: Cocktail, detail: DetailLevel = 'card', motion: Motion = 'ambient'): GlassSpec {
  const art = COCKTAIL_ART[c.id];
  return Object.assign(derivedSpec(c), art, { glass: (c.glass ?? 'coupe') as GlassName, seed: c.id, detail, motion });
}
