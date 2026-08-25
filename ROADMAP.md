# Cosa manca

Lavoro aperto e rimandato di proposito, con dentro quello che serve per
riprenderlo senza rifare l'indagine che l'ha trovato. Non è un elenco di idee:
ogni voce è una cosa nota, con il file, la riga e il modo di verificarla.

In fondo c'è una lista che non è lavoro — roba esaminata e lasciata stare, per
non ritrovarla una seconda volta e ricominciare da capo.

## 1. Il nome: da undicesimacasa a dodicisegni

**Prioritario.** Il progetto prende il nome `dodicisegni`, sul dominio
`dodicisegni.it`; `12segni.it` è il dominio di servizio, già registrato. Nel
marchio il numero è in cifre — «12» sopra «segni» — perché «XII» si legge
anche «dodicesima» e il nome dice dodici segni, non il dodicesimo di qualcosa;
il nome breve dell'icona installata è `12segni`, che sta nei sette caratteri
che un lanciatore concede.

**Non c'è niente da preservare.** Il progetto non è in produzione: nessuno ha
una preferenza di tema salvata da migrare, nessun client MCP ha memorizzato un
`undicesimacasa://`, nessuno ha l'AppImage installata sotto il vecchio `appId`.
Ogni identificatore si cambia sul posto, e chi lo cambia non deve niente a
nessuno. È la ragione per cui questa voce è più corta di quanto sarebbe stata
fra un anno, ed è anche la ragione per cui conviene farla adesso.

Resta in tre passi per una ragione sola e molto più piccola di quella: **la
leggibilità del diff**. Il rinomino dello scope npm tocca quasi ogni file del
repo ed è rumore meccanico; impastarlo con le decisioni di nome — la CLI, il
server MCP, l'applicazione desktop — produrrebbe un commit che nessuno rilegge.

### Il sigillo non va ridisegnato

La stella al centro del marchio è il poligono stellato {12/5}: **dodici punte
già oggi**, e non undici. `apps/web/src/lib/components/Marchio.svelte`, righe
16-21, se ne scusava per esteso — il cielo si divide in dodici, e undici era
«solo il nome di questo progetto». Col nome nuovo la scusa non serve più e il
disegno diventa esatto: cambia soltanto la scritta sotto. Vale anche per
`graphics/favicon.svg` e per le icone che `apps/web/scripts/build-icons.mjs`
ne rasterizza, perché la fonte è il favicon e il favicon è la stessa stella.

### Passo 1 — quello che si legge — **fatto**

Il nome come parola, in ciò che una persona vede o incolla.
`apps/web/src/lib/project.ts` (`SITE_NAME`, `SITE_SHORT_NAME`),
`Marchio.svelte`, l'informativa privacy, i tre testi di `packages/lettura` che
finiscono negli appunti di chi li copia, il titolo della pagina senza rete,
`README.md`, `CLAUDE.md` e la skill `nuova-funzione`.

Nello stesso passaggio `Meta.svelte` e `service-worker.ts` hanno smesso di
ripetere il nome alla lettera e lo leggono da `SITE_NAME`, e la proprietà
`--marchio-casa` è diventata `--marchio-parola`: chi posa il marchio decide una
misura, non che cosa ci sta scritto.

### Passo 2 — lo scope npm e i tag — **fatto**

Meccanico e voluminoso, senza una sola decisione dentro. È andato in un commit
solo perché a metà l'albero non compila.

- `@undicesimacasa/*` → `@dodicisegni/*`: sette `package.json`, ogni import di
  ogni workspace, gli script della radice, `Dockerfile:48,58-65`,
  `.github/workflows/controlli.yml`, `compose.yaml:82` e
  `apps/desktop/scripts/stage.mjs:47,61,68`, che compone percorsi dentro
  `node_modules/@undicesimacasa`.
- Il nome del pacchetto radice (`package.json:2`), il nome del progetto compose
  (`compose.yaml:1`) e i tag immagine (`compose.yaml:9,72`,
  `controlli.yml:87,94,125`).
