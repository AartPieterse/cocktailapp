# Barkast — Privacybeleid

_Laatst bijgewerkt: 2026-09-04_

Barkast is een cocktail-app die laat zien welke drankjes je kunt maken met wat je in huis hebt. De
app is **local-first**: je kunt hem volledig gebruiken **zonder account** en **zonder internet**. Dit
beleid legt uit welke gegevens we verwerken, waarom, en wat je rechten zijn.

In de **huidige, gepubliceerde versie** draait de app op je eigen apparaat: hij werkt met een
ingebouwde cocktailcatalogus en stuurt **geen** gegevens over jou of je gebruik naar een eigen server.
Eén uitzondering: de app laadt lettertypen en icoonfonts rechtstreeks bij **Google Fonts**
(`fonts.googleapis.com` / `fonts.gstatic.com`). Daarbij ziet Google je IP-adres en browsergegevens;
dat is een verwerking door een derde partij buiten onze controle (zie §4). De paragrafen hieronder
over **accounts, synchronisatie en statistieken** beschrijven een optionele (zelf-gehoste) backend
die in de huidige app **nog niet is ingeschakeld**.

**Verwerkingsverantwoordelijke:** de beheerder van deze Barkast-installatie (particulier, Nederland).
**Contact:** a.pieterse@ratho.nl.

> Deze tekst is een sjabloon dat is opgesteld op basis van de daadwerkelijke werking van de app en
> de backend. Laat hem juridisch controleren voordat je de app publiceert of accounts openstelt.

## 1. Gebruik zonder account (standaard)

Zonder in te loggen slaat Barkast **alleen op jouw apparaat** op:

- je bar (welke ingrediënten je hebt),
- je favoriete cocktails,
- je voorkeuren (thema, taal, maateenheid voor recepten, of de wizard is afgerond, of vervangers
  meetellen, of de installatie-melding is weggeklikt, en je keuze over statistieken).

Deze gegevens verlaten je apparaat niet en worden niet naar een server gestuurd. Verwijder je de app
(of wis je de app-opslag), dan zijn ze weg.

## 2. Optioneel account & synchronisatie

> Accounts en synchronisatie zijn voorbereid in de backend, maar staan in de **huidige versie van de
> app nog niet open**. Deze paragraaf beschrijft wat er gebeurt zodra je een account kunt aanmaken.

Maak je een account aan (e-mail + wachtwoord), dan synchroniseren we je **bar** en **favorieten**
tussen je apparaten. Daarvoor verwerken we:

- **je e-mailadres** — om in te loggen en je account te identificeren;
- **een versleutelde hash van je wachtwoord** (bcrypt) — we bewaren je wachtwoord nooit leesbaar;
- **je bar en favorieten** — lijsten met cocktail- en ingrediënt- id's (geen vrije tekst);
- **sessietokens** — om je ingelogd te houden (een kortlevend access-token en een roterend
  refresh-token).

Op je eigen apparaat bewaart de app je inlogstatus in de app-opslag (localStorage) onder de sleutel
`barkast.auth`: je e-mailadres en **beide** tokens, dus ook het langlevende refresh-token. Zodra
synchronisatie draait, komt daar `barkast.sync` bij met het tijdstip van de laatste synchronisatie.
Uitloggen wist die sleutels; wis je zelf de app-opslag, dan word je daarmee ook uitgelogd.

**Grondslag:** uitvoering van de dienst die je hebt aangevraagd (synchronisatie). **Bewaartermijn:**
zolang je account bestaat. Je kunt je account op elk moment verwijderen (zie §5).

We verkopen je gegevens niet, delen ze niet met derden voor marketing, en gebruiken ze niet voor
profilering of advertenties.

## 3. Anonieme, geaggregeerde statistieken

De **huidige app verstuurt geen enkele statistiek** — er wordt niets over je gebruik naar een server
gestuurd. Mocht dit in een toekomstige versie (met de optionele backend) worden ingeschakeld, dan zou
de app **anonieme** gebeurtenissen kunnen sturen (bijvoorbeeld: “een cocktail bekeken”, “een ingrediënt
toegevoegd”), en geldt:

- **geen** gebruikers-id, **geen** apparaat-vingerafdruk, **geen** IP-adres wordt opgeslagen;
- de server bewaart **uitsluitend geaggregeerde tellers** per dag (totalen per gebeurtenis en per
  cocktail/ingrediënt) — er is **geen** herleidbare gebeurtenissenlog;
- deze statistieken zijn **niet** te herleiden tot een persoon; de dagtellers worden daarom
  **onbeperkt bewaard** — er staat geen verloopdatum op, omdat er niets in staat dat naar een
  persoon of apparaat verwijst;
