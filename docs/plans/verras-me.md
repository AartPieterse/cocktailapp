<!-- Beslissing van 26 nov 2026, dezelfde dag herzien. De uitgangssituatie hieronder is die dag in
     de code en de catalogus gemeten, niet overgenomen uit eerdere plannen. -->

# Verras me en het smaakkompas

Twee kleine, speelse dingen die één idee delen: **kies op smaak, niet op fles.**

- **Verras me** schenkt een drankje uit je eigen bar. Je tikt, en het glas op Ontdek vult zich met
  iets nieuws.
- **Het smaakkompas** bestaat uit drie paren chips: Zoet/Bitter, Fris/Rond en Licht/Sterk. Ze sturen
  de keuze op Ontdek bij en vervangen op de cocktailpagina de chips per hoofddrank.

Beslissingen van de gebruiker, 26 nov 2026:

- **Geen fysieke shake.** Het speelse zit in de onthulling, niet in het gebaar. `DeviceMotionEvent`
  vraagt bovendien een secure context, en die hebben we zonder https niet.
- **Eén plek voor "een drankje voor jou".** De eerste versie van dit plan had een apart paneel voor
  Verras me. Dat is geschrapt, omdat het nabouwde wat de dagkeuze op Ontdek al doet. Verras me gaat
  nu naar de dagkeuze in plaats van ernaast te staan.
- **Op de cocktailpagina filter je op smaak, niet op hoofddrank.**
- **De layout blijft eenvoudig.** Er komt geen nieuwe pagina, geen dialoog en geen navigatie-item.
  Het kompas is overal hetzelfde chip-rijtje.

## Uitgangssituatie, gemeten

| | Staat |
|---|---|
| "Verras me" | Knop in de navbar (`core/navbar/navbar.ts`, icoon `casino`). Kiest via `CatalogService.randomCocktail()` uit **de hele catalogus**, dus ook drankjes waarvoor je flessen mist, en springt naar het recept. |
| Dagkeuze op Ontdek | Kiest uit wat je kunt maken, per kalenderdag vast (`pickOfTheDay`). "Iets anders" stapt verder door dezelfde lijst. Bij een lege bar kiest hij uit de hele kaart. Het glas staat in `'ambient'`-modus. |
| Twee gokken | Daarmee zijn er twee willekeurige keuzes die zich verschillend gedragen. Dit plan maakt er één van. |
| Cocktailpagina | De chips zijn Gin, Wodka, Rum, Tequila, Whisky, Brandy, Overig en Alcoholvrij (`cocktail-list.ts`). De filter staat niet in de URL en er linkt niets naar. De zoekbalk zoekt op naam **en ingrediënt**, dus "gin" typen vindt de gindrankjes nog steeds. |
| Schenkanimatie | Bestaat al: `glassSpecFor(c, 'hero', 'pour', key)` laat het glas vullen en de garnering landen. `prefers-reduced-motion` zet het uit (`shared/glass-art/glass-svg.ts`). |
| Wat kan ik maken | Wordt berekend in de `Bar`-component zelf en is niet herbruikbaar. |
| Smaakdata | **Geen.** `tags` bevat alleen `iba-official`, `modern-classic` en `mocktail`. Wel beschikbaar: `family`, de ingrediëntregels met hoeveelheden, `servedAbv()` en `isLong()`. |

## Het smaakkompas: één component, drie plekken

`TasteChips` is een rij van zes chips in drie paren, met een dun scheidingsstreepje tussen de paren
(zoals de `.sep` op Ontdek):

```
( Zoet ) ( Bitter ) │ ( Fris ) ( Rond ) │ ( Licht ) ( Sterk )
```

- Binnen een paar sluiten de chips elkaar uit: tik je op Bitter terwijl Zoet aan staat, dan wisselt
  het. Tik je nogmaals op een gekozen chip, dan gaat hij uit. Tussen de paren telt de keuze op.
- Niets gekozen betekent "maakt niet uit". Er komt geen derde knop per paar.
- Op een telefoon is het één rij die je opzij veegt, net als de chips die er nu staan.
- Labels: NL Zoet/Bitter, Fris/Rond, Licht/Sterk. EN Sweet/Bitter, Fresh/Rich, Light/Strong. De
  `aria-label` van de groep is "Op smaak" / "By taste", en de chips gebruiken `aria-pressed`.
- De keuze wordt niet onthouden. Het is een filter zoals de andere, geen instelling.

Hetzelfde component doet op elke plek iets anders:

| Plek | Wat het kompas doet |
|---|---|
| **Cocktailpagina** | **Een strikte filter**, ter vervanging van de chips per hoofddrank. Alleen drankjes die op elke gekozen as precies kloppen blijven over. "Alcoholvrij" blijft als losse chip achteraan staan, na een scheidingsstreepje. Bij 0 resultaten verschijnt de bestaande lege-filtermelding. |
| **Ontdek, bij de dagkeuze** | **Het stuurt bij, het filtert niet.** De dagkeuze komt uit de best passende drankjes die je kunt maken. Als niets precies past, kiest hij de dichtstbijzijnde, met de rustige regel "Niets precies zo, dit komt het dichtst bij". De dagkeuze kan dus nooit leeg raken. |
| **Gastenmenu** | Dezelfde strikte filter als op de cocktailpagina, op de menukaart van de gast. Zie [gastenmenu.md](gastenmenu.md). |

**Op Ontdek** staat het rijtje binnen het dagkeuze-blok, direct onder "Naar recept / Iets anders".
Het hoort bij de keuze, niet bij de lijst "Nu te maken" eronder. Die lijst houdt haar familie-chips
en krijgt geen tweede filterrij.

## Verras me

De navbar-knop gaat naar Ontdek en schenkt daar een nieuwe keuze in, vanaf elke pagina. Sta je al op
Ontdek, dan gebeurt hetzelfde zonder navigatie, en scrollt de pagina naar de dagkeuze.

- Het is precies "Iets anders": één stap verder in de pool van de dagkeuze. Die pool is je bar,
  bijgestuurd door het kompas, of de hele kaart als je bar leeg is. Verras me kiest daarmee **niet
  langer uit de hele catalogus** als je bar iets kan maken, en dat lost het verschil tussen de twee
  gokken op.
- Implementatie: een kleine `SurpriseService` met een teller-signal. De navbar verhoogt hem en
  navigeert naar `/ontdek`, en `Bar` reageert met `another()`. `CatalogService.randomCocktail()` en
  de endpoint `GET /cocktails/random` worden ongebruikt. Verwijder ze als niets anders ze aanroept.
- **De onthulling:** het glas speelt `'pour'` af als de keuze door de gebruiker verandert, dus bij
  Verras me, "Iets anders" of een tik op het kompas. Bij het openen van de pagina blijft het
  `'ambient'`, want 's ochtends ligt de kaart er rustig klaar. Het `@for`-blok met de drank als key
  speelt de animatie al opnieuw af bij elke nieuwe drank. Alleen de motion-modus wordt een signal.
- De dagkeuze blijft wat hij was zolang je niets aanraakt: de hele dag dezelfde.
  `pickOfTheDay(pool, …, offset)` blijft deterministisch, ook met een kompaskeuze. Er is dus geen
  `Math.random` en geen logica om herhalingen te vermijden nodig, want de offset loopt de pool
  gewoon af.

## De drie assen, gemeten

Voor elke as is gemeten of hij uit de catalogus af te leiden is, met een prototype over de huidige
`catalog.json`. De verdeling telt per pool (min / midden / plus).

| As | Bron | Verdeling | Oordeel |
|---|---|---|---|
| **Licht ↔ Sterk** | `servedAbv()`, met grenzen < 12% en > 22% | 50 / 52 / 36 | Exact af te leiden en goed verdeeld. Geen handwerk. |
| **Fris ↔ Rond** | Aandeel citrus (limoen, citroen, grapefruit) in de pour, plus de families `fizz`/`highball`/`sparkling` als fris en `spirit-forward`/`creamy` als rond | 56 / 17 / 65 | Bruikbaar af te leiden. Een handvol correcties via een override. |
| **Zoet ↔ Bitter** | Afleiding uit siroop/likeur (zoet) tegen Campari/vermout/bitters (bitter) | 92 / 22 / 24 | **Niet af te leiden.** De Margarita komt uit als "zoet" door de triple sec, en de Old Fashioned ook. Dit is smaak, geen rekensom. |

De correlaties zijn laag genoeg om drie aparte vragen te rechtvaardigen. Fris en sterk hangen samen
met −0,31, zoet en sterk met −0,24. Kort ↔ Lang is afgevallen als as: `isLong()` markeert er maar 12,
en hij overlapt met fris (0,49).

Als filter op de cocktailpagina vallen de drankjes in het midden van een as weg zodra je die as
kiest. Dat is goed: een Margarita is niet "zoet" en niet "bitter", en hoort dus bij geen van beide.

**Waar de data woont.** De zoet/bitter-as wordt **met de hand gezet in de seed**, als nieuw veld per
cocktail:

```jsonc
"taste": { "sweetness": "sweet" | "balanced" | "bitter" }   // verplicht
         // optioneel: "freshness": "fresh" | "round", "strength": "light" | "strong"
```

- Het hoort in de seed en niet in een frontendtabel zoals `cocktail-art.data.ts`, omdat het een
  feit over de drank is (net als `difficulty`) en geen presentatie.
- De twee afgeleide assen kunnen per cocktail worden overschreven, met hetzelfde patroon als de
  glas-art: de regel geeft een standaard en de hand wint.
- Een variatie erft het profiel van de ouder, tenzij ze een eigen `taste` heeft. Een Kir Royal is
  frisser dan een Kir.
