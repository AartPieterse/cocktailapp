# Barkast-box als privé-cloud — Google Photos + Drive vervangen

## Context

Je wilt weg bij Google Photos en Google Drive en dat zelf hosten op de machine die je al hebt staan
(`aart@192.168.1.100`, de omgebouwde ASUS VivoBook Pro). Vier vragen: wat is best practice, kan het
naast het Barkast-project, hoe maak je het altijd bereikbaar vanaf mobiel, en hoe regel je backups.
Voorkeur voor bestaande, gratis, open-source software — geen maatwerk.

Dit staat los van de cocktailapp-codebase; er verandert niets in deze repository. Wel hergebruiken we
bewust de conventies uit `deploy/` (age-encryptie, systemd-timers, compose-overlays).

---

## Besluitenlog

Vastgelegd op 2026-09-05, na meting van de machine. Dit zijn keuzes, geen opties meer.

| # | Besluit | Grond |
|---|---|---|
| 1 | **Immich** voor foto's, gepind op `v3.1.0` | Enige met een Android-app die écht op de achtergrond backupt |
| 2 | **Kale WireGuard**, twee peers, UDP 51820 geforward | *Herzien 2026-09-05 na de EU-audit.* Tailscale loste NAT-traversal op — een probleem dat hij niet heeft (publiek IP, geen CGNAT) — en betaalde daarvoor met een control plane onder Amerikaanse jurisdictie die zijn thuis-IP, device-namen en verbindingstijden bewaart. WireGuard is hier soevereiner **én simpeler**: geen daemon, geen account, geen derde partij |
| 2b | **Geen foto's of video door een Cloudflare Tunnel** | Cloudflare's Free/Pro/Business-voorwaarden beperken non-HTML-content op public hostnames |
| 3 | **2 TB SATA-SSD in de vrije bay, LUKS met TPM2-unlock, gemount op `/srv`** | TPM 2.0 + Secure Boot aanwezig → versleuteling zonder herinstallatie en zonder handwerk bij boot |
| 4 | **Geen NAS, geen extra RAM, geen NVIDIA-driver** | Vrije SATA-bay maakt een NAS overbodig; 5 van 16 GB in gebruik; de iGPU doet de transcoding |
| 5 | **Immich eerst, twee weken alleen** | Eén variabele tegelijk. Bij een probleem weet je waar het vandaan komt |
| 6 | **Nextcloud is een beslismoment ná die twee weken**, geen voldongen feit | Bij één gebruiker en 30 GB is het enige onderdeel met upgrade-pijn misschien niet nodig |
| 7 | **Backups + geslaagde restore-drill vóór er iets bij Google weg mag** | Google One blijft tot die tijd je verzekering |
| 8 | **restic** als backup-engine, **Caddy** als reverse proxy, **Diun** notify-only | Zie de softwaretabel |
| 9 | **DNS naar deSEC** (Berlijn, non-profit, gratis), ACME-token gescoped op `_acme-challenge` TXT | Cloudflare ziet anders elke hostnaam en elke query. Het gescopete token is de echte winst: een gecompromitteerde Caddy kan de zone niet omleiden |
| 10 | **Offsite backup naar Hetzner Storage Box BX11 (Helsinki)**, niet Backblaze B2 | Niet primair om de vlag — restic versleutelt client-side — maar omdat ZFS-snapshots onder `/home/.zfs/snapshot` over SFTP **niet schrijfbaar** zijn, wat echte immutability geeft die restic met S3 Object Lock niet betrouwbaar haalt |
| 11 | **Cloudflare Tunnel voor Barkast wordt vervangen** | Dit is de enige plek waar een niet-EU partij **plaintext persoonsgegevens van derden** ziet: de tunnel termineert TLS aan de edge, dus een Barkast-login passeert met e-mailadres én wachtwoord. Bovendien kan de tunnel niet blijven bestaan naast een DNS-verhuizing — zie de soevereiniteitsparagraaf |

---

## Korte antwoorden op je vier vragen

**1. Best practice.** Twee gespecialiseerde apps in plaats van één alleskunner: **Immich** voor foto's
(achtergrond-upload, gezichtsherkenning, zoeken op inhoud) en pas daarna, als je het dan nog nodig
blijkt te hebben, iets voor bestanden. Alles in Docker Compose met **gepinde tags**, één reverse proxy
ervoor, backups via **restic**. Niets automatisch laten bijwerken.

**2. Naast Barkast?** Ja, ruimschoots. Barkast idle't onder de 2 GB en claimt alleen `:8080`. Je komt
met alles erbij op ~5 GB van 16 GB. Eén ding moet wijzigen: de `:8080`-overlay van Barkast trek je in,
zodat de reverse proxy de enige toegangsweg wordt.

**3. Altijd bereikbaar vanaf mobiel.** **Kale WireGuard** met één geforwarde UDP-poort. Box +
telefoon en laptop als peers, op Android "always-on VPN" aan. Thuis, op 4G en in het buitenland gelijk
bereikbaar, en er is geen enkele derde partij bij betrokken. (Dit was Tailscale; zie
[de soevereiniteitsparagraaf](private-cloud-sovereignty.md) voor waarom dat is gewijzigd — kort:
Tailscale lost NAT-traversal op, en dat probleem heb je niet.)

