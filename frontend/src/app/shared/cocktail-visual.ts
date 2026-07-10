import type { Cocktail } from '@cocktailapp/shared';
import type { GarnishSpec, GlassName, GlassSpec } from './glass-art/glass-svg';

/**
 * The catalog stores no per-drink colours, so we derive a believable liquid colour, a soft card
 * tint and a full {@link GlassSpec} (ice / fizz / foam / rim / garnish) from a cocktail's glass,
 * ingredients and garnish text. Deterministic, so a drink always looks the same.
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

const CLEAR_SPIRITS = ['gin', 'vodka', 'white-rum', 'tequila', 'pisco', 'cachaca', 'grappa'];
const AMBER = [
  'bourbon', 'rye-whiskey', 'scotch', 'irish-whiskey', 'cognac', 'brandy', 'dark-rum',
  'amaro', 'amaretto', 'drambuie', 'benedictine', 'calvados', 'apricot-brandy', 'grand-marnier',
];
const FIZZY = ['cola', 'ginger-ale', 'ginger-beer', 'grapefruit-soda', 'soda-water', 'sparkling-wine'];

/** Derive the drink's liquid colour from its ingredients (ordered by how strongly each signals). */
export function liquidFor(c: Cocktail): string {
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  const has = (id: string): boolean => ids.has(id);
  const hasAny = (arr: string[]): boolean => arr.some(has);
  const creamy = hasAny(['cream', 'coconut-cream', 'egg-yolk']);

  if (hasAny(['coffee-liqueur', 'espresso', 'coffee']) && !hasAny(['aperol', 'campari'])) return '#2E1C14';
  if (has('cola')) return '#3A2016';
  if (hasAny(['fernet-branca'])) return '#3A2018';
  if (has('campari')) return '#A8321B';
  if (has('aperol')) return '#E8712A';
  if (hasAny(['grenadine', 'raspberry-syrup', 'raspberry-liqueur'])) return '#C0243A';
  if (has('cranberry-juice')) return '#B83A5E';
  if (has('creme-de-violette')) return '#7A5A9E';
  if (hasAny(['green-chartreuse', 'creme-de-menthe', 'absinthe', 'pernod'])) return '#7FA83A';
  if (hasAny(['sweet-vermouth', 'red-wine', 'port', 'cherry-liqueur', 'creme-de-cassis', 'creme-de-mure', 'maraschino']) && !creamy)
    return '#7A1F2A';
  if (has('tomato-juice')) return '#C23A22';
  if (has('orange-juice')) return '#EE8A2A';
  if (has('pineapple-juice')) return '#E6C24A';
  if (has('creme-de-cacao') && creamy) return '#7A5638';
  if (creamy) return '#EDE3CB';
  if (hasAny(AMBER)) {
    return c.method === 'stirred' || c.method === 'build' ? '#A85E22' : '#C98A4A';
  }
  if (hasAny(['lemon-juice', 'lime-juice', 'grapefruit-juice']) && hasAny(CLEAR_SPIRITS)) return '#ECE7CF';
  if (hasAny(CLEAR_SPIRITS)) return '#EDEAD6';
  return '#D9A441';
}

/** A soft, pale wash of the liquid colour — the tinted background behind a glass on a card. */
export function tintFor(c: Cocktail): string {
  return mix(liquidFor(c), '#F6EEDD', 0.82);
}

/** Derive a garnish (type + colour) from the free-text garnish field. */
function garnishFor(c: Cocktail): GarnishSpec | null {
  const g = (c.garnish || '').toLowerCase();
  if (!g) return null;
  const pick = (kw: string[]): boolean => kw.some((k) => g.includes(k));
  const color = pick(['orange'])
    ? '#E8862B'
    : pick(['lemon'])
      ? '#E9C84A'
      : pick(['lime'])
        ? '#8FB63C'
        : pick(['cherry'])
          ? '#B11B2A'
          : pick(['mint'])
            ? '#3E7D34'
            : '#E8862B';
  if (pick(['coffee bean', 'coffee beans', 'espresso bean'])) return { type: 'beans', color: '#3A241A' };
  if (pick(['cherry'])) return { type: 'cherry', color };
  if (pick(['mint'])) return { type: 'mint', color };
  if (pick(['twist', 'peel', 'zest', 'spiral'])) return { type: 'twist', color };
  if (pick(['wedge'])) return { type: 'wedge', color };
  if (pick(['wheel', 'slice', 'round', 'disc'])) return { type: 'wheel', color };
  return null;
}

const RIM_GLASSES = ['rocks', 'highball', 'collins', 'mug'];

/** Full glass spec used by <app-glass-art>. */
export function glassSpecFor(c: Cocktail): GlassSpec {
  const ids = new Set(c.ingredients.map((i) => i.ingredientId));
  const hasAny = (arr: string[]): boolean => arr.some((id) => ids.has(id));
  const glass = (c.glass ?? 'coupe') as GlassName;
  const g = (c.garnish || '').toLowerCase();
  const rim: 'salt' | 'sugar' | null = g.includes('salt')
    ? 'salt'
    : g.includes('sugar rim') || g.includes('sugar-rim')
      ? 'sugar'
      : null;

  return {
    glass,
    liquid: liquidFor(c),
    garnish: garnishFor(c),
    ice: RIM_GLASSES.includes(glass) || c.method === 'build' || c.method === 'muddled',
    fizz: hasAny(FIZZY) || c.ingredients.some((i) => i.unit === 'topup'),
    foam: hasAny(['egg-white']) || (hasAny(['espresso', 'coffee-liqueur']) && glass === 'martini'),
    rim,
  };
}
