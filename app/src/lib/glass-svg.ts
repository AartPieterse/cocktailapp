/* ============================================================================
   Barkast Glassware — portable, data-driven cocktail glass renderer.

   TypeScript port of the original framework-agnostic `glassware.js`. Pure SVG on
   a fixed viewBox (0 0 200 260), so it stays razor sharp at 40px in a card or
   400px on a hero. `barkastGlassSVG(spec)` returns an `<svg>…</svg>` string that
   the GlassArt component drops in via [innerHTML].
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

export interface GarnishSpec {
  type: 'wheel' | 'wedge' | 'twist' | 'cherry' | 'mint' | 'beans';
  color?: string;
}

export interface GlassSpec {
  glass?: GlassName;
  liquid?: string;
  garnish?: GarnishSpec | null;
  ice?: boolean;
  fizz?: boolean;
  foam?: boolean;
  rim?: 'salt' | 'sugar' | null;
}

const INK = '#241E17';
const VB = 200; // viewBox is 0 0 200 260, centre line x = 100
const CX = 100;
let uid = 0; // unique-id counter for gradients (avoids clashes)

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

/* ---- svg primitives ---------------------------------------------------- */
function el(tag: string, attrs: Attrs, kids?: string): string {
  let s = '<' + tag;
  for (const k in attrs) {
    if (attrs[k] == null || attrs[k] === false) continue;
    s += ' ' + k + '="' + attrs[k] + '"';
  }
  s += kids != null ? '>' + kids + '</' + tag + '>' : '/>';
  return s;
}
const stroke = (w: number, extra?: Attrs): Attrs =>
  Object.assign(
    { fill: 'none', stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    extra || {},
  );

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
  martini: { kind: 'bowl', profile: [[46, 74], [128, 2]], stemTo: 128, footY: 250, footW: 38, fill: 0.74 },
  coupe: { kind: 'bowl', profile: [[60, 70], [72, 73], [122, 9]], stemTo: 122, footY: 250, footW: 38, fill: 0.8 },
  nick_and_nora: { kind: 'bowl', profile: [[64, 50], [80, 53], [126, 8]], stemTo: 126, footY: 250, footW: 34, fill: 0.78 },
  wine: { kind: 'bowl', profile: [[44, 62], [64, 73], [120, 70], [166, 40]], stemTo: 166, footY: 252, footW: 40, fill: 0.62 },
  flute: { kind: 'bowl', profile: [[24, 25], [70, 31], [156, 22]], stemTo: 156, footY: 252, footW: 30, fill: 0.86 },
  hurricane: { kind: 'bowl', profile: [[30, 40], [66, 54], [120, 58], [168, 30]], stemTo: 168, footY: 252, footW: 36, fill: 0.72 },
};

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

/* smooth right-side path down a bowl profile (goblet curve) */
function rightCurve(profile: number[][]): string {
  let d = 'M ' + (CX + profile[0][1]) + ' ' + profile[0][0];
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    const dy = (b[0] - a[0]) * 0.42;
    d += ' C ' + (CX + a[1]) + ' ' + (a[0] + dy) + ' ' + (CX + b[1]) + ' ' + (b[0] - dy) + ' ' + (CX + b[1]) + ' ' + b[0];
  }
  return d;
}
function leftCurveReverse(profile: number[][]): string {
  const n = profile.length;
  let d = '';
  for (let i = n - 1; i >= 1; i--) {
    const b = profile[i];
    const a = profile[i - 1];
    const dy = (b[0] - a[0]) * 0.42;
    d += ' C ' + (CX - b[1]) + ' ' + (b[0] - dy) + ' ' + (CX - a[1]) + ' ' + (a[0] + dy) + ' ' + (CX - a[1]) + ' ' + a[0];
  }
  return d;
}

