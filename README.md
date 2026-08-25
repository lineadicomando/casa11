# dodicisegni

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
npm run ephe:download -w @dodicisegni/core   # opzionale, ~2 MB
npm run geo:import   -w @dodicisegni/geo     # ricerca località, ~215 MB
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
npm run dev -w @dodicisegni/web      # http://localhost:5173
npm run build && npm start -w @dodicisegni/web   # http://localhost:3000
```

Si installa come applicazione — manifesto, icone e un service worker che tiene
il guscio sul dispositivo — e senza collegamento si apre e si sfoglia. Non
calcola: il motore sta sul server, e a rete assente l'interfaccia lo dice
invece di far finta. Nessuna notifica, né la richiesta di poterne mandare. Il
service worker si registra solo sulla build, e non dentro Electron: il perché è
in `apps/web/src/routes/+layout.svelte`.

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
npm start -w @dodicisegni/desktop        # sviluppo
npm run dist -w @dodicisegni/desktop     # AppImage in apps/desktop/release/
npm run dist:win -w @dodicisegni/desktop # installer Windows
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

## Prima di mettere in rete

Tre cose che il codice non può indovinare da solo, e che una copia pubblicata
deve sistemare.

**`ORIGIN`.** `adapter-node` ricava l'indirizzo pubblico dagli header della
richiesta, e dietro un reverse proxy quella deduzione sbaglia lo schema: il
proxy parla `http` col server anche quando parla `https` col mondo. Ogni
`<link rel="canonical">` e ogni `og:url` del sito uscirebbe con l'indirizzo
sbagliato, che è il modo più silenzioso di dividere in due un sito agli occhi
di un motore di ricerca. Si dichiara una volta:

```sh
ORIGIN=https://esempio.it node apps/web/build/index.js
```

Con Docker sta in `.env`; in sviluppo e dentro Electron non serve — là
l'indirizzo è quello del loopback e il sito non è indicizzato da nessuno.

**`REPOSITORY_URL`** in `apps/web/src/lib/project.ts` va cambiato con
l'indirizzo del **proprio** sorgente. L'AGPL, articolo 13, obbliga a offrirlo a
chi usa il programma attraverso la rete, e l'obbligo riguarda il codice che sta
girando: puntare al repository di qualcun altro non lo assolve. Lo stesso
indirizzo è il recapito che l'informativa privacy indica.

**La rotazione dei log.** L'informativa dichiara che i log tecnici del server si
conservano sette giorni. È una dichiarazione, non una configurazione: la rende
vera il server che sta davanti all'applicazione, e finché non lo si configura
l'informativa dice il falso.

## Sviluppo

```sh
npm test                                  # tutti i workspace
npm run test:watch -w @dodicisegni/core
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

Questo sito è uno spazio dedicato alla ricerca interiore e all'arricchimento
personale e in nessun caso sostituisce il parere di professionisti per questioni
mediche, legali, finanziarie o altro.