**4. Backups.** 3-2-1 met **restic**: kopie 1 is de live data, kopie 2 een lokale externe USB-schijf,
kopie 3 een versleutelde offsite-repo bij **Hetzner Storage Box** (Helsinki). Op 30 GB kost dat een paar
euro per maand. Het echte werk zit
niet in het maken maar in het **bewijzen** dat het werkt: een geteste restore, een guard tegen lege
backups, en een externe dead-man's switch die klaagt als de backup níét draaide.

**En het vijfde punt dat je er zelf bij gaf:** je data binnen Europa houden. Je *inhoud* staat sowieso op
je eigen box en gaat client-side versleuteld de deur uit — de vraag is bij wie je welke **metadata**
achterlaat. Dat is apart uitgezocht in [`private-cloud-sovereignty.md`](private-cloud-sovereignty.md) en
heeft vier besluiten in dit plan gewijzigd: DNS, remote access, de offsite-bestemming, en de Cloudflare
Tunnel van Barkast.

---

## Gemeten uitgangssituatie (geverifieerd over SSH, niet aangenomen)

| Onderdeel | Werkelijke staat |
|---|---|
| OS | Ubuntu Server 24.04.4 LTS, kernel 6.8.0-139 |
| CPU | Intel i7 8e gen (Coffee Lake-H), 12 threads, AVX2 |
| RAM | 16 GB in één DIMM (ChannelB) — 770 MB in gebruik. Vrije slots aanwezig. Swap 4 GB |
| Opslag | **één** NVMe (Intel SSDPEKNW512G8 = 660p, QLC), 477 GB. `/` = 466 GB, 13 GB gebruikt, **437 GB vrij** |
| LVM | `ubuntu-vg`: VSize 473,89 GB, **VFree = 0** — alles in één LV, ext4 op `/` |
| SATA | `ahci 00:17.0`, `ata1` 6 Gbps, **link down** — vrije poort, vermoedelijk lege 2,5"-bay |
| TPM | **TPM 2.0 aanwezig** (`/dev/tpm0`, ASUS TPM2-tabel), **Secure Boot enabled**, `systemd-cryptenroll` beschikbaar |
| Ethernet | **Aanwezig**: `eno2`, Realtek RTL8111 Gigabit — nu DOWN, alleen kabel nodig |
| Wifi | `wlo1`, 5 GHz VHT80, −61 dBm, rx 176 / tx 780 Mbit |
| iGPU | UHD 630 → `/dev/dri/renderD128` (**VAAPI/QuickSync voor transcoding**) |
| dGPU | GTX 1050 Mobile, geen driver — bewust laten slapen |
| Accu | 26,7 van 48,1 Wh = **55% gezondheid** → ~2 uur UPS. `HandleLidSwitch=ignore` staat al goed |
| Docker | Engine 29.8.0, Compose v5.5.1 |
| Draait nu | `deploy-api-1` (host **:8080**), `deploy-mongo-1` (intern), netwerk `deploy_internal` |
| Firewall | **UFW inactief** |
| Overig | `unattended-upgrades` actief; alleen sshd op `:22`; `/srv` en `/opt` leeg |

**Jouw uitgangspunten:** ~30 GB data nu, met groeipotentie · alleen Android · alleen jijzelf als
gebruiker · ethernet wordt aangesloten.

---

## Softwarekeuze

| Functie | Keuze | Pin | Waarom deze en niet de concurrent |
|---|---|---|---|
| Foto's | **Immich** | `v3.1.0` (stable, 2026-07-29) | Enige met een Android-app die écht op de achtergrond backupt. PhotoPrism heeft geen serieuze upload-app; Ente is goed maar self-host is tweederangs; Nextcloud Memories is een plugin, geen product |
| Foto-migratie | **immich-go** | `v0.32.0` | Lost het Takeout JSON-sidecar-probleem op (datums, albums). Handmatig importeren verliest je metadata |
| Bestanden | **beslismoment in fase 9** | — | Nextcloud is de complete Drive-vervanger (deellinks, on-demand files, CalDAV/CardDAV) maar ook het enige onderdeel met upgrade-pijn. Syncthing + SMB is een fractie van het onderhoud maar levert geen web-UI en geen deellinks |
| Reverse proxy | **Caddy** | pinnen | Automatische certificaten met twee regels config. Traefik is krachtiger dan je nodig hebt; nginx-proxy-manager voegt een database en een UI toe die kunnen breken |
| Toegang | **WireGuard** (kaal, 2 peers) | in-kernel | Geen control plane, geen account, geen derde partij. NAT-traversal is niet nodig: publiek IP zonder CGNAT. NetBird (Berlijn) is het EU-alternatief als hij toch een gehoste control plane wil; Headscale is hier overkill voor twee peers |
| DNS | **deSEC** | — | Duitse non-profit, gratis, officiële Caddy-module `caddy-dns/desec`, en token policies die je op één recordnaam kunt vastzetten |
| Backup | **restic** | `0.19.1` upstream binary | Eén statische Go-binary, client-side AES-256, dedup. **Let op**: Ubuntu noble levert 0.16.4 met `self-update` eruit gepatcht — pak de upstream binary |
| Update-signalering | **Diun** | `4.33.0` | Notify-only. **Nooit Watchtower** op Immich: die draait breaking migrations terwijl je slaapt |
| Dead-man's switch | **healthchecks.io** | free tier | Moet extern staan. Een monitor op dezelfde box merkt niet dat de box dood is |

Bewust **weggelaten**: Collabora/OnlyOffice (≥2 GB RAM voor iets wat je nu lokaal in Office doet),
Uptime Kuma, Prometheus/Grafana, docker-socket-proxy, een tweede Cloudflare Tunnel, btrfs/ZFS.
Verdedigbaar bij drie gebruikers en 2 TB; nu niet.

