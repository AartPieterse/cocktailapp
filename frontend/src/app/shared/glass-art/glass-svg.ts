/* ============================================================================
   Barkast Glassware — portable, data-driven cocktail glass renderer.

   Pure SVG on a fixed viewBox (0 0 200 260), so it stays razor sharp at 96px in
   a card and 270px on a hero. `barkastGlassSVG(spec)` returns an `<svg>…</svg>`
   string that the GlassArt component drops in via [innerHTML]. No external
   assets, no <script>, no filters — see the notes on cost at the bottom.

   The spec describes a DRINK, not a drawing: what it is made of (colour, layers,
   clarity), how it is served (fill height, ice style, fizz, foam, rim) and what
   is on it (garnishes, straw, steam). Everything the renderer invents on top of
   that — where each ice cube sits, which way the garnish leans, where the
   bubbles are — is drawn from a RNG seeded on `spec.seed` (the cocktail id), so
   a drink is subtly unique but always renders identically.

   Lighting convention, applied everywhere: one key light from the upper LEFT.
   Highlights sit left and up, shading and the cast shadow fall right and down.
   ========================================================================== */

export type GlassName =
  | 'rocks'
  | 'highball'
  | 'collins'
  | 'mug'
  | 'shot'
  | 'coupe'
  | 'martini'
  | 'wine'
  | 'flute'
  | 'nick_and_nora'
  | 'hurricane';

/** How the drink is iced. Changes the silhouette, not just the fill. */
export type IceStyle = 'none' | 'cubes' | 'big-rock' | 'crushed' | 'pebble' | 'frozen-slush';

/** Carbonation: a champagne top-up is not a cola highball. */
export type FizzLevel = 'none' | 'gentle' | 'lively';

export type FoamKind = 'none' | 'egg-white' | 'cream-float' | 'espresso-crema' | 'whipped-cream';

export type RimCrust = 'none' | 'salt' | 'sugar' | 'cinnamon-sugar';

/** How much light gets through. Drives the liquid's depth shading. */
export type Clarity = 'crystal' | 'hazy' | 'cloudy' | 'opaque';

/** Solids visible inside the drink — what a muddler leaves behind. */
export type Inclusion =
  | 'none'
  | 'lime-chunks'
  | 'mint-leaves'
  | 'berries'
  | 'citrus-slices'
  | 'cucumber-slices'
  | 'fruit-pulp';

export type StrawKind = 'none' | 'straw' | 'straw-pair' | 'swizzle-stick';

export type GarnishType =
  | 'lemon-wheel'
  | 'lemon-wedge'
  | 'lemon-twist'
  | 'lime-wheel'
  | 'lime-wedge'
  | 'lime-twist'
  | 'orange-wheel'
  | 'orange-half-wheel'
  | 'orange-wedge'
  | 'orange-twist'
  | 'grapefruit-twist'
  | 'cherry'
  | 'cherry-flag'
  | 'olive'
  | 'olive-pick'
  | 'celery'
  | 'cucumber-ribbon'
  | 'mint-sprig'
  | 'basil-leaf'
  | 'rosemary-sprig'
  | 'coffee-beans'
  | 'nutmeg-dust'
  | 'cinnamon-stick'
  | 'star-anise'
  | 'pineapple-wedge'
  | 'orchid'
  | 'apple-fan'
  | 'strawberry'
  | 'raspberries'
  | 'grapes'
  | 'chilli'
  | 'cardamom-pod';

/**
 * What each garnish is when nobody says otherwise. The renderer used to fall back
 * to one orange for every type, which is how an uncoloured mint sprig ended up
 * the colour of a peel.
 */
const GARNISH_COLOUR: Partial<Record<GarnishType, string>> = {
  'lemon-wheel': '#E9C84A', 'lemon-wedge': '#E9C84A', 'lemon-twist': '#E9C84A',
  'lime-wheel': '#8FB63C', 'lime-wedge': '#8FB63C', 'lime-twist': '#8FB63C',
  'orange-wheel': '#E8862B', 'orange-half-wheel': '#E8862B', 'orange-wedge': '#E8862B',
  'orange-twist': '#E8862B', 'grapefruit-twist': '#E8896F',
  cherry: '#B11B2A', 'cherry-flag': '#B11B2A',
  olive: '#8FA23C', 'olive-pick': '#8FA23C', celery: '#7FA84A', 'cucumber-ribbon': '#9FC46B',
  'mint-sprig': '#3E8B4A', 'basil-leaf': '#3B7A3A', 'rosemary-sprig': '#4F7A4A',
  'coffee-beans': '#3A241A', 'nutmeg-dust': '#A9754A', 'cinnamon-stick': '#A5642C',
  'star-anise': '#6B4022', 'pineapple-wedge': '#F2C94C', orchid: '#E67FA8',
  'apple-fan': '#EFE6C8', strawberry: '#D8324A', raspberries: '#C22348', grapes: '#7A4E86',
  chilli: '#CE2B22', 'cardamom-pod': '#9BB06A',
};

/**
 * Where a garnish sits. This is the single biggest source of variety between two
 * drinks that share a glass and a colour, so it is specified rather than derived.
 */
export type GarnishPlacement = 'rim' | 'surface' | 'in-glass' | 'dust' | 'skewer';

export interface GarnishSpec {
  type: GarnishType;
  placement?: GarnishPlacement;
  color?: string;
}

export interface LiquidLayer {
  color: string;
  /** Share of the pour's height, top layer first. Shares are normalised. */
  share: number;
}

/**
 * `'pour'` plays the full build — the glass fills, the garnish lands — and is for
 * the one recipe the user opened. `'ambient'` is the endless part only (bubbles
 * rising, steam drifting, a garnish that breathes) and is cheap enough for a grid
 * of cards. Both resolve to the finished static drawing under reduced motion.
 */
export type Motion = 'none' | 'ambient' | 'pour';

/** `'card'` drops sub-pixel detail that costs nodes and shows nothing at 96px. */
export type DetailLevel = 'card' | 'hero';

/**
 * Which cut of the glass. Real glassware comes in shapes, and 44 of the catalog's
 * 126 drinks are served in "a coupe" — one profile array, so one outline, 44
 * times. A shaken sour goes into a wide saucer; a stirred spirit-forward drink
 * into a deeper bowl that holds the aromatics. This is a bar convention rather
 * than a fact the catalog states, so it is an explicit input, not a guess made
 * down here.
 */
export type GlassCut = 'wide' | 'classic' | 'deep';

export interface GlassSpec {
  glass?: GlassName;
  cut?: GlassCut;
  /** Body colour of the drink, backlit — usually lighter than the bottle. */
  liquid?: string;
  /** Bottom of a vertical gradient (a sunrise, a float that has bled). */
  liquidBottom?: string;
  /** Hard bands for a genuinely layered pour, top first. Beats `liquidBottom`. */
  layers?: readonly LiquidLayer[];
  /** 0–1 of the glass's height. Overrides the glass's own default fill. */
  fill?: number;
  ice?: IceStyle;
  fizz?: FizzLevel;
  foam?: FoamKind;
  rim?: RimCrust;
  clarity?: Clarity;
  inclusion?: Inclusion;
  straw?: StrawKind;
  steam?: boolean;
  garnishes?: readonly GarnishSpec[];
  /** Cocktail id. Seeds every "random" placement, so a drink never shifts. */
  seed?: string;
  motion?: Motion;
  detail?: DetailLevel;
}

/**
 * Outline colour. A CSS variable so the one mount that draws straight onto the
 * page background (the bar hero) can flip it for dark mode; the card and detail
 * panels keep their pale tint in both themes and so keep the dark default.
 */
const INK = 'var(--bk-ink, #241E17)';
/** Same colour as a literal, for the rgba()/darken() helpers that need channels. */
const INK_HEX = '#241E17';
const VB = 200; // viewBox is 0 0 200 260, centre line x = 100
const CX = 100;

/**
 * One key light, upper LEFT, for the whole set. Every highlight, every specular
 * and the cast shadow are derived from it, so 126 glasses read as one photo shoot
 * instead of 126 separately-lit drawings.
 */
const LIGHT = { x: -0.6, y: -0.8 };

type Attrs = Record<string, string | number | boolean | null | undefined>;

/* ---- colour helpers ---------------------------------------------------- */
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
/** Blend two hex colours; t=0 → a, t=1 → b. */
function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
}
/** Perceived lightness, 0–1. */
function luma(h: string): number {
  const c = parseHex(h);
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
}
/**
 * Warm a colour toward its own light — how a backlit drink glows, as opposed to
 * plain lightening, which just washes it out.
 *
 * The amount is scaled down for colours that are already light. A Daiquiri lit as
 * hard as an Espresso Martini goes white, and a pale drink under a white foam cap
 * beside white ice then reads as an empty glass — which is exactly what half the
 * coupes used to look like.
 */
function glow(h: string, a: number): string {
  const c = parseHex(h);
  const k = a * (1 - luma(h) * 0.8);
  return toHex(c[0] + (255 - c[0]) * k, c[1] + (250 - c[1]) * k * 0.92, c[2] + (225 - c[2]) * k * 0.8);
}

/* ---- tiny deterministic RNG (stable bubbles between renders) ----------- */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hash(str: string): number {
  let h = 2166136261;
  str = String(str);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
/**
 * One independent stream per subsystem. Keyed by name so adding ice to a drink
 * cannot shuffle its bubbles, and a drink with no ice still bubbles identically.
 */
function stream(seed: string, name: string): () => number {
  return rng(hash(seed + '/' + name));
}

/* ---- svg primitives ---------------------------------------------------- */
/**
 * Attribute values are escaped even though every one of them is produced by this
 * file or by the authored art table. The output goes through
 * `bypassSecurityTrustHtml`, so this function is the last thing standing between
 * a spec value and the DOM; making it safe costs one replace per attribute and
 * removes the need to reason about who can reach it.
 */
function esc(v: string | number | boolean): string {
  return String(v).replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );
}
function el(tag: string, attrs: Attrs, kids?: string): string {
  let s = '<' + tag;
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    s += ' ' + k + '="' + esc(v) + '"';
  }
  s += kids != null ? '>' + kids + '</' + tag + '>' : '/>';
  return s;
}
const stroke = (w: number, extra?: Attrs): Attrs =>
  Object.assign(
    {
      fill: 'none',
      stroke: INK,
      'stroke-width': w,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    extra || {},
  );
const n1 = (v: number): string => v.toFixed(1);

/**
 * Many small identical-styled dots as ONE path. Salt grains, bubbles, nutmeg and
 * condensation are all crowds; drawn as separate <circle>s a rim crust alone cost
 * 27 nodes per glass, and there are 126 glasses on the catalog grid.
 */
function dotsPath(pts: number[][]): string {
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0];
    const y = pts[i][1];
    const r = pts[i][2];
    d +=
      'M ' + n1(x - r) + ' ' + n1(y) +
      ' a ' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + n1(r * 2) + ' 0' +
      ' a ' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + n1(-r * 2) + ' 0 ';
  }
  return d;
}

/* ======================================================================
   GLASS PROFILES — geometry, not hand-drawn paths.
   ==================================================================== */
interface GlassCfg {
  kind: 'straight' | 'bowl';
  fill: number;
  topY?: number;
  topW?: number;
  botY?: number;
  botW?: number;
  handle?: boolean;
  profile?: number[][];
  stemTo?: number;
  footY?: number;
  footW?: number;
}

