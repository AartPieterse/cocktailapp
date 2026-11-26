<!-- Beslissing van 26 nov 2026. De uitgangssituatie hieronder is die dag in de code, de
     deploy-config en de catalogus gemeten. -->

# Gastenmenu: je bar als menukaart voor je gasten

Je geeft een feestje. Barkaart maakt van wat je bar kan schenken een menukaart. Gasten scannen een
QR-code, bladeren door de kaart op hun eigen telefoon en kiezen wat ze willen. Hun keuze laten ze aan
jou zien. Er is geen backend voor nodig.

## Uitgangssituatie, gemeten

| | Staat |
|---|---|
| Hosting | Caddy serveert alleen de statische SPA op `http://192.168.1.100` (`deploy/Caddyfile.lan`). **Er is bewust geen `/api`-proxy.** De API publiceert geen poort. |
| Productiebuild | `dataSource: 'static'` en `authEnabled: false`. De app doet in productie **geen enkele API-call** en leest de gebundelde `catalog.json`. |
| HTTPS | Niet aanwezig, en de gebruiker heeft dat op 26 nov afgewezen (geen domein). Dus geen service worker, geen push, geen Wake Lock, geen camera-API voor gasten. |
| Catalogus-id's | `catalog-ids.lock.json` is **alfabetisch gesorteerd** en niet append-only. Een index-bitset in een link verschuift dus zodra er een cocktail bijkomt. |
| Wat kan ik maken | Staat sinds 26 nov in `MakeableStore` en wordt getoond op Mijn bar (`/bar`). |

**Het inzicht dat dit goedkoop maakt:** gasten op een feestje bij jou thuis zitten op jouw wifi.
`http://192.168.1.100` werkt voor hen gewoon in de browser, zonder Brave-flag, want die flag is alleen
nodig voor installeren als PWA. **Er is niets uit [public-access.md](public-access.md)
nodig.**

## De menukaart via QR

**De host.** Op Mijn bar, naast de lijst wat je kunt maken, opent een knop "Gastenmenu" een scherm met:

1. Alles wat je nu kunt maken, voorgevinkt en gegroepeerd per familie. Je vinkt uit wat je vanavond
   niet wilt maken.
2. Een optionele titel van maximaal 40 tekens, bijvoorbeeld "Zaterdag". Zonder titel staat er
   "Menukaart".
3. Een QR-code en de link eronder, plus "Kopieer link" en, waar de browser het ondersteunt, "Deel".
   Het scherm is groot genoeg om de telefoon op tafel te leggen.

**De link** zet de keuze in de URL, zodat er niets opgeslagen hoeft te worden:

```
http://192.168.1.100/menu?t=Zaterdag&m=negroni,daiquiri,caipirinha~caipiroska,…
```

- Het zijn expliciete sleutels, `cocktailId` of `cocktailId~variationKey`, en geen index-bitset,
  omdat het lock-bestand alfabetisch is (zie hierboven). Onbekende sleutels worden stil
  overgeslagen, zodat een link na een catalogusupdate blijft werken.
- **Gemeten lengte:** 15 drankjes geven 194 tekens, 40 geven 378 en 80 geven 644. Met deflate en
  base64url wordt dat maar ongeveer 20% korter. Dat is de asynchrone `CompressionStream` niet waard,
  dus we gebruiken platte tekst. 40 drankjes past in een QR van versie ~13, en die scant goed van
  een scherm. Boven 80 toont het hostscherm een rustige hint dat een kortere kaart beter scant.
- Voor de QR-code komt er een kleine dependency zonder eigen dependencies die SVG maakt (`uqr` of
  `qrcode`; kies bij de implementatie, met een exacte versie). Het is SVG en geen canvas, zodat de
  code scherp blijft en de themakleuren volgt. Op een donker thema blijft hij wel zwart op wit, want
  sommige scanners lezen geen inverse codes.

