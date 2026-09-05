import type { Locale } from './i18n';

/**
 * The structural family a recipe belongs to — the template underneath the drink.
 *
 * Almost every classic is one of a handful of shapes, and once you know the shape you can improvise
 * inside it: a sour is spirit, citrus and something sweet, and swapping the spirit gives you a
 * different drink with the same balance. That is the single most useful thing to teach someone who
 * wants to stop following recipes, which is why it sits next to the technique lessons rather than
 * inside the filter bar.
 *
 * Family is deliberately ORTHOGONAL to whether a drink contains alcohol. A Virgin Mojito is a fizz;
 * a Virgin Mary is savoury. Folding "alcohol-free" in as a family would rebuild the very separation
 * this catalog just removed — the zero-proof drinks are peers with the same structures, not a
 * category of their own.
 */
export type DrinkFamily =
  | 'sour'
  | 'spirit-forward'
  | 'highball'
  | 'fizz'
  | 'sparkling'
  | 'creamy'
  | 'tiki'
  | 'hot'
  | 'savoury';

export const DRINK_FAMILIES: readonly DrinkFamily[] = [
  'sour',
  'spirit-forward',
  'highball',
  'fizz',
  'sparkling',
  'creamy',
  'tiki',
  'hot',
  'savoury',
];

export const DRINK_FAMILY_LABELS: Record<Locale, Record<DrinkFamily, string>> = {
  nl: {
    sour: 'Sour',
    'spirit-forward': 'Puur en geroerd',
    highball: 'Highball',
    fizz: 'Fizz',
    sparkling: 'Mousserend',
    creamy: 'Romig',
    tiki: 'Tiki',
    hot: 'Warm',
    savoury: 'Hartig',
  },
  en: {
    sour: 'Sour',
    'spirit-forward': 'Spirit-forward',
    highball: 'Highball',
    fizz: 'Fizz',
    sparkling: 'Sparkling',
    creamy: 'Creamy',
    tiki: 'Tiki',
    hot: 'Hot',
    savoury: 'Savoury',
  },
};

/** The working ratio of a family, written the way a bartender would say it aloud. */
export const DRINK_FAMILY_RATIO: Record<Locale, Record<DrinkFamily, string>> = {
  nl: {
    sour: '2 sterk : 1 zuur : 1 zoet',
    'spirit-forward': '2 basis : 1 vermout of bitter',
    highball: '1 sterk : 3 lang',
    fizz: '2 sterk : 1 zuur : 1 zoet, aangevuld met bruis',
    sparkling: '1 basis : 2 mousserend',
    creamy: '2 sterk : 1 zoet : 1 room',
    tiki: 'meerdere rums, citrus en siroop',
    hot: 'sterk, zoet en iets heets',
    savoury: 'sap, zuur en kruiden',
  },
  en: {
    sour: '2 strong : 1 sour : 1 sweet',
    'spirit-forward': '2 base : 1 vermouth or bitter',
    highball: '1 strong : 3 long',
    fizz: '2 strong : 1 sour : 1 sweet, lengthened with soda',
    sparkling: '1 base : 2 sparkling',
    creamy: '2 strong : 1 sweet : 1 cream',
    tiki: 'several rums, citrus and syrup',
    hot: 'strong, sweet and something hot',
    savoury: 'juice, acid and seasoning',
  },
};

/** One or two sentences on what the family is and how to improvise inside it. */
export const DRINK_FAMILY_ABOUT: Record<Locale, Record<DrinkFamily, string>> = {
  nl: {
    sour: 'De grootste familie en de nuttigste om te kennen: iets sterks, iets zuurs, iets zoets. Wissel de sterke drank en je hebt een ander drankje met dezelfde balans — dat is het verschil tussen een Daiquiri en een Whiskey Sour.',
    'spirit-forward':
      'Alleen gedistilleerd, geroerd en koud geserveerd. Er is niets om je achter te verschuilen, dus alles hangt af van de verhouding en de verdunning.',
    highball: 'Eén sterke drank, lang gemaakt met iets bruisends. De makkelijkste familie om te maken en de moeilijkste om goed te maken: vol ijs, één keer roeren.',
    fizz: 'Een sour die is verlengd met sodawater. Je krijgt de balans van een sour en de lengte van een highball, en met eiwit ook nog een kraag.',
    sparkling: 'Iets kleins onderin, aangevuld met mousserende wijn. De temperatuur telt hier zwaarder dan de verhouding.',
    creamy: 'Room, kokosroom of ei geven body en zachtheid. Stevig shaken is verplicht, anders scheidt het.',
    tiki: 'Meerdere rums, citrus en siroop, gelaagd tot iets wat naar geen van de onderdelen smaakt. Complex bedoeld, niet toevallig.',
    hot: 'Warm geschonken, en de temperatuur doet het werk dat ijs anders doet. Niet laten koken — daar wordt bijna alles bitter van.',
    savoury: 'Geen suiker maar zout, zuur en kruiden. De uitzondering in de cocktailkaart, en het bewijs dat balans niet hetzelfde is als zoet.',
  },
  en: {
    sour: 'The largest family and the most useful to know: something strong, something sour, something sweet. Swap the spirit and you have a different drink with the same balance — that is all that separates a Daiquiri from a Whiskey Sour.',
    'spirit-forward':
      'Spirits only, stirred and served cold. There is nothing to hide behind, so everything rests on the ratio and the dilution.',
    highball: 'One spirit, made long with something fizzy. The easiest family to make and the hardest to make well: full of ice, stirred once.',
    fizz: 'A sour lengthened with soda water. You get the balance of a sour and the length of a highball, and with egg white a head as well.',
    sparkling: 'Something small in the bottom, topped with sparkling wine. Temperature matters more here than the ratio does.',
    creamy: 'Cream, coconut cream or egg give body and softness. A hard shake is not optional or it separates.',
    tiki: 'Several rums, citrus and syrup, layered into something that tastes of none of its parts. Complex on purpose, not by accident.',
    hot: 'Served warm, with temperature doing the work ice usually does. Never boil it — almost everything turns bitter above a simmer.',
    savoury: 'No sugar, but salt, acid and seasoning. The exception on a cocktail list, and proof that balance is not the same as sweetness.',
  },
};

/**
 * The "this is a …" sentence opener, per family and per language.
 *
 * Written out per family rather than assembled from {@link DRINK_FAMILY_LABELS} because the label
 * alone does not survive an article: "een sour" is Dutch, "een puur en geroerd" is not. One authored
 * sentence per family is the only way both languages read like a bartender wrote them.
 */
export const DRINK_FAMILY_INTRO: Record<Locale, Record<DrinkFamily, string>> = {
  nl: {
    sour: 'Dit is een sour',
    'spirit-forward': 'Dit is puur en geroerd',
    highball: 'Dit is een highball',
    fizz: 'Dit is een fizz',
    sparkling: 'Dit is een mousserende cocktail',
    creamy: 'Dit is een romige cocktail',
    tiki: 'Dit is een tiki',
    hot: 'Dit is een warme cocktail',
    savoury: 'Dit is een hartige cocktail',
  },
  en: {
    sour: 'This is a sour',
    'spirit-forward': 'This one is spirit-forward',
    highball: 'This is a highball',
    fizz: 'This is a fizz',
    sparkling: 'This is a sparkling cocktail',
    creamy: 'This is a creamy cocktail',
    tiki: 'This is a tiki drink',
    hot: 'This is a hot cocktail',
    savoury: 'This is a savoury cocktail',
  },
};
