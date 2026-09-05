# Subsystem plan: EU-soevereiniteit — jurisdictie-audit van elke derde partij

Aanleiding: de eigenaar noemde op 2026-09-05 een tweede motief naast het vervangen van Google Photos
en Drive — *"ik doe dit ook om mijn data binnen europa te houden."* Dit document auditeert elke derde
partij in [`private-cloud.md`](private-cloud.md) op vestigingsland en op wat die partij feitelijk te
zien krijgt, en benoemt de vervangers. De besluiten die hieruit volgen zijn verwerkt in het
besluitenlog van het hoofdplan; dit is de onderbouwing.

Status: onderzoek afgerond, niets gebouwd. Geen juridisch advies.

---

Dat is geen kostenafweging maar een jurisdictie-afweging, en het verandert het gewicht van vier keuzes in het plan. Dit is een inventarisatie van welke partij waar gevestigd is, welk recht dat meebrengt, en wat die partij feitelijk te zien krijgt.

De leidende regel in alles hieronder: **de Amerikaanse CLOUD Act (2018) knoopt aan bij de *provider*, niet bij het datacenter.** Een Amerikaans bedrijf dat bits in Amsterdam bewaart kan door een Amerikaanse rechter bevolen worden die af te geven, omdat het bedrijf ze in "possession, custody, or control" heeft. Regio kiezen is niet hetzelfde als jurisdictie kiezen. De tweede regel: **client-side encryptie lost inhoud op, nooit metadata.** Waar de derde partij alleen versleutelde blobs ziet, is de vlag bijzaak; waar de derde partij plaintext of verkeersmetadata ziet, is de vlag het hele verhaal.

---

## 1. Jurisdictietabel

Alle derde partijen die het ontwerp raakt, inclusief de partijen die pas zichtbaar worden als je de software laat draaien.

### 1.1 Opslag en backup

| Partij | Rol | Entiteit / land | Inhoud? | Metadata die overblijft | Oordeel |
|---|---|---|---|---|---|
| **Backblaze B2** | offsite restic-repo (kandidaat) | Backblaze, Inc., Delaware-vennootschap, San Mateo CA, NASDAQ: BLZE. EU Central = Amsterdam, maar geen EU-verwerkersentiteit. CLOUD Act. | Nee — restic versleutelt client-side, inclusief bestandsnamen, paden en groottes | Identiteit + betaalgegevens, bron-IP, repo-omvang en groeicurve, run-timing en -frequentie, deltavolume per run (directe proxy voor "hoeveel foto's maakte hij die dag"), dát het restic is (repo-layout `config`/`keys`/`snapshots`/`data/`), restore-events | **Vervangen** |
| **Hetzner Storage Box BX11** | offsite restic-repo (nieuw) | Hetzner Online GmbH, Gunzenhausen (DE), oprichtersbezit sinds 1997, geen VS-moeder. Opslag Falkenstein (DE) of Helsinki (FI) | Nee — idem | Idem als hierboven, maar onder Duits recht en AVG | **Nieuw / houden** |
| *(asterisk)* Hetzner US LLC | — | Ashburn VA / Hillsboro OR, levert alleen de VS-Cloud-producten, niet Storage Box | n.v.t. | Theoretisch CLOUD Act-aanknopingspunt *omhoog* naar een Duits moederbedrijf; juridisch onbeproefd, zie §5 | Geen actie |

### 1.2 DNS, TLS en de publieke voetafdruk

| Partij | Rol | Entiteit / land | Inhoud? | Metadata | Oordeel |
|---|---|---|---|---|---|
| **Cloudflare — autoritatieve DNS** | hele zone | Cloudflare, Inc., Delaware/San Francisco. CLOUD Act, FISA 702 | Nee | Volledige zone-inhoud (elke hostnaam die hij ooit aanmaakt, inclusief 192.168.1.100 als bewijs van zijn interne adressering), plus elke query op hun anycast: resolver-IP, tijdstip, volume. Een lookup van `photos.<domein>` = hij opent zijn fotobibliotheek | **Vervangen** |
| **Cloudflare — ACME DNS-01 token** | Caddy-certificaten | idem | Nee | Geen leesrisico maar een **integriteitsrisico**: een standaard "Edit zone DNS"-token mag ook A-, MX- en NS-records herschrijven | **Vervangen** |
| **Cloudflare Tunnel (Barkast, `api.<domein>`)** | publiceert JSON-API | idem | **JA — volledige plaintext.** De tunnel termineert TLS aan de edge; dat is inherent aan hoe WAF/Access/caching werkt. Bij een Barkast-login gaat het e-mailadres én het wachtwoord zelf (POST-body, niet de hash) door Amerikaanse handen | request-metadata, client-IP's, retentie onbekend | **Vervangen — dringendst** |
| **Let's Encrypt / ISRG** | CA | Internet Security Research Group, California public benefit corporation, 501(c)(3), San Francisco | Nee — bij DNS-01 verbindt de CA niet eens met de box | ACME-accountsleutel, contact-e-mail, aangevraagde hostnames, aanvraag-IP. Alles behalve het e-mailadres wordt sowieso wereldwijd gepubliceerd | **Houden** |
| **ZeroSSL** | stille fallback-CA die Caddy standaard aanzet | Oostenrijkse vestiging, maar sinds 11-01-2024 eigendom van **HID Global (VS)** | Nee | idem | **Uitschakelen** (geen winst, wel een onbedoelde Amerikaanse commerciële partij) |
| **Certificate Transparency-logs** | publicatie van elk certificaat (RFC 6962) | Google, Cloudflare, DigiCert, Sectigo, ISRG — overwegend VS | Nee | **Alles publiek en permanent**: `photos.<domein>`, `immich.<domein>`, `api.<domein>` staan binnen minuten doorzoekbaar op crt.sh. Geldt bij élke publiek vertrouwde CA, ook een Italiaanse | **Structureel — indammen met wildcard** |
| **deSEC** | autoritatieve DNS (nieuw) | Geregistreerde non-profit, Berlijn (DE). PowerDNS op anycast | Nee | Zone-inhoud en queries, maar onder Duits recht. **En: token policies op `domain`/`subname`/`type`/`perm_write`** — geverifieerd | **Nieuw** |
| **Registrar** | domeinhouderschap | **Onbekend — eerst `whois` draaien** | Nee | WHOIS/registrantgegevens | Zie §5 |
| **Publieke A-records → 192.168.1.100** | — | n.v.t. | Nee | Lekt het interne subnet en de hostpositie aan passieve-DNS-aggregators; lekt het thuis-IP **niet**. Bijeffect: publieke DNS naar RFC1918 is een kant-en-klaar DNS-rebinding-primitief, en veel resolvers filteren zulke antwoorden juist weg | **Schrappen** (DNS-01 heeft ze niet nodig) |