/* ======================================================================
   GEOMETRY — returns everything the renderer needs, family-agnostic
   ==================================================================== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geometry(cfg: GlassCfg): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = {};
  if (cfg.kind === 'straight') {
    const topY = cfg.topY!;
    const topW = cfg.topW!;
    const botY = cfg.botY!;
    const botW = cfg.botW!;
    const fillY = botY - (botY - topY) * cfg.fill;
    const wf = topW + (botW - topW) * ((fillY - topY) / (botY - topY));
    g.topY = topY;
    g.topW = topW;
    g.botY = botY;
    g.botW = botW;
    g.fillY = fillY;
    g.wf = wf;
    g.topRy = topW * 0.17;
    g.botRy = botW * 0.15;
    g.fRy = wf * 0.17;

    g.bodyPath =
      'M ' + (CX - topW) + ' ' + topY +
      ' L ' + (CX - botW) + ' ' + botY +
      ' Q ' + CX + ' ' + (botY + g.botRy) + ' ' + (CX + botW) + ' ' + botY +
      ' L ' + (CX + topW) + ' ' + topY +
      ' Q ' + CX + ' ' + (topY + g.topRy) + ' ' + (CX - topW) + ' ' + topY + ' Z';
    g.sides =
      'M ' + (CX - topW) + ' ' + topY + ' L ' + (CX - botW) + ' ' + botY +
      ' Q ' + CX + ' ' + (botY + g.botRy) + ' ' + (CX + botW) + ' ' + botY +
      ' L ' + (CX + topW) + ' ' + topY;
    g.liquidPath =
      'M ' + (CX - wf) + ' ' + fillY +
      ' L ' + (CX - botW) + ' ' + botY +
      ' Q ' + CX + ' ' + (botY + g.botRy) + ' ' + (CX + botW) + ' ' + botY +
      ' L ' + (CX + wf) + ' ' + fillY +
      ' Q ' + CX + ' ' + (fillY + g.fRy) + ' ' + (CX - wf) + ' ' + fillY + ' Z';
    g.rim = { cx: CX, cy: topY, rx: topW, ry: g.topRy };
    g.surface = { cx: CX, cy: fillY, rx: wf, ry: g.fRy };
    g.anchor = { x: CX + topW * 0.62, y: topY + 2, w: topW };
    g.handle = cfg.handle;
  } else {
    const p = cfg.profile!;
    const last = p[p.length - 1];
    const topW2 = p[0][1];
    const topY2 = p[0][0];
    const fillY2 = last[0] - (last[0] - topY2) * cfg.fill;
    const wf2 = widthAtY(p, fillY2);
    g.topY = topY2;
    g.topW = topW2;
    g.fillY = fillY2;
    g.wf = wf2;
    g.topRy = topW2 * 0.19;
    g.fRy = wf2 * 0.19;

    g.bodyPath =
      rightCurve(p) +
      (last[1] > 6
        ? ' Q ' + CX + ' ' + (last[0] + last[1] * 0.5) + ' ' + (CX - last[1]) + ' ' + last[0]
        : ' L ' + (CX - last[1]) + ' ' + last[0]) +
      leftCurveReverse(p) +
      ' Q ' + CX + ' ' + (topY2 + g.topRy) + ' ' + (CX + topW2) + ' ' + topY2 + ' Z';
    g.sides =
      rightCurve(p) +
      (last[1] > 6
        ? ' Q ' + CX + ' ' + (last[0] + last[1] * 0.5) + ' ' + (CX - last[1]) + ' ' + last[0]
        : ' L ' + (CX - last[1]) + ' ' + last[0]) +
      leftCurveReverse(p);

    const sub: number[][] = [[fillY2, wf2]];
    for (let i = 0; i < p.length; i++) if (p[i][0] > fillY2) sub.push(p[i]);
    const subLast = sub[sub.length - 1];
    g.liquidPath =
      rightCurve(sub) +
      (subLast[1] > 6
        ? ' Q ' + CX + ' ' + (subLast[0] + subLast[1] * 0.5) + ' ' + (CX - subLast[1]) + ' ' + subLast[0]
        : ' L ' + (CX - subLast[1]) + ' ' + subLast[0]) +
      leftCurveReverse(sub) +
      ' Q ' + CX + ' ' + (fillY2 + g.fRy) + ' ' + (CX + wf2) + ' ' + fillY2 + ' Z';

    g.rim = { cx: CX, cy: topY2, rx: topW2, ry: g.topRy };
    g.surface = { cx: CX, cy: fillY2, rx: wf2, ry: g.fRy };
    g.anchor = { x: CX + topW2 * 0.66, y: topY2 + 1, w: topW2 };
    g.stem = { fromY: cfg.stemTo, footY: cfg.footY, footW: cfg.footW };
  }
  return g;
}

/* ======================================================================
   GARNISHES — each returns an svg fragment placed near the rim
   ==================================================================== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function garnish(type: string, color: string | undefined, g: any): string {
  color = color || '#E8862B';
  const a = g.anchor;
  const x = a.x;
  const y = a.y;
  const out: string[] = [];
  const dark = darken(color, 0.3);
  const light = lighten(color, 0.45);
  const pale = lighten(color, 0.7);

  if (type === 'wheel') {
    const r = Math.max(15, a.w * 0.42);
    const cy = y + 2;
    out.push(el('circle', { cx: x, cy: cy, r: r, fill: light, stroke: INK, 'stroke-width': 3.2 }));
    out.push(el('circle', { cx: x, cy: cy, r: r * 0.78, fill: pale, stroke: rgba(dark, 0.6), 'stroke-width': 1.6 }));
    let seg = '';
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      seg += 'M ' + x + ' ' + cy + ' L ' + (x + Math.cos(ang) * r * 0.74) + ' ' + (cy + Math.sin(ang) * r * 0.74) + ' ';
    }
    out.push(el('path', { d: seg, fill: 'none', stroke: rgba(dark, 0.55), 'stroke-width': 1.4 }));
    out.push(el('circle', { cx: x, cy: cy, r: 2.4, fill: pale, stroke: rgba(dark, 0.6), 'stroke-width': 1.2 }));
  } else if (type === 'wedge') {
    const wr = Math.max(16, a.w * 0.46);
    const bx = x - 2;
    const by = y - 4;
    const d =
      'M ' + bx + ' ' + by + ' q ' + wr + ' ' + wr * 0.16 + ' ' + wr * 1.02 + ' ' + wr + ' q ' + -wr * 0.55 + ' ' + wr * 0.28 + ' ' + -wr * 1.02 + ' ' + -wr + ' Z';
    out.push(el('path', { d: d, fill: light, stroke: INK, 'stroke-width': 3, transform: 'rotate(-28 ' + bx + ' ' + by + ')' }));
    out.push(el('path', { d: 'M ' + bx + ' ' + by + ' l ' + wr * 0.62 + ' ' + wr * 0.62, fill: 'none', stroke: rgba(dark, 0.5), 'stroke-width': 1.6, transform: 'rotate(-28 ' + bx + ' ' + by + ')' }));
  } else if (type === 'twist') {
    const tx = x;
    const ty = y - 8;
    out.push(el('path', { d: 'M ' + tx + ' ' + ty + ' c 14 2 20 14 12 26 c -8 12 -24 12 -30 2 c -4 -7 0 -15 8 -15 c 6 0 9 5 6 10', fill: 'none', stroke: color, 'stroke-width': 8, 'stroke-linecap': 'round' }));
    out.push(el('path', { d: 'M ' + tx + ' ' + ty + ' c 14 2 20 14 12 26 c -8 12 -24 12 -30 2 c -4 -7 0 -15 8 -15 c 6 0 9 5 6 10', fill: 'none', stroke: rgba(light, 0.8), 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
  } else if (type === 'cherry') {
    const cxp = x;
    const cyp = y + 12;
    out.push(el('path', { d: 'M ' + cxp + ' ' + (cyp - 12) + ' q 10 -12 18 -16', fill: 'none', stroke: '#6B3F1B', 'stroke-width': 2.4 }));
    out.push(el('circle', { cx: cxp, cy: cyp, r: 11, fill: color, stroke: INK, 'stroke-width': 3 }));
    out.push(el('ellipse', { cx: cxp - 3.5, cy: cyp - 3.5, rx: 3.4, ry: 2.4, fill: rgba('#ffffff', 0.55) }));
  } else if (type === 'mint') {
    const mx = x - 2;
    const my = y - 6;
    [[-16, -1.1], [0, -0.2], [15, 0.9]].forEach((o) => {
      out.push(el('ellipse', { cx: mx, cy: my, rx: 8, ry: 15, fill: color, stroke: INK, 'stroke-width': 2.4, transform: 'rotate(' + o[1] * 30 + ' ' + mx + ' ' + my + ') translate(' + o[0] + ' -6)' }));
    });
    out.push(el('circle', { cx: mx, cy: my + 8, r: 2, fill: darken(color!, 0.2) }));
  } else if (type === 'beans') {
    const bcx = CX;
    const bcy = g.surface.cy + 2;
    [[-13, 0], [13, 0], [0, -3]].forEach((o, i) => {
      const bx = bcx + o[0];
      const by = bcy + o[1];
      out.push(el('ellipse', { cx: bx, cy: by, rx: 6.5, ry: 4.2, fill: '#3A241A', stroke: '#241209', 'stroke-width': 1.4, transform: 'rotate(' + (i * 25 - 20) + ' ' + bx + ' ' + by + ')' }));
      out.push(el('path', { d: 'M ' + bx + ' ' + (by - 3.6) + ' q 2 3.6 0 7.2', fill: 'none', stroke: '#241209', 'stroke-width': 1.1, transform: 'rotate(' + (i * 25 - 20) + ' ' + bx + ' ' + by + ')' }));
    });
  }
  return out.join('');
}

/* rim crust (salt / sugar) drawn along the top rim ellipse */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rimCrust(kind: string, g: any): string {
  const r = g.rim;
  const dots: string[] = [];
  const grain = kind === 'sugar' ? '#F3ECDD' : '#F6F4EF';
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = Math.PI + (i / n) * Math.PI;
    const px = r.cx + Math.cos(t) * r.rx;
    const py = r.cy + Math.sin(t) * r.ry;
    const rr = kind === 'sugar' ? 1.3 : 1.7;
    dots.push(el('circle', { cx: px.toFixed(1), cy: (py + 1).toFixed(1), r: (rr + (i % 3) * 0.4).toFixed(1), fill: grain, stroke: rgba(INK, 0.25), 'stroke-width': 0.6 }));
  }
  return dots.join('');
}

