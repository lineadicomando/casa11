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
| `packages/ruota` | il disegno: la ruota e il quadro vedico, geometria, glifi, colori, SVG e PNG |
| `packages/lettura` | il tema più le istruzioni per leggerlo, in un testo solo: un documento per sistema astrologico |
| `packages/mcp` | server MCP: dieci tool e un prompt di lettura, trasporto stdio |
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

**Applicazione web.** Cinque sezioni e undici endpoint, tutti in GET perché un
tema è una funzione pura dei suoi parametri:

```sh
npm run dev -w @undicesimacasa/web      # http://localhost:5173
npm run build && npm start -w @undicesimacasa/web   # http://localhost:3000
```

**Server MCP.** Dieci tool su stdio: non è un servizio da avviare, è un processo
che il client lancia. Accanto ai tool c'è il prompt `lettura_del_tema`, che
consegna il tema insieme alle istruzioni per interpretarlo — un prompt e non un
tool perché lo sceglie chi usa il client, non il modello.

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

## L'interpretazione

Il motore non interpreta, ed è un vincolo, non una funzione mancante. Quello che
produce sono **predicati verificabili**: affermazioni che chiunque può
ricalcolare dagli stessi dati di partenza, seguendo la convenzione che il motore
dichiara accanto al risultato. Dove le scuole divergono — la formula della Parte
di Fortuna, che cosa entri in un conteggio — espone i componenti e nomina la
convenzione, invece di sceglierne una in silenzio e presentarne l'esito come un
fatto. Che cosa significhino, quei dati, non lo dice mai.

Sotto il tema calcolato, l'interfaccia offre un pulsante che copia negli appunti
un **prompt già pronto** — il tema in forma di tabella più le istruzioni per
leggerlo — da incollare nell'assistente che si preferisce. Il sito non parla con
nessun modello e non manda niente a nessuno.

Quel prompt è il riferimento unico per la lettura, e vive in
`packages/lettura` — un pacchetto a sé perché non lo vuole solo il sito: la
riga di comando lo stampa e il server MCP lo offre agli agenti.

I documenti sono **uno per sistema astrologico**, non uno parametrizzato. Un
tema vedico ha un altro centro — la Luna e il lagna, non il Sole — altri
domicili, aspetti che non sono orbite e un impianto temporale che in occidente
non ha corrispettivo: le istruzioni tropicali applicate a quei dati non danno
un errore, danno un ibrido plausibile.

Il calcolo è astronomico e verificabile; l'interpretazione è un linguaggio
simbolico, offerta come spunto di riflessione e intrattenimento. Non sostituisce
il parere di un professionista in materia medica, psicologica, legale o
finanziaria.
