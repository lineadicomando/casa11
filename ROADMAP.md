# Cosa manca

Lavoro aperto e rimandato di proposito, con dentro quello che serve per
riprenderlo senza rifare l'indagine che l'ha trovato. Non è un elenco di idee:
ogni voce è una cosa nota, con il file, la riga e il modo di verificarla.

In fondo c'è una lista che non è lavoro — roba esaminata e lasciata stare, per
non ritrovarla una seconda volta e ricominciare da capo.

## 1. Il nome: da undicesimacasa a dodicisegni — **fatto**

I tre passi sono chiusi. Resta fuori il solo `REPOSITORY_URL`, che dipende da
un rinomino su GitHub e sta al **punto 10**.

Il progetto prende il nome `dodicisegni`, sul dominio `dodicisegni.it`; `12segni.it` è il dominio di servizio, già registrato. Nel
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

È andato in tre passi per una ragione sola e molto più piccola di quella: **la
leggibilità del diff**. Il rinomino dello scope npm tocca quasi ogni file del
repo ed è rumore meccanico; impastarlo con le decisioni di nome — la CLI, il
server MCP, l'applicazione desktop — avrebbe prodotto un commit che nessuno
rilegge.

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

### Passo 3 — gli identificatori con un nome da scegliere — **fatto**

Pochi, e ciascuno voleva una decisione prima di una riga di codice. Nessuno
aveva più un vincolo di compatibilità: restava scegliere bene, e la scelta è
stata la stessa dappertutto — `dodicisegni`. `12segni` ha una giustificazione
sola, i sette caratteri sotto un'icona, e nessuno di questi posti è quello.

- **La CLI `casa11` è diventata `dodicisegni`** — **fatto**. La ragione era
  che il nome vecchio era già un terzo nome, né `undicesimacasa` né altro, e un
  progetto che si chiama in tre modi si spiega tre volte. `12segni` si sarebbe
  digitato meglio, ma il nome breve ha una sola giustificazione — i sette
  caratteri sotto un'icona — e sulla riga di comando quella giustificazione non
  c'è. Cambiati il `bin` di `packages/core/package.json`, l'aiuto e il commento
  a `printSky` in `cli.ts`, e le citazioni in `README.md`, `CLAUDE.md`,
  `packages/ruota/src/types.ts` e `.claude/skills/nuova-funzione/SKILL.md`.

  Una nota per chi rifà il giro su un altro identificatore: `npm install` non
  toglie il collegamento vecchio in `node_modules/.bin`, lo affianca. Finché
  non si cancella a mano, `npx casa11` continua a rispondere e il rinomino
  sembra non aver preso.
- **Il server MCP** — **fatto**. `SERVER_NAME` vale `dodicisegni`, il binario
  è `dodicisegni-mcp`, la chiave in `.mcp.json` e l'esempio del `README` pure,
  e le risorse di riferimento stanno su `dodicisegni://riferimento/…`.

  Come nel passo 1, il nome ha smesso di essere ripetuto alla lettera dove una
  costante c'era già: i due URI in `server.ts` e la riga di avvio in `stdio.ts`
  si compongono da `SERVER_NAME`. Il test resta sui letterali di proposito —
  deve provare il valore che passa sul filo, non che due costanti siano la
  stessa costante.

  Verificato avviando `dist/stdio.js` su stdio con un `initialize` a mano:
  `serverInfo.name` è `dodicisegni`, `resources/list` restituisce i due URI
  nuovi e `resources/read` serve il contenuto. Come per la CLI, il
  collegamento vecchio in `node_modules/.bin` è andato tolto a mano.