### 1.3 Remote access

| Partij | Rol | Entiteit / land | Inhoud? | Metadata | Oordeel |
|---|---|---|---|---|---|
| **Tailscale** | enige remote-access-pad | Geverifieerd in Schedule A van de ToS: accounts van vóór 2024-09-02 contracteren met **Tailscale Inc.** (Canada, Toronto); accounts van **2024-09-03 of later met Tailscale US Inc., een Delaware corporation** in San Francisco. Toepasselijk recht is in beide gevallen het recht van de staat New York; JAMS-arbitrage voor Free/personal | **Nee, nul.** WireGuard is end-to-end tussen peers; private keys verlaten het device niet. Ook DERP-relays zijn blind | Identiteit, device-namen, OS-type, publieke sleutels, IP-adressen, welke nodes wanneer met welke praten, geadverteerde routes (dus `192.168.1.0/24`), en het echte thuis-IP `217.105.58.146`. Tailscale zegt dit zelf: *"Your identity is known to us… could be subpoenaed"* | **Vervangen** |
| Tailscale control plane | infrastructuur daaronder | AWS VPC's, backups naar S3, analytics in Snowflake — alle drie Amerikaans. Geen data-residency-optie op enige tier, ook niet Enterprise | Nee | idem | vervalt mee |
| **WireGuard (kaal)** | vervanger | Geen bedrijf, geen control plane, geen account, geen jurisdictie. In de Linux-kernel sinds 5.6 | n.v.t. | n.v.t. | **Nieuw** |
| **deSEC dynDNS** | alleen als het thuis-IP wisselt | non-profit, Berlijn (DE), TTL 60 | Nee | Publiceert wél het thuis-IP in DNS | Optioneel nieuw |
| **NetBird GmbH** | alternatief als hij een gehoste control plane wil | Rosenthaler Str. 36, Berlijn, AG Berlin HRB 237529 B. Free tier: €0, 5 gebruikers, 100 machines, control plane in DE | Nee | Zelfde categorie metadata als Tailscale, maar EU | Alternatief |
| **Headscale (self-hosted)** | alternatief | eigen VPS, jurisdictie = die van de VPS | Nee | geen | **Afgeraden hier** — zie §4 |

### 1.4 Images, OS en monitoring

| Partij | Rol | Entiteit / land | Inhoud? | Metadata | Oordeel |
|---|---|---|---|---|---|
| **healthchecks.io** | externe dead-man's switch | SIA Monkey See Monkey Do, Riga (**Letland, EU**), eenmansbedrijf, draait op Hetzner bare metal (DE). BSD-3-clause | Alleen als hij `--data-binary` gebruikt | Ping-URL (UUID), thuis-IP, tijdstempel, user agent. Daarmee: het exacte ritme van zijn backupjob, wanneer die faalt, wanneer hij weken weg is | **Houden** (schoonste externe partij in het hele ontwerp) |
| ↳ subverwerkers | — | AWS (versleutelde backups, VS), Twilio (SMS/WhatsApp, VS), Braintree (betalingen, VS), Fastmail (AU) | — | Op de free tier raakt hij Twilio en Braintree niet | Kanaal = e-mail, geen SMS |
| **ntfy.sh** | notificaties (overwogen) | Philipp Heckel, natuurlijk persoon, woonachtig in **Connecticut (VS)**. Geen rechtspersoon gevonden. Play Store-build gebruikt Google FCM | **JA — volledige berichtinhoud in platte tekst** | topic, timing | **Vervangen door self-hosted ntfy** |
| **Docker Hub** | images | Docker Inc, Palo Alto CA | Nee — bytes stromen naar hem toe | Thuis-IP + exacte image-namen, tags, digests, tijdstippen = een precieze software-inventaris gekoppeld aan zijn adres | **Houden** |
| **GHCR / GitHub / Microsoft** | images (Immich publiceert hierheen) | GitHub Inc / Microsoft, VS | Nee | idem | **Houden** (geen alternatief: Immich publiceert alleen hier) |
| **Diun** | update-notificaties | crazy-max (FR), self-hosted Go-binary, geen clouddienst | n.v.t. | Voegt geen partij toe maar geeft de registries een **permanente hartslag** van wat er draait, ook in maanden zonder updates | Houden, wel temmen |
| **download.docker.com** | eventueel apt-bron | Docker Inc, VS | Nee | pakketlijst + IP | Checken |
| **Canonical Ltd** | Ubuntu 24.04.4 | HQ Londen, **VK**. De Commissie hernieuwde op 19-12-2025 de twee VK-adequaatheidsbesluiten tot 27-12-2031. Geen CLOUD Act (wel de Britse IPA) | Nee | `archive/security.ubuntu.com`: IP + volledige pakketlijst met versies. `motd-news`: release, hardwareplatform, CPU-type, uptime. `ntp.ubuntu.com`: IP + klok. `api.snapcraft.io` | **Houden**, phone-homes dempen |
| **NTP** | tijd | nu Canonical; voorstel `*.nl.pool.ntp.org` | Nee | IP + klok | Verplaatsen naar NL-pool |