- het is **uit te zetten** in de app, en staat het uit, dan verstuurt de app niets. Let op: het zou
  standaard **aan** staan (een opt-out, geen opt-in). De schakelaar verschijnt pas zodra er een
  statistiek-server is ingesteld; in de huidige, gepubliceerde app is dat niet zo, dus valt er niets
  uit te zetten en wordt er ook niets verstuurd.

De geaggregeerde cijfers en technische metrics (aantal verzoeken, foutpercentage, latency, uptime)
zijn alleen in te zien door de beheerder op het **lokale thuisnetwerk**; ze zijn niet bereikbaar via
het openbare internet.

## 4. Technische verwerking & bewaring

- De backend draait op een zelf-gehoste machine die **alleen op het lokale thuisnetwerk** bereikbaar
  is (poort 8080, onversleuteld HTTP binnen het eigen netwerk). Er staan **geen inkomende poorten**
  open naar het internet en de gepubliceerde app praat op dit moment helemaal niet met deze backend.
  Zodra de backend wél publiek wordt aangeboden, gebeurt dat over **HTTPS** via een uitgaande
  Cloudflare-tunnel (TLS eindigt aan de rand van Cloudflare; het thuis-IP blijft verborgen) — en
  wordt dit beleid daarop aangepast.
- De database (MongoDB) is niet vanaf het internet bereikbaar; toegang vereist inloggegevens.
- Er worden op dit moment **geen back-ups** van de database gemaakt. Zodra accounts opengesteld
  worden, gaan er nachtelijke back-ups draaien die **vóór het wegschrijven** versleuteld worden met
  `age` (de dump bevat e-mailadressen en wachtwoord-hashes) en alleen versleuteld de machine
  verlaten; ze worden dan maximaal 14 dagen bewaard. Een verwijderverzoek werkt daardoor met een
  vertraging van maximaal die bewaartermijn door in de back-ups.
- Verzoeken worden beperkt (rate limiting) per client-IP om misbruik te voorkomen; dat IP wordt
  alleen kortstondig in het geheugen gebruikt om te tellen en **niet als profielgegeven bewaard**.
  Zolang de backend alleen op het thuisnetwerk draait, is deze limiet vooral een vangnet en geen
  waterdichte beveiliging.

### Derden

De app draait op je eigen apparaat, maar om hem te laden zijn twee externe partijen betrokken:

- **Netlify** — hosting van de statische app. Als hostingpartij verwerkt Netlify standaard
  technische gegevens van bezoekers (IP-adres, tijdstip, opgevraagde bestanden) en levert het de
  site over HTTPS uit.
- **Google Fonts** — lettertypen. De pagina opent een verbinding met `fonts.googleapis.com` en haalt
  de lettertypebestanden (Fraunces, Inter en de Material Icons) op bij `fonts.gstatic.com`. Google
  ziet daarbij je IP-adres en browsergegevens. De app bewaart die bestanden daarna lokaal in de
  cache, maar bij het eerste bezoek gaat er dus wél een verzoek naar Google.

**Grondslag:** gerechtvaardigd belang — het uitleveren en leesbaar tonen van de app. Er worden geen
cookies of trackers van derden geplaatst en er zit geen advertentie- of analysecode van derden in de
app. De lettertypen lokaal meeleveren, waarmee de verbinding met Google helemaal vervalt, is nog niet
gedaan.

## 5. Je rechten (AVG/GDPR)

Je hebt recht op inzage, correctie, verwijdering, beperking en overdraagbaarheid van je
persoonsgegevens, en je kunt bezwaar maken tegen verwerking.

- **Verwijderen:** zodra accounts opengesteld zijn, verwijder je je account in de app; dit verwijdert
  je account én alle gesynchroniseerde gegevens (bar, favorieten) definitief van de server
  (`DELETE /api/me`). Zolang er nog geen account-functie in de app zit, kun je hiervoor contact opnemen
  via het adres bovenaan. Je lokale kopie op het apparaat blijft bestaan tot je de app-opslag wist.
- **Inzage/export:** neem contact op via het adres bovenaan.
- **Klacht:** je kunt een klacht indienen bij de Autoriteit Persoonsgegevens.

## 6. Kinderen

Barkast gaat over alcoholische dranken en is niet bedoeld voor personen onder de wettelijke
leeftijdsgrens voor alcohol.

## 7. Wijzigingen

We kunnen dit beleid bijwerken. Bij belangrijke wijzigingen passen we de datum bovenaan aan en, waar
van toepassing, melden we het in de app.

Dit beleid staat op dit moment alleen als bestand in de repository (`docs/privacy-policy.md`): er is
nog geen publieke URL en er zit nog geen link naartoe in de app. Voordat accounts opengesteld worden,
krijgt dit beleid een vaste publieke URL en een plek in de app zelf.