- I nomi di comodo nei test, che non provano niente e vanno per compagnia: i
  prefissi di `mkdtempSync` in `packages/mcp/test/server.test.ts:25`,
  `packages/geo/test/search.test.ts:98` e
  `packages/core/test/ephemeris.test.ts:9`, la URL finta in
  `packages/lettura/test/lettura.test.ts:68` e il sito finto in
  `apps/web/src/lib/cache-policy.test.ts:4`.

Verifica: `npm install` (rifà i collegamenti in `node_modules`, che con lo scope
nuovo sono altri file), poi
`npm run typecheck && npm test && npm run build`, poi il giro Docker con i
profili espliciti.

### Passo 3 — gli identificatori con un nome da scegliere

Pochi, e ciascuno vuole una decisione prima di una riga di codice. Nessuno di
questi ha più un vincolo di compatibilità: quello che resta è scegliere bene.

- **La CLI `casa11` diventa `dodicisegni`** — deciso, e la ragione è che il
  nome vecchio era già un terzo nome, né `undicesimacasa` né altro, e un
  progetto che si chiama in tre modi si spiega tre volte. `12segni` si sarebbe
  digitato meglio, ma il nome breve ha una sola giustificazione — i sette
  caratteri sotto un'icona — e sulla riga di comando quella giustificazione non
  c'è. Da cambiare: `packages/core/package.json:16`, l'aiuto in
  `packages/core/src/cli.ts:70-75,751`, le citazioni in `README.md:26,52,54`,
  `CLAUDE.md:14`, `packages/ruota/src/types.ts:9` e
  `.claude/skills/nuova-funzione/SKILL.md:20`, che la nomina nella mappa dei
  file.
- **Il server MCP.** `SERVER_NAME` in `packages/mcp/src/server.ts:18`, la riga
  di avvio in `stdio.ts:21`, il binario `undicesimacasa-mcp` in
  `packages/mcp/package.json:16`, la chiave in `.mcp.json` e l'esempio nel
  `README.md:80-82`, e lo schema di URI `undicesimacasa://riferimento/…`
  (`server.ts:83,104`), che `packages/mcp/test/server.test.ts:191-196` verifica.
- **L'applicazione desktop.** `appId`, `productName` ed `executableName` in
  `apps/desktop/electron-builder.yml:3-6`, il `serviceName` e i titoli in
  `apps/desktop/src/main.ts:77,153,172,253,262`, la descrizione in
  `apps/desktop/package.json:5`. L'`appId` diventa `it.dodicisegni.desktop`.
  `syncDesktopName: true` lega il nome della voce di menu a `productName`:
  cambia anche quella, e va bene perché nessuno ha l'AppImage installata.
- **La chiave del tema** `undicesimacasa:color-scheme`, in
  `apps/web/src/lib/color-scheme.ts:22` e ripetuta alla lettera nello script in
  linea di `apps/web/src/app.html:39` — che non può importare la costante,
  perché gira prima di tutto il resto per non far lampeggiare la pagina. Le due
  copie vanno cambiate insieme, e con loro la prosa in
  `privacy/+page.svelte:170`, che il valore lo cita.
- **Il nome della cache** `casa11-${version}` in `service-worker.ts:39`, e la
  prosa che lo cita in `privacy/+page.svelte:178`. Le cache di nome vecchio le
  butta `activate` da sé (righe 113-118).
- **Il repository resta `lineadicomando/casa11`** — deciso, per ora. Il
  rinomino su GitHub è un'azione fuori dal repo, e `REPOSITORY_URL` in
  `apps/web/src/lib/project.ts:16` non va toccata finché quella non è fatta:
  quell'indirizzo è insieme il recapito che l'informativa privacy dichiara e
  l'offerta del sorgente che l'AGPL articolo 13 impone, quindi un collegamento
  rotto lì non è un refuso ma una violazione di licenza. **L'ordine è
  obbligato: prima si rinomina su GitHub, poi si cambia la costante** — mai il
  contrario, e neanche insieme.

  Il costo di aspettare è piccolo: nei due posti dove il collegamento compare —
  il piè di pagina e l'informativa — il testo dice «codice sorgente» e «il
  repository pubblico del progetto», quindi il nome vecchio sta nell'indirizzo
  e non sulla pagina. Si vede passandoci sopra, non leggendo. Da chiudere prima
  di mettere il sito in rete, non necessariamente prima dei passi 2 e 3.

  Dopo il rinomino su GitHub resta indietro anche il **remote della copia
  locale**, che oggi è `https://github.com/lineadicomando/casa11.git`. Non
  urge: GitHub redirige i remote vecchi, quindi non si rompe niente e non c'è
  un ordine da rispettare. Sta qui solo perché è l'unica cosa, oltre a
  `REPOSITORY_URL`, che quel rinomino lasci indietro sulla macchina.

