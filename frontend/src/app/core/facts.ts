/**
 * "Wist je dat?" — short, verifiable cocktail-trivia snippets shown on the home screen.
 * Dutch-only for now (matches the rest of the UI chrome). Keep each fact to one or two
 * sentences and factually defensible; add freely.
 */
export const FACTS: readonly string[] = [
  "'Wodka' en 'vodka' zijn precies dezelfde drank — alleen de spelling verschilt per taal. In Polen, Nederland en Duitsland schrijf je wodka, in het Engels vodka.",
  'Absint werd decennialang verboden omdat men dacht dat de stof thujon hallucinaties gaf. Later onderzoek liet zien dat het gehalte veel te laag is voor enig effect — het was gewoon de hoge alcohol.',
  "De Margarita dankt haar naam aan het Spaanse woord voor 'madeliefje'.",
  'De Negroni ontstond volgens de overlevering in 1919 in Florence, toen graaf Camillo Negroni zijn Americano liet versterken met gin in plaats van bruiswater.',
  'Angostura bitter komt niet van een plant, maar is genoemd naar de stad Angostura in Venezuela.',
  'De coupe waaruit champagne vroeger werd gedronken is níet gevormd naar de borst van Marie Antoinette — dat is een hardnekkig broodjeaapverhaal.',
  'De Daiquiri is vernoemd naar een klein mijnstadje vlak bij Santiago de Cuba.',
  "De Espresso Martini werd in de jaren '80 in Londen bedacht door barman Dick Bradsell, naar verluidt voor een gast die 'iets wilde dat wakker maakt'.",
  "Campari's felrode kleur kwam ooit van karmijn — een kleurstof uit gemalen schildluizen. Sinds 2006 wordt er een kunstmatige kleurstof gebruikt.",
  'Prosecco is genoemd naar het gelijknamige dorpje bij Triëst in het noordoosten van Italië.',
  "De Mojito zou een 16e-eeuwse voorloper hebben: 'El Draque', vernoemd naar de Engelse kaper Francis Drake.",
  "Aperol bestaat al sinds 1919 en heeft maar zo'n 11% alcohol — een stuk lichter dan de meeste likeuren.",
];

/** Deterministic starting fact so every visit today opens on the same one, then advances on tap. */
export function factOfTheDay(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  return dayOfYear % FACTS.length;
}