- **L'applicazione desktop** — **fatto**. `appId` è `it.dodicisegni.desktop`,
  `productName` ed `executableName` sono `dodicisegni`, e così la descrizione
  del pacchetto, che finisce nel `Comment` della voce di menu. In `main.ts` il
  nome sta in una costante `NOME` — dichiarata lì e non importata da `web`, che
  non è una libreria e da cui il desktop non dipende.

  Verificato impacchettando davvero: `npm run dist` produce
  `dodicisegni-0.1.0.AppImage`, l'eseguibile dentro è `dodicisegni`, e il
  `.desktop` porta `Name`, `Icon` e `StartupWMClass` tutti col nome nuovo.
  L'app avviata mostra il titolo giusto.

  Due cose viste di passaggio e **non toccate**, perché non sono di questo
  lavoro: `release/` tiene ancora l'AppImage vecchia del nome vecchio, e
  `electron-builder` avvisa che `desktopName` non è impostato in
  `package.json`, il che rende `syncDesktopName: true` meno efficace di quanto
  la riga qui sopra dicesse. L'avviso c'era già prima del rinomino.
- **La chiave del tema** — **fatto**. Vale `dodicisegni:color-scheme`, e
  `COLOR_SCHEME_KEY` la compone da `SITE_NAME` invece di ripeterla.

  Lo script in linea di `app.html` **non può** fare altrettanto: gira prima di
  ogni import, per non far lampeggiare la pagina, e la chiave se la scrive a
  mano. Prima erano due letterali e si dimenticavano insieme; ora la costante
  segue `SITE_NAME` e la copia in `app.html` no, che è un modo peggiore di
  sbagliare — cambiare il nome del sito perderebbe l'aspetto scelto a ogni
  caricamento, in silenzio. Per questo `color-scheme.test.ts` adesso legge
  `app.html` e confronta le due copie: è l'unico posto dove si guardano in
  faccia. Provato facendolo cadere.
- **Il nome della cache** — **fatto**. `service-worker.ts` lo compone da
  `SITE_NAME`, che già importava per il titolo della pagina senza rete;
  nel worker compilato risulta `dodicisegni-<versione>`. Le cache di nome
  vecchio le butta `activate` da sé.

  In tutt'e due i casi è cambiata anche la prosa dell'informativa privacy, che
  i due valori li cita alla lettera.

Il repository non è in questo elenco: `REPOSITORY_URL` dipende da un rinomino
su GitHub, che è fuori dal repo e non si può fare da qui. Sta al **punto 10**,
e non blocca niente di quanto sopra.

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
ufficiale. I due conti sono stati rifatti e non sono cambiati.

**Le versioni di arrivo sono due, e vanno scelte.** `43.4.1` è l'ultima della
serie 43 e chiude tutto: l'intervallo vulnerabile di quel major si ferma a
`43.0.0-beta.8`. Nel frattempo è però uscita la `44.0.0` stabile, ed è quella
che `npm audit fix --force` propone. Un major in più oggi costa la stessa
prova a mano e allontana il prossimo salto; contro, è appena uscita, e questo
è l'unico posto del progetto dove una regressione la vede l'utente e non un
test.

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

Verifica: `npm run dist -w @dodicisegni/desktop`, poi lanciare davvero
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
che vivono nel motore: le nove orbite e i nove aspetti da `ASPECTS`
(`packages/core/src/constants.ts:275`), che la pagina ricopia nella tabella a
riga 194; i nove sistemi di case da `HOUSE_SYSTEM_CODES`, il bonus dei
luminari, le orbite dei transiti da `TRANSIT_ORBS`; i sei ayanamsa da
`AYANAMSAS` (`ayanamsa.ts:44`) e i sei varga da `VARGAS` (`varga.ts:75`), che
la pagina elenca a riga 344.

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

La pagina non è povera: 476 righe e diciassette sezioni, ciascuna con il suo
`id`. Il problema è che è **una pagina sola**. Le diciassette ancore non sono
diciassette risultati: `#dasha` non è mai un indirizzo per sé, e chi cerca
«dasha vimshottari» trova al più la pagina intera, che parla di altre sedici
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

**Priorità media**, e il primo passo è **fatto**: restano il linter vero e la
decisione che porta con sé. Il progetto non ha alcuna configurazione di lint o
di formattazione — nessun ESLint, nessun Prettier, nessun Biome, nessun oxlint,
e in `package.json` nessuno script che li chiami.

