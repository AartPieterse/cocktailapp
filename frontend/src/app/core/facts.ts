import type { Locale } from '@cocktailapp/shared';

/**
 * "Wist je dat?" — short, verifiable cocktail trivia.
 *
 * Every fact is bilingual and, wherever it honestly can be, tied to the catalog: a `cocktailId` for
 * a fact about a drink, an `ingredientId` for a fact about a bottle. That link is the point — a fact
 * about Campari's colouring belongs on the Negroni you are reading, not on a card that shuffles at
 * random on the home screen. A couple of facts are about neither and stay unlinked; inventing a link
 * for them would be worse than leaving them to the daily rotation.
 *
 * Keep each fact to one or two sentences and factually defensible. Where the story is disputed or a
 * legend, the wording says so ("volgens de overlevering", "zou…") instead of asserting it.
 */
export interface Fact {
  /** Stable id — survives reordering of the list, so a fact stays addressable. */
  id: string;
  /** The trivia itself, per display language. */
  text: Record<Locale, string>;
  /** Catalog cocktail this fact is about. */
  cocktailId?: string;
  /** Catalog ingredient this fact is about. */
  ingredientId?: string;
}

export const FACTS: readonly Fact[] = [
  {
    id: 'vodka-spelling',
    ingredientId: 'vodka',
    text: {
      nl: "'Wodka' en 'vodka' zijn precies dezelfde drank — alleen de spelling verschilt per taal. In Polen, Nederland en Duitsland schrijf je wodka, in het Engels vodka.",
      en: "'Wodka' and 'vodka' are exactly the same spirit — only the spelling differs by language. Polish, Dutch and German write wodka; English writes vodka.",
    },
  },
  {
    id: 'absinthe-thujone',
    ingredientId: 'absinthe',
    text: {
      nl: 'Absint werd decennialang verboden omdat men dacht dat de stof thujon hallucinaties gaf. Later onderzoek liet zien dat het gehalte veel te laag is voor enig effect — het was gewoon de hoge alcohol.',
      en: 'Absinthe was banned for decades because thujone was believed to cause hallucinations. Later analysis showed the levels are far too low to do anything — it was simply the high proof.',
    },
  },
  {
    id: 'margarita-daisy',
    cocktailId: 'margarita',
    text: {
      nl: "De Margarita dankt haar naam aan het Spaanse woord voor 'madeliefje'.",
      en: "The Margarita takes its name from the Spanish word for 'daisy'.",
    },
  },
  {
    id: 'negroni-origin',
    cocktailId: 'negroni',
    text: {
      nl: 'De Negroni ontstond volgens de overlevering in 1919 in Florence, toen graaf Camillo Negroni zijn Americano liet versterken met gin in plaats van bruiswater.',
      en: 'The Negroni is said to have appeared in Florence in 1919, when Count Camillo Negroni asked for his Americano to be stiffened with gin instead of soda water.',
    },
  },
  {
    id: 'angostura-town',
    ingredientId: 'angostura-bitters',
    text: {
      nl: 'Angostura bitter komt niet van een plant, maar is genoemd naar de stad Angostura in Venezuela — tegenwoordig Ciudad Bolívar.',
      en: 'Angostura bitters are not made from a plant called angostura: they are named after the town of Angostura in Venezuela, today Ciudad Bolívar.',
    },
  },
  {
    id: 'angostura-label',
    ingredientId: 'angostura-bitters',
    text: {
      nl: 'Het etiket van Angostura is te groot voor het flesje. Volgens het bedrijf zelf een oude vergissing — twee familieleden bestelden los van elkaar het etiket en de fles — en die vergissing is nooit rechtgezet.',
      en: "Angostura's label is famously too big for its bottle. The company's own telling is that two family members ordered the label and the bottle separately, and the mistake was never corrected.",
    },
  },
  {
    id: 'coupe-myth',
    text: {
      nl: 'De coupe waaruit champagne vroeger werd gedronken is níet gevormd naar de borst van Marie Antoinette — dat is een hardnekkig broodjeaapverhaal.',
      en: "The coupe glass was not moulded from Marie Antoinette's breast — that is a stubborn piece of folklore, nothing more.",
    },
  },
  {
    id: 'daiquiri-village',
    cocktailId: 'daiquiri',
    text: {
      nl: 'De Daiquiri is vernoemd naar een klein mijnstadje vlak bij Santiago de Cuba.',
      en: 'The Daiquiri is named after a small mining village just outside Santiago de Cuba.',
    },
  },
  {
    id: 'espresso-martini-bradsell',
    cocktailId: 'espresso-martini',
    text: {
      nl: "De Espresso Martini werd in de jaren '80 in Londen bedacht door barman Dick Bradsell, naar verluidt voor een gast die 'iets wilde dat wakker maakt'.",
      en: "The Espresso Martini was invented in 1980s London by bartender Dick Bradsell, reportedly for a guest who wanted 'something that wakes me up'.",
    },
  },
  {
    id: 'campari-carmine',
    ingredientId: 'campari',
    text: {
      nl: "Campari's felrode kleur kwam ooit van karmijn — een kleurstof uit gemalen schildluizen. Sinds 2006 wordt er een kunstmatige kleurstof gebruikt.",
      en: "Campari's bright red used to come from carmine — a dye made from crushed cochineal insects. Since 2006 it has been coloured artificially.",
    },
  },
  {
    id: 'prosecco-village',
    ingredientId: 'sparkling-wine',
    text: {
      nl: 'Prosecco is genoemd naar het gelijknamige dorpje bij Triëst in het noordoosten van Italië.',
      en: 'Prosecco is named after the village of the same name near Trieste, in the north-east of Italy.',
    },
  },
  {
    id: 'mojito-draque',
    cocktailId: 'mojito',
    text: {
      nl: "De Mojito zou een 16e-eeuwse voorloper hebben: 'El Draque', vernoemd naar de Engelse kaper Francis Drake.",
      en: "The Mojito is said to descend from a 16th-century drink called 'El Draque', named after the English privateer Francis Drake.",
    },
  },
  {
    id: 'aperol-strength',
    ingredientId: 'aperol',
    text: {
      nl: "Aperol bestaat al sinds 1919 en heeft maar zo'n 11% alcohol — een stuk lichter dan de meeste likeuren.",
      en: 'Aperol has been made since 1919 and is only about 11% alcohol — considerably lighter than most liqueurs.',
    },
  },
  {
    id: 'maraschino-pits',
    ingredientId: 'maraschino',
    text: {
      nl: 'Maraschino wordt gestookt van marascakersen inclusief de pitten. Daar komt die amandelachtige bittertoon vandaan — er zit geen amandel in.',
      en: 'Maraschino is distilled from marasca cherries, pits included. That is where the almond-like bitterness comes from; there is no almond in it.',
    },
  },
  {
    id: 'chartreuse-monks',
    ingredientId: 'green-chartreuse',
    text: {
      nl: 'Chartreuse wordt sinds de 18e eeuw gemaakt door kartuizer monniken. Het recept, met ruim 130 kruiden, is maar bij een handvol van hen bekend.',
      en: 'Chartreuse has been made by Carthusian monks since the 18th century. The recipe, with over 130 plants in it, is known to only a handful of them.',
    },
  },
  {
    id: 'gin-juniper',
    ingredientId: 'gin',
    text: {
      nl: 'Gin is wettelijk geen kruidenverhaal maar één kruid: de smaak moet overheersend naar jeneverbes zijn. Al het andere is vrije keuze van de stoker.',
      en: 'Gin is legally defined by one botanical, not a bouquet: the taste must be predominantly juniper. Everything else is up to the distiller.',
    },
  },
  {
    id: 'tequila-region',
    ingredientId: 'tequila',
    text: {
      nl: 'Tequila mag alleen van blauwe weberagave worden gemaakt, en alleen in een afgebakend gebied rond de stad Tequila in Jalisco en delen van vier andere staten.',
      en: 'Tequila may only be made from blue Weber agave, and only within a defined region around the town of Tequila in Jalisco plus parts of four other states.',
    },
  },
  {
    id: 'mezcal-worm',
    ingredientId: 'mezcal',
    text: {
      nl: 'De rups in de fles mezcal is geen traditie maar marketing: die werd rond 1950 bedacht om flessen te laten opvallen. Goede mezcal zit er niet in.',
      en: 'The worm in the mezcal bottle is marketing, not tradition: it was added around 1950 to make bottles stand out. Good mezcal does not come with one.',
    },
  },
  {
    id: 'bourbon-not-kentucky',
    ingredientId: 'bourbon',
    text: {
      nl: 'Bourbon hoeft niet uit Kentucky te komen — wel uit de VS, met minstens 51% mais, en gerijpt op nieuwe, uitgebrande eiken vaten.',
      en: 'Bourbon does not have to come from Kentucky — but it must be American, at least 51% corn, and aged in new charred oak barrels.',
    },
  },
  {
    id: 'old-fashioned-name',
    cocktailId: 'old-fashioned',
    text: {
      nl: 'De Old Fashioned dankt zijn naam aan gasten die, toen cocktails steeds ingewikkelder werden, gewoon weer een cocktail op de ouderwetse manier bestelden.',
      en: 'The Old Fashioned is named after drinkers who, as cocktails grew more elaborate, simply asked for one made the old-fashioned way.',
    },
  },
  {
    id: 'manhattan-churchill',
    cocktailId: 'manhattan',
    text: {
      nl: 'Het verhaal dat Churchills moeder de Manhattan bedacht op een feest in de Manhattan Club klopt niet: ze zat op dat moment in Engeland, zwanger van Winston.',
      en: "The story that Churchill's mother invented the Manhattan at a Manhattan Club party cannot be true: she was in England at the time, pregnant with Winston.",
    },
  },
  {
    id: 'sazerac-cognac',
    cocktailId: 'sazerac',
    text: {
      nl: 'De Sazerac werd oorspronkelijk met cognac gemaakt. Pas nadat de druifluis de Franse wijngaarden had verwoest, stapte New Orleans over op rye.',
      en: 'The Sazerac was originally made with cognac. New Orleans only switched to rye after phylloxera destroyed the French vineyards.',
    },
  },
  {
    id: 'pina-colada-national',
    cocktailId: 'pina-colada',
    text: {
      nl: 'De Piña Colada is sinds 1978 de officiële nationale drank van Puerto Rico.',
      en: 'The Piña Colada has been the official national drink of Puerto Rico since 1978.',
    },
  },
  {
    id: 'cachaca-vs-rum',
    cocktailId: 'caipirinha',
    text: {
      nl: 'Cachaça wordt gestookt van versgeperst suikerrietsap, rum meestal van melasse. Hetzelfde riet, een andere grondstof — en daardoor een heel andere smaak.',
      en: 'Cachaça is distilled from fresh-pressed sugar cane juice; rum usually from molasses. Same plant, different raw material — and a completely different taste.',
    },
  },
  {
    id: 'julep-derby',
    cocktailId: 'mint-julep',
    text: {
      nl: "Tijdens het weekend van de Kentucky Derby worden er op Churchill Downs zo'n 120.000 Mint Juleps geschonken.",
      en: 'Around 120,000 Mint Juleps are served at Churchill Downs over Kentucky Derby weekend.',
    },
  },
  {
    id: 'bloody-mary-petiot',
    cocktailId: 'bloody-mary',
    text: {
      nl: "Waar de naam Bloody Mary vandaan komt, weet niemand zeker. Barman Fernand Petiot claimde het drankje in de jaren '20 in Harry's New York Bar in Parijs te hebben gemaakt.",
      en: "Nobody is sure where the name Bloody Mary comes from. Bartender Fernand Petiot claimed to have made the drink at Harry's New York Bar in Paris in the 1920s.",
    },
  },
  {
    id: 'egg-white-dry-shake',
    ingredientId: 'egg-white',
    text: {
      nl: 'Eiwit wordt eerst zónder ijs geschud. De eiwitten schuimen dan op; met ijs erbij wordt het mengsel meteen te koud en te dik om nog lucht op te nemen.',
      en: 'Egg white is shaken without ice first. The proteins foam up that way; add ice and the mix turns too cold and too thick to take in any air.',
    },
  },
  {
    id: 'grenadine-pomegranate',
    ingredientId: 'grenadine',
    text: {
      nl: "Grenadine hoort granaatappelsiroop te zijn — 'grenade' is Frans voor granaatappel. De meeste flessen in de supermarkt zijn suiker, water en kleurstof.",
      en: "Grenadine is supposed to be pomegranate syrup — 'grenade' is French for pomegranate. Most supermarket bottles are sugar, water and colouring.",
    },
  },
  {
    id: 'tonic-uv',
    ingredientId: 'tonic-water',
    text: {
      nl: 'Tonic licht blauw op onder uv-licht. Dat komt door kinine, ooit toegevoegd als medicijn tegen malaria en nu vooral verantwoordelijk voor de bittere smaak.',
      en: 'Tonic water glows blue under UV light. That is the quinine — once added as an anti-malarial, now mostly responsible for the bitterness.',
    },
  },
  {
    id: 'vermouth-is-wine',
    ingredientId: 'sweet-vermouth',
    text: {
      nl: 'Vermout is wijn, geen sterke drank. Een geopende fles hoort in de koelkast en gaat maar een paar weken mee — de meeste flauwe Martini’s komen door oude vermout.',
      en: 'Vermouth is wine, not spirits. Once open it belongs in the fridge and lasts only a few weeks — most flat-tasting Martinis are simply old vermouth.',
    },
  },
  {
    id: 'irish-coffee-foynes',
    cocktailId: 'irish-coffee',
    text: {
      nl: 'Irish Coffee werd in 1943 bedacht door Joe Sheridan op de vliegbasis Foynes, voor doorweekte passagiers van wie de oceaanvlucht was afgeblazen.',
      en: 'Irish Coffee was invented in 1943 by Joe Sheridan at Foynes airbase, for soaked passengers whose transatlantic flight had turned back.',
    },
  },
  {
    id: 'sling-raffles',
    cocktailId: 'singapore-sling',
    text: {
      nl: 'De Singapore Sling werd rond 1915 gemaakt in de Long Bar van het Raffles Hotel, door barman Ngiam Tong Boon.',
      en: 'The Singapore Sling was created around 1915 in the Long Bar of the Raffles Hotel, by bartender Ngiam Tong Boon.',
    },
  },
  {
    id: 'cobbler-straw',
    cocktailId: 'sherry-cobbler',
    text: {
      nl: 'De Sherry Cobbler maakte het rietje populair. Het glas zat vol geschaafd ijs, en drinken lukte pas fatsoenlijk met een buisje erbij.',
      en: 'The Sherry Cobbler is what popularised the drinking straw. The glass was packed with crushed ice, and drinking it properly took a tube.',
    },
  },
  {
    id: 'orgeat-barley',
    ingredientId: 'orgeat',
    text: {
      nl: 'Orgeat is amandelsiroop, maar de naam komt van het Latijnse hordeum: gerst. De oorspronkelijke versie werd van gerst gemaakt, niet van amandelen.',
      en: 'Orgeat is almond syrup, but the name comes from the Latin hordeum: barley. The original version was made from barley, not almonds.',
    },
  },
  {
    id: 'ice-surface',
    ingredientId: 'ice',
    text: {
      nl: 'Eén groot blok ijs smelt langzamer dan dezelfde hoeveelheid kleine blokjes: minder oppervlak per volume. Daarom krijgt een tumbler één groot blok.',
      en: 'One big block of ice melts slower than the same volume in small cubes: less surface per volume. That is why a rocks glass gets a single large cube.',
    },
  },
  {
    id: 'falernum-barbados',
    ingredientId: 'falernum',
    text: {
      nl: 'Falernum komt van Barbados en is een gekruide siroop van limoen, kruidnagel, amandel en gember — de smaak die de meeste tikidrankjes bindt.',
      en: 'Falernum comes from Barbados: a spiced syrup of lime, clove, almond and ginger — the flavour that holds most tiki drinks together.',
    },
  },
  {
    id: 'vesper-fleming',
    cocktailId: 'vesper',
    text: {
      nl: 'De Vesper is niet bedacht in een bar maar aan een schrijftafel: Ian Fleming schreef hem in 1953 in Casino Royale, vernoemd naar Vesper Lynd.',
      en: 'The Vesper was not invented in a bar but at a desk: Ian Fleming wrote it into Casino Royale in 1953, naming it after Vesper Lynd.',
    },
  },
  {
    id: 'penicillin-modern',
    cocktailId: 'penicillin',
    text: {
      nl: 'De Penicillin is een moderne klassieker: gemaakt in 2005 door Sam Ross in de New Yorkse bar Milk & Honey, en inmiddels op kaarten over de hele wereld.',
      en: 'The Penicillin is a modern classic: made in 2005 by Sam Ross at Milk & Honey in New York, and on menus worldwide ever since.',
    },
  },
  {
    id: 'fernet-argentina',
    ingredientId: 'fernet-branca',
    text: {
      nl: 'Fernet-Branca werd in 1845 in Milaan verkocht als medicijn. Het grootste deel gaat tegenwoordig naar Argentinië, waar het meestal met cola wordt gedronken.',
      en: 'Fernet-Branca was sold as medicine in Milan in 1845. Most of it now goes to Argentina, where it is usually drunk with cola.',
    },
  },
  {
    id: 'moscow-mule-copper',
    cocktailId: 'moscow-mule',
    text: {
      nl: 'De Moscow Mule ontstond in 1941 uit onverkoopbare voorraad: de een zat vast met wodka, de ander met gemberbier, en een derde met koperen mokken.',
      en: 'The Moscow Mule came out of unsellable stock in 1941: one man was stuck with vodka, another with ginger beer, and a third with copper mugs.',
    },
  },
];

/** Deterministic starting fact so every visit today opens on the same one, then advances on tap. */
export function factOfTheDay(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  return dayOfYear % FACTS.length;
}

/** Tiny stable string hash — picks the same fact for the same recipe on every visit. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * The fact that belongs on a given recipe, or null.
 *
 * A fact about the drink itself always wins. Failing that, a fact about one of its ingredients is
 * picked — deterministically per recipe, so the Negroni always shows the same one, but two gin
 * drinks do not both land on the juniper fact.
 */
export function factForCocktail(cocktailId: string, ingredientIds: readonly string[]): Fact | null {
  const own = FACTS.find((f) => f.cocktailId === cocktailId);
  if (own) return own;

  const ids = new Set(ingredientIds);
  const matches = FACTS.filter((f) => f.ingredientId && ids.has(f.ingredientId));
  if (!matches.length) return null;
  return matches[hash(cocktailId) % matches.length];
}