### Deciso, per non ridiscuterlo

- **Niente riscrittura della storia di git**, e nessun rinomino della cartella
  locale `it-undicesimacasa`: la prima è pericolosa, il secondo non è codice.
- **Il dominio non entra nel codice.** Nessun file lo scrive oggi: `Meta.svelte`
  compone gli indirizzi da `page.url.origin`, e in produzione è `ORIGIN` a
  dirlo. Il cambio di dominio è configurazione, non un passo di questo lavoro.
- **`12segni` non è un secondo marchio.** È il dominio di servizio e il nome
  breve sotto l'icona, dove sette caratteri sono il tetto. Nella prosa il nome
  è uno solo.

## 2. Il guardiano della navigazione nell'app desktop — **fatto**

Entrambi i rimedi, che erano due allo stesso inciampo a due livelli diversi.

Nel processo principale, `creaFinestra` ora installa anche un gestore di
`will-navigate` accanto a `setWindowOpenHandler`, che copriva il solo
`window.open`: confronta l'**origine** della destinazione con quella del server
interno — l'origine e non l'indirizzo, perché la porta del loopback è
sorteggiata a ogni avvio — e quando differisce annulla e passa a
`shell.openExternal`, per i soli `http(s)`.

Sull'interfaccia, i link che escono dal sito prendono `target="_blank"` e
`rel="noopener"`. Erano **sei e non tre**: la conta di questa voce dimenticava
i due su `REPOSITORY_URL` — il piè di pagina e l'informativa, cioè l'offerta del
sorgente che impone l'AGPL articolo 13 — e quello di Swiss Ephemeris in
`/metodo`. Il referrer non ha richiesto niente: la politica predefinita dei
browser è `strict-origin-when-cross-origin`, che fuori origine manda l'origine
e non il percorso, ed è il percorso a portare data e luogo di nascita.

**Attenzione se si rimette mano qui**: la verifica che questa voce prescriveva
— cliccare «Swiss Ephemeris» nel piè di pagina — adesso **non prova più il
guardiano**, perché con `target="_blank"` quel click passa dal gestore delle
finestre nuove. Per toccare `will-navigate` serve una navigazione di primo
livello, cioè un `location.href` verso un'altra origine.

Verificata così, e non a mano: Electron avviato con
`--remote-debugging-port`, la finestra pilotata via CDP con `location.href`
verso un indirizzo esterno, e `xdg-open` sostituito da uno stub che registra
quello che gli arriva. La finestra è rimasta sull'origine interna, lo stub ha
ricevuto l'indirizzo esterno, e la navigazione interna verso `/metodo` è
passata. Resta comunque fuori dai test: vuole un display e un binario Electron.

## 3. Electron da 38 a 43

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

Da fare dopo il punto 2, così il guardiano è già al suo posto quando si cambia
il motore sotto.

## 4. Le azioni di GitHub su Node 24 — **fatto**

`controlli.yml` è salito a `checkout@v7`, `setup-node@v7` e `cache@v6` nel
commit «Porta le azioni sul runtime che i runner eseguono»: gli ultimi major, e
non il minimo che togliesse l'annotazione, così il file si tocca una volta
sola. La voce resta al suo numero invece di sparire: togliendola scalerebbero
tutte quelle dopo, e i punti 2, 3 e 6 sono citati per numero altrove.

## 5. I dieci varga che mancano

Calcolati: D-1, D-3, D-9, D-10, D-12, D-30, in `packages/core/src/varga.ts`.
Sono i più usati, ed è la ragione per cui vengono per primi — non la
completezza. Dei sedici classici ne restano dieci.

**Non vanno fatti in un colpo solo.** Ogni varga è una regola a sé, e le regole
divergono fra scuole più che nel resto del Jyotisha: farne dieci in un
passaggio significa copiarne otto senza verificarle. I lotti che seguono
raggruppano per **forma della regola**, così che dentro ciascuno si verifichi
una volta il meccanismo e poi si applichi.