/* ice cubes floating near the surface */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function iceCubes(g: any): string {
  const out: string[] = [];
  const cy = g.surface.cy;
  const w = g.surface.rx;
  const cubes = [
    { x: CX - w * 0.34, y: cy + 14, s: 22, rot: -12 },
    { x: CX + w * 0.3, y: cy + 30, s: 20, rot: 10 },
    { x: CX - w * 0.05, y: cy + 40, s: 18, rot: 22 },
  ];
  cubes.forEach((c) => {
    const h = c.s;
    out.push(el('rect', { x: (c.x - h / 2).toFixed(1), y: (c.y - h / 2).toFixed(1), width: h, height: h, rx: 4, fill: rgba('#ffffff', 0.42), stroke: rgba('#ffffff', 0.85), 'stroke-width': 1.6, transform: 'rotate(' + c.rot + ' ' + c.x + ' ' + c.y + ')' }));
    out.push(el('path', { d: 'M ' + (c.x - h / 2 + 4) + ' ' + (c.y - h / 6) + ' L ' + (c.x + h / 6) + ' ' + (c.y - h / 6) + ' L ' + (c.x + h / 6) + ' ' + (c.y + h / 2 - 4), fill: 'none', stroke: rgba('#ffffff', 0.7), 'stroke-width': 1.2, transform: 'rotate(' + c.rot + ' ' + c.x + ' ' + c.y + ')' }));
  });
  return out.join('');
}

