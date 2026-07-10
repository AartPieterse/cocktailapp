/* ============================================================================
   Barkast Ingredients — hand-drawn ingredient glyph renderer.

   TypeScript port of the original framework-agnostic `ingredients.js`: the same
   ink-outline language as the glassware, but for the pantry — bottles, citrus,
   herbs, ice, an espresso cup. Pure SVG, resolution independent.

   The colour/kind lookup tables are keyed by the catalog's ingredient ids
   (English) with a per-category fallback, so every ingredient gets a sensible
   glyph even when it has no explicit entry.
   ========================================================================== */

const INK = '#241E17';
const PAPER = '#F7F2E7';

type Attrs = Record<string, string | number | boolean | null | undefined>;

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
function parseHex(h: string): number[] {
  h = String(h || '#000').replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const s = Math.round(clamp(x, 0, 255)).toString(16);
        return s.length < 2 ? '0' + s : s;
      })
      .join('')
  );
}
function lighten(h: string, a: number): string {
  const c = parseHex(h);
  return toHex(c[0] + (255 - c[0]) * a, c[1] + (255 - c[1]) * a, c[2] + (255 - c[2]) * a);
}
function darken(h: string, a: number): string {
  const c = parseHex(h);
  return toHex(c[0] * (1 - a), c[1] * (1 - a), c[2] * (1 - a));
}
function rgba(h: string, a: number): string {
  const c = parseHex(h);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}
