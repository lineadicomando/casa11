/**
 * Processo principale: la web app dentro una finestra.
 *
 * Non calcola nulla e non duplica nulla: avvia il server SvelteKit già
 * compilato (adapter-node) come processo di utilità su una porta libera del
 * loopback e vi punta la finestra. La superficie resta una sola — ciò che
 * funziona sul web funziona identico qui, API comprese.
 *
 * Da impacchettata, l'app trova server e pacchetti in `resources/bundle`
 * (preparato da `scripts/stage.mjs`); in sviluppo usa l'albero del repo,
 * quindi serve una `npm run build` alla radice prima di `npm start`.
 */
import { app, BrowserWindow, dialog, shell, utilityProcess } from 'electron';
import type { UtilityProcess } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

/**
 * Il nome che l'utente vede: titolo della finestra e intestazione dei
 * dialoghi. Qui e non importato da `web`, che non è una libreria: il
 * desktop non dipende da quel pacchetto e non deve cominciare adesso.
 */
const NOME = 'dodicisegni';

// Prima di ogni `getPath`, che di qui in giù non aspetta: `userData` si ricava
// dal nome dell'applicazione, e senza questa riga quel nome è quello del
// pacchetto, scope compreso — una chiocciola e una cartella in mezzo al
// percorso, `~/.config/@dodicisegni/desktop`. È la stessa ragione per cui
// `electron-builder.yml` fissa `executableName` invece di lasciarlo derivare.
app.setName(NOME);

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(appRoot, '..', '..');

/** Radice delle risorse impacchettate; `null` in sviluppo. */
const bundleRoot = app.isPackaged ? join(process.resourcesPath, 'bundle') : null;

const serverEntry = bundleRoot
  ? join(bundleRoot, 'server', 'index.js')
  : join(repoRoot, 'apps', 'web', 'build', 'index.js');

const importScript = bundleRoot
  ? join(bundleRoot, 'node_modules', '@dodicisegni', 'geo', 'scripts', 'import-geonames.mjs')
  : join(repoRoot, 'packages', 'geo', 'scripts', 'import-geonames.mjs');

/**
 * Il database delle località vive in `userData`, non nelle risorse: è un
 * artefatto scaricato al primo avvio, e le risorse sono in sola lettura
 * (un AppImage è un filesystem montato). In sviluppo si riusa quello del
 * repo, così `geo:import` non va ripetuto.
 */
const databasePath =
  process.env['GEONAMES_DB_PATH'] ??
  (app.isPackaged
    ? join(app.getPath('userData'), 'geonames.db')
    : join(repoRoot, 'packages', 'geo', 'data', 'geonames.db'));

let server: UtilityProcess | null = null;
let finestra: BrowserWindow | null = null;
let serverUrl: string | null = null;
let chiusuraVoluta = false;

function portaLibera(): Promise<number> {
  return new Promise((resolve, reject) => {
    const sonda = createServer();
    sonda.once('error', reject);
    sonda.listen(0, '127.0.0.1', () => {
      const indirizzo = sonda.address();
      if (indirizzo === null || typeof indirizzo === 'string') {
        reject(new Error('Nessuna porta libera sul loopback.'));
        return;
      }
      sonda.close(() => resolve(indirizzo.port));
    });
  });
}

function avviaServer(porta: number): UtilityProcess {
  const processo = utilityProcess.fork(serverEntry, [], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(porta),
      GEONAMES_DB_PATH: databasePath,
    },
    stdio: 'pipe',
    serviceName: 'dodicisegni-web',
  });
  processo.stdout?.on('data', (blocco: Buffer) => process.stdout.write(blocco));
  processo.stderr?.on('data', (blocco: Buffer) => process.stderr.write(blocco));
  return processo;
}

async function attendiServer(url: string, processo: UtilityProcess): Promise<void> {
  let uscito: number | null = null;
  processo.once('exit', (codice) => {
    uscito = codice;
  });
  const scadenza = Date.now() + 20_000;
  while (Date.now() < scadenza) {
    if (uscito !== null) {
      throw new Error(`Il server interno si è chiuso subito (codice ${uscito}).`);
    }
    try {
      const risposta = await fetch(url);
      if (risposta.ok) return;
    } catch {
      // Non ancora in ascolto.
    }
    await new Promise((riprova) => setTimeout(riprova, 150));
  }
  throw new Error('Il server interno non ha risposto entro 20 secondi.');
}

/**
 * Scarica il dataset GeoNames riusando lo script del pacchetto `geo`,
 * mostrandone l'avanzamento riga per riga in una finestra dedicata.
 * Chiudere la finestra interrompe l'importazione.
 *
 * Non passa da `utilityProcess` come il server, e la ragione è che qui il
 * figlio deve **finire**. Un `utilityProcess` non esce quando il suo event
 * loop si svuota — il canale col processo padre lo tiene vivo — e lo script di
 * `geo` finisce senza chiamare `process.exit`, che da riga di comando è giusto:
 * aggiungerlo là troncherebbe il riepilogo finale, perché su una pipe
 * `console.log` scrive in modo asincrono. Il risultato era una finestra di
 * avanzamento che restava aperta sull'ultima riga a importazione conclusa.
 * `ELECTRON_RUN_AS_NODE` dà invece al figlio la semantica di Node vera: esce
 * da solo, col suo codice d'uscita e tutto il suo output. Il binario resta
 * quello di Electron, quindi l'ABI non cambia e il modulo nativo di SQLite si
 * carica come prima.
 */