Non è un'ipotesi: due difetti reali sono entrati e nessuno se n'è accorto.
`api/chart/wheel/+server.ts` importava `ruotaSvg` e `ruotaPng` senza usarli, e
il secondo apriva una seconda porta su `ruota/png` — il punto d'ingresso col
modulo nativo che deve entrare solo da `lib/server`, cioè una regola di
`CLAUDE.md` aggirata da un import dimenticato. Quello è corretto; l'altro no.
Nessuno dei due lo vedono `typecheck` né i test, che girano verdi lo stesso.

### Il primo passo — **fatto**

`noUnusedLocals` e `noUnusedParameters` in `tsconfig.base.json`, e **anche in
`apps/web/tsconfig.json`**, che è la cosa che non si vedeva da qui: quello non
estende la base ma il `tsconfig` generato da SvelteKit, quindi i due flag alla
radice non lo raggiungono. Nessuna dipendenza nuova, quindi nessuna questione
di licenza aperta.

Il parametro morto che teneva fermo l'albero è tolto: `findVoidsOfCourse`
riceveva un `EphemerisContext` e non lo toccava, per la ragione dichiarata alle
righe 92-93 dello stesso file — l'elezione è tropicale per scelta, e «il vuoto
di corso siderale non è una tecnica di nessuno».

Due cose sono andate meglio del previsto. Si temeva che coprire i `.svelte`
volesse qualcosa in più: non lo vuole, perché `svelte-check` legge i due flag
come **errori** e non come suggerimenti, e li applica ai componenti come ai
`.ts`. E accendendoli è saltato fuori subito un import morto vero, `ASPECT_GLYPH`
in `components/TransitAspectTable.svelte`, che nessuno aveva visto — il terzo
della serie, dopo i due che aprono questa voce.

Verificato aggiungendo un import inutile in `packages/core/src/place.ts` e una
costante inutile in `apps/web/src/lib/seo.ts`: cadono tutt'e due, la seconda
solo dopo il flag nel `tsconfig` dell'app.

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
- **Che cosa aggiunge, ora che i `.svelte` sono coperti.** Il primo passo li
  prende già, import e variabili morte comprese. Quello che un linter porta in
  più sono le regole che il compilatore non ha — le promesse non attese, i
  confronti che non possono essere veri — e vanno guardate una per una prima di
  accenderle tutte.

## 10. Il rinomino su GitHub, e i due riferimenti che lascia indietro

**Bassa priorità**, e l'unica voce del cambio di nome che non si chiude
scrivendo codice: il primo passo è un'azione sull'interfaccia di GitHub, che
nessuno può fare da dentro il repo. Sta qui, e non dentro il punto 1, proprio
per questo — non è un passo rimasto indietro, è un lavoro d'altra natura.

Il repository oggi è `lineadicomando/casa11`.

**L'ordine è obbligato: prima si rinomina su GitHub, poi si cambia la
costante** — mai il contrario, e neanche insieme. `REPOSITORY_URL` in
`apps/web/src/lib/project.ts:16` è insieme il recapito che l'informativa
privacy dichiara e l'offerta del sorgente che l'AGPL articolo 13 impone: un
collegamento rotto lì non è un refuso ma una violazione di licenza. Cambiarla
prima del rinomino rompe l'indirizzo per il tempo che passa in mezzo.

Il costo di aspettare è piccolo, ed è la ragione della bassa priorità. Nei due
posti dove il collegamento compare — il piè di pagina e l'informativa — il
testo dice «codice sorgente» e «il repository pubblico del progetto», quindi il
nome vecchio sta nell'indirizzo e non sulla pagina. Si vede passandoci sopra,
non leggendo.

**Da chiudere prima di mettere il sito in rete.** Fino ad allora l'indirizzo
funziona e nessuno lo legge.

Dopo il rinomino resta indietro anche il **remote della copia locale**, che
oggi è `https://github.com/lineadicomando/casa11.git`. Non urge e non ha un
ordine da rispettare: GitHub redirige i remote vecchi, quindi non si rompe
niente. Sta qui solo perché è l'unica cosa, oltre a `REPOSITORY_URL`, che quel
rinomino lasci indietro sulla macchina.