---

## Wat je níét gaat doen

- **Geen NAS.** De vrije SATA-bay maakt hem overbodig, en de laptop is als applicatieserver sterker dan
  elke consumenten-NAS in dezelfde prijsklasse.
- **Geen extra RAM.** Je zit op ~5 van 16 GB.
- **Geen NVIDIA-driver.** De iGPU doet je transcoding; de GTX 1050 blijft slapen en scheelt stroom.
- **Geen Watchtower** of andere auto-updater op Immich.
- **Geen foto's of video door een gratis Cloudflare Tunnel.** Cloudflare's beperking op
  non-HTML-content geldt voor Free/Pro/Business en raakt public-hostname-verkeer.
- **Geen Headscale.** Een eigen control plane op een VPS om twee peers te verbinden is puristisch,
  niet verstandig.
- **Geen ntfy.sh.** Self-hosted ntfy wel; de publieke instantie draait bij een privépersoon in
  Connecticut.
- **Geen LV-split op de bestaande NVMe.** `VFree = 0` en ext4 kan niet online krimpen.

---

## Opslag en versleuteling — het besluit

**2 TB SATA-SSD (~€100) in de vrije bay, LUKS-versleuteld met TPM2-unlock, gemount op `/srv`.**

Dat lost drie dingen tegelijk op: versleuteling *zonder herinstallatie*, opslaggroei voor jaren, en een
echt schot zodat een volgelopen fotobibliotheek je root-filesystem niet meesleurt.

Je koopt hier geen capaciteit — bij 30 GB heb je die niet nodig — maar de versleuteling. Dit is een
draagbare laptop waar straks je complete fotoarchief plus `deploy/.env` (Mongo-wachtwoord,
JWT-secrets, tunnel-token) op staat. Full-disk LUKS op de bestaande root kan alleen via een
herinstallatie; een apart versleuteld datavolume raakt de initramfs niet en is daarmee triviaal.

> **Controleer eerst fysiek** of er onder de bodemplaat daadwerkelijk een 2,5"-bay met connector zit.
> De SATA-controller heeft de poort vrij (`ata1: SATA link down`), maar of het chassis de bay
> gepopuleerd heeft kan software niet zien. Zit hij er niet: val terug op een tweede M.2 als die vrij
> is, en anders op optie A hieronder.

```bash
# Na inbouw — /dev/sda is de nieuwe schijf, controleer met lsblk
sudo cryptsetup luksFormat /dev/sda
sudo cryptsetup open /dev/sda srv && sudo mkfs.ext4 /dev/mapper/srv

# Automatisch ontgrendelen bij boot, gebonden aan de Secure Boot-state (PCR7)
sudo systemd-cryptenroll /dev/sda --tpm2-device=auto --tpm2-pcrs=7

echo "srv UUID=$(sudo blkid -s UUID -o value /dev/sda) none tpm2-device=auto,discard" \
  | sudo tee -a /etc/crypttab
echo '/dev/mapper/srv /srv ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload && sudo mount -a
```

> **Wat TPM-unlock wél en níét doet.** Het beschermt tegen een gestolen of afgedankte *schijf*: eruit
> halen en elders uitlezen lukt niet. Binding aan PCR7 zorgt er bovendien voor dat het volume níét
> opengaat als iemand Secure Boot uitzet om van een live-USB te booten. Het beschermt níét tegen iemand
> die de hele laptop meeneemt en gewoon aanzet — wil je dat ook, voeg `--tpm2-with-pin=yes` toe en
> accepteer een pincode bij elke reboot. **Print hoe dan ook een LUKS-recovery-key en leg hem buiten de
> deur**: een BIOS-update wijzigt PCR7 en dan ontgrendelt de TPM niet meer.

**Terugvaloptie A** (als er geen bay blijkt te zijn): niets kopen, mappen op de bestaande root-fs, geen
versleuteling. Groeien gaat dan later zo — géén datamigratie nodig:

```bash
sudo pvcreate /dev/sda && sudo vgextend ubuntu-vg /dev/sda
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv      # ext4 groeit wel online
```

### Directory-layout

```
/srv/                   # het LUKS-volume
├── appdata/            # database + config — gaat elke nacht mee in de backup
│   └── immich/{postgres,cache}
├── media/
│   └── immich/{upload,library,profile,thumbs,encoded-video}
├── stacks/             # compose-bestanden, in git
│   ├── caddy/  immich/  ops/
└── backup/             # restic-cache + dumps in transit
/srv/stacks/barkast/    # Barkast verhuist hierheen, dus ook versleuteld
/mnt/backup/            # externe USB-schijf, fstab met nofail
```

---

## Poorten en RAM-budget

| Host-poort | Proces | Bereikbaar vanaf |
|---|---|---|
| 22/tcp | `sshd` | LAN + wg-tunnel |
| 80/tcp, 443/tcp+udp | `caddy` | LAN + wg-tunnel |
| 51820/udp | `wg-quick@wg0` | **de enige poort die je op de router forwardt**. WireGuard antwoordt niet op ongeauthenticeerde pakketten, dus voor een scanner bestaat hij niet |

Verder **niets**. Alle services praten onderling over Docker-netwerken; databases komen nooit op het
edge-netwerk. Barkast's `:8080` gaat eraf — het admin-dashboard bereik je via Caddy door de
WireGuard-tunnel.