/* rising bubbles for fizzy drinks */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bubbles(g: any, seed: number): string {
  const out: string[] = [];
  const rand = rng(seed);
  const top = g.surface.cy + 4;
  const bot = g.kind === 'straight' ? g.botY - 8 : g.fillY + (g.stem ? 46 : 60);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const yy = top + rand() * (bot - top);
    const maxw = g.surface.rx * (0.5 + 0.4 * rand());
    const xx = CX + (rand() - 0.5) * 2 * maxw;
    const rr = 1.2 + rand() * 2.2;
    out.push(el('circle', { cx: xx.toFixed(1), cy: yy.toFixed(1), r: rr.toFixed(1), fill: 'none', stroke: rgba('#ffffff', 0.7), 'stroke-width': 1 }));
  }
  return out.join('');
}

/* ======================================================================
   MAIN RENDERER
   ==================================================================== */
export function barkastGlassSVG(spec: GlassSpec): string {
  spec = spec || {};
  const name: GlassName = spec.glass && GLASS[spec.glass] ? spec.glass : 'rocks';
  const cfg = GLASS[name];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = geometry(cfg);
  g.kind = cfg.kind;
  const liquid = spec.liquid || '#D9A441';
  const id = 'bg' + ++uid;
  const parts: string[] = [];

  const lg = id + 'l';
  parts.push(
    '<defs>' +
      '<linearGradient id="' + lg + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + lighten(liquid, 0.14) + '"/>' +
      '<stop offset="1" stop-color="' + darken(liquid, 0.16) + '"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + id + 's" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + rgba(INK, 0.16) + '"/>' +
      '<stop offset="1" stop-color="' + rgba(INK, 0) + '"/>' +
      '</radialGradient>' +
      '</defs>',
  );

  const shBottom = cfg.kind === 'straight' ? cfg.botY! : cfg.footY!;
  const shW = cfg.kind === 'straight' ? cfg.botW! * 1.9 : cfg.footW! * 1.9;
  parts.push(el('ellipse', { cx: CX, cy: shBottom + 8, rx: shW, ry: shW * 0.16, fill: 'url(#' + id + 's)' }));

  parts.push(el('path', { d: g.bodyPath, fill: rgba('#F2F6F7', 0.35), stroke: 'none' }));

  parts.push(el('path', { d: g.liquidPath, fill: 'url(#' + lg + ')' }));
  if (spec.fizz) parts.push(bubbles(g, hash((spec.glass || '') + liquid)));
  if (spec.ice) parts.push(iceCubes(g));
  if (spec.foam) {
    parts.push(el('ellipse', { cx: g.surface.cx, cy: g.surface.cy, rx: g.surface.rx, ry: g.surface.ry, fill: lighten(liquid, 0.62), stroke: rgba(INK, 0.25), 'stroke-width': 1.4 }));
    parts.push(el('ellipse', { cx: g.surface.cx, cy: g.surface.cy - 0.5, rx: g.surface.rx * 0.8, ry: g.surface.ry * 0.8, fill: lighten(liquid, 0.78) }));
  } else {
    parts.push(el('ellipse', { cx: g.surface.cx, cy: g.surface.cy, rx: g.surface.rx, ry: g.surface.ry, fill: lighten(liquid, 0.24), stroke: rgba(INK, 0.22), 'stroke-width': 1.4 }));
  }

  if (g.stem) {
    parts.push(el('line', Object.assign({ x1: CX, y1: g.stem.fromY - 2, x2: CX, y2: g.stem.footY - 6 }, stroke(4))));
    parts.push(el('path', Object.assign({ d: 'M ' + (CX - g.stem.footW) + ' ' + g.stem.footY + ' Q ' + CX + ' ' + (g.stem.footY + g.stem.footW * 0.34) + ' ' + (CX + g.stem.footW) + ' ' + g.stem.footY }, stroke(4))));
    parts.push(el('path', Object.assign({ d: 'M ' + (CX - g.stem.footW) + ' ' + g.stem.footY + ' Q ' + CX + ' ' + (g.stem.footY - g.stem.footW * 0.2) + ' ' + (CX + g.stem.footW) + ' ' + g.stem.footY }, stroke(4, { stroke: rgba(INK, 0.35), 'stroke-width': 2 }))));
  }

  if (g.handle) {
    const hx0 = CX + g.topW;
    const hyTop = g.topY + 46;
    const hyBot = g.botY - 44;
    parts.push(el('path', Object.assign({ d: 'M ' + hx0 + ' ' + hyTop + ' C ' + (hx0 + 46) + ' ' + hyTop + ' ' + (hx0 + 46) + ' ' + hyBot + ' ' + hx0 + ' ' + hyBot }, stroke(6))));
  }

  parts.push(el('path', Object.assign({ d: g.sides }, stroke(4))));
  parts.push(el('ellipse', Object.assign({ cx: g.rim.cx, cy: g.rim.cy, rx: g.rim.rx, ry: g.rim.ry }, stroke(4))));

  parts.push(el('ellipse', { cx: g.rim.cx, cy: g.rim.cy + 1.5, rx: g.rim.rx - 3, ry: Math.max(1, g.rim.ry - 1.5), fill: 'none', stroke: rgba('#ffffff', 0.5), 'stroke-width': 1.4 }));
  const sheenX = CX - g.topW * 0.5;
  parts.push(el('path', { d: 'M ' + sheenX + ' ' + (g.topY + g.topW * 0.5) + ' q -4 40 0 ' + (cfg.kind === 'straight' ? cfg.botY! - g.topY - 40 : 70), fill: 'none', stroke: rgba('#ffffff', 0.4), 'stroke-width': 3, 'stroke-linecap': 'round' }));

  if (spec.rim) parts.push(rimCrust(spec.rim, g));
  if (spec.garnish && spec.garnish.type) parts.push(garnish(spec.garnish.type, spec.garnish.color, g));

  return (
    '<svg viewBox="0 0 ' + VB + ' 260" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">' +
    parts.join('') +
    '</svg>'
  );
}