**De gast** landt op `/menu`. Dat is een **eigen route buiten `Layout`**: geen navbar, geen
bottom-nav en geen onboarding. De gast heeft geen bar en de app mag zijn localStorage niet aanraken.
Er wordt dus geen cabinet aangemaakt en de wizard niet gestart.

```
┌──────────────────────────────────┐
│ MENUKAART                        │
│ Zaterdag                         │
│                                  │
│ SOUR                             │
│ ┌──────────────────────────────┐ │
│ │ [glas] Daiquiri              │ │
│ │        Rum, limoen, suiker   │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ [glas] Whiskey Sour          │ │
│ │        Bourbon, citroen, …   │ │
│ └──────────────────────────────┘ │
│ STEVIG                           │
│ …                                │
│ ALCOHOLVRIJ  (icoon, geen ✓)     │
└──────────────────────────────────┘
```

- De kaart is ingedeeld per familie, in de volgorde van `DRINK_FAMILIES`. Een rij bevat een klein
  glas, de naam en `ingredientNames()`, zonder hoeveelheden. Het is een menukaart, geen receptenboek:
  **gasten zien geen recept**.
- Alcoholvrije drankjes krijgen een icoon (`water_drop`, zoals de filterchip op Ontdek). Daarbovenop
  komt één chip "Alcoholvrij" als filter, zodat zwangere of rijdende gasten niet hoeven te zoeken.
- De taal volgt de taalinstelling van de gast, met de gewone `LanguageService`.

**Kiezen.** Tik je op een rij, dan zie je een volledig scherm met de bestelkaart: een groot glas met
de schenkanimatie uit [verras-me.md](verras-me.md), de naam groot, en daaronder "Laat dit zien aan de
bar". Dat is de hele bestelling: een scherm dat je omhoog houdt. Er is niets op te slaan en
niets te beveiligen, en het werkt offline zodra de pagina geladen is.

Een kleine extra: het smaakkompas uit [verras-me.md](verras-me.md) (`TasteChips`) staat bovenaan de
kaart, naast de chip "Alcoholvrij", als strikte filter, net als op de cocktailpagina. Zo vindt een
gast die niet weet wat een Sour is toch "iets fris en niet te sterk".

## Bewust niet: live bestellingen

Gasten bestellen **niet** vanaf hun telefoon naar een rij op het scherm van de host. Dat is op 26 nov
2026 door de gebruiker geschrapt. De bestelkaart die je omhoog houdt is de hele bestelflow. Daarmee
blijft het gastenmenu volledig statisch: geen API, geen opslag, geen persoonsgegevens en geen
afhankelijkheid van `next-phase.md` stap 7.

## Later, na public-access

Zodra [public-access.md](public-access.md) een https-adres oplevert, werkt dezelfde link ook buiten
het huis. Dan kun je de kaart vooraf rondsturen. Daar is geen extra werk voor nodig.

## Bouwvolgorde

Elke stap is een eigen PR.

1. ~~`MakeableStore`~~ — gedaan op 26 nov.
2. **Gastroute `/menu`**, buiten `Layout`: link parsen, de kaart per familie, het alcoholvrij-filter
   en de bestelkaart. Test met een handgemaakte link.
3. **Hostscherm "Gastenmenu"**: aanvinken, titel, QR-code en kopiëren/delen, plus de ingang op
   Mijn bar.
4. **Het smaakkompas** op de gastenkaart. Dit vereist verras-me stap 4, waarin `TasteChips` gebouwd wordt.

## Testen

- Linkparser: onbekende sleutels worden overgeslagen, een variatie zonder ouder wordt overgeslagen,
  de titel wordt geëscaped en afgekapt, en een lege `m` geeft een nette lege kaart.
- De gastroute schrijft **niets** naar localStorage. Assert dat de cabinet- en wizard-keys na een
  bezoek ontbreken.
- Een e2e-rondje op twee schermbreedtes: QR-link → kaart → bestelkaart.

