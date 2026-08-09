# undicesimacasa

Generazione di temi natali: motore di calcolo astronomico, API REST e server MCP.

Il progetto è diviso in un **motore puro** e in **adattatori** che lo espongono
su superfici diverse — un'interfaccia web per le persone, una riga di comando,
un server MCP per gli agenti. Il calcolo è deterministico e **non contiene
interpretazioni**: quelle restano a carico di chi consuma i dati.

## Licenza

**AGPL-3.0-or-later.** Il progetto usa [Swiss Ephemeris](https://www.astro.com/swisseph/),
distribuita da Astrodienst con doppia licenza AGPL / commerciale. Usando la via
AGPL, l'intera applicazione deve essere rilasciata sotto la stessa licenza: chi
utilizza il servizio via rete ha diritto al codice sorgente. Per un uso a
sorgente chiuso serve la licenza commerciale Astrodienst.

I dati delle località vengono da [GeoNames](https://www.geonames.org/), CC BY 4.0.

## Struttura

Monorepo npm workspaces, Node ≥ 22, ESM, TypeScript.

| | |
|---|---|
| `packages/core` | motore di calcolo e CLI `casa11`. Nessuna dipendenza da HTTP, framework o MCP |
| `packages/geo` | ricerca località su dataset GeoNames locale (SQLite) |
| `packages/ruota` | il disegno: geometria, glifi, colori, SVG e PNG |
| `packages/mcp` | server MCP: otto tool, trasporto stdio |
| `apps/web` | SvelteKit: interfaccia e API REST, tutti gli endpoint in GET |
| `apps/desktop` | Electron: la web app in una finestra |

## Avvio rapido

```sh
npm install
npm run ephe:download -w @undicesimacasa/core   # opzionale, ~2 MB
npm run geo:import   -w @undicesimacasa/geo     # ricerca località, ~215 MB
npm test
```

Le effemeridi sono facoltative: senza i file `.se1` il motore ripiega su
Moshier — ~0,4 secondi d'arco sui pianeti principali, niente Chirone — e lo
dichiara in `warnings`.

## Le superfici

**Riga di comando.** Dopo `npm run build`:

```sh
npx casa11 --date 1968-03-12 --time 14:30 \
  --lat 40.8518 --lon 14.2681 --tz Europe/Rome
npx casa11 --help        # tutte le opzioni
```

**Applicazione web.** Nove endpoint, tutti in GET perché un tema è una funzione
pura dei suoi parametri:

```sh
npm run dev -w @undicesimacasa/web      # http://localhost:5173
npm run build && npm start -w @undicesimacasa/web   # http://localhost:3000
```

**Server MCP.** Otto tool su stdio: non è un servizio da avviare, è un processo
che il client lancia.

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

**Applicazione desktop.** La web app in una finestra Electron, senza duplicare
niente: il processo principale avvia il server già compilato su una porta del
loopback.

```sh
npm run build
npm start -w @undicesimacasa/desktop        # sviluppo
npm run dist -w @undicesimacasa/desktop     # AppImage in apps/desktop/release/
npm run dist:win -w @undicesimacasa/desktop # installer Windows
```

## Docker

Un'unica immagine per tutte le superfici; l'orchestrazione sta in
`compose.yaml`.

```sh
docker compose --profile setup run --rm geo-import   # una tantum, ~215 MB
docker compose up -d                                 # localhost:3000
docker compose --profile dev up dev                  # Vite, :5173
docker compose --profile mcp run --rm -T mcp         # server MCP su stdio
```

Dove viva il dataset lo decide `GEONAMES_DATA` in `.env` — vedi
`.env.example`: un nome è un volume Docker, un percorso che inizi per `.` o `/`
è un bind mount.

## Sviluppo

```sh
npm test                                  # tutti i workspace
npm run test:watch -w @undicesimacasa/core
npm run typecheck
npm run build
```

## Prima di mettere in rete

Tre cose che non dipendono dal codice ma dalla messa in opera, e senza le quali
l'informativa pubblicata su `/privacy` dice il falso:

- **Valorizzare `REPOSITORY_URL`** in `apps/web/src/lib/project.ts`. L'AGPL,
  articolo 13, obbliga a offrire il sorgente a chi usa il programma via rete, ed
  è lo stesso indirizzo indicato come recapito nell'informativa.
- **Togliere la query string dai log.** I parametri di nascita viaggiano
  nell'indirizzo: il formato `combined` di nginx li registra accanto all'IP.
  Serve un formato che usi `$uri` al posto di `$request` — con Caddy, il filtro
  `query` sui campi `date`, `time`, `latitude`, `longitude`, `locationId`.
- **Rendere vera la ritenzione dichiarata.** Sette giorni, da `RITENZIONE_LOG`
  in `apps/web/src/routes/(informativa)/privacy/+page.svelte`: va reso vero con
  la rotazione, e i due numeri vanno cambiati insieme.

## L'interpretazione

Il motore non interpreta, ed è un vincolo, non una funzione mancante. Sotto il
tema calcolato, l'interfaccia offre un pulsante che copia negli appunti un
**prompt già pronto** — il tema in forma di tabella più le istruzioni per
leggerlo — da incollare nell'assistente che si preferisce. Il sito non parla con
nessun modello e non manda niente a nessuno.

Quel prompt è il riferimento unico per la lettura, e vive in
`apps/web/src/lib/lettura.ts`.
