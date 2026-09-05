/**
 * Runtime internationalization for both clients (Angular web + Expo mobile).
 *
 * `Locale` is the single language axis for the whole product: it selects the catalog display
 * overlay (see {@link applyCatalogTranslations}) AND the UI chrome strings below. English is the
 * canonical id space; Dutch is the default display language.
 *
 * All user-facing chrome lives in one place — {@link UI_STRINGS} — so the two apps stay in step and
 * every concept has exactly one wording per language (no more "kast" vs "bar", or four spellings of
 * "you're missing an ingredient"). Interpolated / pluralized phrases are functions so word order can
 * differ per language.
 */

/** Display language. English is the canonical id space; a Dutch overlay carries the same `version`. */
export type Locale = 'en' | 'nl';

/** The languages offered in the in-app switcher, in display order. */
export const LOCALES: readonly Locale[] = ['nl', 'en'];

/** Default display language when nothing is stored. */
export const DEFAULT_LOCALE: Locale = 'nl';

/** Short native name for each language, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
};

/** Two-letter code shown on a compact toggle. */
export const LOCALE_SHORT: Record<Locale, string> = {
  nl: 'NL',
  en: 'EN',
};

/** The full shape of the UI string table. Both apps consume the same keys. */
export interface UiStrings {
  /** Brand + generic words reused across screens. */
  common: {
    appName: string;
    tagline: string;
    cocktails: string;
    edit: string;
    delete: string;
    cancel: string;
    save: string;
    saving: string;
    add: string;
    back: string;
    next: string;
    ok: string;
    close: string;
    none: string;
    optional: string;
    loading: string;
    ingredientsWord: string;
  };
  /** Top navigation / bottom tab bar. */
  nav: {
    home: string;
    discover: string;
    myBar: string;
    cocktails: string;
    technique: string;
    surpriseMe: string;
    lightMode: string;
    darkMode: string;
    toggleTheme: string;
    toggleLanguage: string;
    menu: string;
    brandHome: string;
    install: string;
    account: string;
    login: string;
  };
  /** Home / discover dashboard (route was "Mijn bar", now "Ontdek"). */
  home: {
    welcome: string;
    heroTitle: string;
    heroLede: string;
    buildBar: string;
    browseFirst: string;
    eyebrow: string;
    /**
     * One quiet line of fact where a counting-up hero number used to be. It reports a filter
     * result, never a score that rises as the user acquires more.
     */
    fitLine: (n: number) => string;
    editBar: string;
    wizardAgain: string;
    makeNow: string;
    cocktailsCount: (n: number) => string;
    emptyTitle: string;
    emptyBody: string;
    refillBar: string;
    yourBar: string;
    ingredientCount: (n: number) => string;
    countSubstitutes: string;
    shareStats: string;
    editBarShort: string;
  };
  /**
   * The technique lessons — the reason to open the app that is not a bottle. Every drill is
   * alcohol-free, and there is deliberately no progress vocabulary here: no "completed", no level.
   */
  technique: {
    eyebrow: string;
    intro: string;
    why: string;
    how: string;
    wrong: string;
    tell: string;
    practise: string;
    seconds: (n: number) => string;
    usedIn: string;
    usedInCount: (n: number) => string;
    noMethod: string;
    notFound: string;
    allLessons: string;
  };
  /**
   * Structural families — the template underneath a drink (sour, highball, spirit-forward…). One
   * line on every recipe, plus a small section of its own so that line has somewhere to lead.
   */
  family: {
    eyebrow: string;
    title: string;
    intro: string;
    ratio: string;
    about: string;
    othersInFamily: (n: number) => string;
    inFamily: (n: number) => string;
    recipesIn: string;
    allFamilies: string;
    notFound: string;
  };
  /** "Did you know?" trivia — on the home card, and on the recipe or ingredient it belongs to. */
  facts: {
    eyebrow: string;
    next: string;
    readMore: (name: string) => string;
  };
  /** First-run wizard. */
  wizard: {
    step: (n: number, total: number) => string;
    progressLabel: string;
    skip: string;
    emptyCategory: string;
    back: string;
    next: string;
    finish: string;
    staplesTitle: string;
    staplesHint: string;
    spiritsTitle: string;
    spiritsHint: string;
    searchPlaceholder: string;
    searchResults: string;
    searchEmpty: string;
    showAll: (n: number) => string;
    showLess: string;
    /** Live payoff under the buttons: what the ticks so far already buy you. */
    makeable: (n: number) => string;
    almost: (n: number) => string;
    nothingYet: string;
  };
  /** "Mijn bar" — the stock editor (route/component was "Mijn kast"/Cabinet). */
  bar: {
    title: string;
    sub: string;
    youCanMake: (n: number) => string;
    selected: (n: number) => string;
  };
  /** Cocktail list. */
  list: {
    title: string;
    searchPlaceholder: string;
    onlyFavorites: string;
    new: string;
    edit: string;
    delete: string;
    emptyTitle: string;
    emptyFavorites: string;
    emptySearch: string;
    emptyAlcoholFree: string;
    filterBySpirit: string;
    alcoholFree: string;
    sortBy: string;
    sortNameAsc: string;
    sortNameDesc: string;
    sortDifficulty: string;
    clearFilters: string;
    confirmDelete: (name: string) => string;
    deleted: string;
  };
  /** Cocktail detail. */
  detail: {
    back: string;
    garnishPrefix: string;
    favorite: string;
    saveFavorite: string;
    print: string;
    edit: string;
    haveAll: string;
    youStillMiss: (names: string) => string;
    addToBar: string;
    ingredients: string;
    less: string;
    more: string;
    glasses: (n: number) => string;
    optional: string;
    inBar: string;
    add: string;
    preparation: string;
    noInstructions: string;
    tips: string;
    variations: string;
    viewRecipe: string;
    notFoundTitle: string;
    backToCollection: string;
    confirmDelete: (name: string) => string;
    deleted: string;
  };
  /** Cocktail card (grid tile). */
  card: {
    removeFavorite: string;
    addFavorite: string;
    makeNow: string;
    missName: (name: string) => string;
    missMany: (n: number) => string;
  };
  /** Cocktail editor form (admin). */
  form: {
    backToCocktails: string;
    editTitle: string;
    newTitle: string;
    name: string;
    nameRequired: string;
    description: string;
    imageUrl: string;
    imageUrlPlaceholder: string;
    imageUrlHint: string;
    glass: string;
    none: string;
    method: string;
    difficulty: string;
    garnish: string;
    garnishPlaceholder: string;
    servings: string;
    tags: string;
    removeTag: (tag: string) => string;
    newTagPlaceholder: string;
    ingredients: string;
    removeLine: string;
    noIngredients: string;
    ingredient: string;
    amount: string;
    unit: string;
    optional: string;
    addLine: string;
    preparation: string;
    preparationPlaceholder: string;
    preparationHint: string;
    saving: string;
    save: string;
    cancel: string;
    updated: string;
    saved: string;
  };
  /** Ingredient catalog / editor. */
  ingredients: {
    eyebrow: string;
    title: string;
    ledeAdmin: string;
    ledeUser: string;
    name: string;
    category: string;
    none: string;
    staple: string;
    update: string;
    add: string;
    cancel: string;
    loading: string;
    stapleTag: string;
    edit: string;
    delete: string;
    empty: string;
    toWizard: string;
    updated: string;
    added: string;
    confirmDelete: (name: string) => string;
    deleted: string;
  };
  /** Shared confirm dialog defaults. */
  confirm: {
    title: string;
    cancel: string;
    confirm: string;
  };
  /**
   * Flat confirmations after a cabinet change. Deliberately plain: the app states what changed and
   * never celebrates an acquisition, so there is no "+N unlocked" string here by design.
   */
  toast: {
    added: (name: string) => string;
    addedMany: (n: number) => string;
    removed: (name: string) => string;
  };
  /** API / data errors and the snackbar dismiss action. */
  errors: {
    network: string;
    invalid: string;
    notFound: string;
    exists: string;
    rateLimit: string;
    generic: string;
    readOnly: string;
    noCocktails: string;
    dismiss: string;
  };
  /** Browser tab / screen titles. */
  titles: {
    discover: string;
    buildBar: string;
    myBar: string;
    ingredients: string;
    newCocktail: string;
    editCocktail: string;
    cocktails: string;
    technique: string;
    families: string;
  };
}

