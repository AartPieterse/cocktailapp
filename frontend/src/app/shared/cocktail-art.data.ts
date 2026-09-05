import type { GlassSpec } from './glass-art/glass-svg';

/**
 * How each drink in the catalog actually looks on a bar.
 *
 * The catalog describes a RECIPE — ingredients, glass, method, a line of garnish
 * prose. It does not describe a picture, and the rules in `cocktail-visual.ts`
 * that infer one from the ingredient list can only ever be approximately right:
 * they read `absinthe` and paint a Sazerac green, they read `build` and drop ice
 * cubes into a hot Irish Coffee, and they collapse forty-four coupes onto three
 * shades of cream. This table is the corrective — one authored entry per drink,
 * saying what is genuinely in the glass.
 *
 * Everything here is a partial {@link GlassSpec} MERGED OVER the derived spec, so
 * an entry states every field it cares about rather than relying on the rule
 * underneath to agree with it — including `garnishes: []` for the few drinks that
 * genuinely go out naked, which would otherwise inherit the derivation's
 * never-bare fallback. A cocktail added to the seed with no entry here still
 * renders, from the rules, which is why the derivation has to stay good instead
 * of letting this table become the only path.
 * `cocktail-visual.spec.ts` fails if a key here is not a catalog id.
 *
 * The comment above each drink says what makes it look unlike its neighbours;
 * that is the thing to preserve if you retune an entry. This file is written by
 * hand from here on — it was seeded in bulk, but the entries have been corrected
 * against the recipes since, so edit it directly rather than regenerating it.
 *
 * Colours are the drink BACKLIT in the glass, which is lighter and more saturated
 * than the bottle: a Negroni is a glowing red-orange you can read print through,
 * not blood red. `fill` is the pour measured against the glass's real capacity —
 * a VOLUME fraction, which the renderer converts to a height — so a 45 ml Old
 * Fashioned sits at 0.38 and a Mojito at 0.92.
 */
/**
 * `Required` on purpose. The entry is merged over the derived spec with
 * `Object.assign`, so any field it leaves out silently inherits whatever the
 * rules guessed — which is how an Old Fashioned ended up with muddled mint leaves
 * floating in it. Making every field mandatory turns that into a compile error;
 * `liquidBottom` and `layers` stay optional because they describe a gradient most
 * drinks do not have.
 */
export type CocktailArt = Required<
  Omit<GlassSpec, 'seed' | 'motion' | 'detail' | 'glass' | 'liquidBottom' | 'layers'>
> &
  Pick<GlassSpec, 'liquidBottom' | 'layers'>;