Per tutti vale la procedura già collaudata: la regola in una riga dentro
`VARGAS`, che viaggia nel risultato ed è ciò che rende il segno
ricontrollabile; le prove ai confini dei segni pari e dispari; l'aggiunta a
`VargaId` in `types.ts` e all'elenco di `--varga` nell'aiuto della CLI.

### Lotto A — quelli che si biforcano su pari e dispari

**D-2 Hora, D-4 Chaturthamsa, D-7 Saptamsa.** Stessa forma del D-10 già
fatto: si guarda se il segno è pari o dispari e si parte da due punti diversi.
Il D-2 divide in due (Sole e Luna); il D-4 in quattro, sui kendra; il D-7 in
sette, dal segno stesso nei dispari e dal settimo nei pari.

Da decidere una cosa sola, ed è il D-2: alcune scuole assegnano le due metà ai
segni del Leone e del Cancro, altre parlano di «hora del Sole» e «hora della
Luna» senza un segno. `VargaChart.positions` porta un `ZodiacSign`, quindi la
seconda convenzione non ci sta dentro senza cambiare il tipo. Va deciso prima
di scrivere, non dopo.

### Lotto B — i multipli con partenza fissa

**D-16 Shodashamsa, D-20 Vimshamsa, D-24 Chaturvimshamsa, D-27
Nakshatramsa.** Qui la partenza non dipende dal segno di arrivo ma da un segno
fisso deciso dalla natura del segno di partenza — cardinale, fisso o mobile per
alcuni; pari o dispari per altri. Il meccanismo è quello del D-9, applicato a
divisioni più fini.

Il D-27 è il più utile del lotto e anche il più semplice: ventisette parti da
1°6'40", cioè un pada di nakshatra, e si parte sempre dall'Ariete. Si può fare
per primo e da solo.

### Lotto C — i fini, che vogliono un'ora di nascita esatta

**D-40 Khavedamsa, D-45 Akshavedamsa, D-60 Shashtiamsa.**

Il D-60 è, in Parashara, il più importante di tutti, e insieme quello che il
motore può garantire di meno: una divisione dura **30 primi d'arco**, che
l'Ascendente percorre in due minuti di orologio. Un'ora di nascita arrotondata
al quarto d'ora produce un D-60 sbagliato, e non se ne accorge nessuno.

Questo lotto vuole quindi una cosa che gli altri non chiedono: **un'avvertenza
propria**, sul modello di quella delle dasha in `dasha.ts`, che dica quanti
minuti di scarto valgano una divisione. Senza, sarebbe il caso peggiore di
tutti — un dato che sembra preciso perché ha molte cifre.

Verifica per tutti i lotti: `packages/core/test/varga.test.ts` ha già la forma
— confini noti calcolati a mano per un segno pari e uno dispari, più la prova
che la regola viaggi col risultato.

## 6. La prosa che può invecchiare senza dirlo

**Bassa priorità.** Nessuna delle due rompe niente: producono testo che dice il
falso, e nessun test le vede. Stanno qui perché è il genere di cosa che si
ritrova per caso due anni dopo, e allora non si sa più quale delle due versioni
fosse quella giusta.

### La precisione di Moshier, dichiarata due volte e in due modi

`packages/core/src/ephemeris.ts`, riga 20, dice «0,1 secondi d'arco per i
pianeti maggiori». `README.md`, riga 44, dice «~0,4 secondi d'arco sui pianeti
principali». Sono la stessa affermazione sullo stesso ripiego, e differiscono di
un fattore quattro.

Una delle due è sbagliata e non si sa quale: il numero non viene da una misura
fatta qui, ma dalla documentazione di Swiss Ephemeris, dove la cifra dipende da
quali corpi e da quale epoca si guardano — Moshier degrada allontanandosi dal
presente, e i pianeti esterni non si comportano come i lunari.

La via per chiuderla non è scegliere il numero che suona meglio: è
**misurarlo**. Il motore sa calcolare in tutt'e due i modi, e `initEphemeris`
espone la modalità; bastano gli stessi corpi allo stesso istante nelle due
modalità e la differenza in secondi d'arco, su qualche data sparsa nell'arco
1800-2400. Diventa un test, e il numero diventa verificabile invece che
riportato.