const nl: UiStrings = {
  common: {
    appName: 'Barkast',
    tagline: 'wat kun je maken?',
    cocktails: 'Cocktails',
    edit: 'Bewerk',
    delete: 'Verwijder',
    cancel: 'Annuleren',
    save: 'Opslaan',
    saving: 'Bezig…',
    add: 'Toevoegen',
    back: 'Terug',
    next: 'Volgende',
    ok: 'Oké',
    close: 'Sluiten',
    none: '— geen —',
    optional: 'optioneel',
    loading: 'Laden…',
    ingredientsWord: 'ingrediënten',
  },
  nav: {
    home: 'Home',
    discover: 'Ontdek',
    myBar: 'Mijn bar',
    cocktails: 'Cocktails',
    technique: 'Techniek',
    surpriseMe: 'Verras me',
    lightMode: 'Lichte modus',
    darkMode: 'Donkere modus',
    toggleTheme: 'Wissel thema',
    toggleLanguage: 'Wissel taal',
    menu: 'Menu',
    brandHome: 'Barkast home',
    install: 'Installeer Barkast',
    account: 'Account',
    login: 'Inloggen',
  },
  home: {
    welcome: 'Welkom bij Barkast',
    heroTitle: 'Wat staat er<br />in jouw bar?',
    heroLede:
      'Vink aan wat je in huis hebt — sterke drank, mixers, dat ene flesje achterin — en Barkast laat meteen zien welke cocktails je <em>nu</em> kunt maken.',
    buildBar: 'Stel je bar samen',
    browseFirst: 'Blader eerst rond',
    eyebrow: 'Ontdek',
    fitLine: (n) =>
      n === 1
        ? '1 recept past bij wat je in huis hebt.'
        : `${n} recepten passen bij wat je in huis hebt.`,
    editBar: 'Bewerk mijn bar',
    wizardAgain: 'Wizard opnieuw',
    makeNow: 'Nu te maken',
    cocktailsCount: (n) => `${n} ${n === 1 ? 'cocktail' : 'cocktails'}`,
    emptyTitle: 'Nog niks helemaal compleet.',
    emptyBody:
      'Zet in je bar wat je in huis hebt, dan zie je hier wat je ermee kunt maken. Of begin bij een techniek.',
    refillBar: 'Bar aanvullen',
    yourBar: 'Mijn bar',
    ingredientCount: (n) => `${n} ${n === 1 ? 'ingrediënt' : 'ingrediënten'}`,
    countSubstitutes: 'Vervangers meetellen',
    shareStats: 'Anonieme statistieken delen',
    editBarShort: 'Bewerk bar',
  },
  technique: {
    eyebrow: 'Leren',
    intro:
      'Zes handelingen waarmee je elk recept in deze app kunt maken. Elke les heeft een oefening waar geen fles voor nodig is.',
    why: 'Waarom',
    how: 'Zo doe je het',
    wrong: 'Waar het misgaat',
    tell: 'Hoe je weet dat het goed is',
    practise: 'Oefenen',
    seconds: (n) => `${n} seconden`,
    usedIn: 'Recepten waarin je dit gebruikt',
    usedInCount: (n) => `${n} ${n === 1 ? 'recept' : 'recepten'}`,
    noMethod: 'Geldt voor elk recept',
    notFound: 'Deze les bestaat niet.',
    allLessons: 'Alle lessen',
  },
  family: {
    eyebrow: 'De vorm',
    title: 'Families',
    intro:
      'Bijna elke klassieker is één van negen vormen. Ken je de vorm, dan kun je erbinnen improviseren zonder recept.',
    ratio: 'Verhouding',
    about: 'Wat het is',
    othersInFamily: (n) => (n === 1 ? 'Nog 1 in deze familie ›' : `Nog ${n} in deze familie ›`),
    inFamily: (n) => `${n} ${n === 1 ? 'recept' : 'recepten'}`,
    recipesIn: 'Recepten in deze familie',
    allFamilies: 'Alle families',
    notFound: 'Deze familie bestaat niet.',
  },
  facts: {
    eyebrow: 'Wist je dat?',
    next: 'Nog een weetje →',
    readMore: (name) => `Bekijk ${name} ›`,
  },
  wizard: {
    step: (n, total) => `Stap ${n} van ${total}`,
    progressLabel: 'Voortgang',
    skip: 'Overslaan',
    emptyCategory: 'Niets in deze categorie past bij je flessen — tik op “toon alles”.',
    back: 'Terug',
    next: 'Volgende',
    finish: 'Klaar — toon mijn bar',
    staplesTitle: 'Dit heb je vast al in huis',
    staplesHint: 'Suiker, siroop, bruiswater… vink aan wat klopt. We hebben alvast wat aangevinkt.',
    spiritsTitle: 'Welke sterke drank staat er?',
    spiritsHint: 'Begin hier: hierna vragen we alleen nog naar wat bij jouw flessen past.',
    searchPlaceholder: 'Zoek een ingrediënt…',
    searchResults: 'Zoekresultaten',
    searchEmpty: 'Niets gevonden.',
    showAll: (n) => `Toon alles (${n} meer)`,
    showLess: 'Toon minder',
    makeable: (n) => `Hiermee maak je al ${n} ${n === 1 ? 'cocktail' : 'cocktails'}`,
    almost: (n) =>
      `${n} ${n === 1 ? 'cocktail is' : 'cocktails zijn'} nog één ingrediënt van je af`,
    nothingYet: 'Vink aan wat je in huis hebt.',
  },
  bar: {
    title: 'Mijn bar',
    sub: 'Vink aan wat je in huis hebt — de rest rekent Barkast uit.',
    youCanMake: (n) => `Je kunt ${n} ${n === 1 ? 'cocktail' : 'cocktails'} maken`,
    selected: (n) => `${n} ${n === 1 ? 'ingrediënt' : 'ingrediënten'} geselecteerd`,
  },
  list: {
    title: 'Alle cocktails',
    searchPlaceholder: 'Zoek op naam of ingrediënt…',
    onlyFavorites: 'Alleen favorieten',
    new: 'Nieuw',
    edit: 'Bewerk',
    delete: 'Verwijder',
    emptyTitle: 'Niets gevonden',
    emptyFavorites: 'Je hebt nog geen favorieten. Tik op het hartje van een cocktail.',
    emptySearch: 'Pas je zoekopdracht of filters aan.',
    emptyAlcoholFree: 'Nog geen alcoholvrije recepten in de collectie.',
    filterBySpirit: 'Filter op basissterk',
    alcoholFree: 'Alcoholvrij',
    sortBy: 'Sorteer op',
    sortNameAsc: 'Naam A–Z',
    sortNameDesc: 'Naam Z–A',
    sortDifficulty: 'Moeilijkheid',
    clearFilters: 'Wis filters',
    confirmDelete: (name) => `Cocktail "${name}" verwijderen?`,
    deleted: 'Cocktail verwijderd',
  },
  detail: {
    back: '‹ Terug',
    garnishPrefix: 'Garnering',
    favorite: 'Favoriet',
    saveFavorite: 'Bewaar',
    print: 'Print',
    edit: 'Bewerk',
    haveAll: '✓ Je hebt alles in huis — shaken maar!',
    youStillMiss: (names) => `Je mist nog ${names}`,
    addToBar: '+ Toevoegen aan mijn bar',
    ingredients: 'Ingrediënten',
    less: 'Minder',
    more: 'Meer',
    glasses: (n) => `${n} ${n === 1 ? 'glas' : 'glazen'}`,
    optional: 'optioneel',
    inBar: '✓ in bar',
    add: '+ Toevoegen',
    preparation: 'Bereiding',
    noInstructions: 'Geen instructies opgegeven.',
    tips: 'Tips',
    variations: 'Variaties',
    viewRecipe: 'Bekijk recept ›',
    notFoundTitle: 'Deze cocktail bestaat niet (meer)',
    backToCollection: 'Terug naar de collectie',
    confirmDelete: (name) => `Cocktail "${name}" verwijderen?`,
    deleted: 'Cocktail verwijderd',
  },
  card: {
    removeFavorite: 'Verwijder uit favorieten',
    addFavorite: 'Voeg toe aan favorieten',
    makeNow: 'Nu te maken',
    missName: (name) => `Mist ${name}`,
    missMany: (n) => `Mist ${n} ingrediënten`,
  },
  form: {
    backToCocktails: 'Cocktails',
    editTitle: 'Cocktail bewerken',
    newTitle: 'Nieuwe cocktail',
    name: 'Naam',
    nameRequired: 'Naam is verplicht',
    description: 'Omschrijving',
    imageUrl: 'Afbeelding-URL (optioneel)',
    imageUrlPlaceholder: 'https://…',
    imageUrlHint: 'Leeg laten? Dan tonen we een stijlvol standaardbeeld.',
    glass: 'Glas',
    none: '— geen —',
    method: 'Methode',
    difficulty: 'Niveau',
    garnish: 'Garnering',
    garnishPlaceholder: 'bv. schijfje limoen',
    servings: 'Aantal glazen',
    tags: 'Tags',
    removeTag: (tag) => `verwijder ${tag}`,
    newTagPlaceholder: 'Nieuwe tag…',
    ingredients: 'Ingrediënten',
    removeLine: 'verwijder',
    noIngredients: 'Nog geen ingrediënten toegevoegd.',
    ingredient: 'Ingrediënt',
    amount: 'Hoeveelheid',
    unit: 'Eenheid',
    optional: 'Optioneel',
    addLine: 'Toevoegen',
    preparation: 'Bereiding',
    preparationPlaceholder: 'Eén stap per regel',
    preparationHint: 'Eén stap per regel.',
    saving: 'Bezig…',
    save: 'Opslaan',
    cancel: 'Annuleren',
    updated: 'Cocktail bijgewerkt',
    saved: 'Cocktail opgeslagen',
  },
  ingredients: {
    eyebrow: 'De catalogus',
    title: 'Ingrediënten',
    ledeAdmin:
      'De bouwstenen van je bar. Markeer wat de meeste mensen in huis hebben als basis — die staan vooraan in de wizard.',
    ledeUser: 'De bouwstenen van je bar — alle ingrediënten in de catalogus.',
    name: 'Naam',
    category: 'Categorie',
    none: '— geen —',
    staple: 'Basis',
    update: 'Bijwerken',
    add: 'Toevoegen',
    cancel: 'Annuleren',
    loading: 'Laden…',
    stapleTag: 'basis',
    edit: 'bewerk',
    delete: 'verwijder',
    empty: 'Nog geen ingrediënten. Voeg je eerste hierboven toe.',
    toWizard: 'Naar de wizard',
    updated: 'Ingrediënt bijgewerkt',
    added: 'Ingrediënt toegevoegd',
    confirmDelete: (name) => `Ingrediënt "${name}" verwijderen?`,
    deleted: 'Ingrediënt verwijderd',
  },
  confirm: {
    title: 'Bevestigen',
    cancel: 'Annuleren',
    confirm: 'Verwijderen',
  },
  toast: {
    added: (name) => `${name} staat nu in je bar`,
    addedMany: (n) => `${n} ingrediënten toegevoegd`,
    removed: (name) => `${name} staat niet meer in je bar`,
  },
  errors: {
    network: 'Geen verbinding met de server. Draait de backend?',
    invalid: 'Ongeldige invoer.',
    notFound: 'Niet gevonden.',
    exists: 'Bestaat al.',
    rateLimit: 'Even rustig aan — te veel verzoeken.',
    generic: 'Er ging iets mis. Probeer het opnieuw.',
    readOnly: 'De catalogus is alleen-lezen in deze omgeving.',
    noCocktails: 'Er zijn nog geen cocktails.',
    dismiss: 'Sluiten',
  },
  titles: {
    discover: 'Ontdek — Barkast',
    buildBar: 'Stel je bar samen — Barkast',
    myBar: 'Mijn bar — Barkast',
    ingredients: 'Ingrediënten — Barkast',
    newCocktail: 'Nieuwe cocktail — Barkast',
    editCocktail: 'Cocktail bewerken — Barkast',
    cocktails: 'Cocktails — Barkast',
    technique: 'Techniek — Barkast',
    families: 'Families — Barkast',
  },
};