const GLASS: Record<GlassName, GlassCfg> = {
  highball: { kind: 'straight', topY: 30, topW: 34, botY: 240, botW: 33, fill: 0.9 },
  collins: { kind: 'straight', topY: 20, topW: 31, botY: 244, botW: 30, fill: 0.92 },
  rocks: { kind: 'straight', topY: 98, topW: 51, botY: 232, botW: 47, fill: 0.6 },
  shot: { kind: 'straight', topY: 150, topW: 27, botY: 232, botW: 24, fill: 0.8 },
  mug: { kind: 'straight', topY: 44, topW: 40, botY: 236, botW: 42, fill: 0.88, handle: true },
  // The martini is the only bowl that really is a cone; everything else is a
  // BOWL, and drawing them all as V-shapes was why a coupe of Daiquiri looked
  // like a thin wedge of liquid under a wide empty dome. A saucer holds its width
  // most of the way down and only then turns in toward the stem.
  martini: { kind: 'bowl', profile: [[46, 74], [128, 2]], stemTo: 128, footY: 250, footW: 38, fill: 0.74 },
  coupe: { kind: 'bowl', profile: [[62, 70], [72, 72], [90, 66], [108, 48], [122, 22], [128, 7]], stemTo: 128, footY: 250, footW: 38, fill: 0.8 },
  nick_and_nora: { kind: 'bowl', profile: [[64, 48], [76, 51], [96, 47], [114, 33], [128, 13], [132, 6]], stemTo: 132, footY: 250, footW: 34, fill: 0.78 },
  wine: { kind: 'bowl', profile: [[44, 54], [62, 68], [96, 72], [130, 64], [158, 38], [170, 14]], stemTo: 170, footY: 252, footW: 40, fill: 0.62 },
  flute: { kind: 'bowl', profile: [[24, 25], [70, 31], [140, 27], [162, 12]], stemTo: 162, footY: 252, footW: 30, fill: 0.86 },
  hurricane: { kind: 'bowl', profile: [[28, 46], [56, 54], [86, 47], [120, 55], [156, 38], [172, 13]], stemTo: 172, footY: 252, footW: 36, fill: 0.72 },
};

/**
 * Re-cut a glass. A `wide` bowl is broader and shallower, a `deep` one narrower
 * and taller — the same vessel from the same shelf, in the cut the drink asks
 * for. Straight glasses get the equivalent as a taper on the base.
 *
 * This is the one change that breaks up the biggest block of look-alikes in the
 * catalog, because the outline is the only thing that reliably survives the
 * 96px card downscale.
 */
function applyCut(cfg: GlassCfg, cut: GlassCut): GlassCfg {
  if (cut === 'classic') return cfg;
  const wide = cut === 'wide';
  const kw = wide ? 1.07 : 0.94; // half-widths
  const kd = wide ? 0.93 : 1.08; // bowl depth

  if (cfg.kind === 'straight') {
    // A tumbler cannot get deeper — the viewBox fixes its height — so the cut
    // shows as flare: a wide cut opens at the lip and narrows to the base.
    return Object.assign({}, cfg, {
      topW: Math.round(cfg.topW! * (wide ? 1.07 : 0.94)),
      botW: Math.round(cfg.botW! * (wide ? 0.95 : 1.0)),
    });
  }
  const p = cfg.profile!;
  const topY = p[0][0];
  const profile = p.map((q) => [Math.round(topY + (q[0] - topY) * kd), Math.round(q[1] * kw)]);
  const lastY = profile[profile.length - 1][0];
  return Object.assign({}, cfg, { profile, stemTo: lastY });
}

/* interpolate silhouette half-width at a given y for bowls */
function widthAtY(profile: number[][], y: number): number {
  if (y <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return profile[profile.length - 1][1];
}

/**
 * Run a smooth curve through every profile point.
 *
 * Catmull-Rom, converted to cubic Béziers. The obvious alternative — a smooth
 * step per segment, with the control points sitting on each node's own x — has
 * zero derivative at every node, so the outline visibly flattens and then bulges
 * between them. On a two-point cone nobody notices; on a six-point bowl it turns
 * the silhouette into a row of scallops.
 *
 * @param profile  [y, halfWidth] pairs, top to bottom.
 * @param dir      +1 for the right wall, -1 for the left.
 * @param reverse  Walk bottom-to-top, to close the outline back to the rim.
 */
function bowlCurve(profile: number[][], dir: number, reverse: boolean): string {
  const pts = profile.map((p) => [CX + dir * p[1], p[0]]);
  if (reverse) pts.reverse();
  const at = (i: number): number[] => pts[clamp(i, 0, pts.length - 1)];
  let d = reverse ? '' : 'M ' + n1(pts[0][0]) + ' ' + n1(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C ' + n1(c1[0]) + ' ' + n1(c1[1]) + ' ' + n1(c2[0]) + ' ' + n1(c2[1]) + ' ' + n1(p2[0]) + ' ' + n1(p2[1]);
  }
  return d;
}
function rightCurve(profile: number[][]): string {
  return bowlCurve(profile, 1, false);
}
function leftCurveReverse(profile: number[][]): string {
  return bowlCurve(profile, -1, true);
}

/* ======================================================================
   GEOMETRY — everything the renderer needs, family-agnostic and typed.
   ==================================================================== */
interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
interface Geometry {
  kind: 'straight' | 'bowl';
  topY: number;
  topW: number;
  /** Lowest drawn point of the vessel's bowl — where the liquid bottoms out. */
  baseY: number;
  fillY: number;
  /** Half-width of the liquid surface. */
  wf: number;
  bodyPath: string;
  sides: string;
  liquidPath: string;
  rim: Ellipse;
  surface: Ellipse;
  /** Half-width of the interior at a given y — for placing ice against the wall. */
  halfWidthAt(y: number): number;
  handle?: boolean;
  stem?: { fromY: number; footY: number; footW: number };
  /** Widest half-width of the whole vessel, for sizing garnish and shadows. */
  maxW: number;
  botW: number;
}

/**
 * @param ecc  How open the rim ellipse is — the camera's elevation. Low means you
 *             are level with the drink; high means you are looking down into it.
 *             The surface ellipse is locked to the same value, or the two
 *             disagree and the glass reads as broken.
 */
function geometry(cfg: GlassCfg, fill: number, ecc: number): Geometry {
  if (cfg.kind === 'straight') {
    const topY = cfg.topY!;
    const topW = cfg.topW!;
    const botY = cfg.botY!;
    const botW = cfg.botW!;
    const fillY = botY - (botY - topY) * fill;
    const at = (y: number): number =>
      topW + (botW - topW) * clamp((y - topY) / (botY - topY), 0, 1);
    const wf = at(fillY);
    const topRy = topW * ecc;
    const botRy = botW * (ecc - 0.02);
    const fRy = wf * ecc;

    return {
      kind: 'straight',
      topY,
      topW,
      baseY: botY + botRy,
      fillY,
      wf,
      maxW: Math.max(topW, botW),
      botW,
      halfWidthAt: at,
      bodyPath:
        'M ' + (CX - topW) + ' ' + topY +
        ' L ' + (CX - botW) + ' ' + botY +
        ' Q ' + CX + ' ' + (botY + botRy) + ' ' + (CX + botW) + ' ' + botY +
        ' L ' + (CX + topW) + ' ' + topY +
        ' Q ' + CX + ' ' + (topY + topRy) + ' ' + (CX - topW) + ' ' + topY + ' Z',
      sides:
        'M ' + (CX - topW) + ' ' + topY + ' L ' + (CX - botW) + ' ' + botY +
        ' Q ' + CX + ' ' + (botY + botRy) + ' ' + (CX + botW) + ' ' + botY +
        ' L ' + (CX + topW) + ' ' + topY,
      liquidPath:
        'M ' + (CX - wf) + ' ' + n1(fillY) +
        ' L ' + (CX - botW) + ' ' + botY +
        ' Q ' + CX + ' ' + (botY + botRy) + ' ' + (CX + botW) + ' ' + botY +
        ' L ' + (CX + wf) + ' ' + n1(fillY) +
        ' Q ' + CX + ' ' + n1(fillY + fRy) + ' ' + (CX - wf) + ' ' + n1(fillY) + ' Z',
      rim: { cx: CX, cy: topY, rx: topW, ry: topRy },
      surface: { cx: CX, cy: fillY, rx: wf, ry: fRy },
      handle: cfg.handle,
    };
  }

  const p = cfg.profile!;
  const last = p[p.length - 1];
  const topW = p[0][1];
  const topY = p[0][0];
  // `fill` is a fraction of the glass's VOLUME, which is the only thing a recipe
  // can tell you. A bowl narrows toward its stem, so its volume grows roughly
  // with the square of the depth: half a coupe by volume is about 70% of the way
  // up it, not half. Taking the fraction as a height put every coupe in the
  // catalog under a wide empty dome and made the whole set look like leftovers.
  const heightFrac = Math.pow(clamp(fill, 0, 1), 1 / 2.2);
  const fillY = last[0] - (last[0] - topY) * heightFrac;
  const wf = widthAtY(p, fillY);
  const topRy = topW * (ecc + 0.02);
  const fRy = wf * (ecc + 0.02);
  const closeBowl = (w: number, y: number): string =>
    w > 6 ? ' Q ' + CX + ' ' + n1(y + w * 0.5) + ' ' + n1(CX - w) + ' ' + n1(y) : ' L ' + n1(CX - w) + ' ' + n1(y);

  const sub: number[][] = [[fillY, wf]];
  for (let i = 0; i < p.length; i++) if (p[i][0] > fillY) sub.push(p[i]);
  const subLast = sub[sub.length - 1];

  return {
    kind: 'bowl',
    topY,
    topW,
    baseY: last[0] + (last[1] > 6 ? last[1] * 0.5 : 0),
    fillY,
    wf,
    maxW: Math.max.apply(null, p.map((q) => q[1])),
    botW: last[1],
    halfWidthAt: (y: number) => widthAtY(p, y),
    bodyPath:
      rightCurve(p) + closeBowl(last[1], last[0]) + leftCurveReverse(p) +
      ' Q ' + CX + ' ' + (topY + topRy) + ' ' + (CX + topW) + ' ' + topY + ' Z',
    sides: rightCurve(p) + closeBowl(last[1], last[0]) + leftCurveReverse(p),
    liquidPath:
      rightCurve(sub) + closeBowl(subLast[1], subLast[0]) + leftCurveReverse(sub) +
      ' Q ' + CX + ' ' + n1(fillY + fRy) + ' ' + n1(CX + wf) + ' ' + n1(fillY) + ' Z',
    rim: { cx: CX, cy: topY, rx: topW, ry: topRy },
    surface: { cx: CX, cy: fillY, rx: wf, ry: fRy },
    stem: { fromY: cfg.stemTo!, footY: cfg.footY!, footW: cfg.footW! },
  };
}

/* ======================================================================
   THE DRINK — colour, depth and what is suspended in it
   ==================================================================== */

/**
 * The liquid gradient. A drink is not a flat swatch: it is brightest just under
 * the meniscus where the pour is shallow and the light gets through, and it
 * deepens toward the base. `layers` overrides that with hard bands (an Irish
 * Coffee's cream, a New York Sour's wine float) blended over a few percent so
 * they read as poured rather than as clip art.
 */
function liquidGradient(id: string, spec: GlassSpec, liquid: string): string {
  const layers = spec.layers && spec.layers.length ? spec.layers : null;
  const clarity: Clarity = spec.clarity || 'hazy';
  let stops = '';

  if (layers) {
    const total = layers.reduce((s, l) => s + Math.max(0.02, l.share), 0);
    let at = 0;
    for (let i = 0; i < layers.length; i++) {
      const c = layers[i].color;
      const share = Math.max(0.02, layers[i].share) / total;
      // A 2% ramp on each side of the boundary: a real float has a visible but
      // narrow meeting line, not an aliased edge.
      stops += '<stop offset="' + n1((at + (i ? 0.02 : 0)) * 100) + '%" stop-color="' + glow(c, 0.1) + '"/>';
      at += share;
      stops += '<stop offset="' + n1((at - 0.02) * 100) + '%" stop-color="' + darken(c, 0.1) + '"/>';
    }
  } else if (spec.liquidBottom) {
    // A sunrise: the heavy syrup has settled and the two never fully met.
    stops =
      '<stop offset="0%" stop-color="' + glow(liquid, 0.16) + '"/>' +
      '<stop offset="42%" stop-color="' + liquid + '"/>' +
      '<stop offset="74%" stop-color="' + spec.liquidBottom + '"/>' +
      '<stop offset="100%" stop-color="' + darken(spec.liquidBottom, 0.14) + '"/>';
  } else {
    // Opaque drinks are lit on the surface, not through the body, so their
    // brightest point is the very top and they fall away fast.
    const top = clarity === 'opaque' ? lighten(liquid, 0.2) : glow(liquid, 0.22);
    const mid = clarity === 'opaque' ? liquid : glow(liquid, 0.04);
    const bot = darken(liquid, clarity === 'opaque' ? 0.24 : 0.18);
    stops =
      '<stop offset="0%" stop-color="' + top + '"/>' +
      '<stop offset="' + (clarity === 'opaque' ? '22' : '38') + '%" stop-color="' + mid + '"/>' +
      '<stop offset="100%" stop-color="' + bot + '"/>';
  }
  return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops + '</linearGradient>';
}

/**
 * The cylinder. One horizontal pass that darkens both walls and leaves the middle
 * clear, so the pour reads as a round body of liquid instead of a cut-out.
 */
function bodyShadeGradient(id: string, strength: number): string {
  return (
    '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="' + rgba(INK_HEX, strength * 1.1) + '"/>' +
    '<stop offset="26%" stop-color="' + rgba(INK_HEX, 0) + '"/>' +
    '<stop offset="62%" stop-color="' + rgba(INK_HEX, 0) + '"/>' +
    '<stop offset="100%" stop-color="' + rgba(INK_HEX, strength) + '"/>' +
    '</linearGradient>'
  );
}

/* ---- ice --------------------------------------------------------------- */

/**
 * One cube, drawn isometrically: a bright top rhombus and two side faces. Three
 * paths beats a rounded rectangle at any size, and the top face catching the key
 * light is what makes a glass of ice read as cold rather than as decoration.
 */
function iceCube(cx: number, cy: number, w: number, tilt: number): string {
  const t = w * 0.46; // isometric squash of the top face
  const h = w * 0.92;
  const P = (x: number, y: number): string => n1(x) + ' ' + n1(y);
  const top = 'M ' + P(cx, cy - t * 2) + ' L ' + P(cx + w, cy - t) + ' L ' + P(cx, cy) + ' L ' + P(cx - w, cy - t) + ' Z';
  const left = 'M ' + P(cx - w, cy - t) + ' L ' + P(cx, cy) + ' L ' + P(cx, cy + h) + ' L ' + P(cx - w, cy - t + h) + ' Z';
  const right = 'M ' + P(cx, cy) + ' L ' + P(cx + w, cy - t) + ' L ' + P(cx + w, cy - t + h) + ' L ' + P(cx, cy + h) + ' Z';
  const g = 'rotate(' + n1(tilt) + ' ' + n1(cx) + ' ' + n1(cy) + ')';
  // A faint ink edge all the way round. Without it a cube in a pale drink is a
  // white shape on a white shape and simply disappears at card size.
  const silhouette =
    'M ' + P(cx, cy - t * 2) + ' L ' + P(cx + w, cy - t) + ' L ' + P(cx + w, cy - t + h) +
    ' L ' + P(cx, cy + h) + ' L ' + P(cx - w, cy - t + h) + ' L ' + P(cx - w, cy - t) + ' Z';
  return el(
    'g',
    { transform: g },
    el('path', { d: left, fill: 'rgba(255,255,255,0.4)' }) +
      el('path', { d: right, fill: 'rgba(198,222,232,0.34)' }) +
      el('path', { d: top, fill: 'rgba(255,255,255,0.78)' }) +
      el('path', { d: silhouette, fill: 'none', stroke: rgba(INK_HEX, 0.28), 'stroke-width': 1.4, 'stroke-linejoin': 'round' }) +
      el('path', { d: top, fill: 'none', stroke: 'rgba(255,255,255,0.9)', 'stroke-width': 1.1 }),
  );
}

/** A shard of crushed ice: an irregular triangle-ish chip. */
function iceShard(cx: number, cy: number, r: number, rand: () => number): string {
  let d = '';
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const rr = r * (0.62 + rand() * 0.5);
    d += (i ? 'L ' : 'M ') + n1(cx + Math.cos(a) * rr) + ' ' + n1(cy + Math.sin(a) * rr * 0.86) + ' ';
  }
  return d + 'Z';
}