Finché non è deciso, `apps/web/src/routes/(informativa)/metodo/+page.svelte`,
riga 77, dice «una frazione di secondo d'arco» senza cifra — di proposito, e va
aggiornata insieme alle altre due.

Verifica: un test in `packages/core/test/` che confronti le due modalità e
fallisca se lo scarto esce dall'ordine di grandezza dichiarato. A quel punto le
tre righe di prosa possono portare la stessa cifra.

### La pagina del metodo non è legata a `constants.ts`

`apps/web/src/routes/(informativa)/metodo/+page.svelte` ricopia in prosa valori
che vivono nel motore: le nove orbite e i nove aspetti da `ASPECTS` in
`packages/core/src/constants.ts` (tabella a riga 194), i nove sistemi di case da
`HOUSE_SYSTEM_CODES`, il bonus dei luminari, le orbite dei transiti da
`TRANSIT_ORBS`, i sei ayanamsa da `AYANAMSAS` in `ayanamsa.ts`, i sei varga da
`VARGAS` in `varga.ts` (riga 344).

Cambiando un'orbita, la pagina resta vecchia in silenzio. Non c'è nessun test
che colleghi le due cose, ed è la scelta scritta nel commento in testa al file:
legare la pagina ai valori vorrebbe dire generarla, e una tabella generata non
può dire *perché* le orbite dei transiti sono strette — che è l'unica ragione
per cui la pagina esiste.

La forma che risolve senza generare la prosa esiste, ed è quella che il progetto
usa già altrove: **un test che fallisce a voce alta quando i due divergono**, sul
modello di `packages/ruota/test/tipi.test.ts`, che verifica che i tipi
ridichiarati combacino con quelli di `core` senza importarli. Qui vorrebbe dire
leggere il file `.svelte` e cercarci i valori di `ASPECTS` — nove righe di
tabella, non tutta la pagina — e fallire se un'orbita non compare più.

Un test così è brutto e va tenuto stretto: se comincia a cercare frasi invece
che numeri diventa un impedimento a riscrivere la prosa, che è il contrario di
quello che serve. Da fare solo per i valori tabellari, e solo se la pagina
sopravvive abbastanza da giustificarlo.

Verifica: cambiare un'orbita in `ASPECTS` e vedere il test cadere.

## 7. La domanda che manca ai transiti: che cosa è attivo in un arco

Oggi ci sono due tool e nessuno dei due risponde a «che cosa è in orbita fra il
1° e il 30 settembre». `compute_transits` fotografa **un istante**;
`find_transit_passages` elenca **gli istanti in cui un aspetto si perfeziona**.
Fra i due manca l'intervallo, che è quello che serve per leggere un periodo —
un giorno, una settimana, un mese, un bimestre. È una domanda sola con `from` e
`to` diversi: **non serve un enum di periodi**, e non deve entrarci. Chiamare
«bimestre» un arco è comodità di chi chiama, non un fatto del motore.

### Quasi tutto il calcolo c'è già

`windowAround`, `packages/core/src/passages.ts:180`, calcola già l'intervallo in
cui ogni passaggio resta in orbita, e lo fa quasi gratis: cammina sui campioni
già presi e dimezza solo l'ultimo. Il margine di campionamento a
`passages.ts:65` è `WIDEST_ORB / MEAN_DAILY_MOTION[bodyId]`, cioè esattamente il
tempo massimo che un corpo impiega ad attraversare l'orbita più larga concessa:
non è un margine prudenziale, è dimensionato sul caso peggiore.

Quel lavoro viene poi buttato via da una riga, `passages.ts:79`:

```js
found.filter((passage) => passage.julianDay >= start && passage.julianDay <= end)
```

Sostituire «l'istante esatto cade nell'arco» con «la finestra interseca l'arco»
non è matematica nuova: è un predicato diverso su valori già calcolati. Il
commento sopra il filtro lo dice quasi in chiaro.

### Il pezzo che invece manca davvero

