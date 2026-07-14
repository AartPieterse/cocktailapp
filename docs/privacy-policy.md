# Barkast — Privacybeleid

_Laatst bijgewerkt: 2026-07-10_

Barkast is een cocktail-app die laat zien welke drankjes je kunt maken met wat je in huis hebt. De
app is **local-first**: je kunt hem volledig gebruiken **zonder account** en **zonder internet**. Dit
beleid legt uit welke gegevens we verwerken, waarom, en wat je rechten zijn.

In de **huidige, gepubliceerde versie** draait de app volledig op je eigen apparaat: hij werkt met een
ingebouwde cocktailcatalogus en stuurt **geen** persoonsgegevens naar een server. De paragrafen
hieronder over **accounts, synchronisatie en statistieken** beschrijven een optionele (zelf-gehoste)
backend die in de huidige app **nog niet is ingeschakeld**.

**Verwerkingsverantwoordelijke:** de beheerder van deze Barkast-installatie (particulier, Nederland).
**Contact:** a.pieterse@ratho.nl.

> Deze tekst is een sjabloon dat is opgesteld op basis van de daadwerkelijke werking van de app en
> de backend. Laat hem juridisch controleren voordat je de app publiceert of accounts openstelt.

## 1. Gebruik zonder account (standaard)

Zonder in te loggen slaat Barkast **alleen op jouw apparaat** op:

- je bar (welke ingrediënten je hebt),
- je favoriete cocktails,
- je voorkeuren (thema, of de wizard is afgerond, of vervangers meetellen, en of de
  installatie-melding is weggeklikt).

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
- deze statistieken zijn **niet** te herleiden tot een persoon;
- het is **uit te zetten** in de app, en staat het uit, dan verstuurt de app niets.

De geaggregeerde cijfers en technische metrics (aantal verzoeken, foutpercentage, latency, uptime)
zijn alleen in te zien door de beheerder op het **lokale thuisnetwerk**; ze zijn niet bereikbaar via
het openbare internet.

## 4. Technische verwerking & bewaring

- De app praat met de backend over **HTTPS**; TLS wordt beëindigd aan de rand van Cloudflare via een
  uitgaande tunnel (er staan geen inkomende poorten open, het thuis-IP blijft verborgen).
- De database (MongoDB) is niet vanaf het internet bereikbaar; toegang vereist inloggegevens.
- Er worden **versleutelde back-ups** gemaakt (de dump bevat e-mailadressen en wachtwoord-hashes) die
  versleuteld de machine verlaten.
- Verzoeken worden beperkt (rate limiting) op basis van het echte client-IP om misbruik te voorkomen;
  dit IP wordt niet als profielgegeven bewaard.

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
