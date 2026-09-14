/**
 * Dutch display name per base id. The canonical English name lives in the seed; this only renames
 * what the UI shows — and it is the single string a Dutch user reads in the wizard, in Mijn bar, on
 * every card's "je mist nog" chip and inside `missing[]` itself.
 *
 * Two rules:
 *   - **Every base id needs an entry.** `validate-seed.mjs` (rule 17) fails the build below 100%
 *     coverage. The absence of that check is exactly how the gap opened the last time the seed grew:
 *     a base with no entry silently reads English next to its Dutch neighbours.
 *   - **A brand or a loanword stays as it is.** Campari, Aperol, Drambuie, Fernet-Branca and Grand
 *     Marnier are names, not words; gin, tequila, cognac, grenadine, falernum, orgeat and ginger ale
 *     are simply what Dutch calls them. An entry identical to the English name is therefore a
 *     deliberate answer, not a missing one — which is why the check counts entries, never
 *     differences. Translate the generic types (Cherry Liqueur → Kersenlikeur), never the labels.
 */
export const NL_INGREDIENTS = {
  // spirits
  gin: 'Gin', vodka: 'Wodka', 'white-rum': 'Witte rum', 'dark-rum': 'Donkere rum',
  tequila: 'Tequila', mezcal: 'Mezcal', bourbon: 'Bourbon whiskey', 'rye-whiskey': 'Rye whiskey',
  'irish-whiskey': 'Ierse whiskey', scotch: 'Scotch whisky', brandy: 'Brandy', cognac: 'Cognac',
  calvados: 'Calvados', pisco: 'Pisco', cachaca: 'Cachaça', grappa: 'Grappa', absinthe: 'Absint',
  pernod: 'Pernod',
  // liqueurs
  'triple-sec': 'Triple sec', amaretto: 'Amaretto', amaro: 'Amaro', aperol: 'Aperol',
  'apricot-brandy': 'Abrikozenlikeur', benedictine: 'Bénédictine', 'cherry-liqueur': 'Kersenlikeur',
  'coffee-liqueur': 'Koffielikeur', 'creme-de-cacao': 'Crème de cacao',
  'creme-de-cassis': 'Crème de cassis', 'creme-de-menthe': 'Crème de menthe',
  'creme-de-mure': 'Crème de mûre', 'creme-de-violette': 'Crème de violette', drambuie: 'Drambuie',
  'fernet-branca': 'Fernet-Branca', 'green-chartreuse': 'Groene Chartreuse',
  'yellow-chartreuse': 'Gele Chartreuse', maraschino: 'Maraschinolikeur',
  'peach-schnapps': 'Perziklikeur', 'raspberry-liqueur': 'Frambozenlikeur', campari: 'Campari',
  'grand-marnier': 'Grand Marnier', cynar: 'Cynar', frangelico: 'Frangelico',
  'allspice-liqueur': 'Pimentlikeur', 'passion-fruit-liqueur': 'Passievruchtlikeur',
  // wine & vermouth
  'sweet-vermouth': 'Rode vermout', 'dry-vermouth': 'Droge vermout', 'lillet-blanc': 'Lillet Blanc',
  'sparkling-wine': 'Mousserende wijn', 'white-wine': 'Droge witte wijn', 'red-wine': 'Rode wijn',
  port: 'Tawny port',
  // mixers
  cola: 'Cola', 'soda-water': 'Sodawater', 'ginger-ale': 'Ginger ale', 'ginger-beer': 'Ginger beer',
  'grapefruit-soda': 'Grapefruitfrisdrank', 'tonic-water': 'Tonic',
  // juices
  'lime-juice': 'Vers limoensap', 'lemon-juice': 'Vers citroensap', 'orange-juice': 'Vers sinaasappelsap',
  'pineapple-juice': 'Ananassap', 'cranberry-juice': 'Cranberrysap', 'grapefruit-juice': 'Grapefruitsap',
  'tomato-juice': 'Tomatensap', 'sugar-cane-juice': 'Suikerrietsap', 'peach-puree': 'Perzikpuree',
  'passion-fruit-puree': 'Passievruchtpuree', 'passion-fruit-juice': 'Passievruchtsap',
  'apple-juice': 'Appelsap',
  // syrups (passion fruit)
  'passion-fruit-syrup': 'Passievruchtsiroop',
  // syrups
  'simple-syrup': 'Suikersiroop', grenadine: 'Grenadine', orgeat: 'Orgeat (amandelsiroop)',
  'honey-syrup': 'Honingsiroop', 'agave-syrup': 'Agavesiroop', 'elderflower-cordial': 'Vlierbloesemsiroop',
  falernum: 'Falernum', 'raspberry-syrup': 'Framboossiroop', 'donns-mix': "Donn's Mix",
  'chamomile-cordial': 'Kamillesiroop',
  // bitters
  'angostura-bitters': 'Angostura bitters', 'orange-bitters': 'Sinaasappelbitters',
  'peychauds-bitters': "Peychaud's bitters",
  // dairy & egg
  cream: 'Room', 'coconut-cream': 'Kokosroom', 'egg-white': 'Eiwit', 'egg-yolk': 'Eidooier',
  // seasoning
  salt: 'Zout', pepper: 'Peper', 'celery-salt': 'Selderijzout', tabasco: 'Tabasco',
  'worcestershire-sauce': 'Worcestershiresaus', 'orange-flower-water': 'Oranjebloesemwater',
  'vanilla-extract': 'Vanille-extract', 'black-pepper': 'Zwarte peper', cardamom: 'Kardemom',
  cinnamon: 'Kaneel', nutmeg: 'Nootmuskaat',
  // produce
  mint: 'Munt', ginger: 'Gember', 'chili-pepper': 'Chilipeper', basil: 'Basilicum',
  'maraschino-cherry': 'Cocktailkers', strawberries: 'Aardbeien',
  pineapple: 'Ananas', orange: 'Sinaasappel', lemon: 'Citroen', cloves: 'Kruidnagel',
  sherry: 'Sherry',
  // pantry & other
  sugar: 'Suiker', water: 'Water', coffee: 'Koffie', espresso: 'Espresso',
  ice: 'IJs', tea: 'Thee',
};