## 11. Gli elenchi che vivono in quattro posti

**Priorità media.** `AYANAMSAS` è dichiarato in `packages/core/src/ayanamsa.ts:44`,
di nuovo in `packages/mcp/src/tools.ts:88`, di nuovo in
`apps/web/src/lib/server/birth.ts:27` e una quarta volta in
`apps/web/src/lib/zodiacs.ts:28`. I sistemi di case stanno in cinque, contando
`HOUSE_SYSTEM_CODES` in `constants.ts:255`. Oggi combaciano tutti: verificati uno
per uno.

Il commento in testa a `ayanamsa.ts` dice che aggiungerne uno «è una riga qui».
Sono quattro, e due delle quattro non se ne accorgerebbero. `zodiacs.ts` e
`house-systems.ts` dichiarano `AyanamsaId` e `HouseSystem`, quindi il
compilatore le tiene legate al motore; `birth.ts` usa un `Set<string>` e il
server MCP uno `z.enum` scritto lì, e un settimo ayanamsa non produrrebbe
nessun errore da nessuna parte — le due superfici continuerebbero a rifiutarlo,
cioè a dire che non esiste una cosa che esiste.

Il guasto è sicuro: un rifiuto, non un numero sbagliato, ed è la ragione per cui
la priorità è media e non alta. È però invisibile a chi aggiunge, che vede il
motore accettare il valore nuovo dalla riga di comando e non ha motivo di
sospettare le altre tre copie.

Il rimedio non è importare dappertutto. La ragione per cui `zodiacs.ts` non lo
fa sta scritta lì ed è il bundle del browser, dove un import di valore dal
motore trascina le effemeridi. Quella ragione non vale per `packages/mcp`, che è
codice di server e che in `server.ts:3` importa già `HOUSE_SYSTEM_CODES` da
`core`: là la copia non ha nessuna giustificazione e si toglie. Per `birth.ts` e
per i due elenchi del client la forma è quella che il progetto usa già in
`packages/ruota/test/tipi.test.ts` — un test che confronta e cade a voce alta.

Verifica: un settimo ayanamsa in `AYANAMSAS`, e il test che cade nominando i
posti rimasti indietro.

## 12. Le funzioni che compongono gli indirizzi non hanno test — **fatto**

`apps/web/src/lib/api.test.ts` e `apps/web/src/lib/server/birth.test.ts`, in
tutto settantaquattro prove.

La proprietà che la pagina del tema dichiara per iscritto —
`apps/web/src/routes/+page.svelte:47`, «un indirizzo condiviso che
ricalcolasse un tema diverso da quello a schermo sarebbe il peggiore dei
difetti, perché non si vede» — non è provata guardando i nomi dei parametri,
che sarebbe copiarli una seconda volta. L'indirizzo composto da
`chartParameters` viene **dato da rileggere a `lib/server/birth.ts`**, cioè al
codice vero delle rotte, e si confronta quel che ne esce con la nascita di
partenza. Un nome cambiato da una parte sola cade lì, in tutt'e due i versi:
verificato rinominando `locationId` nel client (dodici prove rosse) e
`houseSystem` nella rotta (sedici).

Nello stesso giro passano i nove sistemi di case e i sei ayanamsa che il modulo
propone, presi da `house-systems.ts` e `zodiacs.ts` e fatti accettare alla
rotta. **Non chiude il punto 11**: lega due delle quattro copie fra loro, non
al motore, e un settimo ayanamsa aggiunto in `core` continuerebbe a non far
cadere niente.

### Quello che non si sapeva da qui

`api.ts` non era senza test: undici prove su `chartParameters`,
`transitParameters`, `skyParameters` e `skyCalendarParameters` vivevano in
`moment.test.ts`, dove erano arrivate al seguito di `MomentInput` e di
`shiftDate`. È la ragione per cui la lacuna sembrava totale ed era invece
parziale — e anche la ragione per cui conveniva toglierle di lì: un test che
sta nel file del modulo sbagliato non lo trova chi cerca, e in un repo dove
ogni modulo ha il suo `.test.ts` accanto è l'assenza a fare da indice. Ora
`moment.test.ts` prova `moment.ts` e basta.