async function importaDatabase(): Promise<void> {
  const splash = new BrowserWindow({
    width: 640,
    height: 480,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: { preload: join(appRoot, 'preload.cjs') },
  });
  await splash.loadFile(join(appRoot, 'splash.html'));

  await mkdir(dirname(databasePath), { recursive: true });
  const processo = spawn(process.execPath, [importScript], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      GEONAMES_DB_PATH: databasePath,
      GEONAMES_CACHE_DIR: join(app.getPath('userData'), 'geonames-cache'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  splash.on('closed', () => processo.kill());

  const scrivi = (riga: string) => {
    if (!splash.isDestroyed()) splash.webContents.send('riga', riga);
  };
  for (const flusso of [processo.stdout, processo.stderr]) {
    if (flusso) createInterface({ input: flusso }).on('line', scrivi);
  }

  // `null` quando il processo muore di segnale, cioè quando la finestra chiusa
  // l'ha interrotto: vale come «non è arrivata in fondo», al pari di un codice
  // diverso da zero.
  const codice = await new Promise<number | null>((esce) => processo.once('exit', esce));
  splash.destroy();
  if (codice !== 0) {
    throw new Error("L'importazione non è andata a buon fine; si può riprovare al prossimo avvio.");
  }
}

type EsitoDatabase = 'pronto' | 'assente' | 'esci';

async function preparaDatabase(): Promise<EsitoDatabase> {
  if (existsSync(databasePath)) return 'pronto';

  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: NOME,
    message: 'Database delle località assente',
    detail:
      'La ricerca delle località usa un database locale costruito dai dati ' +
      'GeoNames: scaricarlo richiede circa 215 MB di traffico e ~90 MB su ' +
      "disco, una volta sola. Senza, il resto dell'app funziona ma le " +
      'località vanno inserite per coordinate.',
    buttons: ['Scarica ora', 'Continua senza', 'Esci'],
    defaultId: 0,
    cancelId: 2,
  });
  if (response === 2) return 'esci';
  if (response === 1) return 'assente';

  try {
    await importaDatabase();
    return 'pronto';
  } catch (errore) {
    dialog.showErrorBox(
      NOME,
      errore instanceof Error ? errore.message : String(errore),
    );
    return existsSync(databasePath) ? 'pronto' : 'assente';
  }
}

/**
 * L'origine di un indirizzo, o `null` se non è un indirizzo.
 *
 * `new URL` solleva su una stringa malformata, e qui una stringa malformata
 * arriva da fuori: vale come «non è la nostra origine», che è la risposta
 * prudente.
 */
function origineDi(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Gli unici schemi che si passano al browser di sistema. */
function apribileFuori(url: string): boolean {
  return url.startsWith('http:') || url.startsWith('https:');
}

function creaFinestra(url: string): void {
  // L'origine e non l'indirizzo: il server interno sta su una porta libera del
  // loopback, sorteggiata a ogni avvio, quindi `url` cambia da una sessione
  // all'altra mentre l'origine è l'unica cosa che si possa confrontare.
  const origineInterna = origineDi(url);

  finestra = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
  });

  // `window.open` e i link con `target="_blank"`.
  finestra.webContents.setWindowOpenHandler(({ url: esterno }) => {
    if (apribileFuori(esterno)) {
      void shell.openExternal(esterno);
    }
    return { action: 'deny' };
  });

  // La navigazione di primo livello, che non passa dal gestore qui sopra.
  // Senza questo, un link esterno cliccato nella finestra caricherebbe il sito
  // remoto dentro il Chromium impacchettato: contenuto di terzi in un motore
  // che non si aggiorna con la fretta di un browser, e — con `autoHideMenuBar`
  // e nessun comando di navigazione — nessun modo di tornare indietro se non
  // riavviando. L'interfaccia mette `target="_blank"` sui link che escono, ma
  // quello è un rimedio che si può dimenticare aggiungendone uno nuovo: questo
  // no, perché non sta nella pagina.
  finestra.webContents.on('will-navigate', (evento, destinazione) => {
    if (origineInterna !== null && origineDi(destinazione) === origineInterna) return;
    evento.preventDefault();
    // Solo `http(s)`: `shell.openExternal` su uno schema qualunque è il modo
    // di far aprire al sistema operativo cose che non sono pagine.
    if (apribileFuori(destinazione)) {
      void shell.openExternal(destinazione);
    }
  });

  void finestra.loadURL(url);
}

async function avvia(): Promise<void> {
  if ((await preparaDatabase()) === 'esci') {
    app.quit();
    return;
  }

  const porta = await portaLibera();
  server = avviaServer(porta);
  serverUrl = `http://127.0.0.1:${porta}/`;
  try {
    await attendiServer(serverUrl, server);
  } catch (errore) {
    dialog.showErrorBox(
      NOME,
      errore instanceof Error ? errore.message : String(errore),
    );
    app.quit();
    return;
  }

  server.once('exit', (codice) => {
    if (!chiusuraVoluta) {
      dialog.showErrorBox(NOME, `Il server interno si è arrestato (codice ${codice}).`);
      app.quit();
    }
  });
  creaFinestra(serverUrl);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (finestra !== null && !finestra.isDestroyed()) {
      if (finestra.isMinimized()) finestra.restore();
      finestra.focus();
    }
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    // macOS: riapre dal dock; il server è ancora vivo.
    if (BrowserWindow.getAllWindows().length === 0 && serverUrl !== null) creaFinestra(serverUrl);
  });
  app.on('will-quit', () => {
    chiusuraVoluta = true;
    server?.kill();
  });
  void app.whenReady().then(avvia);
}