> **Val waar je in gaat lopen:** Docker DNAT't gepubliceerde poorten in `nat/PREROUTING`, *vóór* UFW's
> `INPUT`-chain. UFW filtert door Docker gepubliceerde poorten dus **niet**. Wil je 80/443 echt
> LAN-scopen, gebruik `chaifeng/ufw-docker` (schrijft in `DOCKER-USER`). Zet **nooit**
> `{"iptables": false}` in `daemon.json` — dat breekt egress-NAT van alle containers.

| Component | Idle RAM |
|---|---|
| Host + Docker + WireGuard | ~850 MB |
| Barkast (api + mongo, met `mem_limit`) | ~700 MB |
| Immich server + ML + Postgres + Valkey | ~2,5 GB (piek ~4 GB tijdens ML-sweep) |
| Caddy + Diun | ~60 MB |
| **Subtotaal** | **~4,2 GB idle, ~6 GB piek** |
| Nextcloud (alleen als fase 9 daarvoor kiest) | +~800 MB |

CPU is een non-issue: 12 threads, >95% idle zodra de eerste ML-sweep klaar is.

---

## Gefaseerd bouwplan

### Fase 0 — Meten en beslissen

```bash
sudo apt install -y speedtest-cli && speedtest-cli   # uplink → duur van de eerste offsite-seed
```

Verder: **bodemplaat eraf** om de 2,5"-bay te bevestigen, en `whois` op je domein om te zien bij welke
registrar het staat (dat bepaalt of fase 5 een NS-wijziging is of een transfer).

Caddy met echte certificaten wil een domeinnaam. Heb je er geen, dan is er een gratis EU-route die
alles intact laat: **deSEC geeft gratis namen onder `dedyn.io` uit**, met dezelfde API, dezelfde
Caddy-module en gewoon Let's Encrypt-certificaten via DNS-01. Je hoeft dus geen domein te kopen en
hoeft ook niet terug te vallen op zelfondertekende certificaten.

Publieke A-records heb je in geen van beide gevallen nodig — DNS-01 gebruikt alleen een TXT-record, en
je bereikt de box door de WireGuard-tunnel. Zie fase 5.

**Checkpoint:** je kent je uplink, je weet of de bay er is, en de domeinkeuze staat vast.

### Fase 1 — Ethernet + WireGuard + de 4G-test *(vanavond, gratis, ~30 min)*

Dit is de enige stap die het hele project kan laten sneuvelen, en hij kost niets. Doe hem vóór je ook
maar één applicatie installeert.

```bash
# Kabel erin; wifi als fallback laten staan
ip -br link                     # eno2 moet UP zijn
# DHCP-reservering op de router voor BEIDE MACs: eno2 04:d4:c4:78:d3:5b, wlo1 a0:51:0b:d1:c4:91

sudo apt install -y wireguard
umask 077; wg genkey | tee server.key | wg pubkey > server.pub
wg genkey | tee phone.key | wg pubkey > phone.pub
wg genpsk > phone.psk
```

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address    = 10.10.0.1/24
ListenPort = 51820
PrivateKey = <server.key>

[Peer]                            # telefoon
PublicKey    = <phone.pub>
PresharedKey = <phone.psk>        # gratis extra laag op de key-exchange
AllowedIPs   = 10.10.0.2/32
```

```bash
sudo systemctl enable --now wg-quick@wg0
sudo ufw allow 51820/udp comment 'wireguard'
```

Op de router alleen **UDP 51820** forwarden. Geen `ip_forward` en geen MASQUERADE nodig zolang
Immich, Caddy en Barkast op deze box zelf draaien — routing naar het hele LAN is er niet voor nodig.
In de Android-peer `PersistentKeepalive = 25` (anders valt de NAT-mapping van je provider weg) en
always-on via Android's eigen VPN-instelling.

> **Test dit vóór je iets anders weggooit, en controleer eerst dat je SSH over LAN hebt.** Jezelf
> buitensluiten is de enige echte faalmodus hier. Android's "verbindingen blokkeren zonder VPN"
> gedraagt zich wisselend in combinatie met smalle `AllowedIPs`; werkt het niet, kies dan of
> lockdown uit met alleen always-on, of full tunnel (`AllowedIPs = 0.0.0.0/0, ::/0`).

**Checkpoint:** telefoon op 4G, wifi uit, `http://10.10.0.1:8080/api/catalog` geeft JSON. Werkt dit
niet, ga dan niet verder — los dit eerst op.

### Fase 2 — Host-basis

```bash
# Docker log rotation — anders vult json-file ongemerkt je schijf
sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
sudo systemctl restart docker

# nouveau blacklisten: houdt de GTX 1050 slapend en laat renderD128 de Intel iGPU zijn
printf 'blacklist nouveau\noptions nouveau modeset=0\n' | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
sudo update-initramfs -u

# SMART-bewaking (QLC-schijf: houd percentage_used in de gaten)
sudo apt install -y smartmontools nvme-cli
sudo nvme smart-log /dev/nvme0 | grep -E 'percentage_used|data_units_written'

# SSH dichttimmeren + UFW
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp comment 'ssh lan'
sudo ufw allow in on wg0
sudo ufw --force enable
```

Zet in het BIOS/MyASUS een **laadlimiet van 60–80%** als dat wordt aangeboden — de accu zit al op 55%
van zijn ontwerpcapaciteit en 24/7 aan de lader versnelt dat.