`passagesOf`, `passages.ts:116`, trova i passaggi cercando i **cambi di segno**
di `gap`, cioè le perfezioni. Un transito che entra in orbita, staziona a due
gradi e mezzo dal punto natale e retrocede **senza mai perfezionarsi** non
produce nessuna radice, quindi nessun passaggio, quindi nessuna finestra. Oggi è
invisibile a ragione, perché lì non c'è nessun istante esatto da elencare — ma
in un elenco di ciò che è attivo quel transito c'è, e per mesi.

Va quindi cercata la radice di `|gap| − orbLimit` **indipendentemente** da
quella di `gap`. `bisect` in `roots.ts` sa già farlo ed è la stessa funzione che
`windowAround` chiama: solo, oggi la invoca ancorata a un istante esatto. Va
scollegata da quell'ancora.

Secondo caso, più semplice: quando il bordo non si trova entro
`MAX_WINDOW_DAYS` (1095, `roots.ts:30`) la finestra oggi viene omessa. In un
elenco di transiti attivi «in orbita per tutto l'arco» **è la risposta**, non un
dato mancante, e va detta invece che taciuta.

Niente di tutto questo tocca la catena di calcolo sincrona né lo stato globale
dell'ayanamsa: si resta dentro `zodiacContext`, come il resto del file.

### Decisioni già prese, per non ridiscuterle

- **Le superfici espongono solo dati.** MCP, CLI e API restano agnostiche
  rispetto alla lettura: dicono quale transito è in orbita, con che aspetto, con
  quanta orbita ai bordi, e quante volte si perfeziona dentro l'arco.
  L'interpretazione la fanno gli agenti, su fattori che non si trattano qui e
  che non entrano nel repo.
- **Nessun punteggio, nessun indice di intensità del periodo.** Sarebbe il
  «totale solo» che il progetto rifiuta: pesare Saturno contro Giove è una
  dottrina, e finirebbe nel codice senza che chi legge possa vederla. Si
  espongono i componenti, come `Distribution` porta `counted`.
- **Nessun `mode:` su `find_transit_passages`.** Il precedente è un tool per
  domanda — `compute_sky` accanto a `find_sky_events` — e le descrizioni sono
  scritte apposta perché un modello non li confonda. Un flag che ribalta il
  significato delle righe è la cosa più facile da sbagliare per un agente.
- **Niente interfaccia web.** La funzione serve agli agenti e alla riga di
  comando: l'endpoint sì, la pagina e la tabella Svelte no.
- Serve un tetto all'arco: `MAX_RANGE_DAYS` in `tools.ts` e
  `lib/server/range.ts` sono il precedente.

### Nome e superfici

`find_transit_passages` risponde a *quando*, questo a *che cosa*: i due nomi
devono renderlo ovvio a un modello che li legge di fianco. `find_active_transits`
per l'MCP, `attivi.ts` accanto a `passages.ts` in `core`.

Due commit, nell'ordine della skill `nuova-funzione`: il calcolo con la CLI e i
test, che è il grosso; poi rotta GET e tool MCP con la descrizione che dice
anche che cosa non fare.

Verifica, in due casi distinti perché provano due cose diverse:

1. **Il filtro.** Tema del 2 giugno 1978, 15:15, Palermo, arco
   `2026-07-01 → 2026-08-01`. Saturno quadrato Venere (finestra
   2026-05-26 → 2026-09-29, esatto il 22 giugno e il 31 agosto) e Saturno
   opposizione Plutone (finestra 2026-05-29 → 2026-09-25, esatto il 27 giugno e
   il 25 agosto) sono in orbita per tutto l'arco e non si perfezionano dentro:
   oggi `find_transit_passages` su quell'arco non restituisce nulla. Caso reale,
   già verificato, nessuna costruzione.
2. **La radice nuova.** Un transito che entri in orbita e retroceda senza mai
   perfezionarsi va costruito apposta — il caso 1 non lo copre, perché lì le
   perfezioni esistono e cadono solo fuori dall'arco.

## 8. Il glossario, e /metodo da rivedere

**Priorità media.** Viene da un esame del SEO organico, dove l'ipotesi di
partenza era un payoff da mettere nel titolo. Il payoff non sposta niente — è
del marchio, quindi si ripete su ogni pagina, e un titolo ripetuto è la cosa
che i motori riscrivono per prima. Quello che sposta è il testo, e di testo qui
ce n'è pochissimo.