/**
 * @param part  Crushed ice is the one style that exists on both sides of the rim,
 *              and the two halves have different clipping needs: `'inside'` is
 *              the ice seen through the glass and must be clipped to the pour,
 *              `'above'` is the mound and must not be. Every other style is
 *              entirely `'inside'`. Drawing the whole thing twice — once in each
 *              pass — doubled the below-rim shards and leaked the mound out of
 *              the pour animation's clip.
 */
function iceLayer(
  g: Geometry,
  spec: GlassSpec,
  seed: string,
  hero: boolean,
  shadeId: string,
  part: 'inside' | 'above',
): string {
  const style = spec.ice || 'none';
  if (style === 'none' || style === 'frozen-slush') return '';
  if (style !== 'crushed' && part === 'above') return '';
  const rand = stream(seed, 'ice');
  const out: string[] = [];
  const top = g.surface.cy;
  const floor = g.baseY - 6;
  const span = Math.max(10, floor - top);

  if (style === 'big-rock') {
    // A king cube fills the glass corner to corner; the whole point is that it is
    // one object and you can see the drink around it.
    const w = Math.max(9, Math.min(g.wf * 0.74, span * 0.46));
    const cy = Math.min(floor - w * 0.95, top + span * 0.44);
    out.push(iceCube(CX + (rand() - 0.5) * g.wf * 0.16, cy, w, -8 + rand() * 16));
  } else if (style === 'cubes') {
    const n = 3 + (rand() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      // Stack down the column, alternating sides, each cube pinned inside the wall
      // at its OWN depth — a tapered bowl narrows fast and cubes must follow it.
      const y = top + span * (0.16 + (i / n) * 0.66) + rand() * span * 0.08;
      const wall = g.halfWidthAt(y);
      const w = clamp(wall * 0.42, 6, 17);
      const lean = (i % 2 ? 1 : -1) * (0.12 + rand() * 0.34);
      const x = CX + lean * Math.max(0, wall - w * 1.25);
      out.push(iceCube(x, y, w, -18 + rand() * 36));
    }
  } else if (style === 'pebble') {
    // Nugget ice: the glass is packed, so this is texture, not objects.
    const pts: number[][] = [];
    const n = hero ? 26 : 18;
    for (let i = 0; i < n; i++) {
      const y = top + rand() * span * 0.94;
      const wall = g.halfWidthAt(y) - 5;
      pts.push([CX + (rand() - 0.5) * 2 * wall, y, 3 + rand() * 2.4]);
    }
    out.push(el('path', { d: dotsPath(pts), fill: 'rgba(255,255,255,0.5)' }));
    out.push(el('path', { d: dotsPath(pts.filter((_, i) => i % 3 === 0).map((p) => [p[0] - 0.8, p[1] - 0.9, p[2] * 0.5])), fill: 'rgba(255,255,255,0.75)' }));
  } else if (style === 'crushed' && part === 'inside') {
    // The ice below the rim, seen through the glass.
    let below = '';
    for (let i = 0; i < (hero ? 9 : 6); i++) {
      const y = top + rand() * span * 0.5;
      const wall = g.halfWidthAt(y) - 6;
      below += iceShard(CX + (rand() - 0.5) * 2 * wall, y, 5 + rand() * 3.5, rand);
    }
    out.push(el('path', { d: below, fill: 'rgba(255,255,255,0.46)' }));
  } else if (style === 'crushed') {
    // A snow mound standing proud of the rim — the one ice style that changes the
    // silhouette, which is exactly why a julep reads differently at thumbnail size.
    // It has to be a heaped DOME with a nibbled edge; scalloping it too hard turns
    // the ink outline into a black crown sitting on the glass.
    const rx = g.rim.rx * 1.02;
    const peak = Math.max(5, g.rim.cy - rx * 0.78);
    const bumps = 6;
    let dome = 'M ' + n1(CX - rx) + ' ' + n1(g.rim.cy + 2);
    for (let i = 0; i < bumps; i++) {
      const t0 = i / bumps;
      const t1 = (i + 1) / bumps;
      const x1 = CX - rx + t1 * rx * 2;
      // The dome's own arc, plus a small per-bump nibble so the edge is icy
      // rather than moulded. The control point rides the arc, never above it.
      const archAt = (t: number): number => g.rim.cy + 2 - Math.sin(t * Math.PI) * (g.rim.cy + 2 - peak);
      dome +=
        ' Q ' + n1(CX - rx + ((t0 + t1) / 2) * rx * 2) + ' ' + n1(archAt((t0 + t1) / 2) - 2 - rand() * 4) +
        ' ' + n1(x1) + ' ' + n1(archAt(t1) + (i === bumps - 1 ? 0 : 1.5 + rand() * 2.5));
    }
    dome += ' Z';
    out.push(el('path', { d: dome, fill: '#F3F9FB', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    // Shade the right of the mound away from the key light, so it reads as a heap.
    out.push(el('path', { d: dome, fill: 'url(#' + shadeId + ')' }));
    let facets = '';
    for (let i = 0; i < (hero ? 7 : 4); i++) {
      facets += iceShard(CX + (rand() - 0.5) * rx * 1.3, g.rim.cy - rand() * (g.rim.cy - peak) * 0.72, 4 + rand() * 3, rand);
    }
    out.push(el('path', { d: facets, fill: 'none', stroke: 'rgba(120,155,170,0.4)', 'stroke-width': 1.2 }));
  }
  return out.join('');
}

/** Frozen drinks have no separate ice — the body itself is granular and matte. */
function slushTexture(g: Geometry, seed: string, hero: boolean): string {
  const rand = stream(seed, 'slush');
  const pts: number[][] = [];
  const span = g.baseY - g.surface.cy;
  const n = hero ? 34 : 20;
  for (let i = 0; i < n; i++) {
    const y = g.surface.cy + rand() * span * 0.92;
    const wall = g.halfWidthAt(y) - 5;
    pts.push([CX + (rand() - 0.5) * 2 * wall, y, 1.6 + rand() * 2.2]);
  }
  return el('path', { d: dotsPath(pts), fill: 'rgba(255,255,255,0.42)' });
}

/* ---- carbonation -------------------------------------------------------- */

/**
 * Bubbles. Each one climbs to the meniscus and pops; a deep one simply takes
 * longer. Static drinks get the whole field as ONE path — 126 cards of twelve
 * <circle>s each is 1500 nodes for something nobody can count.
 */
function bubbles(g: Geometry, seed: string, level: FizzLevel, animate: boolean, hero: boolean): string {
  if (level === 'none') return '';
  const rand = stream(seed, 'fizz');
  const top = g.surface.cy + 4;
  const bot = g.baseY - 8;
  const n = level === 'lively' ? (hero ? 18 : 11) : hero ? 9 : 6;
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const yy = top + rand() * Math.max(8, bot - top);
    const wall = g.halfWidthAt(yy) - 6;
    const xx = CX + (rand() - 0.5) * 2 * Math.max(4, wall);
    const rr = (level === 'lively' ? 1.4 : 1.1) + rand() * (level === 'lively' ? 2.2 : 1.5);
    pts.push([xx, yy, rr]);
  }
  if (!animate) {
    return el('path', {
      d: dotsPath(pts),
      fill: 'none',
      stroke: 'rgba(255,255,255,0.72)',
      'stroke-width': 1,
    });
  }
  // Animated, so each bubble needs its own element to carry its own delay.
  return pts
    .map((p) => {
      const climb = Math.max(6, p[1] - top);
      const dur = 0.7 + climb / 70 + rand() * 0.4;
      return el('circle', {
        cx: n1(p[0]),
        cy: n1(p[1]),
        r: n1(p[2]),
        fill: 'none',
        stroke: 'rgba(255,255,255,0.72)',
        'stroke-width': 1,
        class: 'bk-bub',
        style:
          '--bk-rise:' + n1(-climb) + 'px;animation-duration:' + dur.toFixed(2) +
          's;animation-delay:-' + (rand() * dur).toFixed(2) + 's',
      });
    })
    .join('');
}

/** The collar of fine bubbles clinging where the drink meets the glass. */
function fizzCollar(g: Geometry, seed: string, level: FizzLevel): string {
  if (level === 'none') return '';
  const rand = stream(seed, 'collar');
  const pts: number[][] = [];
  const n = level === 'lively' ? 14 : 8;
  for (let i = 0; i <= n; i++) {
    const t = Math.PI + (i / n) * Math.PI;
    pts.push([
      g.surface.cx + Math.cos(t) * g.surface.rx * 0.94,
      g.surface.cy + Math.sin(t) * g.surface.ry * 0.94 + 1,
      0.9 + rand() * 1.1,
    ]);
  }
  return el('path', { d: dotsPath(pts), fill: 'rgba(255,255,255,0.66)' });
}

/* ---- foam --------------------------------------------------------------- */
function foamCap(g: Geometry, spec: GlassSpec, liquid: string, seed: string): string {
  const kind = spec.foam || 'none';
  const s = g.surface;
  const out: string[] = [];

  if (kind === 'none') {
    out.push(el('ellipse', { cx: s.cx, cy: n1(s.cy), rx: n1(s.rx), ry: n1(s.ry), fill: glow(liquid, 0.3), stroke: rgba(INK_HEX, 0.22), 'stroke-width': 1.4 }));
    return out.join('');
  }

  if (kind === 'whipped-cream') {
    // A swirled dome above the rim — the biggest silhouette change any topping makes.
    const rx = s.rx * 0.92;
    const peak = Math.max(8, s.cy - rx * 1.05);
    out.push(el('path', {
      d: 'M ' + n1(s.cx - rx) + ' ' + n1(s.cy) +
        ' C ' + n1(s.cx - rx) + ' ' + n1(peak + rx * 0.3) + ' ' + n1(s.cx - rx * 0.62) + ' ' + n1(peak) + ' ' + n1(s.cx - rx * 0.1) + ' ' + n1(peak + rx * 0.12) +
        ' C ' + n1(s.cx + rx * 0.5) + ' ' + n1(peak - rx * 0.16) + ' ' + n1(s.cx + rx) + ' ' + n1(peak + rx * 0.5) + ' ' + n1(s.cx + rx) + ' ' + n1(s.cy) +
        ' Q ' + n1(s.cx) + ' ' + n1(s.cy + s.ry * 1.5) + ' ' + n1(s.cx - rx) + ' ' + n1(s.cy) + ' Z',
      fill: '#FDF8EE', stroke: INK, 'stroke-width': 2.6, 'stroke-linejoin': 'round',
    }));
    out.push(el('path', {
      d: 'M ' + n1(s.cx - rx * 0.55) + ' ' + n1(s.cy - rx * 0.2) + ' q ' + n1(rx * 0.4) + ' ' + n1(-rx * 0.34) + ' ' + n1(rx * 0.86) + ' ' + n1(-rx * 0.08),
      fill: 'none', stroke: 'rgba(150,130,100,0.35)', 'stroke-width': 1.6,
    }));
    return out.join('');
  }

  const face =
    // Crema is a colour in its own right — hazelnut — not the coffee lightened,
    // which on a near-black body only ever comes out muddy grey-brown.
    kind === 'espresso-crema' ? mixHex('#C89A62', liquid, 0.22) :
    kind === 'cream-float' ? '#F7EEDC' :
    lighten(liquid, 0.72);
  // A sour's head is thick, but a dome the height of the bowl's own radius hides
  // the drink completely — on a wide wine bowl the Pisco Sour became a cup of
  // meringue. Cap it in absolute units so it stays a head, not a hat.
  const lift = kind === 'egg-white' ? Math.min(s.ry * 0.7, 9) : Math.min(s.ry * 0.35, 5);

  // A cap has thickness: the front lip of the head shows below the surface line,
  // and it casts a little shade onto the drink. Without that shade a white head
  // on a pale drink — a Ramos, a White Lady — is white on white and vanishes.
  out.push(el('ellipse', { cx: s.cx, cy: n1(s.cy + s.ry * 1.5), rx: n1(s.rx * 0.94), ry: n1(s.ry * 0.9), fill: rgba(INK_HEX, 0.13) }));
  out.push(el('path', {
    d: 'M ' + n1(s.cx - s.rx) + ' ' + n1(s.cy) +
      ' A ' + n1(s.rx) + ' ' + n1(s.ry + lift) + ' 0 0 1 ' + n1(s.cx + s.rx) + ' ' + n1(s.cy) +
      ' Q ' + n1(s.cx) + ' ' + n1(s.cy + s.ry * 1.9) + ' ' + n1(s.cx - s.rx) + ' ' + n1(s.cy) + ' Z',
    fill: face, stroke: rgba(INK_HEX, 0.38), 'stroke-width': 1.8, 'stroke-linejoin': 'round',
  }));
  out.push(el('ellipse', { cx: s.cx, cy: n1(s.cy - lift * 0.18), rx: n1(s.rx * 0.78), ry: n1(s.ry * 0.72), fill: lighten(face, 0.4) }));

  if (kind === 'egg-white' || kind === 'espresso-crema') {
    // The pinprick texture of a shaken head.
    const rand = stream(seed, 'foam');
    const pts: number[][] = [];
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand());
      pts.push([s.cx + Math.cos(a) * s.rx * 0.66 * rr, s.cy - lift * 0.2 + Math.sin(a) * s.ry * 0.6 * rr, 0.9 + rand() * 1.1]);
    }
    out.push(el('path', { d: dotsPath(pts), fill: rgba(darken(face, 0.35), 0.5) }));
  }
  return out.join('');
}