**Checkpoint:** `ls /dev/dri` toont nog maar één render-node, `docker info | grep -i logging` toont
max-size, `ufw status` is active, en je kunt nog steeds inloggen.

### Fase 3 — Schijf erin, LUKS, `/srv`

Zie de opslagsectie hierboven voor de commando's. Daarna:

```bash
sudo mkdir -p /srv/{appdata,media,stacks,backup}
sudo chown -R aart:aart /srv
```

**Checkpoint:** `lsblk` toont `sda` → `crypt` → `/srv`, en na een **reboot** is `/srv` vanzelf
gemount zonder dat je een wachtwoord hebt ingetypt. Test die reboot nu, niet later.

### Fase 4 — Barkast opschonen en verhuizen

```bash
sudo mv ~/cocktailapp /srv/stacks/barkast && cd /srv/stacks/barkast/deploy
docker network create --driver bridge --subnet 10.200.0.0/24 edge
```

Vier wijzigingen in `deploy/docker-compose.yml`:
- `name: barkast` bovenaan (het project heet nu `deploy` en dat gaat botsen)
- `mem_limit: 1g` en `--wiredTigerCacheSizeGB 0.5` op mongo
- `cloudflare/cloudflared:latest` → een vaste tag
- de `:8080`-overlay laten vallen; de api krijgt in plaats daarvan een alias op het `edge`-netwerk

**En de tunnel moet weg.** Dit is de scherpste bevinding uit de soevereiniteitsaudit en hij raakt
Barkast, niet de fotostack. Een Cloudflare Tunnel **termineert TLS aan de edge** — dat is inherent aan
hoe WAF, Access en caching werken. Bij een Barkast-login passeert daardoor het e-mailadres én het
wachtwoord zelf (POST-body, niet de hash) door een Amerikaans bedrijf. Dat is de enige plek in dit hele
ontwerp waar je persoonsgegevens van **anderen** verwerkt, en dus geen voorkeur maar een
AVG-verantwoordelijkheid.

Bovendien kan de tunnel niet blijven bestaan naast de DNS-verhuizing in fase 5: een tunnel-hostname
vereist een CNAME naar `<UUID>.cfargotunnel.com`, en dat subdomein proxyt alleen voor records in
hetzelfde Cloudflare-account. Externe nameservers behouden vereist partial setup (Business, $200/mnd);
een los subdomein als eigen zone vereist Enterprise. Beide vallen af.

Twee uitwegen:

- **(a) `api.<domein>` rechtstreeks vanaf Caddy publiceren.** Nul derde partijen, nul kosten. Je thuis-IP
  wordt dan publiek — maar zie hieronder: met WireGuard forward je toch al een poort, dus die eis heb je
  dan al losgelaten.
- **(b) EU-VPS als pure TCP-forwarder** (Hetzner CX22 of Scaleway, ~€60/jaar): WireGuard van de box naar
  de VPS, en op de VPS **geen** TLS-terminatie maar nginx `stream` met `ssl_preread` of HAProxy in
  TCP-mode. De VPS ziet dan alleen versleutelde bytes, de SNI-hostname en client-IP's. Strikt beter dan
  Cloudflare Tunnel, en het verbergt het thuis-IP even goed.

> **Beslis dit één keer, expliciet**, want de twee audits spraken elkaar hier tegen. Kies je WireGuard met
> een geforwarde poort, dan is de eis "thuis-IP moet privé blijven" al vervallen en is (a) coherent én
> €60/jaar goedkoper. Houd je die eis overeind, dan neem je de VPS èn laat je het WireGuard-endpoint via
> die VPS lopen — anders bewaak je een deur die al openstaat.

**Checkpoint:** `docker compose ps` toont `barkast-api-1` en `barkast-mongo-1` up, `ss -tulpn` toont
`:8080` niet meer, en de autodeploy-timer wijst naar het nieuwe pad.

### Fase 5 — DNS naar deSEC + Caddy

Eerst `whois` op je domein: staat het bij **Cloudflare Registrar**, dan is dit een registrar-transfer met
locks en geen simpele NS-wijziging.

NS-records omzetten naar deSEC en DNSSEC laten bootstrappen via CDS/CDNSKEY (deSEC doet
ECDSAP256SHA256 automatisch). Maak een token met een policy die alleen dit mag: `domain = <domein>`,
`subname = "_acme-challenge"`, `type = "TXT"`, `perm_write = true`, plus een default-policy die de rest
weigert. Dat is de eigenlijke winst — je huidige Cloudflare "Edit zone DNS"-token mag ook je A-, MX- en
NS-records herschrijven.

```bash
xcaddy build --with github.com/caddy-dns/desec
```

```
*.jouwdomein.nl {
    tls {
        dns desec { token {env.DESEC_TOKEN} }
    }
    @photos host photos.jouwdomein.nl
    handle @photos { reverse_proxy immich-server:2283 }
}
```

Token via een systemd `EnvironmentFile` met mode 0600, niet inline in de Caddyfile.

**Een wildcard, en geen A-records.** Certificate Transparency publiceert elke hostnaam die je laat
uitgeven; met `*.jouwdomein.nl` staat er straks één regel op crt.sh in plaats van `photos.`, `immich.` en
`api.`. DNS-01 is de enige methode die wildcards toestaat en die gebruik je toch al. Schrap tegelijk de
publieke A-records naar `192.168.1.100`: DNS-01 heeft alleen het TXT-record nodig, en publieke DNS die
naar RFC1918 wijst is een kant-en-klaar DNS-rebinding-primitief dat veel resolvers bovendien wegfilteren.

