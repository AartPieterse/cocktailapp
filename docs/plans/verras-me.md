<!-- Beslissing van 26 nov 2026. De uitgangssituatie hieronder is die dag in de code en de
     catalogus gemeten, niet overgenomen uit eerdere plannen. -->

# Verras me, met smaakkompas

De knop "Verras me" wordt een klein, speels moment: je tikt, een glas schenkt zich vol, en er staat
een drankje dat je **met je eigen bar** kunt maken. Wie wil, stuurt de gok eerst bij met drie tikken
op een smaakkompas: zoet of bitter, fris of rond, licht of sterk.

Twee beslissingen van de gebruiker liggen vast:

- **Geen fysieke shake.** De telefoon schudden is geschrapt: het heeft op iOS een
  toestemmingsvraag nodig, en `DeviceMotionEvent` werkt alleen in een secure context, en die hebben
  we zonder https niet. Het speelse zit in de onthulling, niet in het gebaar.
- **De layout blijft eenvoudig.** Het smaakkompas krijgt geen eigen pagina, wizard of
  navigatie-item. Het is een optionele regel boven dezelfde knop.

## Uitgangssituatie, gemeten

| | Staat |
|---|---|
| "Verras me" | Knop in de navbar (`core/navbar/navbar.ts`, icoon `casino`). Kiest via `CatalogService.randomCocktail()` uit **de hele catalogus** en navigeert meteen naar het recept. Je kast speelt geen rol. |
| Dagkeuze op Ontdek | Kiest uit wat je kunt maken, per kalenderdag vast, met "Iets anders" om verder te bladeren. Bewust "een menukaart, geen gokautomaat" (`bar/bar.ts`). **Die blijft zoals hij is.** |
| Wat kan ik maken | Wordt berekend in de `Bar`-component zelf (cabinet → `expandCabinet` → `makeable(…, 0)`), inclusief variaties met swaps. Niet herbruikbaar buiten die pagina. |
| Schenkanimatie | Bestaat al: `glassSpecFor(c, 'hero', 'pour', key)` laat het glas vullen en de garnering landen, en `prefers-reduced-motion` zet het uit (`shared/glass-art/glass-svg.ts`). |
| Smaakdata | **Geen.** `tags` bevat alleen `iba-official`, `modern-classic` en `mocktail`; de rest van `CocktailTag` is nooit gevuld. Wel beschikbaar: `family`, `method`, de ingrediëntregels met hoeveelheden, `servedAbv()` en `isLong()`. |

## Het ontwerp: één ingang, één paneel

De bestaande navbar-knop opent een paneel in plaats van direct te navigeren. Op een telefoon is dat
een bottom sheet en op desktop een kleine dialoog (één component, alleen de styling verschilt). Het
paneel heeft twee toestanden.

**1. Kiezen**

```
┌──────────────────────────────────┐
│ Verras me                      ✕ │
│                                  │
│ Waar heb je zin in?              │
│   ( Zoet )      ( Bitter )       │
│   ( Fris )      ( Rond   )       │
│   ( Licht )     ( Sterk  )       │
│                                  │
│ 14 drankjes passen               │
│                                  │
│ [        Verras me          ]    │
└──────────────────────────────────┘
```

- Elke regel is een paar pillen. Als je niets kiest, betekent dat "maakt niet uit". Tik je
  nogmaals op een gekozen pil, dan staat die regel weer uit. Er zijn dus geen schuifjes, geen derde
  "maakt niet uit"-knop en geen stappen.
- Kies je niets, dan is het gewoon idee 1: een gok uit alles wat je kunt maken. Het kompas is een
  uitbreiding, geen verplichte stap.
- De telregel ("14 drankjes passen") reageert direct en voorkomt een doodlopende keuze. Bij 0 wordt
  hij "Niets precies zo, de knop kiest wat er het dichtst bij komt", en de knop blijft actief.
- De laatste kompaskeuze wordt per apparaat onthouden (`barkaart.compass`, met try/catch). Wie altijd
  "bitter" wil, hoeft dat niet elke keer opnieuw te tikken.

**2. Onthulling**

```
┌──────────────────────────────────┐
│ Verras me                      ✕ │
│                                  │
│          ╲      ╱                │
│           ╲~~~~╱   ← schenkt vol │
│            ╲__╱                  │
│             ||                   │
│                                  │
│ SOUR · 2 sterk : 1 zuur : 1 zoet │
│ Whiskey Sour                     │
│ Bourbon, citroen, suiker, eiwit  │
│                                  │
│ [ Naar recept ]  ( Nog een )     │
└──────────────────────────────────┘
```

- Het glas speelt de bestaande `'pour'`-animatie af en de naam komt pas op als de garnering geland
  is (ongeveer 1,2 s). Bij `prefers-reduced-motion` staat alles meteen stil in beeld.