export const COCKTAIL_ART: Readonly<Record<string, CocktailArt>> = {
  // A short, squat rocks pour barely half up the glass over plain cubes, pale straw-green and
  // shaken-hazy behind a wide crust of salt on the rim — the only salt-rimmed drink in this group
  // and the only one whose colour reads almost colourless.
  'agave-and-lime': { liquid: '#E7E3BE', fill: 0.5, cut: 'wide', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'salt', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wheel', placement: 'rim', color: '#9DC24A' }] },
  // A flat, light-proof milk-coffee beige filling most of the coupe — the only genuinely opaque
  // glass here, so no stem shows through it — finished with a freckled brown scatter of nutmeg
  // right across the surface.
  'alexander': { liquid: '#C9A87F', fill: 0.62, cut: 'classic', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'nutmeg-dust', placement: 'dust', color: '#A9743F' }] },
  // Glowing translucent red-orange over ordinary cubes in a rocks glass, lit right through, with a
  // half orange slice standing against the inside wall and a pale lemon coil resting on top —
  // brighter and more see-through than any Negroni, and the only rocks pour here carrying a bead.
  'americano': { liquid: '#DE5A2E', fill: 0.6, cut: 'classic', ice: 'cubes', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'in-glass', color: '#F09A2C' }, { type: 'lemon-twist', placement: 'surface', color: '#F2D65C' }] },
  // A warm apricot-amber coupe with a faint shake-haze and no garnish colour competing with it
  // except a pale green-white apple fan clipped to the rim — the warmest, most orange coupe of
  // this set against Aviation's cold lilac and Bee's Knees' acid gold.
  'angel-face': { liquid: '#E4A96C', fill: 0.8, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'apple-fan', placement: 'rim', color: '#E4E3A9' }] },
  // A tall golden-amber highball packed with cubes almost to the rim, visibly turbid from the
  // cloudy apple juice with a hard ginger-beer bead climbing through it, straw in, apple fan on
  // the rim.
  'apple-and-ginger': { liquid: '#DFC27E', fill: 0.85, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'apple-fan', placement: 'rim', color: '#E4E3A9' }] },
  // A tall, still, tea-brown collins — completely bubble-free, which is what sets it apart from
  // every other tall glass here — cubes stacked through a glowing amber body with a bright lemon
  // wheel notched on the rim.
  'arnold-palmer': { liquid: '#C68C3C', fill: 0.78, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'lemon-wheel', placement: 'rim', color: '#F2D64F' }] },
  // A cool, silvery lilac-grey sitting only just past half way up the coupe — the one cold-toned
  // glass in a row of golds — with a single dark red cherry sunk to the bottom of the bowl, which
  // is the only strong colour in it.
  'aviation': { liquid: '#C3B7D2', fill: 0.56, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'cherry', placement: 'in-glass', color: '#A81F2E' }] },
  // Filled to within a finger of the collins rim, pale yellow-green and fizzing hard, with torn
  // green leaf fragments suspended in the body and one whole dark basil leaf floating flat on the
  // surface — the herb is inside the drink here, not just on top.
  'basil-lemonade': { liquid: '#EDEAA8', fill: 0.9, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'basil-leaf', placement: 'surface', color: '#4E8B3A' }] },
  // A brimming, opaque-edged honey-gold coupe — noticeably fuller and warmer than the other coupes
  // here — clouded by 22.5ml of fresh orange juice, with a curl of orange peel hooked over the rim
  // rather than the usual lemon.
  'bee-s-knees': { liquid: '#E9B252', fill: 0.72, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#EE9B33' }] },
  // A tall flute filled almost to the top with soft peach-pink, deeper and denser toward the base
  // where the purée settles, with a slow fine bead rising through it and absolutely nothing on the
  // glass — the only naked drink in this set.
  'bellini': { liquid: '#F0AE85', liquidBottom: '#DF8D5C', fill: 0.83, cut: 'deep', ice: 'none', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [] },
  // A brimming coupe of pale straw-gold, hazy from the shake and filled almost to the lip because
  // 110ml of spirit plus dilution barely fits — the fullest, palest coupe on this shelf, with a
  // single lemon coil lying flat on the surface rather than clipped to the rim.
  'between-the-sheets': { liquid: '#E9C77E', fill: 0.78, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'surface', color: '#E4C24E' }] },
  // The darkest thing in the set that is still transparent: a shallow pool of cola-brown reading
  // red where light passes the ice, only 70ml sitting low among cubes in a big rocks glass, and
  // deliberately bare — no fruit, no pick, nothing on the rim.
  'black-russian': { liquid: '#57301C', fill: 0.45, cut: 'deep', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [] },
  // The only fully opaque red in the set — light stops dead at the glass — and the only one with a
  // green celery stalk standing out of the top; a squat rocks glass packed nearly full at 150ml,
  // matte where every other red here glows.
  'bloody-mary': { liquid: '#BC3A24', fill: 0.8, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'celery', placement: 'in-glass', color: '#7FA84A' }, { type: 'lemon-wedge', placement: 'rim', color: '#F2D25C' }] },
  // A deep glowing garnet — browner and more sombre than a Negroni because 45ml of bourbon sits
  // under the Campari — served up and perfectly clear in a near-full coupe, wearing two twists:
  // orange clipped to the rim, lemon floating flat.
  'boulevardier': { liquid: '#C4381F', fill: 0.72, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E8862B' }] },
  // The only vertical bleed here: cloudy pale lemon-gin at the top dissolving down through the
  // crushed-ice mound into deep blackberry purple at the base, with dark berries sitting on the
  // white ice and a short straw punched through it.
  'bramble': { liquid: '#E4D9A0', liquidBottom: '#6E1B3F', fill: 0.85, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'raspberries', placement: 'surface', color: '#33132E' }, { type: 'lemon-wheel', placement: 'rim', color: '#F0D25A' }] },
  // The one glass in this set with a crusted white sugar rim and a whole lemon peel curled around
  // the inside wall like a collar; a small, rich amber pour sitting only just over half-way, so
  // the empty upper bowl and its lining peel are the whole picture.
  'brandy-crusta': { liquid: '#D2903F', fill: 0.58, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'sugar', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'in-glass', color: '#E4C24E' }] },
  // Packed to the brim and visibly full of solids — lime wedges wedged skin-out through crushed
  // ice, undissolved sugar clouding a pale grey-green liquid; nothing else in this set has chunks
  // of fruit standing in it.
  'caipirinha': { liquid: '#DCE7BE', fill: 0.88, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'lime-chunks', straw: 'straw', steam: false, garnishes: [{ type: 'lime-wedge', placement: 'rim', color: '#8FBF3F' }] },
  // A quiet, still highball: warm honey-amber, faintly hazy from raw honey rather than from
  // shaking, sitting only three-fifths up a tall glass with plain cubes and no bubbles at all —
  // the rare highball that is not fizzing.
  'canchanchara': { liquid: '#DDAE5B', fill: 0.6, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wedge', placement: 'rim', color: '#8FBF3F' }] },
  // Near-black coffee steaming in a mug with a single pale green cardamom pod resting on the
  // surface — the spice the drink is actually built on.
  'cardamom-coffee': { liquid: '#2E1C14', fill: 0.55, cut: 'classic', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: true, garnishes: [{ type: 'cardamom-pod', placement: 'surface', color: '#9BB06A' }] },
  // The palest bitter in the set: only 10ml of Campari in 70ml total leaves a clear coral blush,
  // not a red — and at barely half a coupe it is the shallowest pour of the four coupes, with one
  // lemon twist hooked over the rim.
  'cardinale': { liquid: '#E0784F', fill: 0.49, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E4C24E' }] },
  // Only 60ml of liquid in a rocks glass, so it is a shallow, pale-straw pool clinging to one
  // clear king cube, with a dark cherry sunk beside the rock — unlike the brimming coupes and full
  // highballs around it, this one is mostly empty glass and light.
  'casino': { liquid: '#EFDFA2', fill: 0.45, cut: 'wide', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E4C04A' }, { type: 'cherry', placement: 'in-glass', color: '#9E1B2C' }] },
  // The warm-gold rocks pour of the pair: honey-amber and softly clouded from 25ml of lemon,
  // filling well past halfway over ordinary cubes — where the Casino next to it is a thin pale
  // slick on a single rock, this one is deeper, warmer and busier with ice.
  'chamomile-and-honey': { liquid: '#EBC96A', fill: 0.6, cut: 'wide', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E28A2B' }] },
  // A clear straw-gold flute with a distinct rosy-amber bloom at the very bottom, where the
  // bitters-soaked sugar cube is still bleeding and firing a single thread of bubbles up the
  // middle — the gradient and the bubble column are what make it read as this drink and not a
  // plain glass of fizz.
  'champagne-cocktail': { liquid: '#F6E5AC', liquidBottom: '#D9A06B', fill: 0.62, cut: 'deep', ice: 'none', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E28A2B' }, { type: 'cherry', placement: 'in-glass', color: '#9E1B2C' }] },
  // The only frosted glass here: a cloudy jade-green column packed to the brim with crushed ice
  // heaped above the rim, a mint bouquet planted in the mound and brown nutmeg dusted over it —
  // opaque and cold-looking where the other highballs are see-through.
  'chartreuse-swizzle': { liquid: '#93B843', fill: 0.95, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#4E8C46' }, { type: 'nutmeg-dust', placement: 'dust', color: '#A9713F' }] },
  // The only hot drink in the set: a flat, fully opaque orange mug with visible pulp, no ice and
  // no shine, a cinnamon stick standing in it and a curl of peel floating flat on top, with steam
  // rising off the surface.
  'cinnamon-orange': { liquid: '#E8862B', fill: 0.68, cut: 'classic', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'fruit-pulp', straw: 'none', steam: true, garnishes: [{ type: 'cinnamon-stick', placement: 'in-glass', color: '#8A5A32' }, { type: 'orange-twist', placement: 'surface', color: '#E28A2B' }] },
  // Dusty pastel rose under a thick, matte white egg-white cap that takes up the top of the pour,
  // with two or three dark raspberries resting on the foam — the opaque, capped coupe against the
  // Cosmopolitan's clear bright pink and the Corpse Reviver's near-full pale straw.
  'clover-club': { liquid: '#E27D91', fill: 0.58, cut: 'wide', ice: 'none', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'raspberries', placement: 'surface', color: '#C42A4E' }] },
  // The fullest coupe in the chunk — four 30ml equal parts fill it almost to the brim with a pale,
  // faintly milky straw-yellow that catches the light, bare on top apart from one orange peel
  // clipped to the rim.
  'corpse-reviver-2': { liquid: '#EFE6B4', fill: 0.8, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E28A2B' }] },
  // A bright, see-through pink-red that glows when lit from behind, filling about seven-tenths of
  // the coupe with nothing on the surface — read against the Clover Club it is clearer, redder and
  // flat-topped where that one is opaque, pastel and capped with foam.
  'cosmopolitan': { liquid: '#DE4A61', fill: 0.7, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E4C04A' }] },
  // A still, cloudy crimson highball packed with cubes and topped with a pink grapefruit half-
  // slice on the rim — no bubbles at all, which is what separates it from every other tall glass
  // here.
  'cranberry-breeze': { liquid: '#CE5C74', fill: 0.85, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#F0907C' }] },
  // Dark translucent caramel, not black — cubes and a rising bubble stream show clearly through
  // it, and the spent lime shell sits wedged among the ice with a fresh wedge on the rim and two
  // straws standing in the glass.
  'cuba-libre': { liquid: '#7E3F1F', fill: 0.88, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'straw-pair', steam: false, garnishes: [{ type: 'lime-wedge', placement: 'rim', color: '#93C13F' }] },
  // Almost water-pale with a cold green-white cast, filling a coupe barely two-thirds; no colour,
  // no foam cap, nothing to look at but the haze of a hard shake and one thin lime wheel on the
  // rim - the plainest coupe in the book, and deliberately so.
  'daiquiri': { liquid: '#E4EFCC', fill: 0.62, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wheel', placement: 'rim', color: '#93B84A' }] },
  // The only two-tone highball here: a cloudy amber ginger-beer body with a dark mahogany rum cap
  // sitting on top and bleeding downward in streaks around the cubes, bubbles rising through the
  // pale half only.
  'dark-n-stormy': { liquid: '#6E3410', liquidBottom: '#E3A551', layers: [{ color: '#5A2A0E', share: 0.38 }, { color: '#E3A551', share: 0.62 }], fill: 0.85, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'lime-wedge', placement: 'rim', color: '#7FAE3C' }] },
  // A thick apricot-gold slush mounded to the very lip of the coupe, opaque enough to hold a
  // spoon, with a halved passion fruit resting on the surface (drawn as a dark-rimmed half-round
  // of fruit) - the only frozen coupe among the daiquiris.
  'don-s-special-daiquiri': { liquid: '#F0DFA8', liquidBottom: '#E39A3C', fill: 0.88, cut: 'wide', ice: 'frozen-slush', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'surface', color: '#B4552C' }] },
  // Glass-clear with only the faintest straw tint from 10ml of vermouth, dead still and unclouded,
  // sitting well below the rim of the cone with a single bright lemon twist hooked on the edge -
  // no olive, no bubbles, no haze.
  'dry-martini': { liquid: '#F0F2E5', fill: 0.6, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E8C24A' }] },
  // The darkest coupe in the catalog: an opaque near-black coffee body under a thick hazelnut
  // crema cap, with three beans set on the foam - it reads as a dessert, not a citrus sour.
  'espresso-martini': { liquid: '#4A2A1B', liquidBottom: '#2C170F', fill: 0.8, cut: 'deep', ice: 'none', fizz: 'none', foam: 'espresso-crema', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'coffee-beans', placement: 'surface', color: '#3B2216' }] },
  // Water-clear fizzing tonic in the bottom three-quarters with a dark espresso cloud sitting on
  // top and dropping brown tendrils past the cubes; an orange twist on the rim is the only warm
  // colour above the line.
  'espresso-tonic': { liquid: '#8A6A48', liquidBottom: '#E6EFF1', layers: [{ color: '#4B2C1A', share: 0.28 }, { color: '#E7F0F2', share: 0.72 }], fill: 0.88, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E08A2C' }] },
  // A rocks glass packed with cubes and filled almost to the lip with something so dark it is
  // nearly black at the centre and glows red-brown only at the edges - and it goes out completely
  // naked, which is exactly how it is drunk in Argentina and what separates it from every other
  // cola highball here.
  'fernandito': { liquid: '#3E1A10', fill: 0.87, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [] },
  // Pale champagne-straw with a faint lemon haze from the shaken half, fine bubbles climbing in a
  // single thread up the flute, and a long lemon spiral standing inside the glass rather than
  // perched on the rim - warmer and cloudier than a clear sparkling pour.
  'french-75': { liquid: '#F4E5A6', fill: 0.78, cut: 'deep', ice: 'none', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'in-glass', color: '#E6C043' }] },
  // The only completely ungarnished glass in the rocks set, and deliberately so: the recipe
  // carries no garnish line at all. A deep red mahogany, bare-rimmed, over cubes.
  'french-connection': { liquid: '#8E3A1C', fill: 0.45, cut: 'deep', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [] },
  // A deep Chambord purple under a thin tan pineapple froth, with the lemon peel its recipe
  // actually names — no raspberries, which it has no fruit for and which made it a twin of the
  // Raspberry Sour.
  'french-martini': { liquid: '#8E2452', liquidBottom: '#B02E57', fill: 0.55, cut: 'wide', ice: 'none', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E9C84A' }] },
  // The only bitter-red drink in the set that wears a hat: 120ml of whipped orange juice against
  // 45ml Campari makes a glowing tangerine-red body fading upward into a two-finger pale-apricot
  // froth cap, so it reads as a citrus milkshake lit from inside rather than a Negroni in a tall
  // glass.
  'garibaldi': { liquid: '#E85E24', liquidBottom: '#CE4218', fill: 0.85, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-wedge', placement: 'rim', color: '#F29B22' }] },
  // A coupe filled almost to the shoulder with opaque grass-green - 10 basil leaves smashed into
  // 105ml of liquid make it the only green sour here - and the single dark basil top floating flat
  // on the surface reads against the paler lime-green body.
  'gin-basil-smash': { liquid: '#9EC05A', fill: 0.72, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'mint-leaves', straw: 'none', steam: false, garnishes: [{ type: 'basil-leaf', placement: 'surface', color: '#3E7A2E' }] },
  // An empty-bottomed highball: no ice at all, so the pale cloudy straw column sits alone in the
  // lower half of the glass with clear glass above it and a fine soda bead rising - the only tall
  // drink in this batch you can see straight through the bottom of.
  'gin-fizz': { liquid: '#F1E6B6', fill: 0.58, cut: 'wide', ice: 'none', fizz: 'gentle', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-wheel', placement: 'rim', color: '#F5DE55' }, { type: 'lemon-twist', placement: 'surface', color: '#EDD24A' }] },
  // A squat rocks glass packed to the brim with pebble ice and hazy amber ginger beer, with three
  // muddled ginger coins and their shredded fibres visible low in the glass - the murk and the
  // visible solids are what separate it from the clear golden Horse's Neck.
  'ginger-mule': { liquid: '#D8A44E', fill: 0.9, cut: 'classic', ice: 'pebble', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'fruit-pulp', straw: 'straw', steam: false, garnishes: [{ type: 'lime-wedge', placement: 'rim', color: '#8DBF3F' }] },
  // A cognac-orange amber over cubes behind a wide salt crust — its own first instruction is "Salt
  // the rim of a rocks glass", and the crust plus the warmer colour is what keeps it off the two
  // other margaritas in the set.
  'grand-margarita': { liquid: '#E09A3C', fill: 0.62, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'salt', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wheel', placement: 'rim', color: '#9CCB3F' }] },
  // A shallow pastel-jade pool sitting low in a wide coupe - equal 20/20/20 parts make only 60ml,
  // so it is the emptiest coupe in the batch, and the flat opaque mint-ice-cream surface with one
  // dark mint tip on it reads nothing like a translucent sour.
  'grasshopper': { liquid: '#A3D6AC', fill: 0.42, cut: 'classic', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3F7F3C' }] },
  // A near-full coupe of glassy dark mahogany-garnet - 45ml of sweet vermouth plus Fernet make it
  // the darkest and most transparent drink here - with a bright curl of orange peel lying on the
  // surface as the only light in the picture.
  'hanky-panky': { liquid: '#6A3520', fill: 0.68, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'surface', color: '#E8862A' }] },
  // The fullest coupe in the batch - 130ml of ingredients plus shake dilution leaves barely a
  // finger of freeboard - and the colour is a blush coral-pink from the grapefruit, not the white-
  // green of an ordinary daiquiri; a wide pale grapefruit peel is clipped over the rim.
  'hemingway-special': { liquid: '#EFBFAE', fill: 0.85, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'grapefruit-twist', placement: 'rim', color: '#F0A98C' }] },
  // A small, dense pool of warm honey-gold sitting just under half-way in the coupe - thicker and
  // more saturated than the watery pale sours around it - with a single lemon curl hooked on the
  // rim.
  'honey-and-lemon': { liquid: '#EBC96A', fill: 0.48, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#EDD24A' }] },
  // Clear blond cognac stretched with transparent ginger ale, and the only long spiral of lemon
  // peel hanging the length of the glass — see-through where the Suffering Bastard next to it is
  // murky with ginger beer.
  'horse-s-neck': { liquid: '#E9C87A', fill: 0.82, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#F0D64B' }] },
  // A 230ml tropical build crammed to the top of a mug with a crushed-ice mound: thick, opaque
  // golden-orange from 90ml pineapple and 30ml passion fruit purée, with black passion seeds and
  // muddled ginger visible in the pulp — the only mug in the catalogue that is ice-cold rather
  // than steaming.
  'iba-tiki': { liquid: '#E28B32', liquidBottom: '#C4681A', fill: 0.9, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'fruit-pulp', straw: 'straw', steam: false, garnishes: [{ type: 'pineapple-wedge', placement: 'rim', color: '#DCB25C' }, { type: 'lime-wheel', placement: 'rim', color: '#9CC13F' }] },
  // A short, pale straw-gold rocks pour — barely 100ml of liquid over cubes, so the glass reads
  // little over half full — carrying only a thin lacy bubble collar from three drops of egg white,
  // not a meringue cap. Paler and lower than the Jungle Bird beside it.
  'illegal': { liquid: '#E6DBA6', fill: 0.6, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-twist', placement: 'in-glass', color: '#8FBF3D' }] },
  // The one genuinely hot, steaming glass: a near-full mug of opaque near-black coffee with a
  // hard-edged pale cream band floating on top, never blended. The recipe lists no garnish, so the
  // sharp line between the two layers is the whole picture.
  'irish-coffee': { liquid: '#46220F', layers: [{ color: '#F6ECD6', share: 0.22 }, { color: '#46220F', share: 0.78 }], fill: 0.88, cut: 'classic', ice: 'none', fizz: 'none', foam: 'cream-float', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: true, garnishes: [] },
  // A tall, glass-clear pale lemon column full of cubes with only a modest bead of bubbles —
  // built, not shaken, so it is transparent where every other lemon sour in the set is clouded;
  // the sunken red cherry against clear yellow is its signature.
  'john-collins': { liquid: '#F4E4A2', fill: 0.82, cut: 'wide', ice: 'cubes', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'lemon-wheel', placement: 'rim', color: '#F2D34E' }, { type: 'cherry', placement: 'in-glass', color: '#B3212F' }] },
  // Rust-orange and murky rather than red: pineapple froth clouds it and blackstrap rum drags the
  // bottom toward dark brick, all packed under a white crushed-ice mound that shows the colour off
  // in the melt-water at the edges.
  'jungle-bird': { liquid: '#C0522B', liquidBottom: '#94361A', fill: 0.85, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'pineapple-wedge', placement: 'rim', color: '#E8C047' }] },
  // A wine glass barely a third full of perfectly clear, glowing raspberry-fuchsia — no ice, no
  // bubbles, no garnish at all. Its emptiness and its jewel transparency are what set it apart
  // from every crowded glass around it.
  'kir': { liquid: '#B03D68', fill: 0.29, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [] },
  // The only luminous herbal-green coupe in the set — a cloudy chartreuse-yellow-green sitting
  // mid-high in the bowl, with one dark maraschino cherry resting on the bottom of the pour as a
  // deep red point against the green.
  'last-word': { liquid: '#A9BE55', fill: 0.62, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'cherry', placement: 'in-glass', color: '#6E1523' }] },
  // A small, shallow, very pale lemon pour — only 65ml before dilution, so it sits low in the
  // coupe — framed by a thick white sugar crust on the rim. The crystalline rim, not a fruit
  // garnish, is the whole visual: the lowest-filled coupe in the group.
  'lemon-drop-martini': { liquid: '#F1DE8B', fill: 0.45, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'sugar', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [] },
  // A tall ice-free highball of milky cream-lemon with a dense white egg-white head standing proud
  // above the rim and soda bubbles climbing through the cloud beneath it — the head above the
  // glass line is what makes it unmistakable next to any other tall lemon drink.
  'lemon-fizz': { liquid: '#F2E9C0', fill: 0.88, cut: 'wide', ice: 'none', fizz: 'lively', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#EFCB45' }] },
  // Brim-full tall glass of iced-tea amber over cubes, fizzing hard, with two straws standing in
  // it — the only warm-brown highball here, and the paired straws plus the lemon wheel on the rim
  // mark it out from the pale Lemon Fizz next to it.
  'long-island-ice-tea': { liquid: '#AF6329', fill: 0.9, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw-pair', steam: false, garnishes: [{ type: 'lemon-wheel', placement: 'rim', color: '#F2D34E' }] },
  // A brimming, opaque amber-orange bowl — the orgeat clouds it to the colour of milky apricot,
  // quite unlike the crystal stirred drinks around it, and the mint bouquet sits right on the
  // surface with a pineapple spear leaning off the rim.
  'mai-tai': { liquid: '#D98F45', fill: 0.9, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3E8B4A' }, { type: 'pineapple-wedge', placement: 'rim', color: '#E9B93A' }] },
  // Only half a coupe of it, and dead clear: a deep glowing red-mahogany you can read light
  // through, with a single dark cherry resting in the bottom of the bowl. The shallowest pour of
  // the six coupes here.
  'manhattan': { liquid: '#A94B2C', fill: 0.5, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'cherry', placement: 'in-glass', color: '#8E1B2A' }] },
  // Pale green-tinged straw, faintly clouded by the shake, sitting under a crust of salt on one
  // half of the rim — the only rimmed glass in this set, and the coolest-toned coupe of the six.
  'margarita': { liquid: '#E3E2A2', fill: 0.6, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'salt', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wheel', placement: 'rim', color: '#8FBE3C' }] },
  // Fuller than the Manhattan and a shade browner and more tawny than it — 45ml of sweet vermouth
  // against 45ml of gin makes an orange-brown, gin-bright clarity — with a pale lemon coil laid
  // flat on the surface rather than a cherry in the bottom.
  'martinez': { liquid: '#C4784A', fill: 0.64, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'surface', color: '#EFCB4A' }] },
  // A soft opaque coral-salmon, filled high, with a fine pale froth left by the shaken pineapple
  // juice — the only pink coupe here, and matte where the Manhattan and Martinez are transparent.
  'mary-pickford': { liquid: '#EBA269', fill: 0.7, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'cherry', placement: 'in-glass', color: '#8E1B2A' }] },
  // A flute filled almost to the lip with warm opaque orange, deepening slightly toward the base,
  // threaded with a slow fine bead of prosecco — no ice, no froth head, just juice and bubbles.
  'mimosa': { liquid: '#F5A93E', liquidBottom: '#EE9226', fill: 0.85, cut: 'deep', ice: 'none', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E88A22' }] },
  // A frosted cup packed with a snowy crushed-ice dome standing proud of the rim, the bourbon
  // showing pale honey at the top and deeper amber at the base where it hasn't yet melted through,
  // with a fat mint bouquet and a short straw pushed into it.
  'mint-julep': { liquid: '#D9AE63', liquidBottom: '#C08B36', fill: 0.9, cut: 'deep', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'mint-leaves', straw: 'straw', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3E8B4A' }] },
  // A pale jade slush heaped in the coupe — flat, matte and flecked dark green from blended mint —
  // the only frozen drink among these coupes and the only green one anywhere in the set.
  'missionary-s-downfall': { liquid: '#A6C98C', fill: 0.85, cut: 'wide', ice: 'frozen-slush', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'mint-leaves', straw: 'straw', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3E8B4A' }, { type: 'pineapple-wedge', placement: 'rim', color: '#E9B93A' }] },
  // Near-colourless, packed to the top with pebble ice and hard-bubbling from the soda, mint
  // leaves pinned against the glass wall and a tall sprig standing out of the ice beside the
  // straw. Paler than its alcohol-free twin, which muddles twice the mint and has no rum to thin
  // it.
  'mojito': { liquid: '#EDF4E6', fill: 0.92, cut: 'wide', ice: 'pebble', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'mint-leaves', straw: 'straw', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'in-glass', color: '#3E8B4A' }, { type: 'lime-wheel', placement: 'rim', color: '#8FBE3C' }] },
  // A brim-full coupe of deep, opaque sunset orange-red — a full tablespoon of grenadine drives it
  // well past the Mimosa's juice-orange — with a single bright orange coil hooked over the rim and
  // nothing floating in it.
  'monkey-gland': { liquid: '#E2602B', fill: 0.78, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'fruit-pulp', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E88A22' }] },
  // 120ml of ginger beer against only 45ml vodka means this is essentially a glass of pale cloudy
  // ginger gold, not a clear vodka drink — packed to the brim with small nugget ice and a lime
  // wheel wedged down the inside of the glass rather than perched on the rim, with a coarse lively
  // bead climbing the ice.
  'moscow-mule': { liquid: '#EBCA84', fill: 0.88, cut: 'wide', ice: 'pebble', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wheel', placement: 'in-glass', color: '#9CC03C' }] },
  // A quarter Aperol and a quarter yellow Chartreuse make this a glowing hot-orange coupe with a
  // distinctly yellow-green undertone from the Chartreuse — brighter and more acidic-looking than
  // the Paper Plane sitting next to it, and only just over half full because 90ml of build is a
  // small drink in a coupe. A green lime coin on the rim keeps it visually cool where the Paper
  // Plane is warm.
  'naked-and-famous': { liquid: '#E8802A', fill: 0.6, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-twist', placement: 'rim', color: '#8FBF3B' }] },
  // Equal thirds means Campari owns it: a transparent glowing red-orange you can read print
  // through, sitting only halfway up a wide rocks glass around one clear king cube. The half
  // orange wheel clipped to the rim is the signature — no twist, no cherry.
  'negroni': { liquid: '#C8402A', fill: 0.5, cut: 'deep', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#F09A2E' }] },
  // The only two-tone drink here: a deep ruby band of red wine sitting as a sharp float over
  // cloudy whiskey-sour gold, in a rocks glass on plain cubes, about two-thirds up. Only 15ml of
  // wine, so the band is a narrow crown, not half the glass.
  'new-york-sour': { liquid: '#E2B152', layers: [{ color: '#7C1F2E', share: 0.16 }, { color: '#E2B152', share: 0.84 }], fill: 0.65, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#F2D24B' }, { type: 'cherry', placement: 'surface', color: '#A9202E' }] },
  // A nearly full coupe of pale hazy straw-gold — aged rum lightened by 60ml of champagne — with a
  // fine slow bead rising through it and a mint bouquet lying across the surface. Fuller than any
  // other coupe in this set, and the only one with bubbles.
  'old-cuban': { liquid: '#9A5A2C', fill: 0.85, cut: 'deep', ice: 'none', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3E8E4F' }] },
  // The shallowest pour in the set: 45ml of whiskey plus a sugar cube barely covers the base of a
  // big rocks glass, so the clear king cube stands proud of a thin band of deep transparent amber.
  // The cherry sits down in the liquid beside the rock, the orange peel is draped over the rim.
  'old-fashioned': { liquid: '#BC6E24', fill: 0.38, cut: 'deep', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E8862B' }, { type: 'cherry', placement: 'in-glass', color: '#8C1C27' }] },
  // The pink one: 100ml of pink grapefruit soda over 50ml tequila gives a soft blush coral that no
  // other drink here comes near, fizzing hard on cubes right up to a salted rim, with a lime wedge
  // cut onto the rim and a straw.
  'paloma': { liquid: '#F19A88', fill: 0.9, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'salt', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'lime-wedge', placement: 'rim', color: '#A6C63C' }] },
  // Deeper and browner than the Naked and Famous — bourbon and Amaro Nonino drag the Aperol orange
  // toward burnt sienna — and a noticeably fuller coupe, since 120ml of equal parts plus shake
  // dilution nearly reaches the rim. A yellow lemon coin lying flat on the surface, not clipped to
  // the rim.
  'paper-plane': { liquid: '#D66B2B', fill: 0.74, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'surface', color: '#F2D24B' }] },
  // The palest and smallest coupe of the four: only 65ml of ingredients, so it sits under half
  // way, and the fresh orange juice makes it genuinely cloudy-opaque apricot rather than the
  // translucent orange of the amaro drinks around it.
  'paradise': { liquid: '#F0A75E', fill: 0.48, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E8862B' }] },
  // Thick opaque golden-orange juice stretched with soda, so the colour is deepest at the bottom
  // of the glass and lightens where the bubbles are; seeds and pulp visible in suspension, a dark
  // halved passion fruit perched on the rim and two straws. The only drink here with visible pulp
  // inside it.
  'passion-fruit-cooler': { liquid: '#E9AA33', liquidBottom: '#D98F1E', fill: 0.9, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'fruit-pulp', straw: 'straw-pair', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#6B2F3F' }] },
  // The only two-tone rocks pour in this set: a cloudy honey-lemon gold body around one clear king
  // cube, with a visibly darker peat-brown float band resting on top and refusing to blend in.
  'penicillin': { liquid: '#D6A241', layers: [{ color: '#8B5623', share: 0.13 }, { color: '#D6A241', share: 0.87 }], fill: 0.5, cut: 'wide', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-wheel', placement: 'rim', color: '#C98B3C' }] },
  // A thick opaque ivory-cream slush that holds the straw upright, matte rather than glossy, and
  // the only frozen drink in this group; the fruit sits on the rim because nothing would sink into
  // it.
  'pina-colada': { liquid: '#F6E8C9', fill: 0.72, cut: 'classic', ice: 'frozen-slush', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'pineapple-wedge', placement: 'rim', color: '#EFC24A' }, { type: 'cherry', placement: 'skewer', color: '#B3202C' }] },
  // A frosted highball packed to a crushed-ice dome, the golden pineapple-falernum liquid drawn up
  // through the ice rather than sitting under it, with a swizzle stick standing in it and a mint
  // bouquet on the crown.
  'pineapple-swizzle': { liquid: '#E4C24C', fill: 0.9, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'swizzle-stick', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3E8A4A' }] },
  // A half-filled wine glass of pale straw-gold that is hazy rather than creamy, with steeped
  // pineapple pieces sitting in the bowl — the only drink here with solid fruit suspended in a
  // stemmed glass.
  'pisco-punch': { liquid: '#EBCE86', fill: 0.5, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'pineapple-wedge', placement: 'rim', color: '#EFC24A' }, { type: 'lemon-twist', placement: 'surface', color: '#E8C64A' }] },
  // A wine glass, not a coupe, half-filled with pale ivory-lemon under a thick white egg-white cap
  // that is marked with dark bitters dots — the only foam surface here carrying a pattern.
  'pisco-sour': { liquid: '#F1E3C2', fill: 0.55, cut: 'wide', ice: 'none', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'nutmeg-dust', placement: 'dust', color: '#6B3A2A' }] },
  // A cold mug half-filled with warm translucent amber over cubes — the one mug in this group that
  // is emphatically not steaming, and the only build with no soda lengthening it.
  'planter-s-punch': { liquid: '#BE7639', fill: 0.5, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E08A28' }] },
  // The fullest, warmest coupe of the set: a nearly brimming opaque-orange pour that darkens
  // towards the base as the purée settles, seeds visible in it, with half a fruit floating flat on
  // the surface.
  'porn-star-martini': { liquid: '#EFA636', liquidBottom: '#E08B21', fill: 0.82, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'fruit-pulp', straw: 'none', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'surface', color: '#E8A93A' }] },
  // A low, half-filled coupe of opaque caramel-mahogany with no white cap at all — flat and silky
  // where every other egg drink here wears foam — finished with a brown nutmeg dusting.
  'porto-flip': { liquid: '#B06B45', fill: 0.5, cut: 'classic', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'nutmeg-dust', placement: 'dust', color: '#8B5A2B' }] },
  // The clear one on the rocks: transparent russet-amber over plain cubes, glassy where the
  // Penicillin beside it is cloudy and layered, and lighter than a Negroni because 60ml of
  // colourless cachaça carries only 35ml of tinted liqueur.
  'rabo-de-galo': { liquid: '#A5602F', fill: 0.55, cut: 'deep', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E08A28' }] },
  // A tall, ice-free column of opaque pearl-white filled to the very top with a dense meringue
  // collar standing proud of the rim, deliberately bare — the foam is the garnish.
  'ramos-fizz': { liquid: '#F8F4EC', fill: 0.95, cut: 'classic', ice: 'none', fizz: 'gentle', foam: 'egg-white', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'straw', steam: false, garnishes: [] },
  // A short, low pour of opaque rose-red under a thick ivory egg-white cap, with two whole berries
  // resting on the foam — the only solid-pink coupe among a shelf of pale gold sours.
  'raspberry-sour': { liquid: '#CB3752', fill: 0.5, cut: 'wide', ice: 'none', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'raspberries', placement: 'surface', color: '#C43757' }] },
  // Nearly 100ml of stirred spirit fills this coupe almost to the brim with a clear, glowing
  // garnet-mahogany — darker and redder than a Manhattan thanks to the cherry brandy, with a loose
  // lemon coil floating flat on the surface.
  'remember-the-maine': { liquid: '#98202B', fill: 0.7, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'surface', color: '#E9CE4F' }] },
  // A tall glass of transparent cola-brown, visibly darker where the grenadine has settled,
  // streaming bubbles past the cubes — its cherry rides a pick across the rim because it would
  // vanish inside the dark liquid, which is exactly how it differs from its pink twin the Shirley
  // Temple.
  'roy-rogers': { liquid: '#63281A', liquidBottom: '#3C1310', fill: 0.82, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'cherry', placement: 'skewer', color: '#C41E33' }] },
  // Brim-full highball of hazy magenta-ruby that deepens toward the bottom where the cassis sits,
  // fine sparkling-wine bead rather than soda fizz, and dark near-black berries perched on top
  // against a bright lemon wheel on the rim.
  'russian-spring-punch': { liquid: '#8E2A5C', liquidBottom: '#7A1E46', fill: 0.9, cut: 'deep', ice: 'cubes', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'raspberries', placement: 'surface', color: '#3A1533' }, { type: 'lemon-wheel', placement: 'rim', color: '#F2DA6A' }] },
  // Half a rocks glass of bright, clear honey-amber around one big clear cube — lighter and more
  // golden than any of the whisky drinks near it, with a long peel tucked down the side against
  // the ice.
  'rusty-nail': { liquid: '#C4832A', fill: 0.48, cut: 'deep', ice: 'big-rock', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'in-glass', color: '#E9CE4F' }] },
  // A shallow, absolutely clear pool of rosy cognac-amber sitting naked at the bottom of a big
  // empty rocks glass — no ice at all, which is what makes it read differently from every other
  // rocks pour in the catalog.
  'sazerac': { liquid: '#BC5524', fill: 0.32, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E9CE4F' }] },
  // An almost brim-full highball of even, cloudy cranberry red with no gradient at all and no
  // bubbles — the flat, still, juice-dense counterpart to the layered orange-and-red Sex on the
  // Beach beside it.
  'sea-breeze': { liquid: '#C1304C', fill: 0.88, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E8892B' }, { type: 'cherry', placement: 'skewer', color: '#C41E33' }] },
  // Cloudy peach-orange at the top sinking into cranberry red at the base, with clear headroom
  // above the ice and two straws — the sunrise gradient is what separates it from the flat red Sea
  // Breeze in the same glass.
  'sex-on-the-beach': { liquid: '#F0A582', liquidBottom: '#96183F', fill: 0.75, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw-pair', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#F0A032' }] },
  // Hazy nutty sherry-amber packed with visible orange and lemon slices under a white mound of
  // crushed ice heaped above the rim, crowned with berries and citrus wheels and drunk through two
  // straws — the only fruit-stuffed, snow-topped glass on this page.
  'sherry-cobbler': { liquid: '#BE7C31', fill: 0.85, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'citrus-slices', straw: 'straw-pair', steam: false, garnishes: [{ type: 'orange-wheel', placement: 'rim', color: '#F0A032' }, { type: 'raspberries', placement: 'surface', color: '#C43757' }] },
  // Mostly transparent pale gold with the grenadine pooled hard at the bottom in a distinct band —
  // the layering, not the colour, is what separates it from the flat opaque pink of the Strawberry
  // Lemonade.
  'shirley-temple': { liquid: '#D9455E', liquidBottom: '#B01F3C', layers: [{ color: '#F4E3A6', share: 0.68 }, { color: '#B01F3C', share: 0.32 }], fill: 0.8, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'cherry', placement: 'in-glass', color: '#C41E33' }] },
  // A warm amber coupe with a frosted sugar crust on the rim — the only sugared rim among the
  // coupes here, and the deepest, most orange-brown of them; 40ml of citrus and liqueur against
  // 50ml cognac keeps it glowing rather than brown.
  'sidecar': { liquid: '#D4863A', fill: 0.62, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E8933A' }] },
  // A tall opaque coral-salmon hurricane — 120ml of pineapple juice is more than half the drink,
  // so it is thick and juice-cloudy rather than a clear red sling, and the pineapple-plus-cherry
  // flag on the rim is unique in this set.
  'singapore-sling': { liquid: '#E2603E', fill: 0.82, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'pineapple-wedge', placement: 'rim', color: '#F2CE55' }, { type: 'cherry', placement: 'skewer', color: '#C0202F' }] },
  // The fullest and the coolest-toned of the coupes: a pale yellow-green from five muddled mint
  // leaves, with a mint sprig laid flat on the surface rather than standing — the green tint plus
  // the near-brimming 105ml pour separates it from the amber Sidecar and the honey Spicy Fifty.
  'southside': { liquid: '#DFE3A4', fill: 0.73, cut: 'wide', ice: 'none', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#4A8B3B' }] },
  // A long scarlet chilli pod hooked over the rim of a pale honey-vanilla coupe — the shape and
  // the hue no other coupe in the catalog carries, and exactly what the recipe asks for.
  'spicy-fifty': { liquid: '#EBD07E', fill: 0.64, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'chilli', placement: 'rim', color: '#CE2B22' }] },
  // The single most saturated glass in this set — 60ml of Aperol against 90ml prosecco makes a
  // luminous, transparent traffic-orange, with a full orange wheel dropped down inside the glass
  // among the cubes rather than clipped to the rim.
  'spritz': { liquid: '#F1752A', fill: 0.7, cut: 'deep', ice: 'cubes', fizz: 'gentle', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-wheel', placement: 'in-glass', color: '#F0983C' }] },
  // A sparse, glass-clear amber martini — only 70ml goes in, so it sits notably low and shallow,
  // and the crystal clarity marks it out against every hazy shaken drink around it.
  'stinger': { liquid: '#C98D4E', fill: 0.58, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#4A8B3B' }] },
  // A brimming pink collins, visibly cloudy with muddled strawberry pulp and seeds suspended
  // through it and a live soda bead — the only drink here whose fruit is still physically in the
  // glass.
  'strawberry-lemonade': { liquid: '#DE4F66', fill: 0.9, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'strawberry', placement: 'rim', color: '#D63248' }] },
  // A full collins of hazy ginger-gold with a mint bouquet standing up out of the ice — the ginger
  // beer's own cloudiness makes it the only murky-golden tall drink here, quite unlike the clear
  // pink lemonade beside it.
  'suffering-bastard': { liquid: '#DCA657', fill: 0.9, cut: 'wide', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'in-glass', color: '#4A8B3B' }, { type: 'orange-half-wheel', placement: 'rim', color: '#F09A3E' }] },
  // Brim-full and opaque: 150 ml of undiluted fresh orange juice is dense and pulpy, with the
  // grenadine sitting heavy at the base. The taller, denser of the two sunrises.
  'sunrise': { liquid: '#EE8A2A', liquidBottom: '#C4192B', fill: 0.92, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'orange-wheel', placement: 'rim', color: '#F0983C' }, { type: 'cherry', placement: 'in-glass', color: '#B5222E' }] },
  // Paler and shorter than the mocktail Sunrise: 45ml of tequila thins the orange juice to a
  // lighter, more translucent amber-orange, only 15ml of grenadine settles below, and it goes out
  // bare — a single half wheel on the rim, no cherry, no straw.
  'tequila-sunrise': { liquid: '#F0A03C', liquidBottom: '#BE2B33', fill: 0.68, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#F09A3E' }] },
  // A coupe filled past the brim with a dense, pale honey-amber slush - matte and frozen where
  // every other coupe in the catalog is a smooth liquid surface, with three cherries on a pick
  // laid across the mound and a pineapple wedge on the rim spelling out the Morse V.
  'three-dots-and-a-dash': { liquid: '#C0722C', fill: 0.92, cut: 'wide', ice: 'frozen-slush', fizz: 'none', foam: 'none', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'cherry', placement: 'skewer', color: '#9E1B26' }, { type: 'pineapple-wedge', placement: 'rim', color: '#E8C24A' }] },
  // A brimming martini glass of murky olive-gold - the odd, slightly sickly colour that 15ml of
  // green Chartreuse makes when it meets red vermouth, unlike any other martini-glass drink here,
  // which are pale straw or clear.
  'tipperary': { liquid: '#8F6A24', fill: 0.72, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#E8821E' }] },
  // A bare-rimmed rocks glass of pale hazy straw over ordinary cubes - the naked, agave-only
  // Margarita, visibly plainer and warmer-toned than the salt-rimmed, greener classic version.
  'tommy-s-margarita': { liquid: '#D7CE84', fill: 0.62, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lime-wheel', placement: 'rim', color: '#8CBF3F' }] },
  // Almost full to the coupe's rim and startlingly dark - an opaque brick-mahogany body under a
  // thin buff-coloured collar, the only near-black sour in the catalog and unmistakable next to
  // the pale citrus coupes.
  'trinidad-sour': { liquid: '#8E3B23', fill: 0.76, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E9D24F' }] },
  // Only half a martini glass of water-bright pale straw, with a dark cherry sunk right to the
  // bottom of the bowl - the sunken cherry against a shallow, near-colourless pour is what
  // separates it from every other martini-glass drink here.
  'tuxedo': { liquid: '#E8E2B8', fill: 0.52, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'cherry', placement: 'in-glass', color: '#8E1420' }, { type: 'lemon-twist', placement: 'rim', color: '#E9D24F' }] },
  // A rocks glass with no ice at all - a soft cloudy hay-gold body under a dense white egg-white
  // cap, with a little cluster of pale green grapes hooked on the rim; the ice-free rocks glass
  // and the fruit-on-the-rim make it read completely differently from Tommy's Margarita in the
  // same glass.
  've-n-to': { liquid: '#E4CB7C', fill: 0.7, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'grapes', placement: 'rim', color: '#C8D68C' }, { type: 'lemon-twist', placement: 'surface', color: '#E9D24F' }] },
  // A shallow pour of very faintly gold liquid, slightly frosted and cloudy from the shake rather
  // than glass-clear - the haze in an otherwise colourless spirit drink is the tell, and the coupe
  // sits under half full because it is only a 67ml build.
  'vesper': { liquid: '#F0E9CC', fill: 0.47, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#E9D24F' }] },
  // A hot mug in two hard-edged bands: near-black sweet coffee with a thick pale cream collar
  // floating on top, steam rising, and a dusting of nutmeg freckling the white - the only sharply
  // two-tone mug in the catalog.
  'vienna-coffee': { liquid: '#26150E', liquidBottom: '#26150E', layers: [{ color: '#F4ECDD', share: 0.28 }, { color: '#3A241A', share: 0.72 }], fill: 0.72, cut: 'classic', ice: 'none', fizz: 'none', foam: 'cream-float', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'none', steam: true, garnishes: [{ type: 'nutmeg-dust', placement: 'dust', color: '#8B5A2B' }] },
  // Two-thirds of a coupe of glowing, glass-clear red-amber - warmer and distinctly redder than
  // any other stirred whiskey drink, with a cherry resting in the bowl and a wide orange twist
  // over the rim.
  'vieux-carre': { liquid: '#A55C24', fill: 0.66, cut: 'deep', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'crystal', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-twist', placement: 'rim', color: '#E8821E' }, { type: 'cherry', placement: 'in-glass', color: '#8E1420' }] },
  // A thick, matte coconut-white slush filling just over half a big hurricane glass, paler and
  // flatter-toned than the rum version and deliberately without its cherry - just the pineapple
  // wedge and a pair of straws.
  'virgin-colada': { liquid: '#F1EDE0', fill: 0.8, cut: 'classic', ice: 'frozen-slush', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'straw-pair', steam: false, garnishes: [{ type: 'pineapple-wedge', placement: 'rim', color: '#E8C24A' }] },
  // The only flat, light-blocking drink on this page: a dense matte tomato-red column in a
  // highball, no shine through it at all, with a tall celery stalk standing out of the top and a
  // fleck of black pepper on the surface — it reads as food, not cocktail.
  'virgin-mary': { liquid: '#C23A22', fill: 0.8, cut: 'classic', ice: 'cubes', fizz: 'none', foam: 'none', rim: 'none', clarity: 'opaque', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'celery', placement: 'in-glass', color: '#8FB84A' }, { type: 'lemon-wedge', placement: 'rim', color: '#F2D65C' }] },
  // Twelve muddled mint sprigs and no spirit make this a genuinely herbal green — the deepest
  // green in the tall glasses — beside the near-colourless Mojito it is named after.
  'virgin-mojito': { liquid: '#CFE3AC', fill: 0.92, cut: 'wide', ice: 'pebble', fizz: 'lively', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'mint-leaves', straw: 'straw-pair', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'in-glass', color: '#3E8B4A' }, { type: 'lime-wheel', placement: 'rim', color: '#9FD24A' }] },
  // A soft coral-pink highball, not yellow — grapefruit two ways keeps it blush rather than
  // citrus-gold — with a coarse white salt band on the rim and a lively bead of soda rising past
  // clear cubes.
  'virgin-paloma': { liquid: '#E07A6A', fill: 0.85, cut: 'classic', ice: 'cubes', fizz: 'lively', foam: 'none', rim: 'salt', clarity: 'cloudy', inclusion: 'none', straw: 'straw', steam: false, garnishes: [{ type: 'grapefruit-twist', placement: 'rim', color: '#E8846A' }] },
  // A low, wide rocks pour of soft cloudy gold under a thick ivory egg-white cap that sits proud
  // of the liquid; the cherry rests on that foam rather than sinking, with a half orange slice
  // clipped to the rim — the foam collar is what separates it from every clear whisky drink in the
  // catalog.
  'whiskey-sour': { liquid: '#E3AC55', fill: 0.6, cut: 'wide', ice: 'cubes', fizz: 'none', foam: 'egg-white', rim: 'none', clarity: 'cloudy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'orange-half-wheel', placement: 'rim', color: '#F0912B' }, { type: 'cherry', placement: 'surface', color: '#B02133' }] },
  // Bone-white with the faintest warm straw cast and no foam at all — a veiled, aerated coupe that
  // looks almost like clouded water, so among the catalog's many coupes it is the palest and the
  // coolest, distinguished only by a single bright lemon twist hooked over the rim.
  'white-lady': { liquid: '#F0E9C8', fill: 0.62, cut: 'wide', ice: 'none', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'none', steam: false, garnishes: [{ type: 'lemon-twist', placement: 'rim', color: '#F4D34E' }] },
  // The darkest, hottest-coloured tall drink here: 120ml of three rums plus falernum and Donn's
  // mix give a burnt amber that deepens to grenadine red at the base, under a white mound of
  // crushed ice pushed above the rim with a mint bouquet planted in it and two straws.
  'zombie': { liquid: '#CF6A22', liquidBottom: '#9C3315', fill: 0.85, cut: 'wide', ice: 'crushed', fizz: 'none', foam: 'none', rim: 'none', clarity: 'hazy', inclusion: 'none', straw: 'straw-pair', steam: false, garnishes: [{ type: 'mint-sprig', placement: 'surface', color: '#3E8B4A' }] },
};
