# Cosa manca

Lavoro aperto e rimandato di proposito, con dentro quello che serve per
riprenderlo senza rifare l'indagine che l'ha trovato. Non è un elenco di idee:
ogni voce è una cosa nota, con il file, la riga e il modo di verificarla.

In fondo c'è una lista che non è lavoro — roba esaminata e lasciata stare, per
non ritrovarla una seconda volta e ricominciare da capo.

## 1. Il guardiano della navigazione nell'app desktop

**Da fare per primo, e comunque, indipendentemente dal punto 2.**

`creaFinestra` in `apps/desktop/src/main.ts` installa `setWindowOpenHandler`:
nega ogni `window.open` e gira gli `http(s)` al browser di sistema. Copre una
strada sola. La navigazione di primo livello non passa di lì, e i link esterni
dell'interfaccia non hanno `target="_blank"`:

- `apps/web/src/routes/+layout.svelte`, righe 44-45 — `astro.com`, `geonames.org`
- `apps/web/src/routes/(informativa)/privacy/+page.svelte`, riga 254 — `garanteprivacy.it`

In un browser è il comportamento giusto. Dentro Electron, cliccarne uno porta la
finestra fuori da localhost e carica un sito remoto nel Chromium impacchettato.
Il danno è doppio: contenuto di terzi dentro un motore che non si aggiorna con
la stessa fretta di un browser, e — con `autoHideMenuBar: true` e nessun comando
di navigazione nella finestra — nessun modo di tornare indietro se non
riavviando l'applicazione.

Il rimedio è un gestore di `will-navigate` sul `webContents` della finestra, che
confronta l'origine della destinazione con quella del server interno e, se
differisce, annulla e passa a `shell.openExternal`. **L'origine, non l'URL**: il
server interno sta su una porta libera del loopback, sorteggiata a ogni avvio,
e `serverUrl` cambia da una sessione all'altra.

Vale la pena decidere nello stesso passaggio se i link esterni debbano prendere
`target="_blank"` anche sul web. Sono due rimedi allo stesso inciampo a due
livelli diversi, e quello nel processo principale è l'unico che tiene anche
quando l'interfaccia cambia.

Verifica: nessun test la copre e non è automatizzabile a costo ragionevole.
Serve `npm run build && npm start -w @undicesimacasa/desktop`, cliccare
«Swiss Ephemeris» nel piè di pagina, e vedere che si apre il browser di sistema
mentre la finestra resta dov'è.

## 2. Electron da 38 a 43

`apps/desktop/package.json` fissa `electron` a `38.8.6`, esatta. `npm audit`
riporta diciannove avvisi su quella versione, più uno su `extract-zip@2.0.1`,
che entra sotto Electron e serve al `postinstall` per scompattare il binario
ufficiale. La versione corretta è `43.4.1`.

**Non è una dipendenza di sviluppo nel senso che conta.** `electron-builder`
impacchetta il runtime dentro l'AppImage: chi lancia `npm run dist` distribuisce
quel Chromium a chi userà il programma. `npm audit --omit=dev` dice zero perché
guarda l'albero delle dipendenze, non cosa finisce nel pacchetto.

`extract-zip` invece si può ignorare: il path traversal via link simbolico
richiede uno zip malevolo, cioè che siano compromessi i rilasci ufficiali di
Electron, e in CI il binario non viene nemmeno scaricato.

Cosa rende l'aggiornamento meno spaventoso di cinque major: la superficie usata
è piccola — `app`, `BrowserWindow`, `dialog`, `shell`, `utilityProcess`, e
nient'altro. La finestra non passa `webPreferences`, quindi eredita i default
(isolamento del contesto attivo, `nodeIntegration` spento, sandbox attiva) e non
c'è niente di personalizzato da riportare.

Cosa guardare con attenzione: `utilityProcess`, che è l'API più giovane fra
quelle usate e regge due cose — il server SvelteKit in `avviaServer` e
l'importazione GeoNames in `importaDatabase` — e il `preload.cjs` della finestra
di avanzamento, che è CommonJS proprio perché gira in sandbox.

Verifica: `npm run dist -w @undicesimacasa/desktop`, poi lanciare davvero
l'AppImage prodotto e percorrere le due strade che il processo principale
governa — l'importazione del database al primo avvio, e il calcolo di un tema.
I test non toccano niente di tutto questo.