/* ---- rim crust ---------------------------------------------------------- */
function rimCrust(kind: RimCrust, g: Geometry, seed: string): string {
  if (kind === 'none') return '';
  const r = g.rim;
  const rand = stream(seed, 'rim');
  const grain = kind === 'salt' ? '#FBFAF7' : kind === 'sugar' ? '#F6F1E5' : '#D9B285';
  // Big enough to survive the 96px card, where anything under ~2 units collapses
  // into a dashed line and reads as a crack in the glass rather than a crust.
  const base = kind === 'salt' ? 2.7 : kind === 'sugar' ? 2.1 : 2.4;
  const pts: number[][] = [];
  // A crusted rim goes all the way round: the near lip is the half you actually
  // see, and drawing only the far arc left every rimmed glass looking chipped.
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const drip = Math.sin(t) > 0 ? 1 : -0.2; // the crust sags on the near lip
    pts.push([
      r.cx + Math.cos(t) * r.rx,
      r.cy + Math.sin(t) * r.ry + drip * (1.2 + rand() * 2.6),
      base * (0.62 + rand() * 0.55),
    ]);
  }
  return (
    el('path', { d: dotsPath(pts), fill: grain, stroke: rgba(INK_HEX, 0.16), 'stroke-width': 0.8 }) +
    el('path', { d: dotsPath(pts.filter((_, i) => i % 2 === 0).map((q) => [q[0] - 0.6, q[1] - 0.7, q[2] * 0.42])), fill: 'rgba(255,255,255,0.85)' })
  );
}

/* ---- things suspended in the drink -------------------------------------- */
function inclusions(g: Geometry, kind: Inclusion, seed: string): string {
  if (kind === 'none') return '';
  const rand = stream(seed, 'incl');
  const out: string[] = [];
  const top = g.surface.cy;
  const span = Math.max(12, g.baseY - top);
  const place = (t: number): number[] => {
    const y = top + span * t;
    const wall = g.halfWidthAt(y) - 8;
    return [CX + (rand() - 0.5) * 2 * Math.max(4, wall), y];
  };

  if (kind === 'mint-leaves') {
    for (let i = 0; i < 4; i++) {
      const p = place(0.12 + rand() * 0.7);
      out.push(el('ellipse', {
        cx: n1(p[0]), cy: n1(p[1]), rx: 7.5, ry: 4.2,
        fill: 'rgba(74,132,66,0.72)', stroke: 'rgba(38,80,36,0.5)', 'stroke-width': 1,
        transform: 'rotate(' + n1(-60 + rand() * 120) + ' ' + n1(p[0]) + ' ' + n1(p[1]) + ')',
      }));
    }
  } else if (kind === 'lime-chunks') {
    for (let i = 0; i < 4; i++) {
      const p = place(0.35 + rand() * 0.6);
      const a = -40 + rand() * 80;
      out.push(el('path', {
        d: 'M -8 -5 L 8 -2 L 5 6 Z', fill: 'rgba(150,190,70,0.85)', stroke: 'rgba(80,110,40,0.55)', 'stroke-width': 1,
        transform: 'translate(' + n1(p[0]) + ' ' + n1(p[1]) + ') rotate(' + n1(a) + ')',
      }));
    }
  } else if (kind === 'berries') {
    const pts: number[][] = [];
    for (let i = 0; i < 5; i++) {
      const p = place(0.2 + rand() * 0.6);
      pts.push([p[0], p[1], 4 + rand() * 2]);
    }
    out.push(el('path', { d: dotsPath(pts), fill: 'rgba(150,26,58,0.7)' }));
  } else if (kind === 'citrus-slices' || kind === 'cucumber-slices') {
    const flesh = kind === 'cucumber-slices' ? 'rgba(190,224,160,0.8)' : 'rgba(240,190,70,0.8)';
    for (let i = 0; i < 3; i++) {
      const p = place(0.2 + rand() * 0.6);
      out.push(el('ellipse', {
        cx: n1(p[0]), cy: n1(p[1]), rx: 9, ry: 3.4, fill: flesh, stroke: 'rgba(90,90,50,0.4)', 'stroke-width': 1,
        transform: 'rotate(' + n1(-30 + rand() * 60) + ' ' + n1(p[0]) + ' ' + n1(p[1]) + ')',
      }));
    }
  } else if (kind === 'fruit-pulp') {
    const pts: number[][] = [];
    for (let i = 0; i < 16; i++) {
      const p = place(rand());
      pts.push([p[0], p[1], 1 + rand() * 1.8]);
    }
    out.push(el('path', { d: dotsPath(pts), fill: 'rgba(255,236,190,0.4)' }));
  }
  return out.join('');
}

/* ---- straws, steam, condensation, frost --------------------------------- */
function strawArt(g: Geometry, kind: StrawKind, seed: string, accent: string): string {
  if (kind === 'none') return '';
  const rand = stream(seed, 'straw');
  const lean = (rand() < 0.5 ? -1 : 1) * (9 + rand() * 7);
  const draw = (dx: number, colour: string): string => {
    const footY = Math.min(g.baseY - 8, g.surface.cy + 30);
    const footX = CX + dx * 0.35;
    const headY = Math.max(6, g.topY - 34);
    const headX = footX + dx + lean;
    return (
      el('line', { x1: n1(footX), y1: n1(footY), x2: n1(headX), y2: n1(headY), stroke: INK, 'stroke-width': 6.5, 'stroke-linecap': 'round' }) +
      el('line', { x1: n1(footX), y1: n1(footY), x2: n1(headX), y2: n1(headY), stroke: colour, 'stroke-width': 4, 'stroke-linecap': 'round' })
    );
  };
  if (kind === 'swizzle-stick') {
    const footY = Math.min(g.baseY - 8, g.surface.cy + 34);
    const headY = Math.max(8, g.topY - 26);
    return (
      el('line', { x1: n1(CX + 6), y1: n1(footY), x2: n1(CX + 6 + lean), y2: n1(headY), stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }) +
      el('circle', { cx: n1(CX + 6 + lean), cy: n1(headY - 3), r: 5.5, fill: accent, stroke: INK, 'stroke-width': 2.4 })
    );
  }
  return kind === 'straw-pair' ? draw(-7, '#E8574A') + draw(7, '#F2C24B') : draw(0, '#E8574A');
}

