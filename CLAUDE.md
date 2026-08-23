# undicesimacasa

Calcolo di temi natali: un **motore puro** (`packages/core`) e **adattatori** che
lo espongono su superfici diverse. Il `README.md` tiene la descrizione, la
licenza e i comandi; qui c'è ciò che serve sapere prima di toccare qualsiasi
cosa. Il progetto è agli inizi e **non ha una documentazione estesa**: i
parametri si leggono nei commenti delle rotte e nelle descrizioni dei tool MCP,
che sono la fonte.

## Mappa

| | |
|---|---|
| `packages/core` | motore di calcolo e CLI `casa11`. Nessuna dipendenza da HTTP, framework o MCP |
| `packages/geo` | ricerca località su dataset GeoNames locale (SQLite) |
| `packages/ruota` | il disegno: geometria, glifi, colori, SVG e PNG. Non dipende da `core` |
| `packages/lettura` | il tema più le istruzioni per leggerlo, in un testo solo. Un documento per sistema astrologico. Riceve una tabella già impaginata: non dipende da `core`, nemmeno dai tipi |
| `packages/mcp` | server MCP: nove tool e un prompt di lettura, trasporto stdio |
| `apps/web` | SvelteKit: interfaccia + API REST, tutti gli endpoint in GET |
| `apps/desktop` | Electron: la web app in una finestra. Avvia il server di `web` compilato, non duplica superfici |

Monorepo npm workspaces, Node ≥ 22, ESM, TypeScript.

## Comandi

```sh
npm test                                   # tutti i workspace (vitest)
npm run test:watch -w @undicesimacasa/core
npm run typecheck                          # ricompila core e geo, poi controlla il resto
npm run build
npm run dev -w @undicesimacasa/web         # http://localhost:5173 (Vite)
npm start -w @undicesimacasa/web           # http://localhost:3000, dopo build
npm run dist -w @undicesimacasa/desktop    # AppImage in apps/desktop/release, dopo build
```

`npm run geo:import -w @undicesimacasa/geo` scarica **~215 MB**: serve solo se
la ricerca delle località non funziona, non va lanciato per abitudine.
`npm run ephe:download -w @undicesimacasa/core` (~2 MB) è opzionale — senza,
il motore usa Moshier invece delle effemeridi Swiss.

## Vincoli

- **Licenza AGPL-3.0-or-later**, imposta da Swiss Ephemeris. Ogni nuova
  dipendenza deve esserle compatibile.
- **Il motore non interpreta: emette predicati verificabili.** Un dato è
  un'affermazione che chiunque può ricalcolare dagli stessi input seguendo la
  convenzione che il motore dichiara — `Distribution` porta `counted` perché chi
  conta diversamente rifaccia la somma, la Parte di Fortuna nomina la formula, il
  tema porta il sistema di case. Che cosa significhi non lo dice mai: la riga sta
  per esteso nel commento a `VoidOfCourse` in `types.ts`. Il confine è il
  significato, non l'ampiezza — un conteggio su tutto il tema si può fare,
  «Saturno in settima ritarda il matrimonio» no. Dove le scuole divergono si
  espongono i componenti e si nomina la scuola, mai un totale solo.
- **Il client non importa valori da `@undicesimacasa/core`, solo tipi.** Un
  import di valore trascina effemeridi e modulo nativo nel bundle del browser.
- **Niente `async`/`await` nella catena di calcolo** — `chart`, `sky`,
  `transits`, `passages`, `election`, `sky-events`. Swiss Ephemeris tiene lo
  zodiaco siderale in **stato globale del modulo nativo**: `set_sid_mode` vale
  per il processo, non per la chiamata. Oggi è sicuro perché fra l'impostazione
  e l'ultima `calc_ut` l'event loop non gira; il primo `await` lì dentro apre
  una corsa fra richieste concorrenti con ayanamsa diversi, e il risultato non
  è un errore ma un tema sbagliato di ventiquattro gradi. Per la stessa ragione
  `zodiacContext` restituisce una **copia** del contesto invece di scrivere sui
  flag di quello che `initEphemeris` tiene in cache.
- **Il fallimento è parziale**: un corpo non calcolabile produce un avviso, non
  un errore; l'ora ignota produce una carta senza case, non un rifiuto. Gli
  errori di dominio sono `ChartError` con un `code` mappabile su HTTP.
- Le tabelle Svelte prendono **i dati, non il tema**: legarle a `NatalChart`
  le rende inutilizzabili per i transiti.
- **`packages/ruota` non importa da `core`, nemmeno i tipi**: li ridichiara in
  `types.ts`, e `test/tipi.test.ts` verifica che combacino. Serve a rompere il
  ciclo con la CLI, che vive in `core` e disegna. Il disegno riceve una carta
  già calcolata e non deve poterne calcolare una.
- **Il PNG sta in `@undicesimacasa/ruota/png`**, punto d'ingresso separato:
  porta un modulo nativo, e nel browser non deve arrivare. Lato web si importa
  solo da `lib/server`.
- **`packages/lettura` non prende dipendenze, e soprattutto non prende `core`.**
  Riceve il tema come stringa già impaginata da `format.ts`. Il pulsante che lo
  copia negli appunti gira nel browser: un import di `core` da qui trascinerebbe
  le effemeridi nel bundle per la via traversa che il vincolo sul client
  chiudeva dalla porta principale. I documenti di lettura sono uno per sistema
  astrologico, non uno parametrizzato — vedi `src/lettura.ts`.
- **Un disegno non sostituisce i dati**: non porta le avvertenze del calcolo.
  Le superfici lo dicono a chi le usa, e le descrizioni MCP pure.

## Stile

Messaggi di commit **in italiano, indicativo presente terza persona**, che
dicono cosa fa il codice e non cosa è stato fatto. Nessun prefisso tipo
`feat:`. Esempi reali: «Trova gli ingressi nei segni e le stazioni», «Espone i
transiti su /api/transits», «Accorpa l'asse dei Nodi nell'elenco degli aspetti».

Commenti e identificatori di dominio in italiano dove il dominio è italiano
(`incontri`, `ingressi`, `stazioni`, i `code` degli errori); il resto in inglese.

**I termini dell'astrologia indiana restano in sanscrito e non si traducono**:
`nakshatra`, `tithi`, `karana`, `yoga`, `dasha`, `varga`, `drishti`, `pada`. La
regola di sopra dice «nella lingua del dominio», e qui il dominio è quello —
come `yoga` e `karma`, che in italiano si dicono così. Tradurli produrrebbe
parole che nessun libro usa e che non si possono cercare da nessuna parte:
«dimore lunari» per i nakshatra è una perifrasi, non un nome. La prosa dei
commenti resta italiana, e la prima volta che un termine compare lo si spiega
in mezza riga.

## Aggiungere una funzione

Attraversa più superfici e ha una procedura sua: vedi la skill `nuova-funzione`.