Il conto è in `apps/web/src/lib/seo.ts`: sette indirizzi in
`PAGINE_PUBBLICHE`, e cinque sono strumenti — `h1` nascosto, un cappello di due
paragrafi e sotto il modulo. Le pagine fatte di prosa sono `/metodo` e
`/privacy`, e la seconda la cerca soltanto chi la deve controllare. Un sito con
due pagine di testo non si posiziona su niente, per quanto bene siano scritti i
suoi `<title>`.

Il vincolo del progetto, qui, non è un impedimento: è il filtro che sceglie il
contenuto. Che cos'è un nakshatra è un fatto verificabile; che cosa prometta
Saturno in settima no. **Il glossario è la prosa che questo progetto può
scrivere senza tradirsi**, ed è anche quella che intercetta le ricerche più
precise — in italiano, su questi termini, non copre bene nessuno.

### Il glossario

I termini ci sono già tutti, sparsi: quelli del Jyotisha che la regola di stile
tiene in sanscrito — `nakshatra`, `tithi`, `karana`, `yoga`, `dasha`, `varga`,
`drishti`, `pada`, più `ayanamsa` e `panchanga` — e quelli che il motore
occidentale calcola e nomina: Parte di Fortuna, Luna vuota di corso, ore
planetarie, cuspidi, orbita, retrogradazione, stazione, ingresso, distribuzione
fra elementi e modalità, i nove sistemi di case.

Non c'è niente da inventare e non si deve: la fonte è scritta due volte, nei
commenti di `packages/core` — `VoidOfCourse` in `types.ts`, `dasha.ts`,
`varga.ts`, `constants.ts` — e nella pagina del metodo, che quasi tutti li
spiega già.

Ed è esattamente lì il rischio. **Due pagine che dicono la stessa cosa si
tolgono i lettori a vicenda**, e un motore che deve scegliere fra le due
sceglie male. Il taglio va deciso prima di scrivere una riga, e la forma che
regge è questa: il glossario dice *che cos'è* il termine, in tre righe, e
rimanda; `/metodo` dice *con quale convenzione questo sito lo calcola*. Il
primo definisce, il secondo dichiara — che è poi la differenza fra i due
vincoli del progetto.

**Da decidere, e non è una scelta di stile.** Una pagina per termine è la forma
che intercetta le ricerche, ma sono trenta indirizzi da poche righe l'uno, che
è la definizione di pagina magra, e la sitemap li porterebbe tutti. Una pagina
sola con le ancore è un indirizzo solo e trenta ricerche perse. La via di mezzo
— una pagina per famiglia, il Jyotisha da una parte, il tempo e i moti
dall'altra — è probabilmente quella giusta, ma va scelta guardando quanto testo
regge davvero ogni termine, non prima.

Qualunque sia la forma, le pagine nuove **non sono sezioni**: vanno aggiunte a
mano in `PAGINE_PUBBLICHE`, come `/metodo` e `/privacy`, e
`lib/seo.test.ts` va esteso di conseguenza. Nel menù non entrano.

### La revisione di /metodo

La pagina non è povera: 476 righe e diciotto sezioni, ciascuna con il suo `id`.
Il problema è che è **una pagina sola**. Le diciotto ancore non sono diciotto
risultati: `#dasha` non è mai un indirizzo per sé, e chi cerca «dasha
vimshottari» trova al più la pagina intera, che parla di altre diciassette
cose.

Va quindi valutato — non è deciso — se le cinque parti dell'astrologia indiana
(`#nakshatra`, `#dasha`, `#varga`, `#drishti`, `#panchanga`, righe 298-388)
debbano staccarsi in pagine proprie. Contro: spezzare una pagina che si legge
bene di seguito, e che è l'unica cosa che risponda a «perché la stessa nascita
dà carte diverse altrove». A favore: sono già cinque capitoli con un titolo e
un `id`, e il testo di ognuno regge da solo.

Due cose invece vanno fatte comunque:

- **Il titolo e la descrizione.** «Metodo» è una parola che non cerca nessuno.
  La descrizione a `metodo/+page.svelte:24` è buona ed elenca già i termini
  giusti; il titolo li butta via tutti.
