import type { Locale, Method } from '@cocktailapp/shared';

/**
 * The six technique lessons — the part of the app that is not about which bottles you own.
 *
 * Four are keyed to a {@link Method} value, which is populated on all 126 recipes, so the "recipes
 * that use this" strip comes free from data that already exists. Two — ice and garnish — are not a
 * method and are authored as standalone lessons; the honest cost of the approach is that those two
 * carry no automatic recipe list. Blended and layered are deliberately absent: after the catalog
 * clean-up only 5 and 2 recipes use them, which is too thin for a page of its own.
 *
 * Every drill is alcohol-free by construction. That is how bartenders actually practise — you learn
 * to stir with water and ice, and to shake with lemon, syrup and water — so it is honest rather than
 * cosmetic, and it makes this the one surface that says "do this now" without asking anyone to open
 * a bottle. There is no progress state anywhere: no "I can do this" checkbox, no percentage, no
 * badge. A page you read, not a level you clear.
 *
 * Lives in the lazy-loaded route rather than in `shared`, so ~3,000 words of bilingual copy stay out
 * of the initial bundle.
 */

export interface TechniqueMistake {
  title: string;
  body: string;
}

export interface TechniqueDrill {
  /** What to actually do, in one short paragraph. Never involves alcohol. */
  body: string;
  /** Ingredient ids for the glyph row — all non-alcoholic, all pantry items. */
  kit: string[];
  /** The drill's timer, in seconds, or null where the lesson is not timed. */
  seconds: number | null;
}

export interface TechniqueLesson {
  title: string;
  /** One line under the title. Carries the count of recipes where that is a real figure. */
  lede: string;
  /** Why the technique exists and what it does to the drink. One or two paragraphs. */
  why: string[];
  /** Numbered steps, one action each. */
  steps: string[];
  /** The two ways it goes wrong most often. */
  mistakes: TechniqueMistake[];
  /** The sensory check — how you know it worked, without a clock. */
  tell: string;
  drill: TechniqueDrill;
}

export interface Technique {
  /** Url segment, and the lesson's stable id. */
  id: string;
  /** The recipe method this lesson teaches, when it maps to one. */
  method: Method | null;
  copy: Record<Locale, TechniqueLesson>;
}