### 1.5 Immich

| Endpoint / partij | Entiteit / land | Inhoud? | Wat het lekt | Oordeel |
|---|---|---|---|---|
| Immich als project | Kernteam sinds mei 2024 bij **FUTO, Austin, Texas**. AGPL zonder CLA | n.v.t. | Een softwareleverancier kan onder de CLOUD Act niets afgeven wat hij niet bezit. Wat telt zijn de endpoints die de draaiende software belt | Houden |
| **`tiles.immich.cloud`** (kaartlaag) | Door Immich zelf gehost, **achter Cloudflare (VS)**. Defaults: `map.lightStyle` / `map.darkStyle` → `https://tiles.immich.cloud/v1/style/{light,dark}.json` — geverifieerd in de Immich-docs | **Feitelijk wel.** Bij het openen van de kaart vraagt de client de z/x/y-tegels op voor precies het gebied dat hij bekijkt: **de plekken waar zijn privéfoto's zijn gemaakt, op straatniveau**. Locatiedata afgeleid uit zijn foto's, die de box verlaat | Client-side encryptie van de foto's doet hier **niets**: de tegelverzoeken komen van de client, niet uit de opslag | **Vervangen** |
| `api.github.com` (versiecheck) | Microsoft, VS. `newVersionCheck.enabled` staat **standaard op `true`** | Nee | IP + "hier draait Immich" | **Uitzetten** (Diun doet dit al) |
| `huggingface.co` (CLIP + gezichtsherkenning) | Hugging Face Inc, New York | Nee — alleen gewichten naar binnen | IP + welk model, eenmalig | Houden, daarna offline |
| Reverse-geocoding (GeoNames) | Unxos GmbH, **Zwitserland** — maar de dataset wordt bij elke minor upgrade in zijn eigen Postgres geladen en **alle queries draaien lokaal** | Nee | Niets. Stad/provincie/land uit GPS verlaat de box nooit | Houden — dit is beter dan mensen aannemen |
| Telemetrie | Opt-in, en `IMMICH_TELEMETRY_INCLUDE` opent alleen een lokaal Prometheus-endpoint | Nee | Niets | Houden |
| Licentie-activatie | Lokaal en cryptografisch gevalideerd, de server phone't niet home | Nee | Niets | Houden |
| Immich Android-app | `mobile/pubspec.yaml` bevat **geen** sentry, firebase, crashlytics, posthog of matomo | Nee | Geen telemetrie, geen crash-reporting. Wel `maplibre_gl` (rendert de style-URL die de server aanreikt — dus de serverfix repareert de app mee) en `geolocator` (on-device) | Houden |

### 1.6 Nextcloud

| Endpoint | Entiteit / land | Inhoud? | Oordeel |
|---|---|---|---|
| Nextcloud GmbH | Hauptmannsreute 44a, Stuttgart (DE), HRB 227086 AG München | — | **Houden — schoonste leverancier in het ontwerp** |
| `apps.nextcloud.com` (`appstoreenabled` = true) | DE | Nee; ziet IP + welke apps hij bekijkt/installeert | Houden |
| `updates.nextcloud.com` (`updatechecker` = true) | DE | Nee; instanceversie | Uitzetten |
| `connectivity_check_domains` (default) | `nextcloud.com` (DE), `startpage.com` (NL), `edri.org` (BE), **`eff.org` (VS)** | Nee | **Leegmaken** — EFF is de niet-EU partij die niemand had opgeschreven |
| Lookup server | DE; alleen relevant bij federatie | Nee | Leegmaken |
| `push-notifications.nextcloud.com` | Nextcloud GmbH (DE), zet door naar **Google FCM / Apple APNs (VS)** | **Nee, en beter ontworpen dan zijn reputatie**: de server versleutelt met de *publieke sleutel van het toestel* en tekent met de user private key; de proxy verifieert maar kan niet ontsleutelen, en Google leert niet welke Nextcloud-server het stuurde. Wat de encryptie **niet** wegneemt: de proxy en FCM zien de **cadans** en de toestelidentiteit | Houden, of UnifiedPush indien puristisch |
| Nextcloud Android-app | Play-build gebruikt FCM; de F-Droid-build strípt Play Services volledig en **heeft daardoor geen push** | — | Keuze, zie §4 |

### 1.7 De partijen die buiten het ontwerp vallen maar er wel zijn

| Partij | Land | Wat die ziet |
|---|---|---|
| **Google Play Services op het toestel zelf** | Google LLC, VS | **De grootste niet-EU partij in het hele ontwerp.** Always-on VPN houdt Play Services niet tegen. Stock Android meldt device-identifiers, locatie, connectiviteit en app-inventaris; Play weet ook dat hij een fotobackup-app installeerde |
| F-Droid Limited | Engeland, nr. 08420676 — VK, adequaat tot 2031 | Downloadmetadata |
| ISP: prioritytelecom.net / VodafoneZiggo | NL | Alle verbindingsmetadata; EU |

### 1.8 Schijn-EU: partijen die het niet zijn, en die het waard zijn te herkennen