Il dataset GeoNames è sostituito da due località — Napoli e Tokyo, che servono
anche a provare che i due luoghi di una richiesta di transiti non si scambino.
`getLocation` è l'unica cosa che `server/place.ts` gli chiede, e nessuna prova
deve dipendere da un database da 215 MB che potrebbe non essere stato
importato.

## 13. Due semplificazioni piccole

**Priorità bassa**, e nessuna delle due rompe niente.

`fetchChartCompact` (`apps/web/src/lib/api.ts:142`) e `fetchJyotishaCompact`
(riga 224) sono la stessa funzione scritta due volte: cambiano l'indirizzo e due
messaggi. Che non passino da `request` è giusto — quella risposta è testo e non
JSON — ma è una ragione che vale una volta sola.

`packages/core/src/chart.ts:64` calcola la distribuzione e la butta: viene
rifatta a riga 123, quando anche gli assi e la Parte di Fortuna esistono, ed è
quella la buona. La prima serve solo a costruire un `NatalChart` completo. Costa
un conteggio su tredici elementi, quindi non è una questione di tempo: è che in
un file dove ogni riga ha una ragione ce n'è una che non ne ha, e il commento
accanto spiega la seconda chiamata senza dire niente della prima.

## 14. Il calcolo tiene fermo il server mentre gira

**Da sapere, non da fare** — finché l'applicazione sta su una macchina sola e la
usa chi l'ha avviata.

Misurato: `/api/transits/passages` su tre anni con `moon=true` sono circa 1,9
secondi di calcolo, e il calendario del cielo sullo stesso arco 0,7. Un tema
natale sono due millesimi, quindi il grosso della superficie non c'entra: è la
ricerca delle radici, che campiona e dimezza migliaia di volte.

I tetti ci sono e reggono — `MAX_RANGE_DAYS` a tre anni in
`apps/web/src/lib/server/range.ts:18`, e l'elezione ha il suo di trentun giorni
dentro il motore. Il punto è un altro: quei secondi sono sincroni per
costruzione, e la costruzione è voluta. Il vincolo che vieta `await` nella
catena di calcolo esiste perché Swiss Ephemeris tiene lo zodiaco siderale in
stato globale del modulo nativo, quindi spezzare il calcolo dall'interno non è
un'opzione. Node è a un filo solo: mentre quei due secondi girano, nessun'altra
richiesta viene servita.

Se un giorno l'applicazione sta in rete pubblica il rimedio non è dentro il
motore, è attorno — un worker per richiesta, o una coda. Sta scritto qui perché
è il genere di cosa che si scopre sotto carico, quando progettarla è tardi.

## 15. Le cuspidi non sono ancorate a niente

**Priorità media.** I test del motore verificano le case per proprietà interne:
dodici cuspidi, l'Ascendente opposto al Discendente, i segni interi che
cominciano a zero gradi. Sono controlli veri, e nessuno di essi guarda fuori.

`HOUSE_SYSTEM_CODES` (`packages/core/src/constants.ts:255`) mappa nove nomi su
nove lettere di Swiss Ephemeris. Scambiarne due — Porfirio è `O`, Alcabizio è
`B` — darebbe cuspidi giuste in tutto tranne che nel sistema, e ogni test
resterebbe verde: un risultato plausibile e sbagliato, cioè la specie di errore
che il commento a `validatePlace` chiama la peggiore. Le nove lettere oggi sono
quelle giuste, verificate una per una.

L'unico ancoraggio esterno del motore è il Sole a J2000 in
`packages/core/test/chart.test.ts:30`, con una cifra decimale, più i valori
dell'ayanamsa in `test/ayanamsa.test.ts`. Per le case non c'è niente.

Il rimedio è un tema fissato con le cuspidi dei nove sistemi prese da una fonte
indipendente, confrontate al primo d'arco. Si fa una volta e non si rifà più:
quei valori non cambieranno mai.

Verifica: scambiare due lettere in `HOUSE_SYSTEM_CODES` e vedere cadere il test.

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