> **Volgorde-val:** doe dit pas als naamresolutie door de WireGuard-tunnel werkt (`DNS = 10.10.0.1` in de
> peer-config, met een resolver op de box). Schrap je de A-records eerder, dan is Immich vanaf je telefoon
> onbereikbaar en heb je geen weg terug.

Zet tot slot een CAA-record. Dat is de echte mitigatie tegen mis-issuance, en het sluit meteen Caddy's
stille ZeroSSL-fallback uit (ZeroSSL is sinds 2024 eigendom van HID Global, VS):

```
jouwdomein.nl. 3600 IN CAA 0 issue     "letsencrypt.org"
jouwdomein.nl. 3600 IN CAA 0 issuewild "letsencrypt.org"
jouwdomein.nl. 3600 IN CAA 0 iodef     "mailto:<jouw adres>"
```

**Checkpoint:** geldig wildcard-certificaat, bereikbaar vanaf je telefoon op 4G door de tunnel, en
`crt.sh` toont alleen nog de wildcard.

### Fase 6 — Immich, met een testsubset

```bash
mkdir -p /srv/stacks/immich && cd /srv/stacks/immich
curl -fLo docker-compose.yml https://github.com/immich-app/immich/releases/download/v3.1.0/docker-compose.yml
curl -fLo .env https://github.com/immich-app/immich/releases/download/v3.1.0/example.env
```

In `.env`: `IMMICH_VERSION=v3.1.0`, `UPLOAD_LOCATION=/srv/media/immich`,
`DB_DATA_LOCATION=/srv/appdata/immich/postgres`.

> **Belangrijk:** Immich pint **PostgreSQL 14** met VectorChord. Een tag `postgres:16-vectorchord`
> *bestaat niet* — een klassieke fout die je restore-drill laat crashen. Neem de `database`- en
> `redis`-digests altijd uit de compose van **dezelfde tag** die je pint, en bump ze samen. Nooit alleen
> `IMMICH_VERSION` ophogen.

QuickSync aanzetten: neem `hwaccel.transcoding.yml` met het `quicksync`-profiel mee en geef `/dev/dri`
door. ML op CPU laten staan.

**Drie dingen die Immich naar buiten laten praten, en die je meteen dichtzet:**

- **Kaartlaag.** Dit is de enige plek in het ontwerp waar afgeleide inhoud — de *locaties uit je
  privéfoto's* — bij een derde partij belandt. Standaard haalt Immich zijn tegels bij
  `tiles.immich.cloud`, met Cloudflare ervoor. Administration → Settings → Map & GPS: plak de
  OpenFreeMap style-URL in Light Style en Dark Style (EU, geen API-key). Helemaal dicht kan ook: een
  Europa-extract als `.pmtiles` van Protomaps, door Caddy geserveerd (`file_server` doet range requests
  native) met een eigen MapLibre-style. Kies **geen** MapTiler of Geoapify — die zetten een persoonlijke
  API-key in de style-URL en zijn qua metadata sléchter dan het anonieme origineel. De Android-app haalt
  de style-URL bij je server op, dus deze serverwijziging repareert web én mobiel in één keer.
- **Versiecheck uit**: `newVersionCheck.enabled: false`. Diun doet dat werk al.
- **ML offline**: na de eerste ML-run `HF_HUB_OFFLINE=1` op de `immich-machine-learning`-container.
  Daarna belt hij Hugging Face nooit meer. Er is nooit een foto heen gegaan — alleen modelgewichten
  kwamen binnen.

Haal de **Android-app uit GitHub Releases**, niet uit de Play Store: door het project getekend en altijd
in pas met je server. F-Droid loopt achter, en Immich eist versie-afstemming tussen app en server — een
achterlopende build kan je backup stil breken.

Begin met **5 GB testmateriaal**, niet met je hele archief. Installeer de Android-app, zet
camera-roll-backup aan, sta de **foreground service** toe en schakel batterij-optimalisatie voor de app
uit. Laat dit **twee weken** draaien voordat je verder gaat.

**Checkpoint:** upload een foto via de web-UI en vind het originele bestand terug onder
`/srv/media/immich/upload/...`. Dat je originelen zonder de app vindbaar zijn is de belangrijkste
eigenschap van deze hele opzet.

### Fase 7 — Backups en monitoring *(vóór er onvervangbare data landt)*

**Kopie 1** live op `/srv` · **Kopie 2** externe USB-schijf op `/mnt/backup` (fstab met `nofail`) ·
**Kopie 3** offsite in een versleutelde restic-repo.

```
# ~/.ssh/config -- poort 23, niet 22: poort 22 eist RFC4716-keys, 23 accepteert OpenSSH.
Host storagebox
  Hostname uXXXXXX-subY.your-storagebox.de
  Port     23
  User     uXXXXXX-subY
  IdentityFile /root/.ssh/storagebox_ed25519
```

```bash
# Offsite-repo initialiseren MET de chunker-params van de lokale repo.
# Dit kan ALLEEN bij init. Doe je het niet, dan werkt `restic copy` nooit meer.
restic -r sftp:storagebox:/restic init \
       --from-repo /mnt/backup/restic --copy-chunker-params
```