- **Il coordinamento con il punto 6**, che tocca questa stessa pagina in due
  modi: la precisione di Moshier senza cifra alla riga 77, e il legame mancante
  con `constants.ts`. Se la pagina si riscrive, i due lavori si incrociano —
  farli in ordine sparso significa riscrivere due volte gli stessi paragrafi.

### Deciso, per non ridiscuterlo

- **Niente marcature FAQ.** Le domande frequenti vanno riempite di
  affermazioni, che è la merce che questo progetto non produce: la ragione sta
  già scritta per esteso nel commento a `strutturati` in `Meta.svelte`.
- **I cappelli delle cinque sezioni restano come sono.** Allungarli metterebbe
  prosa fra chi arriva e il modulo che è venuto a compilare, e il guadagno
  sarebbe comunque il più piccolo dei tre.
- **Il payoff nel titolo non fa parte di questo lavoro.** Quello che
  dell'esame è rimasto in piedi — il titolo della home, che oggi spreca la
  pagina più forte del sito, e uno `slogan` nei dati strutturati — è piccolo,
  isolato e va per conto suo.

## 9. Il codice morto non lo vede nessuno

**Priorità media.** Il progetto non ha alcuna configurazione di lint o di
formattazione — nessun ESLint, nessun Prettier, nessun Biome, nessun oxlint, e
in `package.json` nessuno script che li chiami. E in `tsconfig.base.json` non
sono impostati né `noUnusedLocals` né `noUnusedParameters`, che è la parte che
costa meno e che ha già lasciato passare qualcosa.

Non è un'ipotesi: due difetti reali sono entrati e nessuno se n'è accorto.
`api/chart/wheel/+server.ts` importava `ruotaSvg` e `ruotaPng` senza usarli, e
il secondo apriva una seconda porta su `ruota/png` — il punto d'ingresso col
modulo nativo che deve entrare solo da `lib/server`, cioè una regola di
`CLAUDE.md` aggirata da un import dimenticato. Quello è corretto; l'altro no.
Nessuno dei due lo vedono `typecheck` né i test, che girano verdi lo stesso.

### Il primo passo costa quasi niente

`noUnusedLocals` e `noUnusedParameters` in `tsconfig.base.json`. Non è una
dipendenza nuova, quindi non apre la questione di licenza che l'AGPL impone a
ogni aggiunta, e oggi **manca un solo posto** perché l'albero passi:

```
packages/core/src/election.ts(290,3): 'context' is declared but its value is never read.
```

`findVoidsOfCourse` riceve un `EphemerisContext` e non lo tocca. **Non è un
difetto di correttezza, ed è già stato verificato**: `ElectionOptions` non ha
né `zodiac` né `ayanamsa`, e le righe 92-93 dello stesso file dichiarano
l'elezione tropicale per scelta — «il vuoto di corso siderale non è una tecnica
di nessuno». Il parametro è peso morto, e va tolto dalla firma insieme
all'argomento che `election.ts:120` gli passa.

Il modo di rifare il conto senza installare niente, workspace per workspace:

```sh
npx tsc -p packages/core/tsconfig.json --noEmit --noUnusedLocals --noUnusedParameters
```

### Il linter vero è una decisione a parte

Va deciso, e non è ovvio:

- **Quale strumento**, e con quale licenza — ogni dipendenza nuova deve essere
  compatibile con l'AGPL-3.0-or-later.
- **Se la formattazione entri o no.** Qui la cautela è concreta: i commenti di
  questo repo sono prosa italiana mandata a capo a mano, spesso su misura del
  ragionamento che portano. Un formattatore che li riflua non rompe niente e
  peggiora tutto, e il diff che ne esce non si rilegge. Il lint delle regole e
  la formattazione del testo sono due decisioni, e conviene prendere solo la
  prima.
- **Che cosa copre i `.svelte`.** `svelte-check` gira già su `apps/web` e dà
  zero avvisi, ma legge il `tsconfig` dell'app: senza i due flag lì, gli import
  morti nei `.ts` di quell'app non li ha visti nessuno. Coprire i `.svelte`
  vuole comunque qualcosa in più.

Verifica del primo passo: i due flag accesi, `npm run typecheck` verde su tutti
i workspace, e un import inutile aggiunto apposta che lo fa cadere.

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