Da fare dopo il punto 1, così il guardiano è già al suo posto quando si cambia
il motore sotto.

## 3. Le azioni di GitHub su Node 24

`.github/workflows/controlli.yml` usa `actions/checkout@v4`,
`actions/setup-node@v4` e `actions/cache@v4`. Tutte e tre dichiarano `node20`, e
GitHub le sta già forzando su Node 24 con un'annotazione a ogni giro. Funziona
oggi, non funzionerà per sempre.

Verificato leggendo `action.yml` a ogni tag: `v5` è il primo major che dichiara
`node24`, per tutte e tre. Gli ultimi major pubblicati sono `checkout@v7`,
`setup-node@v7` e `cache@v6`.

Conviene salire all'ultimo, non al minimo che toglie l'annotazione: un salto
solo invece di due, e questo file lo si tocca una volta.

Da leggere prima: le note di rilascio di `setup-node` fra v4 e v7, che è l'unica
delle tre a cui il workflow passi un'opzione (`cache: npm`) — un cambio di
default lì è l'unica cosa che possa rompere qualcosa in silenzio, cioè
scaricando le dipendenze senza cache invece di fallire.

Verifica: il push stesso. Il giro deve restare verde e l'annotazione sparire.

## 4. `npm test` su un clone pulito fallisce

Trovato mentre si scriveva il workflow, e aggirato lì dentro senza risolverlo.

Nascondendo `packages/core/ephe`, tre test falliscono:

- `packages/core/test/sky.test.ts`, righe 29 e 70 — `expect(sky.warnings).toHaveLength(0)` e `toHaveLength(2)`
- `packages/mcp/test/server.test.ts` — «il formato compatto costa molti meno token del JSON»: 3139 contro un limite di 3025

La causa è una sola. Senza effemeridi il motore ripiega su Moshier — comportamento
voluto e documentato in `CLAUDE.md` — e aggiunge un'avvertenza; i primi due test
contano le avvertenze una a una, il terzo misura una lunghezza che quella riga in
più fa sforare.

Le effemeridi non sono versionate e il `README` le dichiara **opzionali**. Ne
segue che `git clone && npm install && npm test` fallisce, e chi contribuisce
senza sapere del download vede tre errori rossi che non sanno spiegarsi.

Il workflow scarica le effemeridi, ed è la scelta giusta lì — è la configurazione
che gira in produzione, e i test devono provare quella. Ma cura il sintomo.

Il rimedio: i due test in `sky.test.ts` filtrino l'avvertenza del ripiego invece
di assumerne l'assenza, e quello in `server.test.ts` misuri al netto delle
avvertenze. La proprietà che vogliono dimostrare non c'entra niente con quale
effemeride sia in uso.

Verifica: spostare via `packages/core/ephe`, lanciare `npm test`, rimetterla.

## Esaminato, e lasciato stare

**`cookie@0.6.0` sotto SvelteKit** — `npm audit` conta tre vulnerabilità basse:
`cookie`, `@sveltejs/kit` e `@sveltejs/adapter-node` sono la stessa cosa vista da
tre punti della catena, e portano a una copia sola in
`node_modules/@sveltejs/kit/node_modules/cookie`. Quella di primo livello è
`0.7.2` e sta bene.

Tre ragioni per non farci niente, e la terza è quella che chiude il discorso.

1. **Non esiste una correzione.** L'ultima versione pubblicata di SvelteKit
   dipende ancora da `cookie@^0.6.0`, esattamente come quella installata. Il
   `fixAvailable` che npm propone è `@sveltejs/kit@0.0.30`, un pre-release del
   2023: **`npm audit fix --force` qui rompe il progetto invece di ripararlo.**
2. **Il codice viene messo in rete davvero**, e su questo `npm audit --omit=dev`
   inganna: dice zero perché SvelteKit è una dipendenza di sviluppo, ma il suo
   runtime viene incorporato nel server compilato. La stringa d'errore di
   `cookie` si trova in `apps/web/build/server/chunks/`.
3. **Non c'è un punto di chiamata.** L'avviso riguarda `serialize()`, che accetta
   caratteri fuori intervallo in nome, path e domain: serve a qualcosa solo se
   ci arriva input non fidato. Non esiste `hooks.server.ts`, e in tutto il repo
   `cookies.` non compare mai. Questa applicazione non imposta cookie.

Da riguardare quando SvelteKit alza la dipendenza, non prima.
