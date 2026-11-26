<!-- Beslissing van 26 nov 2026. De uitgangssituatie hieronder is die dag in de code, de
     deploy-config en de catalogus gemeten. -->

# Gastenmenu: je bar als menukaart voor je gasten

Je geeft een feestje. Barkaart maakt van wat je bar kan schenken een menukaart. Gasten scannen een
QR-code, bladeren door de kaart op hun eigen telefoon en kiezen wat ze willen. In de eerste fase laten
ze hun keuze aan jou zien. In de tweede fase komt die binnen op jouw scherm, als een rij bestellingen
die je afwerkt.

## Uitgangssituatie, gemeten

| | Staat |
|---|---|
| Hosting | Caddy serveert alleen de statische SPA op `http://192.168.1.100` (`deploy/Caddyfile.lan`). **Er is bewust geen `/api`-proxy.** De API publiceert geen poort. |
| Productiebuild | `dataSource: 'static'` en `authEnabled: false`. De app doet in productie **geen enkele API-call** en leest de gebundelde `catalog.json`. |
| HTTPS | Niet aanwezig, en de gebruiker heeft dat op 26 nov afgewezen (geen domein). Dus geen service worker, geen push, geen Wake Lock, geen camera-API voor gasten. |
| Rate limiting | `ThrottlerModule` staat op 120/min/IP, maar `common/client-ip.ts` vertrouwt een door de client gezette `CF-Connecting-IP` (`next-phase.md` stap 7). Een openbaar schrijfendpoint is daarmee niet te begrenzen. |
| Catalogus-id's | `catalog-ids.lock.json` is **alfabetisch gesorteerd** en niet append-only. Een index-bitset in een link verschuift dus zodra er een cocktail bijkomt. |
| Wat kan ik maken | Na stap 1 van [verras-me.md](verras-me.md) staat dit in een herbruikbare `MakeableStore`. |

**Het inzicht dat fase A goedkoop maakt:** gasten op een feestje bij jou thuis zitten op jouw wifi.
`http://192.168.1.100` werkt voor hen gewoon in de browser, zonder Brave-flag, want die flag is alleen
nodig voor installeren als PWA. **Voor fase A is niets uit [public-access.md](public-access.md)
nodig.**

## Fase A: menukaart via QR, zonder backend

**De host.** Vanaf Ontdek of Mijn bar opent een knop "Gastenmenu" een scherm met:

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
  Fase B lost dit structureel op.
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
bar". Dat is de bestelling in fase A: een scherm dat je omhoog houdt. Er is niets op te slaan en
niets te beveiligen, en het werkt offline zodra de pagina geladen is.

Een kleine extra: een knop **"Kies voor mij"** op de kaart, die het paneel van verras-me hergebruikt,
inclusief het smaakkompas, maar dan beperkt tot de drankjes op deze kaart. Zo krijgt een gast die
niet weet wat een Sour is toch een antwoord op "iets fris en niet te sterk".

## Fase B: live bestellingen op het LAN

Pas nadat fase A gebruikt is. Gasten bestellen vanaf hun telefoon, de host ziet een rij.

**Voorwaarden, in deze volgorde:**

1. **`next-phase.md` stap 7 is gedaan.** `client-ip.ts` moet het echte bronadres gebruiken. Zonder
   die fix is een openbaar schrijfendpoint niet te begrenzen. Dit is blokkerend.
2. **Caddy proxyt alleen het partygedeelte:** `handle /api/party/* { reverse_proxy api:3000 }` in
   `Caddyfile.lan`. Dus niet de hele API: accounts en sync blijven dicht tot
   [public-access.md](public-access.md).
3. **Een eigen omgevingsvlag `partyApi`**, los van `dataSource: 'static'`. De catalogus blijft
   gebundeld, alleen het feestje praat met de API.

**Backend: een `PartyModule` in NestJS.**

| Endpoint | Wie | Wat |
|---|---|---|
| `POST /api/party` | host | Maakt een feestje aan met `{ title, keys[] }` en geeft `{ partyId, hostToken }` terug. `partyId` bestaat uit 10 willekeurige tekens. |
| `GET /api/party/:id` | iedereen | Titel en menu. |
| `PATCH /api/party/:id` | host | Menu aanpassen, onder andere "op" om een drankje weg te halen als de fles leeg is. |
| `POST /api/party/:id/orders` | gast | `{ guestName ≤ 30, key, note ≤ 80 }` geeft `{ orderId, guestSecret }` terug. |
| `GET /api/party/:id/orders` | host | De rij. Gesorteerd op tijd, met de status per bestelling. |
| `PATCH /api/party/:id/orders/:orderId` | host | Status naar `making`, `ready` of `declined`. |
| `GET /api/party/:id/orders/:orderId` | gast, met `guestSecret` | De eigen status. |