- Een nieuwe regel in `validate-seed.mjs` laat de build falen als een cocktail geen `sweetness`
  heeft, net zoals regel 11 dat doet voor `difficulty`.
- Geen vertaling nodig: de waarden zijn sleutels en de labels staan in `i18n.ts`.

Een eenmalig script maakt een **concept** van `sweetness` met de afleiding hierboven. Dat concept
gaat als lijst naar de gebruiker om na te lopen voordat het de seed in gaat. Het script wordt daarna
niet opnieuw gedraaid, net als de andere eenmalige seedscripts. Het aantal te beoordelen cocktails
staat niet in dit plan; `npm run validate:seed` geeft het.

**Matchen.** Per drankje bestaat het profiel uit drie waarden in {−1, 0, +1}. De afstand is de som
van |keuze − waarde| over alleen de gekozen assen.

- *Filter* (cocktailpagina, gastenmenu): houd alleen de drankjes met afstand 0.
- *Bijsturen* (Ontdek): neem de drankjes met de laagste afstand als pool voor `pickOfTheDay`. Is die
  laagste afstand groter dan 0, dan toont de pagina de regel "dit komt het dichtst bij".

Het berekenen komt als pure functies in `shared/src/taste.ts`: `tasteProfile(cocktail, ingredients,
variation?)` en `tasteDistance(profile, choice)`. Ze worden getest zoals `drink-strength.spec.ts`.

## Wat er verdwijnt

- **De chips per hoofddrank op de cocktailpagina.** Het veld `baseSpirit` en `BASE_SPIRIT_LABELS`
  blijven bestaan, want de seed en de validatorregels gebruiken ze. De UI-string `filterBySpirit`
  vervalt.
- **De willekeurige keuze uit de hele catalogus** via de navbar.

## Bouwvolgorde

Elke stap is een eigen PR die zelfstandig te shippen is.

1. **`MakeableStore`** (`core/makeable.store.ts`, root, signals). Haal de pijplijn cabinet →
   `expandCabinet` → `makeable` uit `Bar` en laat `Bar` hem gebruiken. Dit verandert niets
   zichtbaars, en het gastenmenu heeft dezelfde lijst nodig. De bestaande specs van `Bar` en
   `discover` moeten groen blijven.
2. **Verras me → Ontdek.** `SurpriseService`, de navbar navigeert en verhoogt de teller, `Bar` stapt
   verder en speelt `'pour'` af bij een keuze van de gebruiker. Ruim `randomCocktail()` op.
   Analytics: de bestaande `surprise_me` blijft, met `{ from: 'bar' | 'menu' }`. Er is geen smaakdata
   voor nodig.
3. **Smaakdata.** Het `taste`-type in `shared/src/cocktail.ts`, `shared/src/taste.ts` met tests, het
   conceptscript, de review door de gebruiker, de seed-edit en de validatorregel. Draai daarna
   `build:catalog`, dan `build:translations -- --check`, dan opnieuw `build:catalog`. Werk
   `docs/data-model.md` bij.
4. **`TasteChips` op de cocktailpagina**, ter vervanging van de chips per hoofddrank, als strikte
   filter. "Wis filters" wist ook het kompas.
5. **`TasteChips` op Ontdek**, in het dagkeuze-blok, als bijsturing met de "dichtstbij"-regel.
   Analytics: `taste_compass` met de gekozen assen en de plek, verder niets.
6. **Afronding.** Toetsenbord en focus, schermlezertekst bij een nieuwe keuze (een `aria-live`-regel
   met de naam), dark mode, en een check tegen de UI-stijlregels: een haarlijn rondom, geen
   eenzijdige rand en geen ✓ in tekst.

## Testen

- `taste.spec.ts`: de afleiding per as op een paar vaste drankjes (Negroni bitter/rond/sterk,
  Mojito fris/licht), het erven door variaties, de overrides, de afstandsfunctie, en een
  middenwaarde die bij geen van beide polen past.
- `taste-chips.spec.ts`: binnen een paar sluiten de chips elkaar uit, nogmaals tikken zet uit, en
  meerdere paren tellen op.
- `cocktail-list`: de kompasfilter combineert met zoeken, favorieten en alcoholvrij, en "Wis
  filters" wist alles.
- `Bar`: Verras me verhoogt de offset, het kompas met 0 exacte matches geeft de dichtstbijzijnde
  plus de regel, en het openen van de pagina speelt geen `'pour'` af.
- Een e2e-rondje in de browser op telefoonbreedte: Verras me vanaf de cocktailpagina komt op Ontdek
  uit met een schenkend glas.

## Niet in dit plan

Schudden, geluid, trillen, punten en streaks. Ook niet het kompas als filter op de lijst "Nu te
maken": die heeft haar familie-chips, en een tweede filterrij maakt Ontdek drukker in plaats van
speelser.