Gebruik een **subaccount** met toegang tot één directory, nooit het hoofdaccount, en zet dagelijkse
snapshots aan in de Hetzner Console. Die snapshots staan onder `/home/.zfs/snapshot` en zijn over SFTP
**niet schrijfbaar** — een aanvaller met gestolen credentials kan ze dus niet wissen. Dat is de reden
voor Hetzner boven Backblaze B2, meer nog dan de jurisdictie: restic werkt slecht samen met S3 Object
Lock, en Storage Box lost immutability op opslagniveau op. Kies **Helsinki** in plaats van Falkenstein
voor gratis geografische scheiding.

Repo-wachtwoord met `openssl rand -base64 48`, en **buiten de box bewaren** — een verloren
restic-wachtwoord is een groter reîel risico dan welke buitenlandse wet ook.

App-consistente dumps — een live database wegkopiëren levert een onbruikbare backup op:

| Stack | Procedure |
|---|---|
| Immich | `pg_dumpall --clean --if-exists -U postgres` uit de Postgres-container, dump **in dezelfde restic-snapshot** als de media zodat DB en bestanden altijd bij elkaar horen. Noteer de image-digest in een sidecar |
| Barkast | hergebruik de bestaande `deploy/backup.sh` (age-encrypted mongodump) |

Uitsluiten: `encoded-video/` en `thumbs/` — groot en regenereerbaar.

Drie dingen die de meeste self-hosters vergeten:

- **Lege-backup-guard.** `restic` geeft exit 0 op een backup van een leeg pad. Vergelijk
  `restic stats latest --mode raw-data --json` met de vorige run en faal bij >20% afwijking.
- **Stale lock.** Een reboot midden in een run laat een lock achter waarna élke volgende run faalt. Zet
  `ExecStartPre=-/usr/local/bin/restic unlock` in de unit — niet onvoorwaardelijk in het script zelf.
- **Herstelkaart.** Print op papier, bewaar op een tweede adres: repo-URL, SFTP-host, SSH-sleutel,
  repo-wachtwoord, age-sleutel, **LUKS-recovery-key**, de Immich-image-digest en de LVM-layout
  (`vgcfgbackup`). Test die kaart één keer door een bestand te herstellen met *alleen* wat erop staat.

Systemd-timer met `Persistent=true` en `RandomizedDelaySec` — precies het patroon dat
`deploy/systemd/barkast-autodeploy.timer` al gebruikt.

Monitoring, licht gehouden:

| Check | Hoe | Waarom |
|---|---|---|
| Backup gedraaid | **healthchecks.io** ping aan het eind van de job — `curl -fsS -m 10 --retry 5 https://hc-ping.com/<uuid>`, **zonder** `--data-binary` | Moet extern: een monitor op de box merkt niet dat de box dood is. Riga (Letland, EU), draait op Hetzner. Geen body meesturen, anders reizen je restic-paden mee. Alertkanaal op e-mail, niet SMS |
| **Zijn er foto's binnengekomen?** | wekelijkse timer op `/api/server/statistics`; alarm bij 7 dagen 0 | Zo faalt dit soort opzet in de praktijk. Niemand bouwt deze check, iedereen heeft hem nodig |
| Schijfruimte | alarm op 80% | |
| NVMe-slijtage | `nvme smart-log` → `percentage_used` | QLC met constante schrijfbelasting |
| Nieuwe images | **Diun** notify-only | Je wilt wéten dat er een update is, niet dat hij vannacht al draaide |

**Checkpoint:** een geslaagde restore-drill in een wegwerpstack, met DB en media als gepaard geheel, en
een foto uit het resultaat geopend. Datum noteren. Trek daarna één keer bewust de stekker uit de
backup-job en bevestig dat healthchecks.io klaagt.

### Fase 8 — Google Photos migreren

1. Takeout → **alleen** Google Photos → archieven van 10 GB.
2. `immich-go` v0.32.0 (`immich-go_Linux_x86_64.tar.gz`); controleer het exacte subcommando met
   `immich-go upload --help` — de CLI is tussen versies gewijzigd.
3. Vergelijk aantallen: items in Takeout versus assets in Immich. Niet op gevoel.

**Checkpoint:** aantallen verzoend, en een backup-run ná de import geslaagd.

### Fase 9 — Beslismoment: heb je Nextcloud nodig?

Na twee weken Immich: kijk terug op wat je van je Drive écht gebruikt hebt.

| Als het vooral is… | Dan | Kosten |
|---|---|---|
| "mijn bestanden overal kunnen bereiken" | **Syncthing** + een SMB-share | ~100 MB RAM, vrijwel geen onderhoud |
| "delen via links, web-toegang, en ook weg bij Google Agenda/Contacten" | **Nextcloud** `34-apache` + `postgres:17-alpine` + `redis:7-alpine` | ~800 MB RAM, plus upgrade-discipline |

Kies je Nextcloud: **niet AIO** — die heeft de echte Docker-socket nodig en kan daarmee je
Barkast-containers stoppen en verwijderen. Zet `trusted_proxies` op het `/32` van je Caddy-container,
niet op een heel subnet. En let op: Compose doet **geen** command substitution, dus
`DB_PASSWORD=$(openssl rand -hex 32)` in een `.env` levert letterlijk die tekst op als wachtwoord —
genereer secrets in een root-shell en schrijf de uitkomst weg.

### Fase 10 — Drive migreren

```bash
rclone config                          # Google Drive remote, scope drive.readonly
rclone size gdrive: --drive-skip-gdocs
rclone dedupe --dedupe-mode list gdrive:      # Drive staat dubbele bestandsnamen in één map toe;
                                              # rclone pakt er stilletjes één en logt dat op INFO
rclone copy gdrive: <doelpad> --drive-export-formats docx,xlsx,pptx --progress
rclone check gdrive: <doelpad> --drive-skip-gdocs
```