const en: UiStrings = {
  common: {
    appName: 'Barkast',
    tagline: 'what can you make?',
    cocktails: 'Cocktails',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    add: 'Add',
    back: 'Back',
    next: 'Next',
    ok: 'OK',
    close: 'Close',
    none: '— none —',
    optional: 'optional',
    loading: 'Loading…',
    ingredientsWord: 'ingredients',
  },
  nav: {
    home: 'Home',
    discover: 'Discover',
    myBar: 'My bar',
    cocktails: 'Cocktails',
    technique: 'Technique',
    surpriseMe: 'Surprise me',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    toggleTheme: 'Toggle theme',
    toggleLanguage: 'Switch language',
    menu: 'Menu',
    brandHome: 'Barkast home',
    install: 'Install Barkast',
    account: 'Account',
    login: 'Log in',
  },
  home: {
    welcome: 'Welcome to Barkast',
    heroTitle: "What's in<br />your bar?",
    heroLede:
      "Tick what you have on hand — spirits, mixers, that one bottle at the back — and Barkast shows you right away which cocktails you can make <em>now</em>.",
    buildBar: 'Build your bar',
    browseFirst: 'Browse first',
    eyebrow: 'Discover',
    fitLine: (n) =>
      n === 1 ? '1 recipe matches what you have at home.' : `${n} recipes match what you have at home.`,
    editBar: 'Edit my bar',
    wizardAgain: 'Restart wizard',
    makeNow: 'Make now',
    cocktailsCount: (n) => `${n} ${n === 1 ? 'cocktail' : 'cocktails'}`,
    emptyTitle: 'Nothing quite complete yet.',
    emptyBody:
      'Put what you have at home in your bar and you will see what it makes. Or start with a technique.',
    refillBar: 'Stock up your bar',
    yourBar: 'Your bar',
    ingredientCount: (n) => `${n} ${n === 1 ? 'ingredient' : 'ingredients'}`,
    countSubstitutes: 'Count substitutes',
    shareStats: 'Share anonymous statistics',
    editBarShort: 'Edit bar',
  },
  technique: {
    eyebrow: 'Learn',
    intro:
      'Six actions that between them make every recipe in this app. Each lesson has a drill that needs no bottle.',
    why: 'Why',
    how: 'How to do it',
    wrong: 'Where it goes wrong',
    tell: 'How you know it worked',
    practise: 'Practise',
    seconds: (n) => `${n} seconds`,
    usedIn: 'Recipes that use this',
    usedInCount: (n) => `${n} ${n === 1 ? 'recipe' : 'recipes'}`,
    noMethod: 'Applies to every recipe',
    notFound: 'No such lesson.',
    allLessons: 'All lessons',
  },
  family: {
    eyebrow: 'The shape',
    title: 'Families',
    intro:
      'Almost every classic is one of nine shapes. Know the shape and you can improvise inside it without a recipe.',
    ratio: 'Ratio',
    about: 'What it is',
    othersInFamily: (n) => (n === 1 ? '1 more in this family ›' : `${n} more in this family ›`),
    inFamily: (n) => `${n} ${n === 1 ? 'recipe' : 'recipes'}`,
    recipesIn: 'Recipes in this family',
    allFamilies: 'All families',
    notFound: 'That family does not exist.',
  },
  facts: {
    eyebrow: 'Did you know?',
    next: 'Another one →',
    readMore: (name) => `See ${name} ›`,
  },
  wizard: {
    step: (n, total) => `Step ${n} of ${total}`,
    progressLabel: 'Progress',
    skip: 'Skip',
    emptyCategory: 'Nothing here fits your bottles — tap “show all”.',
    back: 'Back',
    next: 'Next',
    finish: 'Done — show my bar',
    staplesTitle: 'You probably have these already',
    staplesHint: "Sugar, syrup, soda water… tick what's right. We've pre-checked a few.",
    spiritsTitle: 'Which spirits do you have?',
    spiritsHint: 'Start here: after this we only ask about what fits your bottles.',
    searchPlaceholder: 'Search an ingredient…',
    searchResults: 'Search results',
    searchEmpty: 'Nothing found.',
    showAll: (n) => `Show all (${n} more)`,
    showLess: 'Show less',
    makeable: (n) => `That already makes ${n} ${n === 1 ? 'cocktail' : 'cocktails'}`,
    almost: (n) => `${n} ${n === 1 ? 'cocktail is' : 'cocktails are'} one ingredient away`,
    nothingYet: 'Tick what you have on hand.',
  },
  bar: {
    title: 'My bar',
    sub: 'Tick what you have on hand — Barkast works out the rest.',
    youCanMake: (n) => `You can make ${n} ${n === 1 ? 'cocktail' : 'cocktails'}`,
    selected: (n) => `${n} ${n === 1 ? 'ingredient' : 'ingredients'} selected`,
  },
  list: {
    title: 'All cocktails',
    searchPlaceholder: 'Search by name or ingredient…',
    onlyFavorites: 'Favorites only',
    new: 'New',
    edit: 'Edit',
    delete: 'Delete',
    emptyTitle: 'Nothing found',
    emptyFavorites: "You don't have any favorites yet. Tap the heart on a cocktail.",
    emptySearch: 'Try adjusting your search or filters.',
    emptyAlcoholFree: 'No alcohol-free recipes in the collection yet.',
    filterBySpirit: 'Filter by base spirit',
    alcoholFree: 'Alcohol-free',
    sortBy: 'Sort by',
    sortNameAsc: 'Name A–Z',
    sortNameDesc: 'Name Z–A',
    sortDifficulty: 'Difficulty',
    clearFilters: 'Clear filters',
    confirmDelete: (name) => `Delete cocktail "${name}"?`,
    deleted: 'Cocktail deleted',
  },
  detail: {
    back: '‹ Back',
    garnishPrefix: 'Garnish',
    favorite: 'Favorite',
    saveFavorite: 'Save',
    print: 'Print',
    edit: 'Edit',
    haveAll: "✓ You've got everything — let's shake!",
    youStillMiss: (names) => `You're still missing ${names}`,
    addToBar: '+ Add to my bar',
    ingredients: 'Ingredients',
    less: 'Less',
    more: 'More',
    glasses: (n) => `${n} ${n === 1 ? 'glass' : 'glasses'}`,
    optional: 'optional',
    inBar: '✓ in bar',
    add: '+ Add',
    preparation: 'Method',
    noInstructions: 'No instructions provided.',
    tips: 'Tips',
    variations: 'Variations',
    viewRecipe: 'View recipe ›',
    notFoundTitle: "This cocktail doesn't exist (anymore)",
    backToCollection: 'Back to the collection',
    confirmDelete: (name) => `Delete cocktail "${name}"?`,
    deleted: 'Cocktail deleted',
  },
  card: {
    removeFavorite: 'Remove from favorites',
    addFavorite: 'Add to favorites',
    makeNow: 'Make now',
    missName: (name) => `Missing ${name}`,
    missMany: (n) => `Missing ${n} ingredients`,
  },
  form: {
    backToCocktails: 'Cocktails',
    editTitle: 'Edit cocktail',
    newTitle: 'New cocktail',
    name: 'Name',
    nameRequired: 'Name is required',
    description: 'Description',
    imageUrl: 'Image URL (optional)',
    imageUrlPlaceholder: 'https://…',
    imageUrlHint: "Leave it blank and we'll show a stylish default image.",
    glass: 'Glass',
    none: '— none —',
    method: 'Method',
    difficulty: 'Difficulty',
    garnish: 'Garnish',
    garnishPlaceholder: 'e.g. lime wheel',
    servings: 'Servings',
    tags: 'Tags',
    removeTag: (tag) => `remove ${tag}`,
    newTagPlaceholder: 'New tag…',
    ingredients: 'Ingredients',
    removeLine: 'remove',
    noIngredients: 'No ingredients added yet.',
    ingredient: 'Ingredient',
    amount: 'Amount',
    unit: 'Unit',
    optional: 'Optional',
    addLine: 'Add',
    preparation: 'Method',
    preparationPlaceholder: 'One step per line',
    preparationHint: 'One step per line.',
    saving: 'Saving…',
    save: 'Save',
    cancel: 'Cancel',
    updated: 'Cocktail updated',
    saved: 'Cocktail saved',
  },
  ingredients: {
    eyebrow: 'The catalog',
    title: 'Ingredients',
    ledeAdmin:
      'The building blocks of your bar. Mark what most people have on hand as a staple — those come first in the wizard.',
    ledeUser: 'The building blocks of your bar — every ingredient in the catalog.',
    name: 'Name',
    category: 'Category',
    none: '— none —',
    staple: 'Staple',
    update: 'Update',
    add: 'Add',
    cancel: 'Cancel',
    loading: 'Loading…',
    stapleTag: 'staple',
    edit: 'edit',
    delete: 'delete',
    empty: 'No ingredients yet. Add your first one above.',
    toWizard: 'Go to the wizard',
    updated: 'Ingredient updated',
    added: 'Ingredient added',
    confirmDelete: (name) => `Delete ingredient "${name}"?`,
    deleted: 'Ingredient deleted',
  },
  confirm: {
    title: 'Confirm',
    cancel: 'Cancel',
    confirm: 'Delete',
  },
  toast: {
    added: (name) => `${name} is now in your bar`,
    addedMany: (n) => `${n} ingredients added`,
    removed: (name) => `${name} is no longer in your bar`,
  },
  errors: {
    network: 'No connection to the server. Is the backend running?',
    invalid: 'Invalid input.',
    notFound: 'Not found.',
    exists: 'Already exists.',
    rateLimit: 'Easy now — too many requests.',
    generic: 'Something went wrong. Please try again.',
    readOnly: 'The catalog is read-only in this environment.',
    noCocktails: 'There are no cocktails yet.',
    dismiss: 'Dismiss',
  },
  titles: {
    discover: 'Discover — Barkast',
    buildBar: 'Build your bar — Barkast',
    myBar: 'My bar — Barkast',
    ingredients: 'Ingredients — Barkast',
    newCocktail: 'New cocktail — Barkast',
    editCocktail: 'Edit cocktail — Barkast',
    cocktails: 'Cocktails — Barkast',
    technique: 'Technique — Barkast',
    families: 'Families — Barkast',
  },
};

/** The UI string table for every supported locale. */
export const UI_STRINGS: Record<Locale, UiStrings> = { nl, en };

/** Look up the UI string table for a locale (falls back to the default locale). */
export function uiStrings(locale: Locale): UiStrings {
  return UI_STRINGS[locale] ?? UI_STRINGS[DEFAULT_LOCALE];
}