function el(tag: string, attrs: Attrs, kids?: string): string {
  let s = '<' + tag;
  for (const k in attrs) {
    if (attrs[k] == null || attrs[k] === false) continue;
    s += ' ' + k + '="' + attrs[k] + '"';
  }
  s += kids != null ? '>' + kids + '</' + tag + '>' : '/>';
  return s;
}
function stroke(w: number, extra?: Attrs): Attrs {
  return Object.assign(
    { fill: 'none', stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    extra || {},
  );
}

/* ---- per-ingredient colour & shape (catalog ids + category fallback) --- */
const COLORS: Record<string, string> = {
  // spirits
  gin: '#E7EFEA', vodka: '#E9EFF1', 'white-rum': '#EFE7D2', 'dark-rum': '#8A5A2C', tequila: '#ECE4C6',
  bourbon: '#C57A22', 'rye-whiskey': '#C57A22', 'irish-whiskey': '#D08A34', scotch: '#B5701E',
  cognac: '#9E5320', brandy: '#9E5320', calvados: '#C57A22', mezcal: '#E6DDC4', cachaca: '#EFE7D2',
  pisco: '#ECE4C6', grappa: '#E9EFF1', absinthe: '#8FB63C', pernod: '#C9D46A',
  // liqueurs
  campari: '#B4231A', aperol: '#E8712A', amaretto: '#B5732E', 'coffee-liqueur': '#3A241A',
  'creme-de-cacao': '#6B4A2E', 'creme-de-cassis': '#5E1E3E', 'creme-de-menthe': '#4E9E5A',
  'creme-de-mure': '#7A2E4E', 'creme-de-violette': '#7A5A9E', 'triple-sec': '#EEE6CF',
  'grand-marnier': '#C57A22', maraschino: '#EFE6CF', 'green-chartreuse': '#8FB63C',
  'yellow-chartreuse': '#E0C64A', benedictine: '#C58A34', drambuie: '#C57A22', galliano: '#E0C64A',
  'fernet-branca': '#3A241A', amaro: '#5E2E1E', 'cherry-liqueur': '#8A1E2A',
  'raspberry-liqueur': '#B4243F', 'peach-schnapps': '#F0B24A', 'apricot-brandy': '#D9902E',
  // wine & vermouth
  'dry-vermouth': '#EBE4C6', 'sweet-vermouth': '#7E2A22', 'lillet-blanc': '#E7DFB2', port: '#6E1E2A',
  'red-wine': '#6E1E2A', 'white-wine': '#E7DFB2', 'sparkling-wine': '#E7DFB2',
  // mixers
  cola: '#3A2018', 'ginger-ale': '#E3C07A', 'ginger-beer': '#E3C07A', 'grapefruit-soda': '#EAB0A0', 'soda-water': '#E7EFF1',
  // juices
  'lime-juice': '#CFE07E', 'lemon-juice': '#EFE07A', 'orange-juice': '#F09A28', 'cranberry-juice': '#B4243F',
  'grapefruit-juice': '#F0A0A0', 'pineapple-juice': '#ECC64A', 'tomato-juice': '#C0392B',
  'peach-puree': '#F0B24A', 'sugar-cane-juice': '#D8E07A',
  // syrups
  grenadine: '#C11F3A', 'simple-syrup': '#EDE6D0', 'agave-syrup': '#E0C88A', 'honey-syrup': '#E0A82E',
  orgeat: '#EDE6D0', falernum: '#E0C88A', 'raspberry-syrup': '#B4243F', 'donns-mix': '#E0C88A',
  'elderflower-cordial': '#E7E1BF', 'chamomile-cordial': '#E7E1BF',
  // bitters
  'angostura-bitters': '#7A2A1E', 'orange-bitters': '#D9772A', 'peychauds-bitters': '#9A2A1E',
  // dairy
  cream: '#F3ECD9', 'coconut-cream': '#F0EAD8', 'egg-white': '#F3EEDF', 'egg-yolk': '#F0B93A',
  // garnish
  mint: '#3E7D34', ginger: '#E3C07A', 'chili-pepper': '#C0392B',
  // seasoning
  salt: '#EDEAE1', 'celery-salt': '#E0DCC8', pepper: '#5A4A3A', tabasco: '#C0392B',
  'worcestershire-sauce': '#5E2E1E', 'orange-flower-water': '#EFE7D2', 'vanilla-extract': '#8A5A2C',
  // other
  coffee: '#3A241A', espresso: '#3A241A', sugar: '#EDEAE1', water: '#DCEAEC',
};

const CAT_COLOR: Record<string, string> = {
  spirit: '#EAEFE9', liqueur: '#B5732E', wine: '#E7DFB2', mixer: '#E6EEF0', juice: '#EFC24A',
  syrup: '#EDE6D0', bitters: '#7A2A1E', dairy: '#F2ECD9', seasoning: '#EAE3D4', garnish: '#8FB63C', other: '#DCEAEC',
};

const KIND: Record<string, string> = {
  mint: 'mint', ginger: 'wedge', 'chili-pepper': 'wedge',
  salt: 'salt', 'celery-salt': 'salt', pepper: 'salt', sugar: 'salt',
  water: 'ice', coffee: 'espresso', espresso: 'espresso',
  'sparkling-wine': 'champagne',
  'egg-white': 'roundbottle', 'egg-yolk': 'roundbottle', cream: 'shortbottle', 'coconut-cream': 'shortbottle',
  tabasco: 'dropper', 'worcestershire-sauce': 'dropper', 'vanilla-extract': 'dropper', 'orange-flower-water': 'dropper',
};

const CAT_KIND: Record<string, string> = {
  spirit: 'bottle', liqueur: 'roundbottle', wine: 'bottle', mixer: 'soda', juice: 'juice',
  syrup: 'shortbottle', bitters: 'dropper', dairy: 'shortbottle', seasoning: 'dropper', garnish: 'wheel', other: 'ice',
};

function kindFor(id: string | undefined, cat: string | undefined): string {
  if (id && KIND[id]) return KIND[id];
  if (cat && CAT_KIND[cat]) return CAT_KIND[cat];
  return 'bottle';
}
function colorFor(id: string | undefined, cat: string | undefined): string {
  if (id && COLORS[id]) return COLORS[id];
  if (cat && CAT_COLOR[cat]) return CAT_COLOR[cat];
  return '#C9A15A';
}

/* per-kind viewBox so every glyph frames to a similar visual size ------- */
const VB: Record<string, string> = {
  bottle: '12 2 40 90', roundbottle: '12 2 40 90', shortbottle: '15 20 34 71', dropper: '18 6 28 85',
  champagne: '18 6 28 87', soda: '16 4 32 87', juice: '17 16 30 76',
  wheel: '11 27 42 42', wedge: '15 24 34 47', twist: '5 14 50 44', mint: '8 8 48 64',
  cherry: '12 20 44 58', salt: '13 27 38 30', ice: '12 26 44 46', espresso: '12 2 44 78',
};

/* ======================================================================
   GLYPHS
   ==================================================================== */
function bottle(color: string, round: boolean): string {
  const out: string[] = [];
  const body = 'M 18 82 L 18 36 C 18 31 21 29 26 27 L 26 12 L 38 12 L 38 27 C 43 29 46 31 46 36 L 46 82 Q 46 86 42 86 L 22 86 Q 18 86 18 82 Z';
  const liq = 'M 18 47 L 46 47 L 46 82 Q 46 86 42 86 L 22 86 Q 18 86 18 82 Z';
  out.push(el('path', { d: body, fill: rgba('#F2F6F7', 0.5) }));
  out.push(el('path', { d: liq, fill: color }));
  if (round) {
    out.push(el('ellipse', { cx: 32, cy: 62, rx: 13, ry: 12, fill: PAPER, stroke: rgba(INK, 0.35), 'stroke-width': 1.4 }));
    out.push(el('line', { x1: 26, y1: 60, x2: 38, y2: 60, stroke: rgba(INK, 0.3), 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
    out.push(el('line', { x1: 28, y1: 65, x2: 36, y2: 65, stroke: rgba(INK, 0.2), 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
  } else {
    out.push(el('rect', { x: 20, y: 52, width: 24, height: 22, rx: 3, fill: PAPER, stroke: rgba(INK, 0.35), 'stroke-width': 1.4 }));
    out.push(el('line', { x1: 24, y1: 60, x2: 40, y2: 60, stroke: rgba(INK, 0.3), 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
    out.push(el('line', { x1: 24, y1: 66, x2: 36, y2: 66, stroke: rgba(INK, 0.2), 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
  }
  out.push(el('path', { d: 'M 23 40 q -2 22 0 42', fill: 'none', stroke: rgba('#ffffff', 0.45), 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: body })));
  out.push(el('rect', stroke(3, { x: 25, y: 6, width: 14, height: 8, rx: 2, fill: darken(color, 0.35) })));
  return out.join('');
}
function shortBottle(color: string): string {
  const out: string[] = [];
  const body = 'M 20 84 L 20 44 C 20 39 22 37 26 36 L 26 28 L 38 28 L 38 36 C 42 37 44 39 44 44 L 44 84 Q 44 87 41 87 L 23 87 Q 20 87 20 84 Z';
  const liq = 'M 20 54 L 44 54 L 44 84 Q 44 87 41 87 L 23 87 Q 20 87 20 84 Z';
  out.push(el('path', { d: body, fill: rgba('#F2F6F7', 0.5) }));
  out.push(el('path', { d: liq, fill: color }));
  out.push(el('rect', { x: 23, y: 60, width: 18, height: 18, rx: 3, fill: PAPER, stroke: rgba(INK, 0.35), 'stroke-width': 1.3 }));
  out.push(el('line', { x1: 27, y1: 67, x2: 37, y2: 67, stroke: rgba(INK, 0.28), 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
  out.push(el('path', { d: 'M 24 48 q -2 18 0 34', fill: 'none', stroke: rgba('#ffffff', 0.4), 'stroke-width': 2, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: body })));
  out.push(el('rect', stroke(3, { x: 25, y: 22, width: 14, height: 8, rx: 2, fill: darken(color, 0.35) })));
  return out.join('');
}
function dropper(color: string): string {
  const out: string[] = [];
  const body = 'M 22 84 L 22 46 C 22 42 24 40 27 39 L 27 32 L 37 32 L 37 39 C 40 40 42 42 42 46 L 42 84 Q 42 87 39 87 L 25 87 Q 22 87 22 84 Z';
  const liq = 'M 22 56 L 42 56 L 42 84 Q 42 87 39 87 L 25 87 Q 22 87 22 84 Z';
  out.push(el('path', { d: body, fill: rgba('#F2F6F7', 0.5) }));
  out.push(el('path', { d: liq, fill: color }));
  out.push(el('rect', { x: 25, y: 62, width: 14, height: 16, rx: 2.5, fill: PAPER, stroke: rgba(INK, 0.35), 'stroke-width': 1.3 }));
  out.push(el('path', { d: 'M 26 50 q -1.5 16 0 30', fill: 'none', stroke: rgba('#ffffff', 0.4), 'stroke-width': 2, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: body })));
  out.push(el('rect', stroke(2.4, { x: 26, y: 26, width: 12, height: 8, rx: 1.5, fill: darken(color, 0.3) })));
  out.push(el('rect', stroke(3, { x: 27, y: 10, width: 10, height: 18, rx: 5, fill: darken(color, 0.5) })));
  return out.join('');
}
function champagne(color: string): string {
  const out: string[] = [];
  const body = 'M 22 86 L 22 48 C 22 42 24 38 28 34 L 28 16 C 28 12 30 10 32 10 C 34 10 36 12 36 16 L 36 34 C 40 38 42 42 42 48 L 42 86 Q 42 89 39 89 L 25 89 Q 22 89 22 86 Z';
  const liq = 'M 22 58 L 42 58 L 42 86 Q 42 89 39 89 L 25 89 Q 22 89 22 86 Z';
  out.push(el('path', { d: body, fill: rgba('#F2F6F7', 0.5) }));
  out.push(el('path', { d: liq, fill: color }));
  [[29, 70, 1.4], [34, 76, 1.2], [31, 64, 1]].forEach((b) => {
    out.push(el('circle', { cx: b[0], cy: b[1], r: b[2], fill: 'none', stroke: rgba('#fff', 0.7), 'stroke-width': 1 }));
  });
  out.push(el('path', { d: 'M 26 50 q -1.5 18 0 34', fill: 'none', stroke: rgba('#fff', 0.4), 'stroke-width': 2, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: body })));
  out.push(el('path', stroke(2.6, { d: 'M 28 20 L 36 20 L 36 34 C 40 38 42 42 42 47 L 22 47 C 22 42 24 38 28 34 Z', fill: '#C9A15A' })));
  out.push(el('rect', stroke(2.6, { x: 28, y: 8, width: 8, height: 8, rx: 1.5, fill: '#C9A15A' })));
  return out.join('');
}
function soda(color: string): string {
  const out: string[] = [];
  const body = 'M 20 84 L 20 42 C 20 36 23 32 26 28 L 26 16 L 38 16 L 38 28 C 41 32 44 36 44 42 L 44 84 Q 44 87 41 87 L 23 87 Q 20 87 20 84 Z';
  const liq = 'M 20 46 L 44 46 L 44 84 Q 44 87 41 87 L 23 87 Q 20 87 20 84 Z';
  out.push(el('path', { d: body, fill: rgba('#F2F6F7', 0.5) }));
  out.push(el('path', { d: liq, fill: color }));
  [[27, 60], [34, 68], [30, 74], [37, 58], [24, 70]].forEach((b) => {
    out.push(el('circle', { cx: b[0], cy: b[1], r: 1.4, fill: 'none', stroke: rgba('#fff', 0.7), 'stroke-width': 1 }));
  });
  out.push(el('rect', { x: 20, y: 56, width: 24, height: 16, rx: 1, fill: PAPER, stroke: rgba(INK, 0.3), 'stroke-width': 1.3 }));
  out.push(el('line', { x1: 24, y1: 64, x2: 40, y2: 64, stroke: rgba(INK, 0.28), 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  out.push(el('path', { d: 'M 24 40 q -2 20 0 40', fill: 'none', stroke: rgba('#fff', 0.4), 'stroke-width': 2, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: body })));
  out.push(el('path', stroke(2.6, { d: 'M 24 8 L 40 8 L 38 15 L 26 15 Z', fill: '#C9552B' })));
  return out.join('');
}
function juiceGlass(color: string): string {
  const out: string[] = [];
  const glass = 'M 21 32 L 26 84 Q 26.3 87 29 87 L 35 87 Q 37.7 87 38 84 L 43 32';
  const body = glass + ' Z';
  const liq = 'M 23 44 L 41 44 L 37.6 82 Q 37.4 84 35.5 84 L 28.5 84 Q 26.6 84 26.4 82 Z';
  out.push(el('path', { d: body, fill: rgba('#F2F6F7', 0.4) }));
  out.push(el('path', { d: liq, fill: color }));
  out.push(el('ellipse', { cx: 32, cy: 44, rx: 9, ry: 2.4, fill: lighten(color, 0.2) }));
  out.push(el('line', stroke(3.4, { x1: 39, y1: 22, x2: 35, y2: 52, stroke: '#C9552B' })));
  out.push(el('line', { x1: 39, y1: 22, x2: 35, y2: 52, stroke: rgba('#fff', 0.5), 'stroke-width': 1, 'stroke-dasharray': '2 4', 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: glass })));
  out.push(el('ellipse', stroke(3, { cx: 32, cy: 32, rx: 11, ry: 3, fill: 'none' })));
  return out.join('');
}
function wheel(color: string): string {
  const out: string[] = [];
  const cx = 32;
  const cy = 48;
  const r = 19;
  out.push(el('circle', stroke(3, { cx: cx, cy: cy, r: r, fill: lighten(color, 0.35) })));
  out.push(el('circle', { cx: cx, cy: cy, r: r * 0.76, fill: lighten(color, 0.62), stroke: rgba(darken(color, 0.3), 0.6), 'stroke-width': 1.4 }));
  let seg = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    seg += 'M ' + cx + ' ' + cy + ' L ' + (cx + Math.cos(a) * r * 0.72) + ' ' + (cy + Math.sin(a) * r * 0.72) + ' ';
  }
  out.push(el('path', { d: seg, fill: 'none', stroke: rgba(darken(color, 0.3), 0.5), 'stroke-width': 1.3 }));
  out.push(el('circle', { cx: cx, cy: cy, r: 2.4, fill: lighten(color, 0.6), stroke: rgba(darken(color, 0.3), 0.6), 'stroke-width': 1.2 }));
  return out.join('');
}
function wedge(color: string): string {
  const out: string[] = [];
  const d = 'M 32 27 C 47 40 47 60 39 69 L 25 69 C 17 60 17 40 32 27 Z';
  out.push(el('path', stroke(3, { d: d, fill: lighten(color, 0.34) })));
  out.push(el('path', { d: 'M 26 66 C 21 57 21 43 32 33 C 43 43 43 57 38 66', fill: 'none', stroke: rgba(darken(color, 0.3), 0.45), 'stroke-width': 1.5 }));
  out.push(el('path', { d: 'M 32 66 L 32 34 M 27 64 L 33 40 M 37 64 L 33 40', fill: 'none', stroke: rgba(darken(color, 0.3), 0.4), 'stroke-width': 1.2 }));
  return out.join('');
}
function twist(color: string): string {
  const out: string[] = [];
  const d = 'M 30 20 c 16 2 22 16 13 30 c -9 14 -28 13 -34 1 c -4 -8 1 -17 10 -16 c 7 1 10 7 6 12';
  out.push(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round' }));
  out.push(el('path', { d: d, fill: 'none', stroke: rgba(lighten(color, 0.5), 0.85), 'stroke-width': 3, 'stroke-linecap': 'round' }));
  return out.join('');
}
function mint(color: string): string {
  const out: string[] = [];
  const mx = 32;
  const my = 46;
  [[-30], [-6], [26]].forEach((o) => {
    out.push(el('ellipse', stroke(2.6, { cx: mx, cy: my, rx: 9, ry: 17, fill: lighten(color, 0.05), transform: 'rotate(' + o[0] + ' ' + mx + ' ' + my + ') translate(0 -8)' })));
  });
  [[-30], [-6], [26]].forEach((o) => {
    out.push(el('line', { x1: mx, y1: my - 22, x2: mx, y2: my + 2, stroke: rgba(darken(color, 0.25), 0.5), 'stroke-width': 1.4, transform: 'rotate(' + o[0] + ' ' + mx + ' ' + my + ') translate(0 -8)' }));
  });
  out.push(el('circle', { cx: mx, cy: my + 10, r: 2.2, fill: darken(color, 0.15) }));
  return out.join('');
}
function cherry(color: string): string {
  const out: string[] = [];
  out.push(el('path', { d: 'M 26 58 C 26 40 30 30 40 24', fill: 'none', stroke: '#5C3A1E', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
  out.push(el('path', { d: 'M 40 58 C 40 42 41 32 42 24', fill: 'none', stroke: '#5C3A1E', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(2, { d: 'M 41 24 Q 50 20 52 28 Q 46 32 41 24 Z', fill: '#4E8A3A' })));
  out.push(el('circle', stroke(3, { cx: 26, cy: 64, r: 10, fill: color })));
  out.push(el('circle', stroke(3, { cx: 41, cy: 66, r: 10, fill: darken(color, 0.1) })));
  out.push(el('ellipse', { cx: 23, cy: 61, rx: 3, ry: 2, fill: rgba('#fff', 0.5) }));
  return out.join('');
}
function salt(): string {
  const out: string[] = [];
  [[26, 34], [32, 30], [38, 34], [29, 40], [35, 40]].forEach((g) => {
    out.push(el('rect', { x: g[0] - 1.5, y: g[1] - 1.5, width: 3, height: 3, rx: 0.6, fill: '#F3EFE6', stroke: rgba(INK, 0.3), 'stroke-width': 0.8, transform: 'rotate(20 ' + g[0] + ' ' + g[1] + ')' }));
  });
  out.push(el('path', stroke(3, { d: 'M 18 50 Q 32 64 46 50 L 44 46 L 20 46 Z', fill: '#EAE3D4' })));
  out.push(el('path', { d: 'M 24 46 Q 32 39 40 46 Z', fill: '#F7F4EC', stroke: rgba(INK, 0.25), 'stroke-width': 1.2 }));
  out.push(el('ellipse', stroke(2.6, { cx: 32, cy: 46, rx: 14, ry: 4, fill: 'none' })));
  return out.join('');
}
function ice(): string {
  const out: string[] = [];
  function cube(x: number, y: number, s: number, rot: number): void {
    out.push(el('rect', stroke(2.6, { x: x, y: y, width: s, height: s, rx: 4, fill: rgba('#DCEAEC', 0.92), transform: 'rotate(' + rot + ' ' + (x + s / 2) + ' ' + (y + s / 2) + ')' })));
    out.push(el('path', { d: 'M ' + (x + 4) + ' ' + (y + s * 0.3) + ' L ' + (x + s * 0.3) + ' ' + (y + s * 0.3) + ' L ' + (x + s * 0.3) + ' ' + (y + s - 4), fill: 'none', stroke: rgba('#fff', 0.85), 'stroke-width': 1.4, transform: 'rotate(' + rot + ' ' + (x + s / 2) + ' ' + (y + s / 2) + ')' }));
  }
  cube(16, 44, 22, -10);
  cube(32, 50, 20, 12);
  cube(24, 30, 18, 6);
  return out.join('');
}
function espresso(): string {
  const out: string[] = [];
  out.push(el('path', { d: 'M 28 18 q 4 -6 0 -12 M 36 18 q 4 -6 0 -12', fill: 'none', stroke: rgba(INK, 0.3), 'stroke-width': 2, 'stroke-linecap': 'round' }));
  out.push(el('path', stroke(3, { d: 'M 20 34 L 22 60 Q 23 68 32 68 Q 41 68 42 60 L 44 34 Z', fill: '#F3EEE2' })));
  out.push(el('ellipse', { cx: 32, cy: 36, rx: 11, ry: 3.2, fill: '#3A241A' }));
  out.push(el('path', stroke(3, { d: 'M 44 40 q 9 1 9 9 q 0 8 -9 8' })));
  out.push(el('ellipse', stroke(3, { cx: 32, cy: 74, rx: 18, ry: 4, fill: '#EAE3D4' })));
  return out.join('');
}

function draw(kind: string, color: string): string {
  switch (kind) {
    case 'bottle':
      return bottle(color, false);
    case 'roundbottle':
      return bottle(color, true);
    case 'shortbottle':
      return shortBottle(color);
    case 'dropper':
      return dropper(color);
    case 'champagne':
      return champagne(color);
    case 'soda':
      return soda(color);
    case 'juice':
      return juiceGlass(color);
    case 'wheel':
      return wheel(color);
    case 'wedge':
      return wedge(color);
    case 'twist':
      return twist(color);
    case 'mint':
      return mint(color);
    case 'cherry':
      return cherry(color);
    case 'salt':
      return salt();
    case 'ice':
      return ice();
    case 'espresso':
      return espresso();
    default:
      return bottle(color, false);
  }
}

export interface IngredientGlyphSpec {
  id?: string;
  cat?: string;
  kind?: string;
  color?: string;
}

export function barkastIngredientSVG(spec: IngredientGlyphSpec): string {
  spec = spec || {};
  const kind = spec.kind || kindFor(spec.id, spec.cat);
  const color = spec.color || colorFor(spec.id, spec.cat);
  const vb = VB[kind] || '0 0 64 96';
  return (
    '<svg viewBox="' + vb + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">' +
    draw(kind, color) +
    '</svg>'
  );
}