- **Nog een** schenkt een nieuw glas uit dezelfde selectie, zonder de laatste drie te herhalen.
  **Naar recept** sluit het paneel en opent het recept, met `?variation=` als het een variatie is.
- Het kompas klapt in tot één regel boven de onthulling ("Bitter · Rond"). Tik je daarop, dan ga je
  terug naar kiezen.
- De tekst is rustig en feitelijk volgens de stijlregels: geen uitroeptekens, geen ✓ of emoji in
  strings, en status wordt getoond met een icoon.

**Wat erbuiten blijft:** de dagkeuze op Ontdek, nieuwe routes en de bottom-nav. Het kompas verschijnt
alleen in dit paneel en wordt geen filter op de lijst "Nu te maken". Daar staan de familie-chips al,
en een tweede filtersysteem ernaast maakt die pagina drukker in plaats van speelser.

**Lege bar.** Kan de bar niets maken, dan kiest het paneel uit de hele kaart, net als de dagkeuze, met
de eyebrow "Uit de hele kaart". De onthulling toont dan onder de naam wat er ontbreekt, als gewone
tekst.

**Terugknop.** Op Android sluit "terug" het paneel in plaats van de pagina te verlaten. Daarvoor zet
het paneel bij openen een history-entry, en `popstate` sluit het.

## Het smaakkompas: drie assen, gemeten

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
van |keuze − waarde| over alleen de gekozen assen, waarbij "midden" op afstand 1 van beide polen ligt.

1. Neem alle drankjes met de laagste afstand. Bij een exacte match is die 0.
2. Kies daaruit willekeurig, maar sla de laatste drie onthullingen over.
3. Is de laagste afstand groter dan 0, dan geeft het paneel de rustige regel "dit komt het dichtst
   bij".

Het berekenen komt als pure functies in `shared/src/taste.ts` (`tasteProfile(cocktail,
ingredients)`, `tasteDistance(profile, choice)`), getest zoals `drink-strength.spec.ts`.

## Bouwvolgorde

Elke stap is een eigen PR die zelfstandig te shippen is. Na stap 2 is idee 1 af.

1. **`MakeableStore`** (`core/makeable.store.ts`, root, signals). Haal de pijplijn cabinet →
   `expandCabinet` → `makeable` uit `Bar` en laat `Bar` hem gebruiken. Dit verandert niets
   zichtbaars, maar het paneel en later het gastenmenu hebben dezelfde lijst nodig. De bestaande
   specs van `Bar` en `discover` moeten groen blijven.
2. **Het paneel, alleen gokken.** `SurpriseSheet` met de toestanden kiezen (alleen de knop) en
   onthulling, plus de schenkanimatie, "Nog een" zonder de laatste drie te herhalen, de fallback bij
   een lege bar en de terugknop. De navbar-knop opent het paneel. Analytics:
   `track('surprise_me', { mode: 'bar' | 'menu' })`.
3. **Smaakdata.** Het `taste`-type in `shared/src/cocktail.ts`, `shared/src/taste.ts` met tests, het
   conceptscript, de review door de gebruiker, de seed-edit en de validatorregel. Draai daarna
   `build:catalog`, dan `build:translations -- --check`, dan opnieuw `build:catalog`. Werk
   `docs/data-model.md` bij.
4. **Het kompas in het paneel.** De drie pillenregels, de live telregel, de terugvalregel,
   `barkaart.compass` en het ingeklapte kompas boven de onthulling. Analytics: dezelfde
   `surprise_me` met `mode: 'taste'` en welke assen gekozen zijn, zonder verdere details.
5. **Afronding.** Toetsenbord en focus (de focus gaat bij de onthulling naar de naam, de pillen zijn
   `aria-pressed`), schermlezertekst voor de onthulling, dark mode, en een check tegen de
   UI-stijlregels: een haarlijn rondom, geen eenzijdige rand.

## Testen

- `taste.spec.ts`: de afleiding per as op een paar vaste drankjes (Negroni bitter/rond/sterk,
  Mojito fris/licht), het erven door variaties, de overrides en de afstandsfunctie.
- `surprise-sheet.spec.ts`: een lege bar valt terug op de kaart, "Nog een" herhaalt de laatste drie
  niet, een keuze met 0 matches geeft de dichtstbijzijnde, en `?variation=` gaat mee naar het recept.
- Een e2e-rondje in de browser op telefoonbreedte: knop → onthulling → recept, en terug sluit het
  paneel.

## Niet in dit plan

Schudden, geluid, trillen, punten, streaks, en het kompas als filter op andere pagina's. Wil de
gebruiker dat laatste later toch, dan is `tasteProfile()` er al. Het blijft dan een losse
beslissing.