| Partij | De val |
|---|---|
| **rsync.net Zürich** | rsync.net, Inc. is een **Californisch** bedrijf (San Anselmo, opgericht 2001). Zwitsers ijzer, Amerikaanse jurisdictie — dezelfde fout als B2 EU Central, maar vier keer zo duur en met 800 GB minimumafname |
| **Contabo** | GmbH in München, maar sinds juni 2022 meerderheidseigendom van **KKR** (VS private equity) |
| **Wasabi** | Massachusetts-vennootschap; EU-regio's veranderen de contractspartij niet. Bovendien **90 dagen minimum retention**, wat frontaal botst met `restic forget --prune` |
| **Njalla** | Nevis/Saint Kitts LLC, en het registreert het domein *op eigen naam*. Dat lost anonimiteit op, niet soevereiniteit — en je geeft je eigendomstitel weg |
| **ZeroSSL** | Oostenrijkse vestiging, Amerikaanse eigenaar sinds januari 2024 |
| **TransIP/STACK** | EU en sympathiek, maar restic heeft **geen WebDAV-backend**, en STACK heeft aantoonbaar data verloren |

---

## 2. Wat er concreet in het plan wijzigt

Volgorde is bewust: punt 1 blokkeert punt 3.

1. **`whois <domein>` — eerst uitzoeken waar het domein *geregistreerd* staat, niet alleen waar de DNS draait.** Staat daar Cloudflare Registrar, dan is dit geen NS-wijziging van een half uur maar een registrar-transfer met locks: partial (CNAME) setup is expliciet incompatibel met Cloudflare Registrar-domeinen, en Cloudflare houdt dan bovendien de registrantgegevens.

2. **Cloudflare Tunnel voor Barkast → EU-VPS als pure TCP/SNI-forwarder, of direct publiceren.** Dit is de enige plek in het ontwerp waar een niet-EU partij **plaintext persoonsgegevens van derden** verwerkt (e-mailadressen en wachtwoorden in de POST-body). De tunnel kan bovendien niet blijven staan náást een verhuizing naar deSEC: een tunnel-hostname vereist een CNAME naar `<UUID>.cfargotunnel.com`, en dat subdomein proxyt alleen voor DNS-records in hetzelfde Cloudflare-account. Externe nameservers behouden vereist partial setup = Business ($200/mnd); een subdomein als losse zone = Enterprise. Geen van beide is hier een optie.
   - *(a) aanbevolen:* Hetzner CX22 (DE) of Scaleway (FR), WireGuard van de box naar de VPS, en op de VPS **geen TLS-terminatie** maar nginx `stream` met `ssl_preread` of HAProxy in TCP-mode. De VPS ziet dan alleen versleutelde bytes, de SNI-hostname en client-IP's — strikt beter dan Cloudflare Tunnel én het verbergt het thuis-IP even goed.
   - *(b) gratis:* tunnel weggooien, `api.<domein>` rechtstreeks vanaf Caddy publiceren op 443. Nul derde partijen, maar het thuis-IP wordt publiek. Zie §5: als punt 4 doorgaat, is dat bezwaar toch al vervallen.

3. **Cloudflare DNS → deSEC (Berlijn, non-profit, €0).** NS-records omzetten bij de registrar, DNSSEC laten bootstrappen via CDS/CDNSKEY (deSEC doet ECDSAP256SHA256 automatisch). Daarna Caddy herbouwen met de officiële module:
   ```
   xcaddy build --with github.com/caddy-dns/desec
   ```
   ```
   tls {
     dns desec { token {env.DESEC_TOKEN} }
   }
   ```
   Token via systemd `EnvironmentFile` met mode 0600, niet inline in de Caddyfile.

4. **ACME-token strikt scopen — dit is de echte winst, niet de vlag.** Zijn huidige Cloudflare "Edit zone DNS"-token mag ook A-, MX- en NS-records herschrijven. Bij deSEC maakt hij een token policy met `domain = <domein>`, `subname = "_acme-challenge"`, `type = "TXT"`, `perm_write = true`, en een default-policy die de rest weigert (geverifieerd in de deSEC-documentatie). Een gecompromitteerde Caddy kan dan zijn zone niet omleiden.

5. **Tailscale → kale WireGuard, twee peers.** Dit is het enige gebied waar het soevereine alternatief niet duurder of complexer is maar **eenvoudiger**: hij heeft één gebruiker, één server, één telefoon en een publiek routeerbaar IP zonder CGNAT. Tailscale lost NAT-traversal op — een probleem dat hij niet heeft — en betaalt daarvoor met een control plane die zijn thuis-IP, device-namen en verbindingstijden bijhoudt.
   ```
   # /etc/wireguard/wg0.conf
   [Interface]
   Address = 10.10.0.1/24
   ListenPort = 51820
   PrivateKey = <server.key>

   [Peer]
   PublicKey  = <phone.pub>
   PresharedKey = <phone.psk>     # gratis extra laag, kwantumweerstand op de key-exchange
   AllowedIPs = 10.10.0.2/32
   ```
   Geen `ip_forward`, geen MASQUERADE, geen subnet-routing nodig zolang Immich, Nextcloud en Barkast op diezelfde box draaien — de `--advertise-routes` was er voor ándere LAN-hosts. Op de telefoon `PersistentKeepalive = 25` (zonder dat valt de NAT-mapping van de provider weg), always-on via Android's eigen OS-instelling. Router: alleen UDP 51820 forwarden.