- De host heeft geen account nodig. `hostToken` staat in localStorage op het hostapparaat en wordt
  als Bearer meegestuurd. Raak je het kwijt, dan maak je een nieuw feestje.
- Opslag gaat in Mongo-collecties `parties` en `partyOrders` met een **TTL-index van 24 uur**. Het
  enige persoonsgegeven is een voornaam die de gast zelf intikt, en die verdwijnt binnen een dag
  vanzelf. Vermeld dit in `docs/privacy-policy.md`.
- Er komen strengere limieten bovenop de globale 120/min: 10 bestellingen per minuut per IP, maximaal
  200 bestellingen en 150 menu-items per feestje, en 5 feestjes per uur per IP.
- De link wordt `http://192.168.1.100/menu/<partyId>`. Die is kort, dus de QR-code is grof en scant
  altijd.

**Verversen.** De host en de gast pollen elke 5 seconden met `If-None-Match`. Een ongewijzigde rij
kost dan een 304 van een paar bytes, hetzelfde patroon als de catalogusprobe in `next-phase.md`
stap 9. SSE kan later, maar polling is op een LAN met een handvol gasten ruim voldoende en heeft
geen open verbindingen door Caddy nodig.

**De bar voor de host:**

```
┌──────────────────────────────────┐
│ Bestellingen · Zaterdag          │
│                                  │
│ ● Daiquiri         Sanne   2 min │
│   [ In de maak ]                 │
│ ● Negroni          Joost   1 min │
│   [ In de maak ]                 │
│ ◐ Mojito           Eva     bezig │
│   [ Klaar ]                      │
│                                  │
│ Menu · QR tonen · Feestje sluiten│
└──────────────────────────────────┘
```

- Je tikt een bestelling verder, van wachtend naar in de maak naar klaar. Vanuit de rij open je het
  recept met één tik, want de host wil wél de specificatie zien.
- De gast ziet op zijn bestelkaart de status van wachtend via in de maak naar klaar, met een rustige
  tekst en geen confetti.
- Bij een nieuwe bestelling klinkt optioneel een kort geluid, standaard uit, alleen zolang het
  hostscherm open is. Pushmeldingen en Wake Lock vereisen een secure context en vallen daarom buiten
  fase B. Zonder Wake Lock kan het hostscherm op slaap gaan. Benoem dat op het scherm ("Houd dit
  scherm aan"), in plaats van eromheen te bouwen.

## Fase C: na public-access

Zodra [public-access.md](public-access.md) een https-adres oplevert, valt er vanzelf meer op zijn
plek: de kaart werkt ook buiten het huis, er kunnen pushmeldingen naar de host, en Wake Lock houdt
het hostscherm aan. Dat is geen apart werk in dit plan. Het is een lijstje dat je aanzet als die
voorwaarde er is.

## Bouwvolgorde

Elke stap is een eigen PR.

1. *(Gedeeld met verras-me stap 1)* `MakeableStore`.
2. **Gastroute `/menu`**, buiten `Layout`: link parsen, de kaart per familie, het alcoholvrij-filter
   en de bestelkaart. Test met een handgemaakte link.
3. **Hostscherm "Gastenmenu"**: aanvinken, titel, QR-code en kopiëren/delen, plus de ingang vanaf
   Ontdek en Mijn bar.
4. **"Kies voor mij"** op de gastenkaart. Dit vereist verras-me stap 4.
5. *Fase B*, pas na `next-phase.md` stap 7: `PartyModule` met tests, de TTL-indexen, de Caddy-proxy
   voor alleen `/api/party/*`, de vlag `partyApi`, het hostscherm met de rij en de status bij de gast.

## Testen

- Linkparser: onbekende sleutels worden overgeslagen, een variatie zonder ouder wordt overgeslagen,
  de titel wordt geëscaped en afgekapt, en een lege `m` geeft een nette lege kaart.
- De gastroute schrijft **niets** naar localStorage. Assert dat de cabinet- en wizard-keys na een
  bezoek ontbreken.
- Een e2e-rondje op twee schermbreedtes: QR-link → kaart → bestelkaart.
- Fase B: unit-tests op de PartyModule (limieten, hostToken, guestSecret, TTL-veld gezet) en
  handmatig een rondje met twee telefoons op het LAN, met `docker compose logs -f api` open.

## Open vragen voor later

- Mag een gast een drankje bestellen dat níet op de kaart staat, als vrij tekstveld? Voorstel: nee.
  Het notitieveld van 80 tekens ("weinig ijs") is genoeg.
- Moet "op" in fase B ook automatisch volgen uit je kast? Dan zou het uitvinken van een fles in Mijn
  bar de bijbehorende drankjes van de kaart halen. Dat is handig, maar het koppelt twee schermen die
  nu los staan. Beslis pas als fase B gebruikt wordt.
