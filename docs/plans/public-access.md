<!-- Beslissing van 12 sep 2026. De uitgangssituatie hieronder is die dag over SSH gemeten op de
     box, niet overgenomen uit de documentatie — die liep op drie punten achter. -->

# Publiek bereikbaar maken

Barkaart draait vandaag alleen thuis: op het LAN en door de WireGuard-tunnel. Dit plan maakt er
`https://barkaart.<domein>` van, bereikbaar vanaf elke verbinding, met accounts en sync.

## De beslissing

**Variant (a): rechtstreeks publiceren vanaf Caddy op 443. Geen Cloudflare Tunnel, geen VPS.**

De tunnel was al afgevallen — hij termineert TLS aan de edge, dus een login stuurt e-mailadres én
wachtwoord in plaintext door een Amerikaans bedrijf, en hij kan niet naast de DNS-verhuizing naar
deSEC bestaan (een tunnel-hostname vereist een CNAME naar `<UUID>.cfargotunnel.com`, die alleen
proxyt binnen hetzelfde Cloudflare-account). Zie `sovereignty.md` in de FileServer-repo.

Wat overbleef was de keuze tussen een EU-VPS als pure TCP/SNI-forwarder (~€60/jaar, thuis-IP blijft
verborgen) en rechtstreeks publiceren (gratis, thuis-IP wordt publiek). **Rechtstreeks**, want die
keuze is al impliciet gemaakt: sinds 11 sep staat UDP 51820 geforward voor WireGuard. Het thuis-IP
is daarmee al kenbaar aan wie ernaar kijkt, dus een VPS zou €60 per jaar kosten om een deur te
bewaken die openstaat. Wie die eis later alsnog wil, neemt de VPS **en** laat het
WireGuard-endpoint erlangs lopen — anders is het incoherent.

## Uitgangssituatie, gemeten

| | Werkelijke staat (12 sep) | Wat de docs zeiden |
|---|---|---|
| Stack | `api` + `mongo` + `web` (caddy:2-alpine) up, project `barkast` | idem |
| Web | Caddy publiceert `0.0.0.0:80`, serveert de SPA, **geen `/api`-proxy**, geen TLS | "komt nog" |
| API | intern op `:3000`; `:8080` is **niet** meer gepubliceerd | admin-overlay op `:8080` |
| WireGuard | `wg0` up, peer live vanaf 4G, UDP 51820 geforward | fase 1 net afgerond |
| UFW | **actief**, deny incoming, alleen 51820/udp + 22/tcp vanaf LAN + alles op wg0 | "inactive" |
| Backups | **twee `.age`-archieven, nachtelijke timer, restore-drill geslaagd** (hash-identiek) | "er is geen enkele backup" |
| Auto-deploy | `barkast-autodeploy.timer` draait, elke 5 min | "niet geïnstalleerd" |
| CORS_ORIGIN | `http://localhost:4200` | — |

**Het gevolg dat telt: de backup-poort is open.** `next-phase.md` liet "nodig iemand anders uit"
wachten op een bewezen restore. Die is er nu (312 documenten, 18 indexen, byte-identiek, live
aantoonbaar onaangeroerd). Publiek gaan is daarmee geen roekeloosheid meer, maar een volgende stap.

## Wat er nog tussen zit

### 0. Een domeinnaam — de enige externe afhankelijkheid

Zonder publieke hostnaam geen geldig certificaat. Er is geen domein. Twee routes:

- **Gratis, direct:** deSEC geeft namen onder `dedyn.io` uit, met dezelfde API, dezelfde
  Caddy-module en gewone Let's Encrypt-certificaten. Kost niets, blijft in de EU, en is
  omkeerbaar — je kunt later een eigen domein ernaast zetten.
- **Eigen domein:** de rename-commit heeft dit al uitgezocht: `barkaart.com`, `.app` en `.be` waren
  op 11 sep vrij; `barkaart.nl` staat bij een domeinhandelaar en is dus duur. **`.app` heeft een
  technisch voordeel dat hier echt telt:** de hele TLD staat op de HSTS-preloadlijst, dus elke
  browser weigert er sowieso een plaintext-verbinding. Controleer beschikbaarheid opnieuw bij
  aankoop; een dag is lang genoeg om een naam kwijt te raken.