6. **Backblaze B2 → Hetzner Storage Box BX11, locatie Helsinki.** De reden is nadrukkelijk niet soevereiniteit: het is dat restic slecht samenwerkt met S3 Object Lock (delete markers, en restic is tot en met v0.18 niet lock-free — lock-free staat op z'n vroegst voor v0.20), terwijl Storage Box het op storage-niveau oplost. ZFS-snapshots onder `/home/.zfs/snapshot`, en de Hetzner-documentatie stelt expliciet dat schrijven naar `/.zfs` en subdirectories **niet mogelijk is**. Een aanvaller met gestolen SFTP-credentials kan de snapshots dus niet wissen. BX11 geeft 10 handmatige + 10 automatische slots. Helsinki in plaats van Falkenstein voor gratis geografische scheiding.
   ```
   Host storagebox
     Hostname uXXXXXX-subY.your-storagebox.de
     Port 23              # poort 22 eist RFC4716-keys; 23 accepteert OpenSSH — klassieke instapval
     User uXXXXXX-subY
     IdentityFile /root/.ssh/storagebox_ed25519
   ```
   Subaccount met toegang tot één directory, nooit het hoofdaccount. Automatische dagelijkse snapshots aanzetten in de Console. En: `openssl rand -base64 48` als repo-wachtwoord, **buiten de box bewaren** — een verloren restic-wachtwoord is een groter reëel risico dan de CLOUD Act.

7. **Immich-kaartlaag weg bij Cloudflare — de enige echte soevereiniteitsvondst in de rest van het ontwerp.** Administration → Settings → Map & GPS Settings:
   - *snelste EU-fix (vijf minuten):* de OpenFreeMap style-URL in Light Style en Dark Style plakken (Zsolt Ero, twee Hetzner-machines, EU, geen API-key).
   - *beste fix (een avond):* een Nederland- of Europa-extract als `.pmtiles` bij Protomaps, door Caddy geserveerd (`file_server` doet range requests native), met een eigen MapLibre style-JSON. Dan verlaat er geen enkel tegelverzoek zijn netwerk.
   - **Niet** MapTiler of Geoapify: die zetten een persoonlijke API-key in de style-URL, en dat is qua metadata *slechter* dan het huidige anonieme `tiles.immich.cloud`, ook al is de jurisdictie beter.
   - De Android-app haalt de style-URL bij de server op via `maplibre_gl`, dus deze serverwijziging repareert web én mobiel in één keer.

8. **Wildcard-certificaat, en publieke A-records schrappen.** `*.<domein>` in Caddy (DNS-01 is de enige methode die wildcards toestaat, en die gebruikt hij al), zodat crt.sh alleen nog `*.<domein>` toont in plaats van `photos.`, `immich.`, `api.`. Hostnaam-geheimhouding is obscurity, geen beveiliging — maar in een metadata-frame is het legitiem: de totale publieke voetafdruk wordt dan "dit domein bestaat, de NS staat bij deSEC, er is één wildcard". Tegelijk de A-records naar `192.168.1.100` verwijderen; DNS-01 heeft ze niet nodig, alleen het TXT-record telt.

9. **CAA-record — de daadwerkelijke mitigatie tegen mis-issuance, meer waard dan van CA wisselen.**
   ```
   <domein>. 3600 IN CAA 0 issue     "letsencrypt.org"
   <domein>. 3600 IN CAA 0 issuewild "letsencrypt.org"
   <domein>. 3600 IN CAA 0 iodef     "mailto:<adres>"
   ```
   Hiermee sluit hij en passant Caddy's stille ZeroSSL-fallback (HID Global, VS) uit. Wil hij die niet laten *falen* maar echt uitzetten, dan de issuer expliciet pinnen en `caddy validate` draaien. Daarna CT-monitoring aanzetten (crt.sh RSS): met een wildcard is elk ander certificaat dat opduikt per definitie verdacht.

10. **Immich-versiecheck uit, ML offline.** `newVersionCheck.enabled: false` (Diun doet dit werk al). Na de eerste ML-run `HF_HUB_OFFLINE=1` op de `immich-machine-learning`-container; daarna belt hij Hugging Face nooit meer.

11. **Nextcloud outbound trimmen** in `config/config.php`:
    ```php
    'updatechecker' => false,
    'connectivity_check_domains' => [],   // haalt eff.org (VS) uit zijn periodieke verkeer
    'lookup_server' => '',
    'appstoreenabled' => true,            // laat aan: apps.nextcloud.com staat in Stuttgart
    'has_internet_connection' => true,    // NIET op false; dat sloopt meer dan het oplost
    ```

12. **Ubuntu-phone-homes dempen.** `ENABLED=0` in `/etc/default/motd-news` plus `systemctl disable --now motd-news.timer`; in `/etc/systemd/timesyncd.conf` `NTP=0.nl.pool.ntp.org 1.nl.pool.ntp.org 2.nl.pool.ntp.org` met lege `FallbackNTP=`; apt naar `nl.archive.ubuntu.com`.

13. **healthchecks.io houden, maar zonder ping-body.** `curl -fsS -m 10 --retry 5 https://hc-ping.com/<uuid>` en géén `--data-binary` — anders reizen restic-paden en repo-statistieken mee naar Riga. Alertkanaal op e-mail, niet SMS/WhatsApp (dat trekt Twilio erbij). Zelf hosten kán (BSD-3-clause) maar **moet niet**: een dead man's switch op de box die hij bewaakt sterft samen met de patiënt.

14. **Notificaties: self-hosted ntfy, nooit ntfy.sh.** Met de F-Droid-app en instant delivery vervalt ook Google FCM. Kost wat batterij (permanente WebSocket) en kan per definitie niet melden dat de box zelf plat ligt — daarvoor blijft healthchecks.io.

15. **Diun temmen.** `DIUN_WATCH_SCHEDULE` naar dagelijks in plaats van elke 6 uur, of een lokale `registry:2` in proxy-modus ervoor. Halveert de hartslag naar Docker Hub/GHCR en lost meteen de 100-pulls-per-6-uur-limiet op.

16. **Immich-app uit GitHub Releases** (door het project getekend, altijd actueel) in plaats van de Play Store. Dat vermijdt Google zonder het F-Droid-versielag-risico: Immich eist versie-afstemming tussen app en server, en een achterlopende F-Droid-build kan zijn backup stilletjes breken.

---

## 3. Wat onvermijdelijk niet-EU blijft, en waarom dat verdedigbaar is

- **Let's Encrypt / ISRG (VS).** Een CA ondertekent een publieke uitspraak over een publieke naam; hij is geen verwerker. ISRG krijgt nooit een private key en nooit inhoud, en bij DNS-01 raakt hij de box niet eens aan. Het reële CA-risico is mis-issuance, en dat los je op met een CAA-record en CT-monitoring, niet met een andere vlag. Het EU-alternatief is bovendien grotendeels verdwenen: Buypass stopte per 15/16 oktober 2025, en ZeroSSL is Amerikaans eigendom. Actalis (IT) bestaat nog, maar koopt niets — zie §5.

- **Certificate Transparency.** Structureel aan publiek vertrouwde TLS. Elke CA — ook een Italiaanse — moet publiceren. Niet vervangbaar, alleen in te dammen tot één regel met een wildcard.

- **GHCR en Docker Hub (VS).** Images ophalen is geen datalek van inhoud: de bytes stromen naar binnen. Wat overblijft is een software-inventaris gekoppeld aan zijn IP — en die krijgt een waarnemer via CT en Shodan toch al. Er is geen EU-alternatief dat werkt, want Immich publiceert alleen naar GHCR; alles spiegelen kost echt onderhoud voor metadata-winst die elders alsnog weglekt.

- **Hugging Face (VS).** Eenmalige download van modelgewichten, daarna `HF_HUB_OFFLINE=1`. Er gaat nooit een foto heen.

- **Canonical (VK).** Post-Brexit geen open vraag meer: de Commissie hernieuwde op 19-12-2025 beide adequaatheidsbesluiten tot 27-12-2031, dus doorgifte is rechtmatig zonder SCC's, en de CLOUD Act raakt een Brits bedrijf niet. Hetzelfde geldt voor F-Droid Limited. openSUSE Leap (SUSE, Neurenberg) is het eerlijke EU-corporate antwoord, maar kost een herinstallatie en breekt de aansluiting met alle Immich-, Nextcloud- en Docker-documentatie voor nul reëel risico.

- **Immich als project (FUTO, Austin TX).** Een Amerikaanse softwareleverancier kan onder de CLOUD Act niets afgeven wat hij niet bezit. AGPL, geen CLA, geen telemetrie, geen phone-home in de licentievalidatie. Wat telde waren de endpoints — en die worden in §2 punt 7 en 10 aangepakt.

- **Google FCM / Apple APNs, als hij Nextcloud-push wil.** De inhoud is end-to-end versleuteld naar het toestel en Google leert niet welke server het stuurde; wat overblijft is cadans en toestelidentiteit. UnifiedPush/NextPush elimineert het volledig, maar vereist de F-Droid-build en distributor-plumbing, en werkt vooral in Talk — voor de Files-app is het rommelig.

- **Google Play Services op de telefoon.** Dit is de grootste niet-EU partij in het hele ontwerp en de enige die hij niet met een configuratieregel oplost. Zijn fotopijplijn wordt Europees; de camera aan de voorkant is dat niet. Alleen een de-Googled ROM verandert dat, en dat is een ander project.

- **healthchecks.io' subverwerkers.** Riga is EU en Hetzner is EU, maar de versleutelde backups staan bij AWS. Bij een dead man's switch die alleen een UUID en een tijdstempel kent, is dat proportioneel.

- **De Tailscale-metadata die er al ligt.** Opzeggen stopt de aanwas, maar wat de control plane historisch heeft geregistreerd blijft daar tot ze het wissen. Verwijder het tailnet in de admin console en dien desnoods een verzoek onder art. 17 AVG in — bij een Delaware-entiteit is dat meer verzoek dan recht.

---

## 4. De eerlijke kosten van soevereiniteit

**In euro's.** De backupwissel kost circa **€32 per jaar**. Backblaze B2 is bij ~100 GB ongeveer €0,54/mnd (eerste 10 GB gratis, daarna $6,95/TB); Hetzner BX11 is €3,20/mnd ex btw flat, dus ~€3,87 incl. 21% btw als particulier, ~€46/jaar. Dat is de volledige prijs van die beslissing, en vanaf ongeveer 460 GB draait het om en wordt Hetzner absoluut goedkoper — met onbeperkte egress, zodat een volledige 1 TB-restore nul kost (bij Exoscale zou diezelfde restore €20 extra kosten, bij Scaleway Glacier €9 aan retrieval). De DNS-wissel kost **niets**: deSEC is gratis en heeft een officiële Caddy-module. De VPN-wissel kost **niets en bespaart complexiteit**: Tailscale free was gratis, WireGuard is gratis, en er verdwijnt een daemon, een account en een subnet-routeringslaag. De kaartlaag, de Nextcloud-config, de Ubuntu-phone-homes en de ntfy-keuze kosten samen **€0**.

De enige echte structurele post is de VPS die de Cloudflare Tunnel vervangt: Hetzner CX22 rond €3,79/mnd + €0,50 voor IPv4, dus ongeveer **€60-62 per jaar**. Totaal komt de soevereiniteitsbelasting daarmee op **circa €90-108 per jaar** waar hij nu ongeveer €6 betaalt — of **circa €46 per jaar** als hij variant 2b kiest en `api.<domein>` gewoon zelf publiceert.

**In complexiteit.** De VPS is een tweede machine die gepatcht, gemonitord en in de restic-backup opgenomen moet worden, plus een nieuwe faalmodus. Een `.pmtiles`-bestand veroudert stil en moet een paar keer per jaar met de hand ververst worden. deSEC heeft geen SLA en geen supportcontract — het is een vereniging van vrijwilligers; voor certificaten is dat onschadelijk (90 dagen geldigheid geeft veel speling), voor DNS-resolutie is uitval direct merkbaar. Met WireGuard verdwijnt MagicDNS, dus interne naamresolutie moet hij zelf regelen. En de F-Droid-route voor de Immich-app kan zijn backup breken door versie-mismatch, wat de GitHub-APK het betere compromis maakt.

**In gemak.** Eén functionele regressie is echt: op netwerken die uitgaand UDP blokkeren (sommige bedrijfs- en hotelnetwerken) komt kale WireGuard er niet in, waar Tailscale's DERP-fallback over 443/TCP stil doorkwam. Dat is meetbaar zeldzaam bij normaal 4G/5G- en thuisgebruik, maar het is geen nul.

**Waar de grens ligt.** Verstandig zijn de ingrepen waar een derde partij *inhoud* of *afgeleide inhoud* ziet, of waar het alternatief toevallig ook technisch beter is: de Cloudflare Tunnel (andermans wachtwoorden in plaintext bij een Amerikaans bedrijf — dat is geen voorkeur maar een AVG-verantwoordelijkheid), de Immich-kaartlaag (locaties uit zijn privéfoto's), het scopen van het ACME-token, Hetzner in plaats van B2, en het schrappen van de A-records. Puristisch — en niet de moeite — zijn: Ubuntu vervangen door openSUSE, Let's Encrypt inruilen voor Actalis, GHCR naar een EU-registry spiegelen, Headscale op een eigen VPS zetten om twee peers te verbinden, en UnifiedPush-plumbing voor één gebruiker die vooral bestandssync wil.

De scherpste manier om die grens te trekken: **bij restic is client-side encryptie het hele verhaal en is de jurisdictie van de opslagprovider praktisch bijzaak** — wat overblijft is beschikbaarheidsrisico (een bevel of een ToS-besluit kan een account bevriezen; AES-256 helpt daar nul) en de deltacurve als gedragspatroon. **Bij DNS, de tunnel en Tailscale kan encryptie principieel niets wegnemen**, omdat de dienst de metadata nodig heeft om te functioneren. Daar helpt alleen partijkeuze of de partij weglaten. Precies daarom staat B2 laag op de lijst en de tunnel bovenaan.

---

## 5. Waar de audits elkaar tegenspreken of iets onbewezen bleef

**Tegenspraken tussen de audits**

1. **Lekken de A-records zijn thuis-IP?** De backup-audit stelt dat het bron-IP dat Backblaze ziet niets nieuws toevoegt "want dat lekt al via de publieke A-records". Dat is onjuist en wordt weersproken door de DNS- en VPN-audits: een A-record naar `192.168.1.100` is RFC1918 en lekt het subnet, niet het publieke adres. **Veilige default:** ga uit van de DNS-lezing — een offsite backupprovider ziet `217.105.58.146` en dat is wél nieuwe blootstelling. Verandert de conclusie niet, wel het argument.

2. **Moet het thuis-IP privé blijven, of niet?** De DNS-audit adviseert een EU-VPS (€60/jaar) om het thuis-IP verborgen te houden. De remote-access-audit adviseert kale WireGuard, wat een geforwarde poort en mogelijk een DDNS-record met dat exacte IP betekent — en merkt terecht op dat Tailscale dat adres nu al opslaat bij precies de partij onder Amerikaanse jurisdictie. **De premisse en de maatregel spreken elkaar tegen.** Veilige default: beslis dit één keer, expliciet. Kiest hij WireGuard, dan is de IP-privacy-eis vervallen en is variant 2b (`api.<domein>` direct publiceren) coherent én €60/jaar goedkoper. Houdt hij de eis overeind, dan moet hij zowel de VPS nemen als het DDNS-record laten en het IP hardcoderen — en dan is WireGuard alsnog beter dan Tailscale, want een geforwarde UDP-poort onthult het IP alleen aan wie er al naar kijkt, terwijl Tailscale het permanent opslaat.

3. **Interne naamresolutie na het schrappen van de A-records.** De DNS-audit verwijst voor `photos.<domein>` naar Tailscale split-DNS/MagicDNS. De remote-access-audit gooit Tailscale weg. **Veilige default:** volgorde vastleggen. Eerst WireGuard werkend krijgen met `DNS = 10.10.0.1` in de peer-config en een lokale resolver op de box (of desnoods een `/etc/hosts`-regel op de telefoon), dán pas de A-records verwijderen. Anders is Immich vanaf Android onbereikbaar en zit hij zonder pad terug.

4. **De Caddyfile in de laatste audit gebruikt nog `tls { dns cloudflare }`** in het wildcard-voorbeeld, terwijl de DNS-audit juist naar deSEC verhuist. **Veilige default:** de deSEC-syntax uit §2 punt 3; die is geverifieerd tegen de README van `github.com/caddy-dns/desec`.

5. **Bestaat er nog een gratis EU-CA?** De DNS-audit concludeert van niet (Buypass dood, ZeroSSL Amerikaans). De overige-partijen-audit noemt Actalis (IT) met een gratis ACME-plan. **Beide adviezen komen op hetzelfde uit — Let's Encrypt houden —** maar de feitelijke claim verschilt. Veilige default: Actalis bestaat, maar koopt niets: CT-publicatie is identiek verplicht, de Caddy-integratie is veel minder getest, en de CA ziet toch geen data van hem. Pin Let's Encrypt met een CAA-record.

**Wat onbewezen bleef, met de veilige default**

| Onbewezen | Veilige default |
|---|---|
| **Hetzner rendert zijn prijzen client-side**, dus de bedragen staan niet in de HTML. Ik vond €3,20/mnd ex btw voor BX11 bevestigd door meerdere onafhankelijke bronnen van 2026 (whtop, hostbrr, hiltonsoftware) en Hetzners eigen BX11-pagina kwam wel in de resultaten voor, maar zonder afleesbaar bedrag | Controleer het bedrag op het bestelscherm vóór je afrekent |
| **Welke Tailscale-entiteit zijn wederpartij is.** Ik heb de ToS zelf opgehaald en de split bevestigd (Schedule A: Canada vóór 2024-09-02, Delaware vanaf 2024-09-03; New Yorks recht in beide gevallen). Wélke van de twee geldt hangt af van de aanmaakdatum van zijn tailnet | Kijk het na in Settings → General. Ga tot dan uit van Delaware — dat is de scherpste lezing en het advies verandert er niet door |
| **Bij welke registrar het domein staat** | `whois` draaien vóór alles. Cloudflare Registrar betekent een transfer, geen NS-wijziging |
| **Android's "Verbindingen blokkeren zonder VPN" (lockdown) in combinatie met smalle `AllowedIPs`.** Bronnen spreken elkaar tegen; het is device- en versieafhankelijk, en er staan open issues over precies dit gedrag — ook bij Tailscale zelf | Ofwel lockdown uit en alleen always-on, ofwel full tunnel (`AllowedIPs = 0.0.0.0/0, ::/0`). **Test dit vóór hij Tailscale weggooit**, en verifieer eerst dat hij SSH over LAN heeft — zichzelf buitensluiten is de enige echte faalmodus |
| **Of een CLOUD Act-bevel aan Hetzner US LLC data zou bereiken bij Hetzner Online GmbH.** Geen jurisprudentie gevonden. Idem voor Contabo/KKR via de 'control'-toets | Behandel als onbeproefd en leun er niet op. De keuze voor Hetzner rust op restic + ZFS-snapshots + egress, niet op deze asterisk — Contabo valt hoe dan ook af op prijs |
| **Of `tiles.immich.cloud` IP-adressen logt en hoe lang.** Immich publiceert geen privacyverklaring voor dat endpoint; wat vaststaat is dat Cloudflare ervoor zit en die logt request-metadata standaard | Aannemen dat het gezien wordt |
| **Of Immich buiten versiecheck, tiles, GeoNames en Hugging Face nog andere uitgaande calls doet.** Niet in de broncode nagegaan | De enige volledige audit is empirisch: een week egress-logging op de Docker-bridge (iptables LOG, of Pi-hole/Unbound als geforceerde resolver) en kijken welke hostnames langskomen |
| **Of de Nextcloud Android-app crash-reporting van derden bevat.** Voor Immich hard gemaakt via `pubspec.yaml`, voor Nextcloud niet | Kijk in `nextcloud/android` `build.gradle` naar acra/sentry/firebase-crashlytics |
| **Waar `push-notifications.nextcloud.com` fysiek draait**, en of de broncode van de proxy publiek is | Voor de CLOUD Act maakt het niet uit (de wet volgt het bedrijf, en dat is Duits), maar neem niet aan dat de servers per se in Duitsland staan |
| **Of Docker uit `download.docker.com` (VS) of uit Ubuntu's `docker.io`-pakket komt** | `ls /etc/apt/sources.list.d/ \| grep -i docker` |
| **Of deSEC's minimum-TTL van 3600s de propagatiewachttijd bij ACME-uitgifte merkbaar verlengt**, en waar deSEC's anycast-nodes geografisch staan | Theoretisch relevant voor het `_acme-challenge`-record; niet getest. Vernieuw de eerste keer met de hand en kijk mee |
| **Prijzen van Infomaniak Swiss Backup (1 TB) en Leaseweb Object Storage** | Beide vielen af op andere gronden; niet blokkerend |
| **Transparantierapporten van Hetzner en Backblaze** (aantal overheidsverzoeken, inwilligingspercentage, notificatie aan gebruikers) heb ik niet bekeken | Dat zou het *praktische* in plaats van het *theoretische* risico kwantificeren en is de moeite waard als hij dieper wil |

**Eén punt buiten de vier audits dat hier hoort.** Barkast staat op dezelfde box en heeft e-mailadressen en wachtwoord-hashes in MongoDB. Dat is de enige plek in dit hele ontwerp waar hij persoonsgegevens van **anderen** verwerkt en dus een echte AVG-verantwoordelijkheid draagt, niet alleen een voorkeur over zijn eigen data. Dat is ook precies waarom de Cloudflare Tunnel bovenaan de lijst staat en niet Backblaze: bij de backup ziet de Amerikaanse partij een onleesbare blob, bij de tunnel ziet ze het wachtwoord zelf.

---

**Bronnen die ik in deze ronde zelf opnieuw heb gecontroleerd:** [tailscale.com/terms](https://tailscale.com/terms) (Schedule A-entiteitensplit en governing law, bevestigd), [desec.readthedocs.io token policies](https://desec.readthedocs.io/en/latest/auth/tokens.html) (velden `domain`/`subname`/`type`/`perm_write`, bevestigd), [docs.immich.app custom map styles](https://docs.immich.app/guides/custom-map-styles/) (`tiles.immich.cloud/v1/style/{light,dark}.json` als default, bevestigd), en de BX11-prijs via [hetzner.com BX11](https://www.hetzner.com/storage/storage-box/bx11/), [whtop](https://www.whtop.com/plans/hetzner.com/128269) en [HostBrr](https://hostbrr.com/storagebox-vs-hetzner-vs-s3.html) (€3,20/mnd ex btw, 1 TB, onbeperkt verkeer — consistent over meerdere bronnen, maar niet afleesbaar uit Hetzners eigen HTML).