/** Three ribbons of steam. The only thing in the drawing that says "drink me now". */
function steamWisps(g: Geometry, seed: string, animate: boolean): string {
  const rand = stream(seed, 'steam');
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    const x = CX + (i - 1) * g.rim.rx * 0.52 + (rand() - 0.5) * 6;
    const base = g.rim.cy - 6;
    const h = 24 + rand() * 12;
    const sway = 7 + rand() * 5;
    out.push(el('path', {
      d: 'M ' + n1(x) + ' ' + n1(base) +
        ' c ' + n1(sway) + ' ' + n1(-h * 0.32) + ' ' + n1(-sway) + ' ' + n1(-h * 0.56) + ' ' + n1(sway * 0.35) + ' ' + n1(-h),
      fill: 'none', stroke: 'rgba(255,255,255,0.62)', 'stroke-width': 3.4, 'stroke-linecap': 'round',
      class: animate ? 'bk-steam' : null,
      style: animate ? '--bk-i:' + i + ';animation-delay:-' + (i * 1.1).toFixed(1) + 's' : null,
    }));
  }
  return out.join('');
}

/** Sweat on a cold glass. Cheap (one path) and it reads instantly as chilled. */
function condensation(g: Geometry, seed: string): string {
  const rand = stream(seed, 'sweat');
  const pts: number[][] = [];
  for (let i = 0; i < 16; i++) {
    const y = g.topY + rand() * (g.baseY - g.topY) * 0.92;
    const wall = g.halfWidthAt(y);
    const side = rand() < 0.5 ? -1 : 1;
    pts.push([CX + side * wall * (0.35 + rand() * 0.55), y, 1 + rand() * 1.9]);
  }
  return el('path', { d: dotsPath(pts), fill: 'rgba(255,255,255,0.55)' });
}

/**
 * The bloom on a glass that came out of the freezer: a band hugging the inside of
 * the rim.
 *
 * Both edges sag by the SAME amount, and the lower one is pushed clear of the
 * upper arc's deepest point. Letting the two edges use different sags made the
 * band's top cross below its bottom, and the resulting bow-tie painted a white
 * wedge straight across the drink on most bowls.
 */
function frostHaze(g: Geometry, seed: string): string {
  const rand = stream(seed, 'frost');
  const sag = g.rim.ry * 2;
  const top = g.topY + 4;
  // Below the top arc's lowest point, and never past the drink's surface.
  const depth = Math.max(9, g.rim.ry * 1.4) * (0.8 + rand() * 0.7);
  const bottom = Math.min(top + sag * 0.5 + depth, g.surface.cy - 3);
  if (bottom <= top + sag * 0.5 + 3) return '';
  const wTop = g.topW * 0.97;
  const wBot = g.halfWidthAt(bottom) * 0.97;
  return el('path', {
    d: 'M ' + n1(CX - wTop) + ' ' + n1(top) +
      ' Q ' + CX + ' ' + n1(top + sag) + ' ' + n1(CX + wTop) + ' ' + n1(top) +
      ' L ' + n1(CX + wBot) + ' ' + n1(bottom) +
      ' Q ' + CX + ' ' + n1(bottom + sag) + ' ' + n1(CX - wBot) + ' ' + n1(bottom) + ' Z',
    fill: 'rgba(255,255,255,0.3)',
  });
}

/* ======================================================================
   GARNISHES

   Every garnish is built from a handful of shared primitives and then placed by
   `placement`, at a scale taken from the glass and an angle taken from the seed.
   The old drawing hung one item off one fixed anchor at one fixed size, which is
   why a shot glass could wear a citrus wheel wider than itself.
   ==================================================================== */

interface Anchor {
  x: number;
  y: number;
  /** Reference size for this garnish, already scaled to the glass. */
  s: number;
  /** -1 when the garnish sits on the left of the glass. */
  side: number;
  rot: number;
}

function anchorFor(g: Geometry, placement: GarnishPlacement, rand: () => number, index: number, side: number): Anchor {
  // Scaled to the glass, with a seeded ±12% so two drinks wearing the same wheel
  // are not wearing the same picture of a wheel.
  const base = clamp(g.topW * 0.46, 10, 20) * (0.88 + rand() * 0.24);
  if (placement === 'surface') {
    return {
      x: g.surface.cx + side * g.surface.rx * (0.1 + rand() * 0.3),
      y: g.surface.cy - 1,
      s: clamp(g.surface.rx * 0.46, 8, 19) * (0.9 + rand() * 0.2),
      side,
      rot: -18 + rand() * 36,
    };
  }
  if (placement === 'in-glass') {
    return {
      x: g.surface.cx + side * g.surface.rx * (0.12 + rand() * 0.28),
      y: g.surface.cy,
      s: base,
      side,
      rot: -10 + rand() * 20,
    };
  }
  if (placement === 'dust') {
    return { x: g.surface.cx, y: g.surface.cy, s: g.surface.rx, side, rot: 0 };
  }
  if (placement === 'skewer') {
    return { x: g.rim.cx, y: g.rim.cy - g.rim.ry * 0.2, s: clamp(g.topW * 0.34, 7, 14), side, rot: -14 + rand() * 28 };
  }
  // 'rim' — hooked ONTO the lip. The anchor sits just inside the rim's widest
  // point and on the rim line itself, so the garnish straddles the outline and
  // reads as slotted on. Sitting it clear of the glass, as the old anchor did,
  // made every garnish look like a sticker floating beside the drink.
  const t = (0.62 + rand() * 0.2) * side;
  return {
    x: g.rim.cx + g.rim.rx * t,
    y: g.rim.cy + g.rim.ry * Math.cos(t * 1.35),
    s: base,
    side,
    rot: (-14 + rand() * 28) * side,
  };
}

/* -- primitives ----------------------------------------------------------- */
function citrusWheel(a: Anchor, flesh: string, half: boolean): string {
  const r = a.s;
  const rind = darken(flesh, 0.16);
  const pale = lighten(flesh, 0.55);
  const segs: string[] = [];
  const n = 8;
  const from = half ? Math.PI : 0;
  const to = half ? Math.PI * 2 : Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const ang = from + ((i + 0.5) / n) * (to - from);
    segs.push('M 0 0 L ' + n1(Math.cos(ang) * r * 0.74) + ' ' + n1(Math.sin(ang) * r * 0.74));
  }
  const body = half
    ? el('path', { d: 'M ' + n1(-r) + ' 0 A ' + n1(r) + ' ' + n1(r) + ' 0 0 0 ' + n1(r) + ' 0 Z', fill: pale, stroke: INK, 'stroke-width': 2.8, 'stroke-linejoin': 'round' })
    : el('circle', { cx: 0, cy: 0, r: n1(r), fill: pale, stroke: INK, 'stroke-width': 2.8 });
  const peel = half
    ? el('path', { d: 'M ' + n1(-r) + ' 0 A ' + n1(r) + ' ' + n1(r) + ' 0 0 0 ' + n1(r) + ' 0', fill: 'none', stroke: rind, 'stroke-width': 3.4 })
    : el('circle', { cx: 0, cy: 0, r: n1(r - 1.7), fill: 'none', stroke: rind, 'stroke-width': 3.4 });
  return el(
    'g',
    { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(half ? a.rot * 0.4 : a.rot) + ')' },
    body + peel +
      el('path', { d: segs.join(' '), fill: 'none', stroke: rgba(darken(flesh, 0.3), 0.5), 'stroke-width': 1.3 }) +
      el('circle', { cx: n1(-r * 0.28), cy: n1(-r * 0.3), r: n1(r * 0.2), fill: 'rgba(255,255,255,0.5)' }),
  );
}

function citrusWedge(a: Anchor, flesh: string): string {
  const r = a.s * 1.15;
  const rind = darken(flesh, 0.2);
  return el(
    'g',
    { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot - a.side * 34) + ')' },
    el('path', {
      d: 'M 0 ' + n1(-r) + ' A ' + n1(r) + ' ' + n1(r) + ' 0 0 1 0 ' + n1(r) + ' Q ' + n1(r * 0.34) + ' 0 0 ' + n1(-r) + ' Z',
      fill: lighten(flesh, 0.42), stroke: INK, 'stroke-width': 2.8, 'stroke-linejoin': 'round',
    }) +
      el('path', { d: 'M 0 ' + n1(-r) + ' A ' + n1(r) + ' ' + n1(r) + ' 0 0 1 0 ' + n1(r), fill: 'none', stroke: rind, 'stroke-width': 3.6 }) +
      el('path', { d: 'M 0 ' + n1(-r * 0.62) + ' L ' + n1(r * 0.4) + ' 0 M 0 ' + n1(r * 0.62) + ' L ' + n1(r * 0.4) + ' 0', fill: 'none', stroke: rgba(darken(flesh, 0.3), 0.55), 'stroke-width': 1.3 }),
  );
}

/**
 * Three cuts of peel. A twist is the commonest garnish in the catalog by a wide
 * margin, and one curl repeated forty-four times was the most visible remaining
 * source of sameness — so the seed picks between a tight coil, a long ribbon and
 * a wide open loop, all of which a bar actually produces.
 */