Daarna: NS naar deSEC, en een token met een policy die **alleen** `_acme-challenge`-TXT mag
schrijven. Dat gescopete token is de eigenlijke winst — een gecompromitteerde Caddy kan de zone
dan niet omleiden.

### 1. Caddy wordt de echte voordeur

Vandaag serveert Caddy alleen bestanden. Erbij komen TLS en de API-proxy, waarmee mixed content,
CORS en certificaten in één klap verdwijnen: alles wordt same-origin.

De deSEC-module zit niet in het standaard-image, dus een eigen build (`deploy/caddy.Dockerfile`):

```dockerfile
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/desec
FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

> **Waarom DNS-01 en niet HTTP-01.** HTTP-01 is tien minuten werk en vraagt geen module — maar het
> vereist dat poort 80 open blijft staan, en het kan geen wildcard. Dezelfde Caddy gaat straks
> Immich en Nextcloud bedienen, en `*.<domein>` zorgt dat Certificate Transparency alleen die ene
> regel publiceert in plaats van `photos.`, `immich.` en `api.` Eén keer goed doen is hier
> goedkoper dan halverwege migreren.

De publieke site-block, met de headerhygiëne die er niet los bij hoort maar in zit:

```caddyfile
barkaart.<domein> {
	tls { dns desec {env.DESEC_TOKEN} }
	encode gzip zstd

	# Admin bestaat niet op het internet. Niet "afgeschermd" — niet aanwezig.
	handle /api/admin/* { respond 404 }

	handle /api/* {
		reverse_proxy api:3000 {
			header_up X-Forwarded-For {remote_host}   # VERVANGEN, niet appenden
			header_up -CF-Connecting-IP               # door de client meegestuurd: weg ermee
		}
	}

	handle {
		root * /srv
		try_files {path} /index.html
		file_server
		# cache-regels ongewijzigd overnemen uit Caddyfile.lan — die kloppen al,
		# inclusief de hyphen-in-plaats-van-punt-val in het hash-patroon.
	}
}
```

`X-Forwarded-For` **vervangen** in plaats van aanvullen: wie zelf een XFF meestuurt, bepaalt anders
zijn eigen rate-limit-sleutel. Met Caddy als enige hop is `TRUST_PROXY=1` daarmee eindelijk waar in
plaats van aangenomen.

De interne site-block (`http://10.10.0.1`, `http://192.168.1.100`, `http://aartfileserver.local`)
houdt `/api/admin/*` juist wél — dat is de enige weg naar het dashboard.

Het token gaat via een systemd `EnvironmentFile` met mode 0600 naar de container, niet inline in de
Caddyfile.

**Checkpoint:** over WireGuard, zonder dat er ook maar iets geforward is — `curl http://10.10.0.1/api/catalog`
geeft de catalogus, en `/api/admin/dashboard` op de publieke hostnaam geeft 404.

### 2. Hardening — dit is blokkerend, niet optioneel

Twee stukken code gaan ervan uit dat Cloudflare in het pad zit. Zonder Cloudflare draaien ze om van
beveiliging naar precies het tegenovergestelde.

- **`backend/src/analytics/admin.guard.ts:31`** bewijst "LAN-only" door de *aanwezigheid* van een
  `CF-Connecting-IP`-header te weigeren. Zonder tunnel is die header er nooit meer, dus die check
  slaagt voortaan altijd — en het admin-dashboard hangt aan het publieke internet achter niets dan
  één wachtwoord. De headercheck moet eruit (hij bewijst niets) en vervangen worden door een
  bronadres-check op `req.ip` tegen `10.10.0.0/24` en `192.168.1.0/24`, wat nu wél betekenis heeft
  omdat Caddy de XFF vervangt. Caddy's 404 is de tweede laag.
- **`backend/src/common/client-ip.ts`** vertrouwt diezelfde header van elke client. Vandaag kan
  iedereen hem roteren en daarmee zowel de 120/min-throttle als de login-throttle ontwijken — vlak
  vóór een bcrypt met cost 12. De Cloudflare-tak kan weg; hij heeft geen legitieme bron meer.

Verder: `CORS_ORIGIN=https://barkaart.<domein>` in `deploy/.env` (staat nu op `localhost:4200`;
same-origin gebruikt het niet, maar `main.ts:26` weigert te booten als het leeg is), en de
`/privacy`-route in de build opnemen — `docs/privacy-policy.md` bestaat en niets in de app linkt
ernaar, terwijl er e-mailadressen en bcrypt-hashes gaan landen.

### 3. Een `selfhost`-build van de frontend

`environment.prod.ts` is de Netlify-build: `authEnabled: false`, geen backend. Ernaast komt
`environment.selfhost.ts` met `authEnabled: true`, `apiBaseUrl: '/api/'`, `analyticsUrl: '/api/events'`,
`admin: false` — plus een `selfhost`-configuratie in `angular.json` die hem inwisselt.

**`dataSource` blijft `'static'`.** De gebundelde `catalog.json` is wat de app overeind houdt als de
backend thuis plat ligt; een backend-storing mag alleen sync degraderen, niet de app. Bovendien
staat de bekende versie-pariteitsbug (`locale`/`schemaVersion` ontbreken in de API-payload, waarna
de Nederlandse overlay stilletjes terugvalt op Engels) nog open — `dataSource: 'api'` loopt daar zo
in.

### 4. Poort open, en live

A-record `barkaart.<domein>` → thuis-IP, en op de router **alleen 443/tcp** forwarden naar
192.168.1.100 (443/udp erbij als je HTTP/3 wilt). Poort 80 hoeft niet: DNS-01 heeft alleen een
TXT-record nodig.

> **De val die hier wacht:** Docker DNAT't gepubliceerde poorten in `nat/PREROUTING`, vóór de
> INPUT-chain van UFW. UFW filtert 443 dus niet, hoe streng de regels ook staan. Dat is hier
> precies de bedoeling — maar het betekent ook dat UFW je nooit gaat redden als je later iets
> publiceert wat je niet publiek wilde. Wil je dat afdwingen, dan is `chaifeng/ufw-docker` (schrijft
> in `DOCKER-USER`) de enige betrouwbare route. Zet **nooit** `{"iptables": false}` in `daemon.json`.

**Checkpoint:** telefoon op 4G, wifi uit, **VPN uit** — `https://barkaart.<domein>` laadt, het
certificaat is geldig, installeren-op-beginscherm werkt weer (een secure context, dus de service
worker registreert eindelijk), registreren en inloggen werken, en `/api/admin/dashboard` geeft 404.

### 5. Netlify eruit, en de rename erin

Pas ná een geslaagde checkpoint 4: de `deploy`-job uit `.github/workflows/ci.yml`, `netlify.toml`
weg. Tot dat moment is Netlify de gratis terugvaloptie.

En de rename landt nog: de box draait project `barkast` met volume `barkast_mongo-data`, de repo
zegt `barkaart`. Een kale `up` maakt dan een **leeg** `barkaart_mongo-data` aan zonder te klagen.
`deploy/README.md` §0 schrijft de drie routes uit. Nu er echte backups zijn heeft dit meer gewicht
dan toen het werd opgeschreven: de archieven heten `barkast-*.age` en `MONGO_DB` op de box is
`barkast`. Doe dit als losse stap, met een verse backup ervoor, en nooit tegelijk met stap 4.

## Volgorde

Stappen 1, 2 en 3 hebben **geen domein nodig** en zijn volledig te testen over WireGuard. Ze kunnen
vandaag. Stap 0 loopt er parallel aan (NS-propagatie kost uren, geen werk). Stap 4 is het moment
zelf. Stap 5 daarna, en de rename als laatste, apart.

Wat je niet moet doen: stap 4 vóór stap 2. Het verschil tussen "publiek" en "publiek met een open
admin-dashboard" is één commit, en het is dezelfde middag.

## Wat dit niet oplost

"Bereikbaar vanaf internet" is hier niet hetzelfde als "altijd bereikbaar". Dit is een laptop op
wifi, met een accu op 51,7% van zijn ontwerpcapaciteit (~1u50), zonder UPS, waarvan de
reboot-recovery nog nooit is getest. Dat is prima voor dit project — maar het maakt offline-first
dragend in plaats van decoratief, en het maakt de ethernetkabel uit fase 1 van het FileServer-plan
(nog steeds overgeslagen, `eno2` is DOWN) een echte resilience-stap in plaats van een nettigheidje.
