# undicesimacasa

Generazione di temi natali: motore di calcolo astronomico, API REST e server MCP.

Il progetto è diviso in un **motore puro** e in **adattatori** che lo espongono
su superfici diverse — un'interfaccia web per le persone, un server MCP per gli
agenti. Il calcolo è deterministico e non contiene interpretazioni: quelle
restano a carico del consumatore.

## Licenza

**AGPL-3.0-or-later.** Il progetto usa [Swiss Ephemeris](https://www.astro.com/swisseph/),
distribuita da Astrodienst con doppia licenza AGPL / commerciale. Usando la via
AGPL, l'intera applicazione deve essere rilasciata sotto la stessa licenza: chi
utilizza il servizio via rete ha diritto al codice sorgente. Per un uso a
sorgente chiuso serve la licenza commerciale Astrodienst.

## Struttura

```
undicesimacasa/
├── packages/
│   ├── core/          motore di calcolo (nessuna dipendenza web)
│   ├── geo/           ricerca località, dataset GeoNames locale
│   └── mcp/           server MCP: search_location + compute_natal_chart
└── apps/
    └── web/           SvelteKit: interfaccia + API REST
```

Monorepo con **npm workspaces**. Node ≥ 22.

## Avvio rapido

```sh
npm install
npm run ephe:download -w @undicesimacasa/core   # opzionale, ~2 MB
npm run geo:import   -w @undicesimacasa/geo     # necessario per la ricerca località, ~205 MB
npm test
```

La CLI si chiama `casa11` — nome corto perché è l'unica cosa che si digita
a ogni invocazione:

```sh
npm run build
npx casa11 --date 1968-03-12 --time 14:30 \
  --lat 40.8518 --lon 14.2681 --tz Europe/Rome
```

```
TEMA NATALE — 1968-03-12 14:30 (Europe/Rome, UTC+01:00) — 40.8518N 14.2681E
Case: placidus | Effemeridi: swisseph | UT: 1968-03-12T13:30:00Z

CORPI
Sole        22°03' Pes    casa  8
Luna        22°53' Leo    casa  1
...
```

Aggiungi `--json` per l'oggetto completo, `--help` per tutte le opzioni.

## Le due modalità di effemeridi

| Modalità | File richiesti | Precisione | Chirone |
|---|---|---|---|
| `swisseph` | `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` (~2 MB) | secondo d'arco | sì |
| `moshier` | nessuno | ~0,4 secondi d'arco sui pianeti principali | no |

Il motore **rileva automaticamente** i file e ripiega su Moshier se assenti,
segnalandolo in `warnings`. Il progetto è quindi utilizzabile subito dopo
`npm install`, senza scaricare nulla. Lo scarto fra le due modalità è verificato
dai test: sotto i 5 secondi d'arco, cioè irrilevante in astrologia.

I file `.se1` **non sono versionati** (dati binari ridistribuibili): li scarica
`packages/core/scripts/download-ephe.mjs` dal repository ufficiale Swiss Ephemeris.

## Uso come libreria

```ts
import { computeNatalChart, formatChartCompact } from '@undicesimacasa/core';

const chart = computeNatalChart({
  date: '1968-03-12',
  time: '14:30',          // se omessa: nessuna casa, nessun asse
  latitude: 40.8518,      // positiva a Nord
  longitude: 14.2681,     // positiva a Est
  timezone: 'Europe/Rome',
}, {
  houseSystem: 'placidus',
  minorAspects: false,
});

chart.bodies;    // posizioni, segno, casa, retrogradazione, velocità
chart.houses;    // 12 cuspidi
chart.angles;    // ASC, MC, DSC, IC, Vertex
chart.aspects;   // matrice degli aspetti con orbita e direzione
chart.partOfFortune;  // ASC + Luna − Sole, invertita nei temi notturni
chart.sect;           // 'diurna' | 'notturna'
chart.siderealTime;   // tempo siderale locale, { hours, formatted }
chart.warnings;  // ora ambigua, effemeridi ripiegate, corpi mancanti

formatChartCompact(chart);  // resa tabellare, ~1/8 dei token del JSON
```

Sistemi di case: `placidus`, `koch`, `segni-interi`, `equale`, `regiomontano`,
`campano`, `porfirio`, `topocentrico`, `alcabizio`.

## Le località

Il dataset GeoNames è importato in un database SQLite locale: 235.073 località,
1,2 milioni di nomi cercabili, nessuna chiamata di rete a runtime. Il fuso
orario IANA arriva dal dataset stesso, quindi una ricerca restituisce già tutto
ciò che serve al calcolo.

**I nomi sono in italiano.** GeoNames usa come nome primario l'esonimo
internazionale — "Rome", "Munich", "Naples" — inadatto a un'interfaccia
italiana. L'importazione preleva le varianti italiane da `alternateNames.zip`
e le applica a città, regioni e paesi:

| Prima | Dopo |
|---|---|
| Rome, Lazio, Italy | Roma, Lazio, Italia |
| Munich, Bavaria, Germany | Monaco di Baviera, Baviera, Germania |
| London, England, United Kingdom | Londra, Inghilterra, Regno Unito |

Circa il 9% delle località ha un esonimo italiano: le altre ricadono sul nome
locale, che è il comportamento giusto (Bergamo resta Bergamo). Paesi tradotti
246 su 246, regioni 2.201 su 3.703.

La **ricerca** resta indipendente dalla lingua: si può digitare "Munich" e
ricevere "Monaco di Baviera", o viceversa. Chi preferisce i nomi
internazionali passa `lang: 'en'`:

```ts
searchLocations('roma', { lang: 'en' });  // → Rome, Lazio, Italy
```

Il file `alternateNames.zip` pesa 200 MB e decompresso supera i 700 MB: viene
letto in streaming e filtrato alla sola lingua italiana, mai caricato in
memoria. L'importazione completa richiede meno di un minuto.

## Accuratezza

Il motore è confrontato con **Astro-Seek** su un tema reale (Palermo, 2 giugno
1978, 15:15 CEST), e il confronto è un test della suite — non una verifica
fatta una volta e dimenticata:

| | Scarto dal riferimento |
|---|---|
| Posizioni planetarie | ≤ 1 primo d'arco, segno e casa compresi |
| Cuspidi delle case | ≤ 1 primo d'arco, a parità di coordinate |
| Tempo Universale | esatto (ora legale del 1978 applicata) |
| Tempo siderale locale | 1 secondo |
| Parte di Fortuna | esatta |

Un primo d'arco è sotto la soglia in cui qualcosa cambia: nessuna orbita,
cuspide o interpretazione ne risente.

**Le case dipendono dalle coordinate.** Due programmi che partono da punti
diversi della stessa città danno cuspidi diverse: il centroide GeoNames di
Palermo dista un chilometro e mezzo da quello usato dalla fonte, e da solo
produce 2-3 primi di scarto. Il test usa le coordinate dichiarate dalla fonte,
altrimenti misurerebbe la differenza fra due centroidi invece della
correttezza del calcolo.

**Parte di Fortuna.** La formula si inverte nei temi notturni, secondo la
tradizione ellenistica e medievale. Parte dei programmi moderni usa sempre la
forma diurna: su un tema notturno le due convenzioni divergono anche di oltre
cento gradi. Per riprodurre il risultato di un altro programma:

```ts
computeNatalChart(nascita, { partOfFortuneFormula: 'diurna' });
```

## Il punto delicato: i fusi orari

Un errore di un'ora nella conversione sposta l'Ascendente di circa 15 gradi,
cioè mezzo segno. Il motore usa il database tzdata **storico** via Luxon, quindi
gestisce correttamente l'ora legale di guerra, i tempi medi locali pre-1893 e i
cambi di fuso. I casi limite sono coperti da test e segnalati in `warnings`:

- ora **inesistente** (salto in avanti per l'ora legale) → si usa l'istante successivo
- ora **ambigua** (ritorno all'ora solare, l'orario ricorre due volte) → si usa la prima occorrenza
- ora **ignota** → carta calcolata a mezzogiorno locale, senza case né assi

La conversione a giorno giuliano è implementata direttamente (algoritmo di
Meeus) invece che delegata al modulo nativo, così da restare testabile in
isolamento.

## Progettato per essere consumato da agenti

L'obiettivo dichiarato del progetto è esporre il calcolo anche via **MCP**.
Alcune scelte del motore vengono da lì:

- **calcolo e interpretazione sono separati** — l'API restituisce solo dati verificabili
- **il fallimento è parziale, non totale** — un corpo non calcolabile produce un
  avviso, non un errore; l'ora ignota produce una carta senza case anziché un rifiuto
- **`formatChartCompact`** esiste per non bruciare migliaia di token di contesto
- **gli errori hanno un `code`** (`ChartError`) mappabile su una risposta API

## Applicazione web

```sh
npm run build
npm start -w @undicesimacasa/web        # http://localhost:3000
npm run dev -w @undicesimacasa/web      # sviluppo
```

Due endpoint, entrambi in GET perché un tema natale è una funzione pura dei
suoi parametri: l'URL è condivisibile e la risposta memorizzabile.

```
GET /api/locations?q=napoli&limit=8&country=IT
GET /api/chart?date=1968-03-12&time=14:30&locationId=3172394
GET /api/chart?date=1968-03-12&latitude=40.85&longitude=14.27&timezone=Europe/Rome
```

Gli errori riportano il `code` del dominio (`FUSO_ORARIO_NON_VALIDO`,
`LUOGO_MANCANTE`, …) con lo status appropriato: 400 per l'input, 404 per una
località inesistente, 503 se il database delle località non è stato importato.

**Il bundle del browser non contiene il motore di calcolo.** Il codice client
importa da `@undicesimacasa/core` solo *tipi*, mai valori: un singolo import di
valore ne trascinerebbe l'intero grafo — effemeridi e modulo nativo compresi —
dentro il JavaScript scaricato dall'utente.

### Docker

```sh
docker build -t undicesimacasa .
docker run -p 3000:3000 -v ./packages/geo/data:/data:ro undicesimacasa
```

Le effemeridi stanno nell'immagine; il dataset delle località si monta come
volume, così l'immagine resta leggera e il dataset si aggiorna senza
ricostruirla.

## Server MCP

Espone il calcolo agli agenti. Trasporto stdio:

```json
{
  "mcpServers": {
    "undicesimacasa": {
      "command": "node",
      "args": ["/percorso/undicesimacasa/packages/mcp/dist/stdio.js"]
    }
  }
}
```

Una volta pubblicato su npm, il binario `undicesimacasa-mcp` renderà superfluo
il percorso assoluto.

Due tool, deliberatamente separati:

| Tool | Cosa fa |
|---|---|
| `search_location` | nome → candidati con `location_id`, coordinate, fuso IANA |
| `compute_natal_chart` | `location_id` (o coordinate) + data/ora locale → tema |

La separazione è il punto: `compute_natal_chart` non fa geocoding. Un tool
unico dovrebbe scegliere in silenzio fra le decine di "Roma" del mondo, e uno
sbaglio lì produce un tema plausibile e sbagliato. Così la disambiguazione
resta una decisione esplicita, e `location_id` evita che l'agente ricopi a mano
tre valori numerici.

Il parametro `format` vale `compact` (default, tabella densa) o `json`.
Le risorse `undicesimacasa://riferimento/aspetti` e `.../sistemi-case` contengono
il materiale di riferimento, caricato solo quando serve.

Variabili d'ambiente: `GEONAMES_DB_PATH`, `SE_EPHE_PATH`.

## Sviluppo

```sh
npm test                                  # tutti i workspace
npm run test:watch -w @undicesimacasa/core
npm run typecheck
npm run build
```
