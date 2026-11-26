import type { Locale } from '@cocktailapp/shared';

/**
 * "Wist je dat?": short, verifiable cocktail trivia.
 *
 * Every fact is bilingual and, wherever it honestly can be, tied to the catalog: a `cocktailId` for
 * a fact about a drink, an `ingredientId` for a fact about a bottle. That link is the point: a fact
 * about Campari's colouring belongs on the Negroni you are reading, not on a card that shuffles at
 * random on the home screen. A couple of facts are about neither and stay unlinked; inventing a link
 * for them would be worse than leaving them to the daily rotation.
 *
 * Keep each fact to one or two sentences and factually defensible. Where the story is disputed or a
 * legend, the wording says so ("volgens de overlevering", "zou…") instead of asserting it.
 */
export interface Fact {
  /** Stable id; survives reordering of the list, so a fact stays addressable. */
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
      nl: "'Wodka' en 'vodka' zijn precies dezelfde drank. Alleen de spelling verschilt per taal. In Polen, Nederland en Duitsland schrijf je wodka, in het Engels vodka.",
      en: "'Wodka' and 'vodka' are exactly the same spirit. Only the spelling differs by language. Polish, Dutch and German write wodka; English writes vodka.",
    },
  },
  {
    id: 'absinthe-thujone',
    ingredientId: 'absinthe',
    text: {
      nl: 'Absint werd decennialang verboden omdat men dacht dat de stof thujon hallucinaties gaf. Later onderzoek liet zien dat het gehalte veel te laag is voor enig effect. Het was gewoon de hoge alcohol.',
      en: 'Absinthe was banned for decades because thujone was believed to cause hallucinations. Later analysis showed the levels are far too low to do anything. It was simply the high proof.',
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
      nl: 'Angostura bitter komt niet van een plant, maar is genoemd naar de stad Angostura in Venezuela, tegenwoordig Ciudad Bolívar.',
      en: 'Angostura bitters are not made from a plant called angostura: they are named after the town of Angostura in Venezuela, today Ciudad Bolívar.',
    },
  },
  {
    id: 'angostura-label',
    ingredientId: 'angostura-bitters',
    text: {
      nl: 'Het etiket van Angostura is te groot voor het flesje. Volgens het bedrijf zelf een oude vergissing (twee familieleden bestelden los van elkaar het etiket en de fles), en die vergissing is nooit rechtgezet.',
      en: "Angostura's label is famously too big for its bottle. The company's own telling is that two family members ordered the label and the bottle separately, and the mistake was never corrected.",
    },
  },
  {
    id: 'coupe-myth',
    text: {
      nl: 'De coupe waaruit champagne vroeger werd gedronken is níet gevormd naar de borst van Marie Antoinette. Dat is een hardnekkig broodjeaapverhaal.',
      en: "The coupe glass was not moulded from Marie Antoinette's breast. That is a stubborn piece of folklore, nothing more.",
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
      nl: "Campari's felrode kleur kwam ooit van karmijn, een kleurstof uit gemalen schildluizen. Sinds 2006 wordt er een kunstmatige kleurstof gebruikt.",
      en: "Campari's bright red used to come from carmine, a dye made from crushed cochineal insects. Since 2006 it has been coloured artificially.",
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
      nl: "Aperol bestaat al sinds 1919 en heeft maar zo'n 11% alcohol, een stuk lichter dan de meeste likeuren.",
      en: 'Aperol has been made since 1919 and is only about 11% alcohol, considerably lighter than most liqueurs.',
    },
  },
  {
    id: 'maraschino-pits',
    ingredientId: 'maraschino',
    text: {
      nl: 'Maraschino wordt gestookt van marascakersen inclusief de pitten. Daar komt die amandelachtige bittertoon vandaan. Er zit geen amandel in.',
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
      nl: 'Bourbon hoeft niet uit Kentucky te komen, wel uit de VS, met minstens 51% mais, en gerijpt op nieuwe, uitgebrande eiken vaten.',
      en: 'Bourbon does not have to come from Kentucky, but it must be American, at least 51% corn, and aged in new charred oak barrels.',
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
      nl: 'Cachaça wordt gestookt van versgeperst suikerrietsap, rum meestal van melasse. Hetzelfde riet, een andere grondstof en daardoor een heel andere smaak.',
      en: 'Cachaça is distilled from fresh-pressed sugar cane juice; rum usually from molasses. Same plant, different raw material, and a completely different taste.',
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
      nl: "Grenadine hoort granaatappelsiroop te zijn: 'grenade' is Frans voor granaatappel. De meeste flessen in de supermarkt zijn suiker, water en kleurstof.",
      en: "Grenadine is supposed to be pomegranate syrup: 'grenade' is French for pomegranate. Most supermarket bottles are sugar, water and colouring.",
    },
  },
  {
    id: 'tonic-uv',
    ingredientId: 'tonic-water',
    text: {
      nl: 'Tonic licht blauw op onder uv-licht. Dat komt door kinine, ooit toegevoegd als medicijn tegen malaria en nu vooral verantwoordelijk voor de bittere smaak.',
      en: 'Tonic water glows blue under UV light. That is the quinine, once added as an anti-malarial, now mostly responsible for the bitterness.',
    },
  },
  {
    id: 'vermouth-is-wine',
    ingredientId: 'sweet-vermouth',
    text: {
      nl: 'Vermout is wijn, geen sterke drank. Een geopende fles hoort in de koelkast en gaat maar een paar weken mee. De meeste flauwe Martini’s komen door oude vermout.',
      en: 'Vermouth is wine, not spirits. Once open it belongs in the fridge and lasts only a few weeks. Most flat-tasting Martinis are simply old vermouth.',
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
      nl: 'Falernum komt van Barbados en is een gekruide siroop van limoen, kruidnagel, amandel en gember, de smaak die de meeste tikidrankjes bindt.',
      en: 'Falernum comes from Barbados: a spiced syrup of lime, clove, almond and ginger, the flavour that holds most tiki drinks together.',
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
  {
    id: 'cosmopolitan-odeon',
    cocktailId: 'cosmopolitan',
    text: {
      nl: 'Wie de Cosmopolitan bedacht, is omstreden. De bekendste versie is die van Toby Cecchini, die hem in 1988 met verse limoen maakte in restaurant The Odeon in New York. Barvrouw Cheryl Cook uit Miami zegt dat ze hem eerder bedacht.',
      en: "Who invented the Cosmopolitan is disputed. The best-known version is Toby Cecchini's, made with fresh lime at The Odeon in New York in 1988. Miami bartender Cheryl Cook says she got there first.",
    },
  },
  {
    id: 'spritz-austrians',
    cocktailId: 'spritz',
    text: {
      nl: "Het woord spritz in Aperol Spritz komt uit het Duits. Volgens de overlevering lengden Oostenrijkse soldaten in het 19e-eeuwse Veneto de stevige lokale wijn aan met een scheut water, in het Duits 'spritzen'.",
      en: "The word spritz in Aperol Spritz is German. Austrian soldiers in 19th-century Veneto are said to have cut the strong local wine with a splash of water, 'spritzen' in German.",
    },
  },
  {
    id: 'mai-tai-tahitian',
    cocktailId: 'mai-tai',
    text: {
      nl: "Mai Tai komt van het Tahitiaanse 'maita'i': goed, uitstekend. Trader Vic zei dat hij hem in 1944 in Oakland maakte voor Tahitiaanse vrienden, maar Donn Beach claimde de naam al eerder te hebben gebruikt.",
      en: "Mai Tai comes from the Tahitian 'maita'i': good, excellent. Trader Vic said he made it in Oakland in 1944 for Tahitian friends, but Donn Beach claimed to have used the name earlier.",
    },
  },
  {
    id: 'zombie-limit-two',
    cocktailId: 'zombie',
    text: {
      nl: "Op de kaart van Don the Beachcomber stond in de jaren '30 dat je maximaal twee Zombies mocht bestellen. Er zitten meerdere soorten rum in, en die limiet bleek ook goede reclame.",
      en: "In the 1930s Don the Beachcomber's menu limited guests to two Zombies each. The drink holds several rums, and the limit doubled as good advertising.",
    },
  },
  {
    id: 'french-75-gun',
    cocktailId: 'french-75',
    text: {
      nl: 'De French 75 is vernoemd naar het Franse 75mm-veldkanon uit de Eerste Wereldoorlog. Wie het drankje als eerste zo noemde, is niet bekend.',
      en: 'The French 75 is named after the French 75 mm field gun of the First World War. Who first gave the drink that name is not known.',
    },
  },
  {
    id: 'aviation-violette',
    cocktailId: 'aviation',
    text: {
      nl: 'Het Savoy Cocktail Book liet in 1930 de crème de violette weg uit de Aviation. Veel barmannen volgden dat voorbeeld, waardoor de cocktail lange tijd zonder zijn lichtpaarse kleur werd gemaakt.',
      en: 'The Savoy Cocktail Book left the crème de violette out of the Aviation in 1930. Many bartenders followed suit, so for a long time the drink was made without its pale violet colour.',
    },
  },
  {
    id: 'ramos-fizz-huey-long',
    cocktailId: 'ramos-fizz',
    text: {
      nl: 'In 1935 liet de Louisiaanse politicus Huey Long een barman uit New Orleans naar New York overkomen, om het personeel van het New Yorker Hotel te leren hoe je een echte Ramos Fizz maakt.',
      en: 'In 1935 Louisiana politician Huey Long brought a New Orleans bartender to New York to teach the staff of the New Yorker Hotel how to make a proper Ramos Fizz.',
    },
  },
  {
    id: 'bellini-painter',
    cocktailId: 'bellini',
    text: {
      nl: "Giuseppe Cipriani maakte de Bellini in Harry's Bar in Venetië, meestal gedateerd op 1948. Hij noemde hem naar de 15e-eeuwse Venetiaanse schilder Giovanni Bellini, omdat de roze kleur hem aan diens werk deed denken.",
      en: "Giuseppe Cipriani created the Bellini at Harry's Bar in Venice, usually dated to 1948. He named it after the 15th-century Venetian painter Giovanni Bellini, whose work the pink colour reminded him of.",
    },
  },
  {
    id: 'dark-n-stormy-trademark',
    cocktailId: 'dark-n-stormy',
    text: {
      nl: "Dark 'n Stormy is een geregistreerd handelsmerk van Gosling's uit Bermuda. In de VS mag de cocktail officieel alleen zo heten als er Gosling's Black Seal-rum in zit.",
      en: "Dark 'n Stormy is a registered trademark of Gosling's of Bermuda. In the US the drink may officially only carry the name when it is made with Gosling's Black Seal rum.",
    },
  },
  {
    id: 'paper-plane-song',
    cocktailId: 'paper-plane',
    text: {
      nl: "Sam Ross maakte de Paper Plane rond 2008 voor The Violet Hour in Chicago. De naam komt van 'Paper Planes' van M.I.A., het nummer dat hij tijdens het uitproberen steeds opnieuw afspeelde.",
      en: "Sam Ross created the Paper Plane around 2008 for The Violet Hour in Chicago. The name comes from M.I.A.'s 'Paper Planes', the song he kept playing while working on it.",
    },
  },
  {
    id: 'gin-basil-smash-pesto',
    cocktailId: 'gin-basil-smash',
    text: {
      nl: "De Gin Basil Smash werd in 2008 bedacht door Jörg Meyer in bar Le Lion in Hamburg. Op de kaart stond hij eerst als 'Gin Pesto'.",
      en: "The Gin Basil Smash was created in 2008 by Jörg Meyer at Le Lion in Hamburg. It first went on the menu as the 'Gin Pesto'.",
    },
  },
  {
    id: 'americano-milano-torino',
    cocktailId: 'americano',
    text: {
      nl: 'De Americano heette oorspronkelijk Milano-Torino: Campari uit Milaan, vermout uit Turijn. De latere naam wordt meestal toegeschreven aan Amerikaanse bezoekers die hem graag bestelden.',
      en: 'The Americano was originally called the Milano-Torino: Campari from Milan, vermouth from Turin. The later name is usually credited to American visitors who were fond of it.',
    },
  },
  {
    id: 'hanky-panky-coleman',
    cocktailId: 'hanky-panky',
    text: {
      nl: 'De Hanky Panky is gemaakt door Ada Coleman, hoofd van de American Bar in het Savoy in Londen. Ze bedacht hem voor acteur Charles Hawtrey, die om iets met pit had gevraagd.',
      en: 'The Hanky Panky was created by Ada Coleman, head bartender of the American Bar at the Savoy in London, for actor Charles Hawtrey, who had asked for something with a bit of punch.',
    },
  },
  {
    id: 'corpse-reviver-warning',
    cocktailId: 'corpse-reviver-2',
    text: {
      nl: "Het Savoy Cocktail Book (1930) geeft bij de Corpse Reviver #2 een waarschuwing mee: vier ervan snel achter elkaar, en het 'lijk' is weer net zo dood als eerst.",
      en: "The Savoy Cocktail Book (1930) gives the Corpse Reviver #2 a warning: 'Four of these taken in swift succession will unrevive the corpse again.'",
    },
  },
  {
    id: 'kir-mayor',
    cocktailId: 'kir',
    text: {
      nl: 'Kir heette eerst gewoon blanc-cassis. De naam komt van Félix Kir, priester en na de oorlog burgemeester van Dijon, die het drankje schonk bij ontvangsten van de stad en het zo bekend maakte.',
      en: 'Kir used to be called simply blanc-cassis. The name comes from Félix Kir, a priest and post-war mayor of Dijon, who served it at civic receptions and made it famous.',
    },
  },
  {
    id: 'hugo-lemon-balm',
    cocktailId: 'hugo',
    text: {
      nl: 'De Hugo is pas in 2005 bedacht, door barman Roland Gruber in Naturns in Zuid-Tirol. In de eerste versie zat melissesiroop; vlierbloesem kwam later, omdat die makkelijker te krijgen was.',
      en: 'The Hugo only dates from 2005, created by bartender Roland Gruber in Naturns, South Tyrol. The first version used lemon balm syrup; elderflower came later because it was easier to find.',
    },
  },
  {
    id: 'pisco-sour-morris',
    cocktailId: 'pisco-sour',
    text: {
      nl: "De oudste vermeldingen van de Pisco Sour zijn advertenties uit de vroege jaren '20 voor Morris' Bar in Lima, van de Amerikaan Victor Morris. Of de pisco zelf bij Peru of Chili hoort, is al lang een twistpunt.",
      en: "The earliest mentions of the Pisco Sour are early-1920s advertisements for Morris' Bar in Lima, run by the American Victor Morris. Whether pisco itself belongs to Peru or Chile is a long-running dispute.",
    },
  },
  {
    id: 'vieux-carre-quarter',
    cocktailId: 'vieux-carre',
    text: {
      nl: "Vieux Carré, letterlijk 'oud vierkant', is de Franse naam voor het French Quarter van New Orleans. Walter Bergeron, barman in Hotel Monteleone, bedacht de cocktail in 1938.",
      en: "Vieux Carré, literally 'old square', is the French name for the French Quarter of New Orleans. Walter Bergeron, bartender at the Hotel Monteleone, created the drink in 1938.",
    },
  },
  {
    id: 'last-word-detroit',
    cocktailId: 'last-word',
    text: {
      nl: 'De Last Word stond in 1916 al op de kaart van de Detroit Athletic Club en raakte daarna bijna vergeten. Barman Murray Stenson zette hem begin deze eeuw in Seattle weer op de kaart.',
      en: 'The Last Word was on the Detroit Athletic Club menu by 1916 and was then all but forgotten. Bartender Murray Stenson put it back on a menu in Seattle in the early 2000s.',
    },
  },
  {
    id: 'tommys-agave',
    cocktailId: 'tommy-s-margarita',
    text: {
      nl: "In een Tommy's Margarita zit geen sinaasappellikeur maar agavesiroop. Julio Bermejo koos daarvoor rond 1990 in het restaurant van zijn familie in San Francisco, om de tequila meer ruimte te geven.",
      en: "A Tommy's Margarita swaps orange liqueur for agave syrup. Julio Bermejo made that choice around 1990 at his family's restaurant in San Francisco, to let the tequila come through.",
    },
  },
  {
    id: 'boulevardier-gwynne',
    cocktailId: 'boulevardier',
    text: {
      nl: 'De Boulevardier deelt zijn naam met het maandblad dat de Amerikaanse schrijver Erskine Gwynne in Parijs uitgaf. Harry MacElhone schreef de cocktail in 1927 in zijn boek aan Gwynne toe.',
      en: 'The Boulevardier shares its name with the monthly magazine American writer Erskine Gwynne published in Paris. Harry MacElhone credited the drink to Gwynne in his 1927 book.',
    },
  },
  {
    id: 'bramble-blackberries',
    cocktailId: 'bramble',
    text: {
      nl: "Dick Bradsell maakte de Bramble in de jaren '80 in Londen. Hij dacht daarbij terug aan bramen plukken als kind op het eiland Wight; 'bramble' is Engels voor braamstruik.",
      en: 'Dick Bradsell created the Bramble in 1980s London, thinking back to picking blackberries as a child on the Isle of Wight. A bramble is a blackberry bush.',
    },
  },
  {
    id: 'tequila-sunrise-stones',
    cocktailId: 'tequila-sunrise',
    text: {
      nl: "De Tequila Sunrise zoals we hem nu kennen, ontstond begin jaren '70 in The Trident in Sausalito. In 1972 schonk barman Bobby Lozoff hem aan de Rolling Stones, en via hun tournee dat jaar werd hij bekend.",
      en: 'The Tequila Sunrise as we know it took shape in the early 1970s at The Trident in Sausalito. In 1972 bartender Bobby Lozoff served it to the Rolling Stones, and their tour that year made it famous.',
    },
  },
  {
    id: 'martini-not-dry',
    cocktailId: 'dry-martini',
    text: {
      nl: "De eerste Martini's waren allesbehalve droog: gin en zoete vermout in gelijke delen, meestal met de zoetere Old Tom-gin. Pas in de 20e eeuw werd de verhouding steeds droger.",
      en: 'The first Martinis were anything but dry: equal parts gin and sweet vermouth, usually with the sweeter Old Tom gin. The ratio only grew drier during the 20th century.',
    },
  },
  {
    id: 'sidecar-1922',
    cocktailId: 'sidecar',
    text: {
      nl: 'De eerste gedrukte recepten van de Sidecar verschenen allebei in 1922, in boeken van Robert Vermeire en Harry MacElhone. Wie hem bedacht, is nog altijd omstreden; zowel Londen als Parijs claimt hem.',
      en: 'The first printed Sidecar recipes both appeared in 1922, in books by Robert Vermeire and Harry MacElhone. Who invented it is still disputed; both London and Paris lay claim to it.',
    },
  },
  {
    id: 'cuba-libre-affidavit',
    cocktailId: 'cuba-libre',
    text: {
      nl: 'Het verhaal dat de Cuba Libre in 1900 in Havana ontstond, rust grotendeels op een verklaring uit 1965 van Fausto Rodriguez. Hij werkte toen voor Bacardi, en daarom twijfelen historici eraan.',
      en: 'The story that the Cuba Libre was born in Havana in 1900 rests largely on a 1965 statement by Fausto Rodriguez. He worked for Bacardi at the time, which is why historians are wary of it.',
    },
  },
  {
    id: 'long-island-no-tea',
    cocktailId: 'long-island-ice-tea',
    text: {
      nl: 'In Long Island Iced Tea zit geen thee. De naam komt van de kleur: een scheut cola maakt het mengsel van vijf sterke dranken net zo amberkleurig als ijsthee.',
      en: 'Long Island Iced Tea contains no tea. The name comes from the colour: a splash of cola turns a mix of five spirits the same amber as iced tea.',
    },
  },
  {
    id: 'mimosa-flower',
    cocktailId: 'mimosa',
    text: {
      nl: "De Mimosa is vernoemd naar de gele bloemetjes van de mimosa. De Britse Buck's Fizz, met meer bubbels en minder sap, is waarschijnlijk een paar jaar ouder.",
      en: "The Mimosa is named after the yellow flowers of the mimosa tree. Britain's Buck's Fizz, with more fizz and less juice, is probably a few years older.",
    },
  },
  {
    id: 'benedictine-legend',
    ingredientId: 'benedictine',
    text: {
      nl: 'Bénédictine werd in 1863 op de markt gebracht door wijnhandelaar Alexandre Le Grand. Het verhaal over een 16e-eeuws monnikenrecept geldt als zijn eigen reclameverhaal; historisch bewijs ervoor is er niet.',
      en: "Bénédictine was launched in 1863 by wine merchant Alexandre Le Grand. The tale of a 16th-century monks' recipe is regarded as his own marketing; there is no historical evidence for it.",
    },
  },
  {
    id: 'jenever-oude-jonge',
    ingredientId: 'jenever',
    text: {
      nl: 'Oude en jonge jenever zeggen niets over leeftijd. Het verschil zit in het recept: oude jenever bevat meer moutwijn en smaakt voller, jonge jenever is lichter en neutraler.',
      en: 'Oude (old) and jonge (young) jenever say nothing about age. The difference is the recipe: oude contains more malt wine and tastes fuller, jonge is lighter and more neutral.',
    },
  },
  {
    id: 'noilly-prat-outdoors',
    ingredientId: 'dry-vermouth',
    text: {
      nl: 'Noilly Prat, een van de bekendste droge vermouts, laat zijn basiswijn ongeveer een jaar in vaten in de open lucht rijpen, op een binnenplaats in het Zuid-Franse Marseillan.',
      en: 'Noilly Prat, one of the best-known dry vermouths, ages its base wine for about a year in barrels left outdoors, in a courtyard in Marseillan in the south of France.',
    },
  },
  {
    id: 'rye-washington',
    ingredientId: 'rye-whiskey',
    text: {
      nl: "George Washington had na zijn presidentschap een eigen stokerij op Mount Vernon. In 1799 maakte die zo'n 41.000 liter whiskey, grotendeels van rogge.",
      en: 'After his presidency George Washington ran his own distillery at Mount Vernon. In 1799 it made nearly 11,000 gallons of whiskey, mostly from rye.',
    },
  },
  {
    id: 'black-tot-day',
    ingredientId: 'dark-rum',
    text: {
      nl: 'Tot 31 juli 1970 kreeg elke matroos bij de Britse marine dagelijks een portie rum. Die laatste dag staat bekend als Black Tot Day.',
      en: 'Until 31 July 1970 every sailor in the Royal Navy received a daily ration of rum. That last day is known as Black Tot Day.',
    },
  },
  {
    id: 'bacardi-bat',
    ingredientId: 'white-rum',
    text: {
      nl: 'De vleermuis van Bacardi komt van de vruchtvleermuizen die in de dakbalken van de eerste stokerij in Santiago de Cuba huisden. Doña Amalia, de vrouw van de oprichter, zag ze als geluksbrengers.',
      en: "Bacardi's bat comes from the fruit bats living in the rafters of its first distillery in Santiago de Cuba. Doña Amalia, the founder's wife, saw them as a sign of good luck.",
    },
  },
  {
    id: 'triple-sec-name',
    ingredientId: 'triple-sec',
    text: {
      nl: "'Sec' betekent droog, maar waarom triple sec 'triple' heet, weet niemand zeker. Combier en Cointreau zeggen allebei dat zij de eerste waren.",
      en: "'Sec' means dry, but nobody knows for sure why triple sec is 'triple'. Combier and Cointreau both say they made it first.",
    },
  },
  {
    id: 'scotch-three-years',
    ingredientId: 'scotch',
    text: {
      nl: 'Scotch moet volgens de wet minstens drie jaar in Schotland op eikenhouten vaten hebben gerijpt. Jongere whisky mag zich geen Scotch noemen.',
      en: 'By law, Scotch must mature in oak casks in Scotland for at least three years. Anything younger cannot be called Scotch.',
    },
  },
  {
    id: 'lime-juice-scurvy',
    ingredientId: 'lime-juice',
    text: {
      nl: "Sinds 1867 moesten Britse koopvaardijschepen op lange reizen limoen- of citroensap meenemen tegen scheurbuik. Datzelfde jaar vond Lauchlan Rose een manier om het sap met suiker in plaats van alcohol houdbaar te maken: Rose's lime cordial.",
      en: "From 1867 British merchant ships on long voyages had to carry lime or lemon juice against scurvy. That same year Lauchlan Rose found a way to preserve the juice with sugar instead of alcohol: Rose's lime cordial.",
    },
  },
  {
    id: 'lillet-kina',
    ingredientId: 'lillet-blanc',
    text: {
      nl: "Lillet Blanc heette tot halverwege de jaren '80 Kina Lillet en bevatte toen meer kinine. Een Vesper precies volgens het recept van Fleming is daardoor niet meer te maken.",
      en: 'Lillet Blanc was called Kina Lillet until the mid-1980s and contained more quinine. That is why a Vesper exactly as Fleming wrote it can no longer be made.',
    },
  },
  {
    id: 'jagermeister-name',
    ingredientId: 'jagermeister',
    text: {
      nl: 'Jägermeister bestaat sinds 1934 en wordt gemaakt met 56 kruiden, bloesems, wortels en vruchten. De naam is een oude Duitse titel voor de hoogste ambtenaar in het jachtwezen.',
      en: 'Jägermeister dates from 1934 and is made with 56 herbs, blossoms, roots and fruits. The name is an old German title for the senior official in charge of hunting.',
    },
  },
  {
    id: 'grand-marnier-ritz',
    ingredientId: 'grand-marnier',
    text: {
      nl: 'Grand Marnier heette bij de introductie in 1880 Curaçao Marnier. Hotelier César Ritz zou de naam Grand Marnier hebben voorgesteld.',
      en: 'Grand Marnier was launched in 1880 as Curaçao Marnier. Hotelier César Ritz is said to have suggested the name Grand Marnier.',
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

/** Tiny stable string hash; picks the same fact for the same recipe on every visit. */
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
 * picked, deterministically per recipe, so the Negroni always shows the same one, but two gin
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