Bij Nextcloud daarna `occ files:scan`, en `occ files:sanitize-filenames` vóór je eerste desktop-sync —
Drive laat tekens toe die de Windows-client stilzwijgend weigert.

### Fase 11 — Google-cutover

De Google-kopie mag pas weg als **alle vijf** waar zijn. Niet vier.

1. Aantallen verzoend (Photos en Drive apart).
2. `rclone check` schoon.
3. Eerste offsite-seed compleet.
4. **Eén end-to-end restore-drill geslaagd en gedateerd.**
5. 60 dagen dubbel gedraaid zonder gaten in de tijdlijn.

Tot die tijd is Google je backup. Dat is de goedkoopste verzekering die je koopt.

---

## Wat het kost

| | |
|---|---|
| Eenmalig | 2 TB SATA-SSD ≈ €100 · externe USB-schijf 2 TB ≈ €65–80 · ethernetkabel ≈ €5 · domein ≈ €10/jaar (had je toch al nodig) |
| Per maand | Hetzner Storage Box BX11 ≈ €3,87 incl. btw · stroom ≈ €4–5 (20 W continu bij ~€0,30/kWh) · deSEC €0 · WireGuard €0 · healthchecks.io €0 |
| Optioneel | EU-VPS als vervanger van de Cloudflare Tunnel ≈ €60/jaar |
| Uren | 8–12 uur opbouw, daarna 1–2 uur per maand |

**De prijs van soevereiniteit, apart uitgerekend.** De backupwissel van Backblaze B2 naar Hetzner kost
ongeveer **€32 per jaar** — B2 zou bij deze omvang rond €0,54/mnd liggen. Vanaf circa 460 GB draait dat
om en is Hetzner absoluut goedkoper, met onbeperkte egress zodat een volledige restore niets kost. De
DNS-wissel naar deSEC kost **niets**. De VPN-wissel kost **niets en bespaart complexiteit**: er verdwijnt
een daemon, een account en een subnet-routeringslaag. Kaartlaag, Nextcloud-config en Ubuntu-phone-homes
kosten samen **€0**. De enige structurele post is de eventuele VPS. Totaal kom je op ongeveer **€46 per
jaar** extra als je `api.<domein>` zelf publiceert, of **€90–108 per jaar** met de VPS erbij.

Eén functionele regressie is echt: op netwerken die uitgaand UDP blokkeren (sommige bedrijfs- en
hotelnetwerken) komt kale WireGuard er niet in, waar Tailscale's DERP-fallback over 443/TCP stil
doorkwam. Zeldzaam bij normaal 4G- en thuisgebruik, maar niet nul.

**Eerlijk:** Google One 100 GB kost €1,99 per maand. Je bent met stroom alleen al duurder uit. De reden
om dit te doen is zeggenschap over je eigen data, EU-jurisdictie en betere functionaliteit — niet geld.
Dat is een prima reden, maar reken jezelf niet rijk.

**Wat er kapot gaat:** Immich breaking changes (het project beweegt hard — lees élke release note),
Nextcloud major-upgrades als je daarvoor kiest (nooit een versie overslaan, altijd snapshot vooraf), de
QLC-NVMe die slijt, en de laptopaccu die opzwelt als je geen laadlimiet zet.

---

## Nog open

| Vraag | Wat het antwoord verandert |
|---|---|
| Zit er fysiek een 2,5"-bay in? | Zo nee: terugvaloptie A (geen versleuteling, mappen op root) of een tweede M.2 |
| Heb je al een eigen domein? | Zo nee: gratis `<naam>.dedyn.io` bij deSEC, met dezelfde Caddy-module en gewoon Let's Encrypt. Kost niets en blijft binnen de EU |
| Wil je ook weg bij Google Agenda en Contacten? | Zo ja, dan is de keuze in fase 9 al gemaakt: Nextcloud |
| TPM-unlock met of zonder pincode? | Zonder = geen handwerk bij reboot, maar een gestolen wérkende laptop is open. Met = pincode bij elke reboot |
| **Moet je thuis-IP privé blijven, ja of nee?** | Beslis dit één keer. Nee → WireGuard met geforwarde poort en `api.<domein>` direct publiceren; scheelt €60/jaar. Ja → EU-VPS als forwarder èn het WireGuard-endpoint daarlangs |
| Bij welke registrar staat het domein? | `whois` draaien vóór fase 5. Cloudflare Registrar betekent een transfer met locks, geen NS-wijziging |
| Wil je de bestaande Tailscale-metadata laten wissen? | Opzeggen stopt de aanwas; wat er ligt blijft. Tailnet verwijderen in de admin console, eventueel een AVG art. 17-verzoek |

---

## Verificatie

Elke fase heeft een checkpoint. De drie die er echt toe doen:

1. **Remote-access-test (fase 1):** telefoon op 4G, wifi uit, box bereikbaar. Werkt dit niet, dan heeft
   de rest geen zin.
2. **Reboot-test na LUKS (fase 3):** `/srv` moet vanzelf terugkomen zonder wachtwoord. Test dit
   meteen, niet als je er data op hebt staan.
3. **Restore-drill (fase 7, vóór de cutover):** laatste snapshot terug in een wegwerpstack, DB en media
   als gepaard geheel, en een foto uit het resultaat geopend. Een backup die je nooit hebt teruggezet is
   geen backup.