const TWISTS = [
  // tight coil
  'M 0 0 c 13 3 18 14 10 24 c -8 10 -22 10 -27 1 c -3 -6 1 -13 8 -13 c 5 0 8 5 5 9',
  // long ribbon, falling into the glass
  'M 0 -6 c 16 6 19 20 8 30 c -9 8 -21 5 -22 -4 c -1 -7 6 -11 11 -7 c 4 3 3 8 -1 10',
  // wide open loop
  'M -4 -2 c 20 -6 30 10 20 22 c -8 10 -24 8 -27 -3 c -2 -8 6 -14 12 -10',
];
function twistCurl(a: Anchor, colour: string, variant: number): string {
  const s = a.s / 15;
  const path = TWISTS[variant % TWISTS.length];
  return el(
    'g',
    { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y - a.s * 0.5) + ') rotate(' + n1(a.rot) + ') scale(' + n1(a.side) + ' 1) scale(' + s.toFixed(2) + ')' },
    el('path', { d: path, fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }) +
      el('path', { d: path, fill: 'none', stroke: colour, 'stroke-width': 8, 'stroke-linecap': 'round' }) +
      el('path', { d: path, fill: 'none', stroke: rgba(lighten(colour, 0.55), 0.85), 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
  );
}

function cherryArt(x: number, y: number, r: number, colour: string, stem: boolean): string {
  return (
    (stem ? el('path', { d: 'M ' + n1(x) + ' ' + n1(y - r) + ' q ' + n1(r * 0.9) + ' ' + n1(-r * 1.3) + ' ' + n1(r * 1.7) + ' ' + n1(-r * 1.6), fill: 'none', stroke: '#6B3F1B', 'stroke-width': 2.2, 'stroke-linecap': 'round' }) : '') +
    el('circle', { cx: n1(x), cy: n1(y), r: n1(r), fill: colour, stroke: INK, 'stroke-width': 2.6 }) +
    el('ellipse', { cx: n1(x - r * 0.32), cy: n1(y - r * 0.34), rx: n1(r * 0.3), ry: n1(r * 0.22), fill: 'rgba(255,255,255,0.6)' })
  );
}

function oliveArt(x: number, y: number, r: number): string {
  return (
    el('ellipse', { cx: n1(x), cy: n1(y), rx: n1(r), ry: n1(r * 1.14), fill: '#8FA23C', stroke: INK, 'stroke-width': 2.4 }) +
    el('circle', { cx: n1(x), cy: n1(y), r: n1(r * 0.36), fill: '#C8402A' }) +
    el('ellipse', { cx: n1(x - r * 0.36), cy: n1(y - r * 0.42), rx: n1(r * 0.26), ry: n1(r * 0.18), fill: 'rgba(255,255,255,0.45)' })
  );
}

/** A cocktail pick laid across the rim with two or three things threaded on it. */
function skewer(a: Anchor, items: ((x: number, y: number, r: number) => string)[]): string {
  const len = a.s * 3.4;
  const out: string[] = [];
  const x0 = a.x - len / 2;
  const y0 = a.y - a.s * 0.5;
  out.push(el('line', {
    x1: n1(x0), y1: n1(y0 + len * 0.16), x2: n1(x0 + len), y2: n1(y0 - len * 0.16),
    stroke: '#8A6A48', 'stroke-width': 2.4, 'stroke-linecap': 'round',
  }));
  items.forEach((draw, i) => {
    const t = (i + 0.5) / items.length;
    out.push(draw(x0 + len * t, y0 + len * 0.16 - len * 0.32 * t, a.s * 0.62));
  });
  return out.join('');
}

function leafSprig(a: Anchor, colour: string, leaves: number, slim: boolean): string {
  const out: string[] = [];
  const h = a.s * 2.1;
  const stemTop = a.y - h;
  out.push(el('path', {
    d: 'M ' + n1(a.x) + ' ' + n1(a.y) + ' Q ' + n1(a.x + a.side * a.s * 0.3) + ' ' + n1(a.y - h * 0.55) + ' ' + n1(a.x + a.side * a.s * 0.12) + ' ' + n1(stemTop),
    fill: 'none', stroke: darken(colour, 0.3), 'stroke-width': 2.2, 'stroke-linecap': 'round',
  }));
  for (let i = 0; i < leaves; i++) {
    const t = 0.2 + (i / Math.max(1, leaves - 1)) * 0.78;
    const lx = a.x + a.side * a.s * 0.3 * t;
    const ly = a.y - h * t;
    const dir = i % 2 ? 1 : -1;
    const rx = slim ? a.s * 0.16 : a.s * 0.4;
    const ry = slim ? a.s * 0.52 : a.s * 0.56;
    out.push(el('ellipse', {
      cx: n1(lx + dir * rx * 0.8), cy: n1(ly), rx: n1(rx), ry: n1(ry),
      fill: i % 2 ? colour : lighten(colour, 0.12), stroke: darken(colour, 0.34), 'stroke-width': 1.6,
      transform: 'rotate(' + n1(dir * 42 - 8) + ' ' + n1(lx + dir * rx * 0.8) + ' ' + n1(ly) + ')',
    }));
  }
  return out.join('');
}

function garnishArt(gz: GarnishSpec, g: Geometry, seed: string, index: number): string {
  const rand = stream(seed, 'garn' + index);
  const placement: GarnishPlacement = gz.placement || 'rim';
  // Which side of the glass, taken straight from the seed rather than from each
  // garnish's own stream, so a second garnish is GUARANTEED the opposite side.
  // Drawing both from their own streams let a Mojito's lime wheel land on top of
  // its mint sprig one time in two.
  const side = (hash(seed + '#side') % 2 === 0 ? -1 : 1) * (index === 1 ? -1 : 1);
  const a = anchorFor(g, placement, rand, index, side);
  const t = gz.type;
  // Each garnish's own natural colour when the spec does not name one. A single
  // orange default meant an uncoloured mint sprig came out orange, and the
  // `colour || '#3E8B4A'` guards further down could never fire.
  const colour = gz.color || GARNISH_COLOUR[t] || '#E8862B';

  switch (t) {
    case 'lemon-wheel':
    case 'lime-wheel':
    case 'orange-wheel':
      return citrusWheel(a, colour, false);
    case 'orange-half-wheel':
      return citrusWheel(a, colour, true);
    case 'lemon-wedge':
    case 'lime-wedge':
    case 'orange-wedge':
      return citrusWedge(a, colour);
    case 'lemon-twist':
    case 'lime-twist':
    case 'orange-twist':
    case 'grapefruit-twist':
      return twistCurl(a, colour, hash(seed + '#curl') % TWISTS.length);
    case 'cherry':
      // A recipe that calls for several cherries (a Three Dots and a Dash, whose
      // three cherries spell the drink's name) asks for them on a pick.
      if (placement === 'skewer')
        return skewer(a, [
          (x, y, r) => cherryArt(x, y, r, colour, false),
          (x, y, r) => cherryArt(x, y, r, colour, false),
          (x, y, r) => cherryArt(x, y, r, colour, false),
        ]);
      return cherryArt(a.x, a.y + (placement === 'in-glass' ? a.s * 1.5 : a.s * 0.5), a.s * 0.56, colour, placement !== 'in-glass');
    case 'cherry-flag':
      return skewer(a, [
        (x, y, r) => cherryArt(x, y, r, colour, false),
        (x, y, r) => citrusWheel({ x, y, s: r * 1.2, side: 1, rot: 0 }, '#F09A2E', true),
      ]);
    case 'olive':
      return oliveArt(a.x, a.y + a.s * 0.5, a.s * 0.5);
    case 'olive-pick':
      return skewer(a, [oliveArt, oliveArt]);
    case 'celery':
      return el('g', { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot * 0.5) + ')' },
        el('path', { d: 'M ' + n1(-a.s * 0.28) + ' 4 C ' + n1(-a.s * 0.5) + ' ' + n1(-a.s * 1.4) + ' ' + n1(-a.s * 0.2) + ' ' + n1(-a.s * 2.2) + ' ' + n1(-a.s * 0.1) + ' ' + n1(-a.s * 3) + ' L ' + n1(a.s * 0.42) + ' ' + n1(-a.s * 3) + ' C ' + n1(a.s * 0.44) + ' ' + n1(-a.s * 2) + ' ' + n1(a.s * 0.36) + ' ' + n1(-a.s * 1) + ' ' + n1(a.s * 0.3) + ' 4 Z',
          fill: '#A9C46A', stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }) +
        el('path', { d: 'M ' + n1(a.s * 0.06) + ' ' + n1(-a.s * 2.7) + ' L ' + n1(a.s * 0.02) + ' 0', fill: 'none', stroke: 'rgba(70,100,40,0.45)', 'stroke-width': 1.4 }) +
        el('path', { d: 'M ' + n1(-a.s * 0.1) + ' ' + n1(-a.s * 3) + ' q ' + n1(-a.s * 0.7) + ' ' + n1(-a.s * 0.7) + ' ' + n1(-a.s * 0.2) + ' ' + n1(-a.s * 1.2) + ' q ' + n1(a.s * 0.8) + ' ' + n1(a.s * 0.1) + ' ' + n1(a.s * 0.8) + ' ' + n1(a.s * 1.2) + ' Z',
          fill: '#6E9C43', stroke: INK, 'stroke-width': 2 }));
    case 'cucumber-ribbon':
      return el('path', {
        d: 'M ' + n1(a.x) + ' ' + n1(a.y + a.s) + ' c ' + n1(a.side * a.s * 1.2) + ' ' + n1(-a.s * 0.8) + ' ' + n1(-a.side * a.s * 1.2) + ' ' + n1(-a.s * 1.6) + ' ' + n1(a.side * a.s * 0.3) + ' ' + n1(-a.s * 2.4),
        fill: 'none', stroke: '#9FC46B', 'stroke-width': 6, 'stroke-linecap': 'round',
      }) + el('path', {
        d: 'M ' + n1(a.x) + ' ' + n1(a.y + a.s) + ' c ' + n1(a.side * a.s * 1.2) + ' ' + n1(-a.s * 0.8) + ' ' + n1(-a.side * a.s * 1.2) + ' ' + n1(-a.s * 1.6) + ' ' + n1(a.side * a.s * 0.3) + ' ' + n1(-a.s * 2.4),
        fill: 'none', stroke: 'rgba(60,100,45,0.5)', 'stroke-width': 1.6, 'stroke-linecap': 'round',
      });
    case 'mint-sprig':
      return leafSprig(a, colour || '#3E8B4A', 5, false);
    case 'basil-leaf':
      return leafSprig(a, colour || '#3B7A3A', 3, false);
    case 'rosemary-sprig':
      return leafSprig(a, colour || '#4F7A4A', 7, true);
    case 'coffee-beans': {
      const out: string[] = [];
      [[-1.1, 0.2], [0, -0.5], [1.1, 0.25]].forEach((o, i) => {
        const bx = a.x + o[0] * a.s * 0.62;
        const by = a.y + o[1] * a.s * 0.5;
        const r = a.s * 0.36;
        out.push(el('ellipse', { cx: n1(bx), cy: n1(by), rx: n1(r), ry: n1(r * 0.66), fill: '#3A241A', stroke: '#1F120B', 'stroke-width': 1.2, transform: 'rotate(' + (i * 26 - 22) + ' ' + n1(bx) + ' ' + n1(by) + ')' }));
        out.push(el('path', { d: 'M ' + n1(bx) + ' ' + n1(by - r * 0.6) + ' q ' + n1(r * 0.34) + ' ' + n1(r * 0.6) + ' 0 ' + n1(r * 1.2), fill: 'none', stroke: '#1F120B', 'stroke-width': 1, transform: 'rotate(' + (i * 26 - 22) + ' ' + n1(bx) + ' ' + n1(by) + ')' }));
      });
      return out.join('');
    }
    case 'nutmeg-dust': {
      const pts: number[][] = [];
      for (let i = 0; i < 22; i++) {
        const ang = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand());
        pts.push([g.surface.cx + Math.cos(ang) * g.surface.rx * 0.84 * rr, g.surface.cy + Math.sin(ang) * g.surface.ry * 0.84 * rr, 0.7 + rand() * 1.2]);
      }
      return el('path', { d: dotsPath(pts), fill: colour || '#A9754A' });
    }
    case 'cinnamon-stick':
      return el('g', { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot + a.side * 18) + ')' },
        el('rect', { x: n1(-a.s * 0.22), y: n1(-a.s * 2.6), width: n1(a.s * 0.44), height: n1(a.s * 3.2), rx: n1(a.s * 0.2), fill: '#A5642C', stroke: INK, 'stroke-width': 2.2 }) +
        el('path', { d: 'M ' + n1(-a.s * 0.1) + ' ' + n1(-a.s * 2.4) + ' L ' + n1(-a.s * 0.1) + ' ' + n1(a.s * 0.4), fill: 'none', stroke: 'rgba(90,50,20,0.5)', 'stroke-width': 1.4 }));
    case 'star-anise': {
      let d = '';
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const px = a.x + Math.cos(ang) * a.s * 0.86;
        const py = a.y + Math.sin(ang) * a.s * 0.86;
        d += 'M ' + n1(a.x) + ' ' + n1(a.y) + ' L ' + n1(px) + ' ' + n1(py) + ' ';
      }
      return el('path', { d: d, fill: 'none', stroke: colour, 'stroke-width': 4.4, 'stroke-linecap': 'round' }) +
        el('circle', { cx: n1(a.x), cy: n1(a.y), r: n1(a.s * 0.28), fill: lighten(colour, 0.25) });
    }
    case 'pineapple-wedge':
      return el('g', { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot * 0.5) + ')' },
        el('path', { d: 'M ' + n1(-a.s * 0.85) + ' ' + n1(a.s * 0.5) + ' L ' + n1(a.s * 0.85) + ' ' + n1(a.s * 0.5) + ' L ' + n1(a.s * 0.5) + ' ' + n1(-a.s * 1.1) + ' L ' + n1(-a.s * 0.5) + ' ' + n1(-a.s * 1.1) + ' Z',
          fill: '#F2C94C', stroke: INK, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }) +
        el('path', { d: 'M ' + n1(-a.s * 0.78) + ' ' + n1(a.s * 0.36) + ' L ' + n1(a.s * 0.78) + ' ' + n1(a.s * 0.36), fill: 'none', stroke: '#C99C2E', 'stroke-width': 3 }) +
        el('path', { d: 'M ' + n1(-a.s * 0.3) + ' ' + n1(-a.s * 1.1) + ' q ' + n1(-a.s * 0.5) + ' ' + n1(-a.s * 0.9) + ' ' + n1(-a.s * 0.1) + ' ' + n1(-a.s * 1.5) + ' q ' + n1(a.s * 0.55) + ' ' + n1(a.s * 0.45) + ' ' + n1(a.s * 0.45) + ' ' + n1(a.s * 1.5) + ' Z',
          fill: '#5E9B45', stroke: INK, 'stroke-width': 2 }) +
        el('path', { d: 'M ' + n1(a.s * 0.2) + ' ' + n1(-a.s * 1.1) + ' q ' + n1(a.s * 0.5) + ' ' + n1(-a.s * 0.8) + ' ' + n1(a.s * 0.55) + ' ' + n1(-a.s * 1.3) + ' q ' + n1(-a.s * 0.6) + ' ' + n1(a.s * 0.3) + ' ' + n1(-a.s * 0.75) + ' ' + n1(a.s * 1.3) + ' Z',
          fill: '#4E8A3B', stroke: INK, 'stroke-width': 2 }));
    case 'orchid': {
      const out: string[] = [];
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        out.push(el('ellipse', {
          cx: n1(a.x + Math.cos(ang) * a.s * 0.52), cy: n1(a.y + Math.sin(ang) * a.s * 0.52),
          rx: n1(a.s * 0.46), ry: n1(a.s * 0.3), fill: colour, stroke: INK, 'stroke-width': 2,
          transform: 'rotate(' + n1((ang * 180) / Math.PI) + ' ' + n1(a.x + Math.cos(ang) * a.s * 0.52) + ' ' + n1(a.y + Math.sin(ang) * a.s * 0.52) + ')',
        }));
      }
      out.push(el('circle', { cx: n1(a.x), cy: n1(a.y), r: n1(a.s * 0.24), fill: '#F2C94C', stroke: INK, 'stroke-width': 1.8 }));
      return out.join('');
    }
    case 'apple-fan': {
      const out: string[] = [];
      for (let i = 0; i < 4; i++) {
        out.push(el('path', {
          d: 'M 0 0 L ' + n1(a.s * 1.5) + ' ' + n1(-a.s * 0.22) + ' L ' + n1(a.s * 1.5) + ' ' + n1(a.s * 0.16) + ' Z',
          fill: i % 2 ? '#F6F0DA' : '#EFE6C8', stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round',
          transform: 'translate(' + n1(a.x) + ' ' + n1(a.y + a.s * 0.4) + ') rotate(' + n1(-58 + i * 17 + a.rot * 0.4) + ')',
        }));
      }
      return out.join('');
    }
    case 'strawberry':
      return el('g', { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot * 0.5) + ')' },
        el('path', { d: 'M ' + n1(-a.s * 0.6) + ' ' + n1(-a.s * 0.4) + ' Q ' + n1(-a.s * 0.7) + ' ' + n1(a.s * 0.9) + ' 0 ' + n1(a.s * 1.1) + ' Q ' + n1(a.s * 0.7) + ' ' + n1(a.s * 0.9) + ' ' + n1(a.s * 0.6) + ' ' + n1(-a.s * 0.4) + ' Z',
          fill: '#D8324A', stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }) +
        el('path', { d: 'M ' + n1(-a.s * 0.72) + ' ' + n1(-a.s * 0.42) + ' L ' + n1(a.s * 0.72) + ' ' + n1(-a.s * 0.42) + ' L 0 ' + n1(-a.s * 0.1) + ' Z', fill: '#5E9B45', stroke: INK, 'stroke-width': 1.8 }));
    case 'cardamom-pod':
      return el('g', { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot + a.side * 26) + ')' },
        el('ellipse', { cx: 0, cy: 0, rx: n1(a.s * 0.3), ry: n1(a.s * 0.62), fill: colour, stroke: INK, 'stroke-width': 2.2 }) +
        el('path', {
          d: 'M 0 ' + n1(-a.s * 0.52) + ' L 0 ' + n1(a.s * 0.52) +
            ' M ' + n1(-a.s * 0.15) + ' ' + n1(-a.s * 0.42) + ' L ' + n1(-a.s * 0.15) + ' ' + n1(a.s * 0.42) +
            ' M ' + n1(a.s * 0.15) + ' ' + n1(-a.s * 0.42) + ' L ' + n1(a.s * 0.15) + ' ' + n1(a.s * 0.42),
          fill: 'none', stroke: darken(colour, 0.34), 'stroke-width': 1.1,
        }) +
        el('path', { d: 'M 0 ' + n1(-a.s * 0.6) + ' l 0 ' + n1(-a.s * 0.34), fill: 'none', stroke: darken(colour, 0.42), 'stroke-width': 2, 'stroke-linecap': 'round' }));
    case 'chilli':
      return el('g', { transform: 'translate(' + n1(a.x) + ' ' + n1(a.y) + ') rotate(' + n1(a.rot + a.side * 22) + ')' },
        el('path', {
          d: 'M 0 ' + n1(-a.s * 0.5) + ' c ' + n1(a.s * 0.42) + ' ' + n1(a.s * 0.2) + ' ' + n1(a.s * 0.5) + ' ' + n1(a.s * 1.1) + ' ' + n1(a.s * 0.12) + ' ' + n1(a.s * 2.1) +
            ' c ' + n1(-a.s * 0.34) + ' ' + n1(-a.s * 0.9) + ' ' + n1(-a.s * 0.44) + ' ' + n1(-a.s * 1.6) + ' ' + n1(-a.s * 0.12) + ' ' + n1(-a.s * 2.1) + ' Z',
          fill: colour, stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round',
        }) +
        el('path', { d: 'M 0 ' + n1(-a.s * 0.5) + ' q ' + n1(-a.s * 0.5) + ' ' + n1(-a.s * 0.4) + ' ' + n1(-a.s * 0.2) + ' ' + n1(-a.s * 0.8), fill: 'none', stroke: '#5E9B45', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    case 'raspberries':
    case 'grapes': {
      const berry = t === 'grapes' ? '#7A4E86' : '#C22348';
      const out: string[] = [];
      [[-0.62, 0.2], [0.62, 0.2], [0, -0.5]].forEach((o) => {
        const bx = a.x + o[0] * a.s * 0.9;
        const by = a.y + o[1] * a.s * 0.9;
        out.push(el('circle', { cx: n1(bx), cy: n1(by), r: n1(a.s * 0.44), fill: berry, stroke: INK, 'stroke-width': 2.2 }));
        out.push(el('circle', { cx: n1(bx - a.s * 0.14), cy: n1(by - a.s * 0.16), r: n1(a.s * 0.12), fill: 'rgba(255,255,255,0.5)' }));
      });
      return out.join('');
    }
    default:
      return '';
  }
}

/* ======================================================================
   MOTION

   Two modes. `ambient` is the endless part — bubbles climbing, steam drifting,
   a garnish that breathes — and is cheap enough that a whole grid can carry it:
   only drinks that actually have bubbles or steam emit any animated node at all.
   `pour` adds the one-shot build and is for the single recipe the user opened.

   Shipped as a <style> inside the SVG rather than in the component: the drawing
   is handed to Angular as an [innerHTML] string, which never picks up a
   component's scoped styles. Rule names are shared on purpose — 126 copies of an
   identical declaration cost nothing and behave identically — while everything
   per-instance travels in a CSS custom property on the element itself.

   Every rule animates FROM a start state TO the drawing's normal, static state.
   That is deliberate: switch the animations off — the reduced-motion query below,
   or the app-wide one in styles.scss — and what is left is exactly the finished
   glass, with no fallback to maintain.
   ==================================================================== */
function motionStyle(mode: Motion, id: string, needs: { bubbles: boolean; steam: boolean; sway: boolean }): string {
  const rules: string[] = [];
  if (needs.bubbles)
    rules.push('.bk-bub{animation-name:bk-bub;animation-timing-function:linear;animation-iteration-count:infinite}' +
      '@keyframes bk-bub{0%{opacity:0;transform:translateY(0)}14%{opacity:.85}100%{opacity:0;transform:translateY(var(--bk-rise,-30px))}}');
  if (needs.steam)
    rules.push('.bk-steam{transform-box:fill-box;transform-origin:50% 100%;opacity:.62;animation:bk-steam 3.4s ease-in-out infinite}' +
      '@keyframes bk-steam{0%,100%{opacity:.32;transform:translateY(0) scaleX(1)}50%{opacity:.7;transform:translateY(-5px) scaleX(1.14)}}');
  if (needs.sway)
    rules.push('.bk-sway{transform-box:fill-box;transform-origin:50% 90%;animation:bk-sway 6s ease-in-out infinite}' +
      '@keyframes bk-sway{0%,100%{transform:rotate(0)}50%{transform:rotate(2.2deg)}}');
  if (mode === 'pour') {
    const sel = '#' + id + ' ';
    rules.push(
      sel + '.bk-rise{transform-box:fill-box;transform-origin:50% 100%;animation:bk-fill .95s cubic-bezier(.22,.75,.3,1) both}' +
      sel + '.bk-surface{animation:bk-level .95s cubic-bezier(.22,.75,.3,1) both}' +
      sel + '.bk-garnish{transform-box:fill-box;transform-origin:50% 50%;animation:bk-land .5s cubic-bezier(.3,1.5,.5,1) .72s both}' +
      '@keyframes bk-fill{from{transform:scaleY(0)}to{transform:scaleY(1)}}' +
      '@keyframes bk-level{from{transform:translateY(var(--bk-drop,40px))}to{transform:translateY(0)}}' +
      '@keyframes bk-land{from{opacity:0;transform:translateY(-16px) rotate(-12deg)}to{opacity:1;transform:none}}',
    );
  }
  if (!rules.length) return '';
  return (
    '<style>' + rules.join('') +
    '@media(prefers-reduced-motion:reduce){.bk-bub,.bk-steam,.bk-sway,#' + id + ' .bk-rise,#' + id + ' .bk-surface,#' + id + ' .bk-garnish{animation:none}}' +
    '</style>'
  );
}

/* ======================================================================
   MAIN RENDERER
   ==================================================================== */
export function barkastGlassSVG(spec: GlassSpec): string {
  spec = spec || {};
  const name: GlassName = spec.glass && GLASS[spec.glass] ? spec.glass : 'rocks';
  const cfg = applyCut(GLASS[name], spec.cut || 'classic');
  const liquid = spec.liquid || '#D9A441';
  const seed = spec.seed || name + liquid;
  const hero = spec.detail !== 'card';
  const mode: Motion = spec.motion || 'none';
  const ice: IceStyle = spec.ice || 'none';
  const fizz: FizzLevel = spec.fizz || 'none';
  const clarity: Clarity = spec.clarity || 'hazy';
  const steam = spec.steam === true;
  const foam: FoamKind = spec.foam || 'none';
  const garnishes = (spec.garnishes || []).slice(0, 2);

  // Camera elevation. You lean over a mound of crushed ice, a slush, a head of
  // foam or a wheel floating on the surface; you meet a stirred drink served up
  // at eye level. Deriving it from the drink means the viewpoint says something.
  const looksInto =
    ice === 'crushed' || ice === 'pebble' || ice === 'frozen-slush' ||
    foam !== 'none' || steam ||
    garnishes.some((gz) => gz.placement === 'surface' || gz.placement === 'dust');
  const ecc = looksInto ? 0.235 : ice === 'none' && fizz === 'none' ? 0.172 : 0.196;

  const fill = clamp(spec.fill != null ? spec.fill : cfg.fill, 0.12, 0.97);
  const g = geometry(cfg, fill, ecc);
  // Deterministic: the same drink produces byte-identical markup on every render,
  // whatever else is on the page. A module counter made the output depend on how
  // many glasses had been drawn before it, which no snapshot test can pin down.
  const id = 'bk' + hash(seed + '|' + name + '|' + liquid).toString(36);
  const parts: string[] = [];

  const animBubbles = mode !== 'none' && fizz !== 'none';
  // Bubbles and steam earn their keep on a card: they only appear on the drinks
  // that actually have them (31 and 4 of the catalog's 126), so most of the grid
  // stays completely still. A swaying garnish would be on every single card, and
  // 126 groups transforming forever is a compositor running for no reason — it is
  // worth it on the one glass being looked at, and nowhere else.
  const animSway = mode !== 'none' && hero && garnishes.length > 0;
  parts.push(motionStyle(mode, id, { bubbles: animBubbles, steam: mode !== 'none' && steam, sway: animSway }));

  /* ---- defs: one liquid gradient, one wall shade, one clip ------------- */
  const lg = id + 'l';
  const sg = id + 'w';
  const clip = id + 'c';
  parts.push(
    '<defs>' +
      liquidGradient(lg, spec, liquid) +
      bodyShadeGradient(sg, clarity === 'opaque' ? 0.2 : 0.13) +
      '<clipPath id="' + clip + '">' + el('path', { d: g.liquidPath }) + '</clipPath>' +
      '<radialGradient id="' + id + 's" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + rgba(INK_HEX, 0.2) + '"/>' +
      '<stop offset="1" stop-color="' + rgba(INK_HEX, 0) + '"/>' +
      '</radialGradient>' +
      '</defs>',
  );

  /* ---- the table: a contact shadow thrown right, and the drink's own
          colour pooling through the glass onto it -------------------------- */
  const footY = g.stem ? g.stem.footY : g.baseY;
  const footW = g.stem ? g.stem.footW : g.botW;
  const away = -LIGHT.x; // the shadow falls opposite the key light
  parts.push(el('ellipse', { cx: n1(CX + footW * 0.46 * away), cy: footY + 8, rx: n1(footW * 1.9), ry: n1(footW * 0.32), fill: 'url(#' + id + 's)' }));
  // The caustic: the drink's own colour, focused through the glass onto the table.
  // It is the only place the drawing puts the drink outside its own outline, so a
  // Negroni casts red and a Grasshopper casts green even at thumbnail size.
  if (clarity !== 'opaque')
    parts.push(el('ellipse', { cx: n1(CX + footW * 0.8 * away), cy: footY + 7, rx: n1(footW * 0.8), ry: n1(footW * 0.19), fill: rgba(liquid, 0.34) }));

  /* ---- the empty vessel behind the drink -------------------------------- */
  parts.push(el('path', { d: g.bodyPath, fill: 'var(--bk-glass, rgba(242,246,247,0.42))', stroke: 'none' }));

  /* ---- the drink -------------------------------------------------------- */
  const contents: string[] = [];
  contents.push(el('path', { d: g.liquidPath, fill: 'url(#' + lg + ')' }));
  contents.push(el('path', { d: g.liquidPath, fill: 'url(#' + sg + ')' }));
  if (clarity === 'cloudy') contents.push(el('path', { d: g.liquidPath, fill: 'rgba(255,255,255,0.16)' }));
  else if (clarity === 'hazy') contents.push(el('path', { d: g.liquidPath, fill: 'rgba(255,255,255,0.07)' }));

  // Everything suspended in the drink is clipped to the pour, so a tapered bowl
  // never leaks an ice cube or a bubble out through its wall.
  const inside: string[] = [];
  if (ice === 'frozen-slush') inside.push(slushTexture(g, seed, hero));
  inside.push(inclusions(g, spec.inclusion || 'none', seed));
  inside.push(iceLayer(g, spec, seed, hero, sg, 'inside'));
  inside.push(bubbles(g, seed, fizz, animBubbles, hero));
  const insideArt = inside.join('');
  if (insideArt) contents.push(el('g', { 'clip-path': 'url(#' + clip + ')' }, insideArt));

  /* ---- the meniscus, and whatever is riding on it ----------------------- */
  const surface: string[] = [foamCap(g, spec, liquid, seed)];
  if (fizz !== 'none' && hero) surface.push(fizzCollar(g, seed, fizz));

  if (mode === 'pour') {
    // How far the drink has to climb: from the base of the drawn liquid up to the
    // fill line. The clip grows over exactly that band and the meniscus drops by
    // exactly the same distance, so the two move in lockstep.
    const climb = Math.max(1, g.baseY - g.fillY);
    parts.push(
      '<clipPath id="' + id + 'r">' +
        el('rect', { class: 'bk-rise', x: -20, y: n1(g.fillY), width: VB + 40, height: n1(climb) }) +
        '</clipPath>' +
        // The meniscus is clipped so that, at the start of the pour when it sits
        // down at the base, its too-wide ellipse cannot poke out through the
        // walls. The glass BODY alone is the wrong clip: its top edge is the
        // front rim arc, which dips below the rim line, so it also shaved the
        // back off the finished meniscus and cut an egg-white or whipped-cream
        // cap clean off. Union it with everything above the rim, which the
        // travelling meniscus can only reach once it has arrived.
        '<clipPath id="' + id + 'b">' + el('path', { d: g.bodyPath }) +
        el('rect', { x: -20, y: -60, width: VB + 40, height: n1(g.rim.cy + 60) }) + '</clipPath>',
    );
    parts.push(el('g', { 'clip-path': 'url(#' + id + 'r)' }, contents.join('')));
    parts.push(el('g', { class: 'bk-surface', 'clip-path': 'url(#' + id + 'b)', style: '--bk-drop:' + n1(climb) + 'px' }, surface.join('')));
  } else {
    parts.push(contents.join(''));
    parts.push(surface.join(''));
  }

  /* ---- the front wall of the glass, drawn OVER the drink ---------------- */
  // Without this the liquid touches the ink outline directly and the whole thing
  // reads as a flat colour swatch inside a line drawing. Three millimetres of
  // glass tint and dull what is behind them; this is that pane.
  parts.push(el('path', { d: g.bodyPath, fill: 'url(#' + sg + ')', opacity: 0.55 }));

  /* ---- crushed ice and whipped cream stand above the rim, so they are
          drawn after the drink but before the outline ---------------------- */
  if (ice === 'crushed') parts.push(iceLayer(g, spec, seed, hero, sg, 'above'));

  /* ---- stem, foot, handle ----------------------------------------------- */
  if (g.stem) {
    parts.push(el('line', Object.assign({ x1: CX, y1: g.stem.fromY - 2, x2: CX, y2: g.stem.footY - 6 }, stroke(4))));
    parts.push(el('path', Object.assign({ d: 'M ' + (CX - g.stem.footW) + ' ' + g.stem.footY + ' Q ' + CX + ' ' + (g.stem.footY + g.stem.footW * 0.34) + ' ' + (CX + g.stem.footW) + ' ' + g.stem.footY }, stroke(4))));
    parts.push(el('path', Object.assign({ d: 'M ' + (CX - g.stem.footW) + ' ' + g.stem.footY + ' Q ' + CX + ' ' + (g.stem.footY - g.stem.footW * 0.2) + ' ' + (CX + g.stem.footW) + ' ' + g.stem.footY }, stroke(4, { stroke: rgba(INK_HEX, 0.35), 'stroke-width': 2 }))));
  }
  if (g.handle) {
    const hx0 = CX + g.topW;
    parts.push(el('path', Object.assign({ d: 'M ' + hx0 + ' ' + (g.topY + 46) + ' C ' + (hx0 + 46) + ' ' + (g.topY + 46) + ' ' + (hx0 + 46) + ' ' + (g.baseY - 48) + ' ' + hx0 + ' ' + (g.baseY - 48) }, stroke(6))));
  }

  /* ---- the glass itself: outline, then the light on it ------------------ */
  parts.push(el('path', Object.assign({ d: g.sides }, stroke(4))));
  parts.push(el('ellipse', Object.assign({ cx: g.rim.cx, cy: g.rim.cy, rx: n1(g.rim.rx), ry: n1(g.rim.ry) }, stroke(4))));
  parts.push(el('ellipse', { cx: g.rim.cx, cy: g.rim.cy + 1.5, rx: n1(g.rim.rx - 3), ry: n1(Math.max(1, g.rim.ry - 1.5)), fill: 'none', stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1.4 }));

  // The key light's own reflection: a long sheen down the lit wall, and a short,
  // tighter rim light catching the far edge. Both follow the actual silhouette
  // instead of running straight down, so a goblet's sheen bends with its bowl.
  const sheenTop = g.topY + Math.max(10, g.topW * 0.4);
  const sheenBot = Math.min(g.baseY - 12, sheenTop + (g.baseY - sheenTop) * 0.62);
  const sx = (y: number, k: number): number => CX + LIGHT.x * g.halfWidthAt(y) * k;
  parts.push(el('path', {
    d: 'M ' + n1(sx(sheenTop, 1.03)) + ' ' + n1(sheenTop) + ' Q ' + n1(sx((sheenTop + sheenBot) / 2, 1.2)) + ' ' + n1((sheenTop + sheenBot) / 2) + ' ' + n1(sx(sheenBot, 1)) + ' ' + n1(sheenBot),
    fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 3.4, 'stroke-linecap': 'round',
  }));
  if (hero)
    parts.push(el('path', {
      d: 'M ' + n1(sx(sheenTop + 6, -1.33)) + ' ' + n1(sheenTop + 6) + ' Q ' + n1(sx((sheenTop + sheenBot) / 2, -1.43)) + ' ' + n1((sheenTop + sheenBot) / 2) + ' ' + n1(sx(sheenBot * 0.92, -1.3)) + ' ' + n1(sheenBot * 0.92),
      fill: 'none', stroke: 'rgba(255,255,255,0.3)', 'stroke-width': 1.8, 'stroke-linecap': 'round',
    }));

  /* ---- cold, hot, crusted ----------------------------------------------- */
  if (ice !== 'none' && !steam && hero) parts.push(condensation(g, seed));
  if (ice === 'none' && !steam && g.kind === 'bowl' && foam === 'none') parts.push(frostHaze(g, seed));
  parts.push(rimCrust(spec.rim || 'none', g, seed));
  if (steam) parts.push(steamWisps(g, seed, mode !== 'none'));

  /* ---- straw and garnish, last: they overlap everything ----------------- */
  parts.push(strawArt(g, spec.straw || 'none', seed, liquid));

  if (garnishes.length) {
    let drawn = garnishes.map((gz, i) => garnishArt(gz, g, seed, i)).join('');
    // Nested, not both on one group: `bk-garnish` is id-scoped and so outranks
    // `bk-sway`, and a single `animation` property cannot hold both anyway — put
    // them on the same element and the landing silently cancels the breathing.
    if (animSway) drawn = el('g', { class: 'bk-sway' }, drawn);
    if (mode === 'pour') drawn = el('g', { class: 'bk-garnish' }, drawn);
    parts.push(drawn);
  }

  return (
    '<svg id="' + id + '"' +
    ' viewBox="0 0 ' + VB + ' 260" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"' +
    ' role="presentation" aria-hidden="true"' +
    ' style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">' +
    parts.join('') +
    '</svg>'
  );
}