export const TECHNIQUES: readonly Technique[] = [
  {
    id: 'geschud',
    method: 'shaken',
    copy: {
      nl: {
        title: 'Geschud',
        lede: 'Koelen, verdunnen en lucht inslaan — in twaalf seconden.',
        why: [
          'Schudden doet drie dingen tegelijk: het koelt, het verdunt en het slaat lucht in. Die derde is waar het om gaat. Alles met citrus, ei, room of sap wordt er lichter en romiger van — een Whiskey Sour zonder schuimkraag is gewoon whisky met citroen.',
          'En daarom schud je een Negroni juist níet. Drank zonder sap heeft geen lucht nodig; die wordt er alleen troebel van.',
        ],
        steps: [
          'Vul het blik voor tweederde met ijs. Te weinig ijs smelt te snel en maakt je drank waterig.',
          'Schenk de ingrediënten erbij, sluit het blik en druk het vast.',
          'Schud hard, twaalf seconden, met het blik van je schouder weg.',
          'Zeef dubbel in een gekoeld glas: door de zeef van de shaker én door een fijne zeef.',
        ],
        mistakes: [
          {
            title: 'Te weinig ijs',
            body: 'Half gevuld schud je vooral smeltwater. Vol blik, kort schudden — niet andersom.',
          },
          {
            title: 'Schudden wat geroerd moet worden',
            body: 'Alles wat alleen uit gedistilleerd bestaat — Martini, Manhattan, Negroni — wordt troebel en schuimig van de shaker. Die gaan de roerbeker in.',
          },
        ],
        tell: 'Aan de buitenkant van het blik slaat rijp neer en het wordt te koud om vast te houden. Dat is het signaal, niet de klok. Voel je het niet, dan was er te weinig ijs of schudde je te zacht.',
        drill: {
          body: 'Schud citroensap, suikersiroop en water — twaalf seconden, tot het blik aan de buitenkant te koud is om vast te houden. Zo leer je het geluid en de kou zonder een fles open te maken.',
          kit: ['lemon-juice', 'simple-syrup', 'water', 'ice'],
          seconds: 12,
        },
      },
      en: {
        title: 'Shaken',
        lede: 'Chill, dilute and aerate — in twelve seconds.',
        why: [
          'Shaking does three things at once: it chills, it dilutes and it beats air in. The third is the point. Anything with citrus, egg, cream or juice comes out lighter and softer for it — a Whiskey Sour with no head is just whisky and lemon.',
          'Which is exactly why you do not shake a Negroni. Spirits without juice need no air; all they get from a shaker is a cloud.',
        ],
        steps: [
          'Fill the tin two-thirds with ice. Too little melts too fast and waters the drink down.',
          'Add the ingredients, seal the tin and press it shut.',
          'Shake hard for twelve seconds, with the tin pointing away from your shoulder.',
          'Double-strain into a chilled glass: through the shaker strainer and a fine one.',
        ],
        mistakes: [
          {
            title: 'Not enough ice',
            body: 'A half-filled tin mostly shakes meltwater. Full tin, short shake — not the other way round.',
          },
          {
            title: 'Shaking what should be stirred',
            body: 'Anything that is only spirits — Martini, Manhattan, Negroni — turns cloudy and frothy in a shaker. Those go in the mixing glass.',
          },
        ],
        tell: 'Frost forms on the outside of the tin and it becomes too cold to hold. That is the signal, not the clock. If you cannot feel it, there was too little ice or you shook too gently.',
        drill: {
          body: 'Shake lemon juice, sugar syrup and water — twelve seconds, until the outside of the tin is too cold to hold. That teaches you the sound and the cold without opening a bottle.',
          kit: ['lemon-juice', 'simple-syrup', 'water', 'ice'],
          seconds: 12,
        },
      },
    },
  },
  {
    id: 'geroerd',
    method: 'stirred',
    copy: {
      nl: {
        title: 'Geroerd',
        lede: 'Koelen zonder lucht in te slaan. Helder en zijdezacht.',
        why: [
          'Roeren koelt en verdunt, maar slaat geen lucht in. Dat is precies wat je wilt bij alles wat alleen uit gedistilleerd bestaat: de drank blijft helder, en de textuur wordt dik en zijdezacht in plaats van luchtig.',
          'Verdunning is hier geen bijverschijnsel maar een ingrediënt. Een Martini van pure gin is ondrinkbaar; het smeltwater temt hem.',
        ],
        steps: [
          'Vul de roerbeker voor driekwart met groot, hard ijs.',
          'Schenk de ingrediënten erbij.',
          'Roer met de barlepel langs de wand, twintig seconden, zonder de ijsblokken te laten klapperen.',
          'Zeef in een voorgekoeld glas.',
        ],
        mistakes: [
          {
            title: 'Te kort roeren',
            body: 'Onder de vijftien seconden is de drank koud maar nog scherp. De verdunning heeft tijd nodig, niet snelheid.',
          },
          {
            title: 'Klein of nat ijs',
            body: 'Kleine blokjes en aangesmolten ijs verdunnen veel te snel. Groot en hard ijs koelt sneller dan het smelt.',
          },
        ],
        tell: 'De buitenkant van de beker beslaat en de drank wordt duidelijk stroperiger aan de lepel. Twintig seconden is de vuistregel, maar de beker vertelt het je.',
        drill: {
          body: 'Roer water met ijs, twintig seconden, en proef het daarna. Je proeft de verdunning — en dat is precies wat je bij een Martini regelt.',
          kit: ['water', 'ice'],
          seconds: 20,
        },
      },
      en: {
        title: 'Stirred',
        lede: 'Chill without beating air in. Clear and silky.',
        why: [
          'Stirring chills and dilutes but adds no air. That is exactly what you want for anything made only of spirits: the drink stays clear, and the texture comes out thick and silky rather than frothy.',
          'Dilution here is an ingredient, not a side effect. A Martini of neat gin is undrinkable; the meltwater tames it.',
        ],
        steps: [
          'Fill the mixing glass three-quarters with large, hard ice.',
          'Add the ingredients.',
          'Stir with the bar spoon against the wall for twenty seconds, without rattling the cubes.',
          'Strain into a pre-chilled glass.',
        ],
        mistakes: [
          {
            title: 'Stirring too briefly',
            body: 'Under fifteen seconds the drink is cold but still sharp. Dilution needs time, not speed.',
          },
          {
            title: 'Small or wet ice',
            body: 'Small cubes and half-melted ice dilute far too fast. Large, hard ice chills quicker than it melts.',
          },
        ],
        tell: 'The outside of the glass frosts and the drink turns visibly thicker on the spoon. Twenty seconds is the rule of thumb, but the glass tells you.',
        drill: {
          body: 'Stir water with ice for twenty seconds, then taste it. You can taste the dilution — and that is the exact thing you are setting in a Martini.',
          kit: ['water', 'ice'],
          seconds: 20,
        },
      },
    },
  },
  {
    id: 'gebouwd',
    method: 'build',
    copy: {
      nl: {
        title: 'Opgebouwd in het glas',
        lede: 'Geen shaker, geen beker. Alles gaat in het glas waaruit je drinkt.',
        why: [
          'Bij een opgebouwde drank doet het ijs in je glas al het koelen, en het bruis doet het mengen. Daarom hoef je nauwelijks te roeren: elke slag jaagt koolzuur weg dat je juist wilt houden.',
          'Het is de makkelijkste techniek en tegelijk de meest onvergeeflijke, want er is geen enkele stap waarin je iets kunt rechttrekken.',
        ],
        steps: [
          'Vul het glas helemaal met ijs — tot boven, niet halverwege.',
          'Schenk eerst de zware ingrediënten: sap, siroop, sterke drank.',
          'Top af met het bruisende deel.',
          'Roer één keer, van onderaf omhoog. Meer niet.',
        ],
        mistakes: [
          {
            title: 'Te weinig ijs',
            body: 'Een half gevuld glas smelt snel en wordt halverwege slap. Vol ijs koelt beter én verdunt minder — dat voelt tegenstrijdig en is het niet.',
          },
          {
            title: 'Doorroeren na het bruis',
            body: 'Elke extra slag kost bubbels. Eén beweging is genoeg om de lagen te verbinden.',
          },
        ],
        tell: 'Het glas is koud in je hand en het bruis staat nog zichtbaar te tintelen aan de rand. Zie je geen bubbels meer, dan heb je te lang geroerd.',
        drill: {
          body: 'Bouw sodawater op ijs met een scheut limoensap. Roer één keer en kijk hoe lang het bruis blijft staan; roer daarna nog vijf keer en kijk opnieuw. Dat verschil is wat je bewaart.',
          kit: ['soda-water', 'lime-juice', 'ice'],
          seconds: null,
        },
      },
      en: {
        title: 'Built in the glass',
        lede: 'No shaker, no mixing glass. Everything goes in the glass you drink from.',
        why: [
          'In a built drink the ice in your glass does the chilling and the carbonation does the mixing. That is why you barely stir: every turn drives off bubbles you want to keep.',
          'It is the easiest technique and the least forgiving, because there is no later step in which to fix anything.',
        ],
        steps: [
          'Fill the glass completely with ice — to the top, not halfway.',
          'Pour the heavy ingredients first: juice, syrup, spirits.',
          'Top with the carbonated part.',
          'Stir once, lifting from the bottom. No more than that.',
        ],
        mistakes: [
          {
            title: 'Not enough ice',
            body: 'A half-filled glass melts fast and goes weak halfway down. A full glass chills better and dilutes less — which feels contradictory and is not.',
          },
          {
            title: 'Stirring after the fizz',
            body: 'Every extra turn costs bubbles. One movement is enough to join the layers.',
          },
        ],
        tell: 'The glass is cold in your hand and the fizz is still visibly working at the rim. If you see no bubbles, you stirred too long.',
        drill: {
          body: 'Build soda water over ice with a dash of lime. Stir once and watch how long the fizz holds; then stir five more times and watch again. That difference is what you are protecting.',
          kit: ['soda-water', 'lime-juice', 'ice'],
          seconds: null,
        },
      },
    },
  },
  {
    id: 'gemuddled',
    method: 'muddled',
    copy: {
      nl: {
        title: 'Gemuddled',
        lede: 'Olie uit blad en schil halen, zonder iets kapot te maken.',
        why: [
          'Muddelen haalt aromatische olie uit kruiden, schil en fruit. Bij munt zit die olie in het blad; bij limoen in de schil, niet in het sap.',
          'De kunst zit in de terughoudendheid. Fijngestampte munt geeft chlorofyl af in plaats van olie, wordt bitter en laat zwarte snippers achter in het glas.',
        ],
        steps: [
          'Leg het kruid of fruit in de bodem van het glas of de shaker.',
          'Voeg de suiker of siroop toe — die werkt als schuurmiddel en helpt de olie eruit.',
          'Druk drie tot vier keer en draai een kwartslag. Niet malen.',
          'Bouw de rest van de drank er direct bovenop.',
        ],
        mistakes: [
          {
            title: 'Munt fijnstampen',
            body: 'Je wilt de olie, niet het blad. Aangedrukte munt ruikt zoet; kapotgestampte munt smaakt naar gras en kleurt de drank groen.',
          },
          {
            title: 'Limoen op het vruchtvlees drukken',
            body: 'Draai de partjes met de schil naar beneden. De olie zit in de schil; het vruchtvlees geeft alleen sap en bitterheid uit het wit.',
          },
        ],
        tell: 'Je ruikt het voordat je het ziet. Houd het glas onder je neus: er hoort munt of citrus uit te komen, niet gras.',
        drill: {
          body: 'Muddle munt met suiker in een leeg glas en ruik eraan. Doe het daarna nog een keer en stamp door tot het blad donker wordt — ruik opnieuw. Het verschil is het hele punt.',
          kit: ['mint', 'sugar'],
          seconds: null,
        },
      },
      en: {
        title: 'Muddled',
        lede: 'Getting oil out of leaf and peel without destroying either.',
        why: [
          'Muddling draws aromatic oil out of herbs, peel and fruit. In mint that oil is in the leaf; in lime it is in the skin, not the juice.',
          'The skill is restraint. Pulverised mint gives up chlorophyll instead of oil, turns bitter, and leaves black flecks in the glass.',
        ],
        steps: [
          'Put the herb or fruit in the base of the glass or shaker.',
          'Add the sugar or syrup — it works as an abrasive and helps the oil out.',
          'Press three or four times, turning a quarter each time. Do not grind.',
          'Build the rest of the drink straight on top.',
        ],
        mistakes: [
          {
            title: 'Pulverising the mint',
            body: 'You want the oil, not the leaf. Pressed mint smells sweet; crushed mint tastes of grass and turns the drink green.',
          },
          {
            title: 'Pressing lime flesh-down',
            body: 'Turn the wedges skin-down. The oil is in the peel; the flesh only gives juice and bitterness from the pith.',
          },
        ],
        tell: 'You smell it before you see it. Hold the glass under your nose: it should come up mint or citrus, not grass.',
        drill: {
          body: 'Muddle mint with sugar in an empty glass and smell it. Then do it again and keep pounding until the leaf darkens — smell again. The difference is the whole lesson.',
          kit: ['mint', 'sugar'],
          seconds: null,
        },
      },
    },
  },
  {
    id: 'ijs-en-glas',
    method: null,
    copy: {
      nl: {
        title: 'IJs en glas',
        lede: 'Het ingrediënt dat in bijna elk recept zit en nergens op de lijst staat.',
        why: [
          'IJs is geen koeling maar een ingrediënt: het levert het water dat elke drank nodig heeft. Een geroerde Martini is voor ongeveer een kwart smeltwater, en dat is geen verlies maar het recept.',
          'De vorm bepaalt het tempo. Groot ijs heeft weinig oppervlak en koelt sneller dan het smelt; gemalen ijs koelt bliksemsnel en verdunt net zo hard — precies wat je wilt in een julep, en precies wat je niet wilt in een Old Fashioned.',
        ],
        steps: [
          'Gebruik groot, hard ijs recht uit de vriezer voor alles wat geroerd of op ijs geserveerd wordt.',
          'Gebruik gemalen ijs voor juleps, swizzles en tikidranken, waar snelle verdunning bij het recept hoort.',
          'Koel het serveerglas voor: vul het met ijs en water terwijl je de drank maakt, en gooi het leeg vlak voor het schenken.',
          'Gooi het ijs waarmee je hebt geroerd of geshaket altijd weg. Het is halfgesmolten en verdunt door.',
        ],
        mistakes: [
          {
            title: 'Nat ijs',
            body: 'IJs dat op het aanrecht heeft gelegen is aan de buitenkant al aan het smelten en verdunt vanaf de eerste seconde. Direct uit de vriezer, direct in de beker.',
          },
          {
            title: 'Een warm glas',
            body: 'Een gekoelde drank in een kamerwarme coupe is binnen een minuut lauw. Voorkoelen kost niets en is het grootste verschil dat je thuis kunt maken.',
          },
        ],
        tell: 'Een goed voorgekoeld glas beslaat zichtbaar zodra je het leeggooit. Voelt het glas niet koud aan je vingers, dan is het niet koud genoeg.',
        drill: {
          body: 'Zet twee glazen klaar, koel er één voor met ijs en water, en schenk in beide hetzelfde koude sodawater. Proef ze na twee minuten naast elkaar. Dat verschil kost je nul euro en één minuut.',
          kit: ['ice', 'water', 'soda-water'],
          seconds: null,
        },
      },
      en: {
        title: 'Ice and glassware',
        lede: 'The ingredient in nearly every recipe that appears on no ingredient list.',
        why: [
          'Ice is not cooling, it is an ingredient: it supplies the water every drink needs. A stirred Martini is roughly a quarter meltwater, and that is not a loss — it is the recipe.',
          'Shape sets the pace. Large ice has little surface area and chills faster than it melts; crushed ice chills instantly and dilutes just as fast — exactly what a julep wants, and exactly what an Old Fashioned does not.',
        ],
        steps: [
          'Use large, hard ice straight from the freezer for anything stirred or served on the rocks.',
          'Use crushed ice for juleps, swizzles and tiki drinks, where fast dilution is part of the recipe.',
          'Pre-chill the serving glass: fill it with ice and water while you make the drink, and empty it just before pouring.',
          'Always discard the ice you stirred or shook with. It is half-melted and keeps diluting.',
        ],
        mistakes: [
          {
            title: 'Wet ice',
            body: 'Ice that has sat on the counter is already melting on the outside and dilutes from the first second. Straight from the freezer, straight into the glass.',
          },
          {
            title: 'A warm glass',
            body: 'A cold drink in a room-temperature coupe is lukewarm within a minute. Pre-chilling costs nothing and is the biggest single difference you can make at home.',
          },
        ],
        tell: 'A properly chilled glass fogs visibly the moment you tip the ice out. If the glass does not feel cold to your fingers, it is not cold enough.',
        drill: {
          body: 'Set out two glasses, pre-chill one with ice and water, and pour the same cold soda water into both. Taste them side by side after two minutes. That difference costs nothing and takes a minute.',
          kit: ['ice', 'water', 'soda-water'],
          seconds: null,
        },
      },
    },
  },
  {
    id: 'garneren',
    method: null,
    copy: {
      nl: {
        title: 'Garneren',
        lede: 'Bijna altijd een geur, niet een versiering.',
        why: [
          'Een garnering hoort iets te doen. Een twist is er niet om mooi te zijn: je knijpt de olie uit de schil over het oppervlak, en die olie ruik je bij elke slok voordat je iets proeft.',
          'Daarom staat er in zoveel recepten sinaasappel bij bittere drankjes en limoen bij frisse. Laat je de garnering weg, dan mis je niet een plaatje maar een halve smaak.',
        ],
        steps: [
          'Snijd de schil breed en dun, met zo min mogelijk wit — het wit is bitter.',
          'Houd de schil met de gekleurde kant naar beneden, een paar centimeter boven het glas.',
          'Knijp hem één keer kort dicht. Je ziet een fijne nevel op het oppervlak.',
          'Wrijf de rand ermee in en leg hem in het glas, of gooi hem weg als het recept dat zegt.',
        ],
        mistakes: [
          {
            title: 'Te veel wit meesnijden',
            body: 'Een dikke schil geeft bitterheid af in de drank. Je wilt alleen de gekleurde buitenlaag, waar de olie zit.',
          },
          {
            title: 'De garnering als decoratie behandelen',
            body: 'Een munttakje dat je er alleen in steekt ruik je niet. Sla het één keer aan in je handpalm zodat het openkomt, en zet het vlak bij de rand.',
          },
        ],
        tell: 'Houd het glas onder je neus voor je drinkt. Ruik je de citrus of de munt, dan zit de garnering goed. Ruik je alleen de drank, dan is het decoratie geworden.',
        drill: {
          body: 'Knijp een sinaasappelschil boven een glas water uit en ruik eraan. Doe hetzelfde met een schil waar veel wit aan zit en proef beide. Je proeft precies waarom je dun snijdt.',
          kit: ['orange', 'water'],
          seconds: null,
        },
      },
      en: {
        title: 'Garnishing',
        lede: 'Almost always a smell, not a decoration.',
        why: [
          'A garnish should do something. A twist is not there to look pretty: you squeeze the oil from the peel across the surface, and you smell that oil on every sip before you taste anything.',
          'That is why so many recipes pair orange with bitter drinks and lime with fresh ones. Skip the garnish and you lose half a flavour, not a picture.',
        ],
        steps: [
          'Cut the peel wide and thin, with as little pith as possible — pith is bitter.',
          'Hold the peel coloured-side down, a few centimetres above the glass.',
          'Pinch it shut once. You will see a fine mist settle on the surface.',
          'Wipe it around the rim and drop it in, or discard it if the recipe says so.',
        ],
        mistakes: [
          {
            title: 'Taking too much pith',
            body: 'A thick peel leaks bitterness into the drink. You want only the coloured outer layer, which is where the oil is.',
          },
          {
            title: 'Treating the garnish as decoration',
            body: 'A mint sprig you simply push in has no smell. Clap it once in your palm to open it up, and set it close to the rim.',
          },
        ],
        tell: 'Hold the glass under your nose before you drink. If you smell the citrus or the mint, the garnish is doing its job. If you only smell the drink, it has become decoration.',
        drill: {
          body: 'Squeeze an orange peel over a glass of water and smell it. Do the same with a peel that still has plenty of pith, and taste both. You will taste exactly why you cut thin.',
          kit: ['orange', 'water'],
          seconds: null,
        },
      },
    },
  },
];

export const TECHNIQUE_IDS: readonly string[] = TECHNIQUES.map((t) => t.id);

export function techniqueById(id: string): Technique | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}

/** The lesson that teaches a recipe's method, so a recipe can link to it. */
export function techniqueForMethod(method: Method | undefined): Technique | undefined {
  if (!method) return undefined;
  return TECHNIQUES.find((t) => t.method === method);
}

/**
 * A lesson picked from the day of the year — the same rotation the trivia card used, so the home
 * screen keeps its ambient personality without it being twelve pieces of spirits trivia.
 */
export function techniqueOfTheDay(date: Date): Technique {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return TECHNIQUES[day % TECHNIQUES.length];
}
