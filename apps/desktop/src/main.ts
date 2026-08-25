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
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

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
    serviceName: 'undicesimacasa-web',
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
  const processo = utilityProcess.fork(importScript, [], {
    env: {
      ...process.env,
      GEONAMES_DB_PATH: databasePath,
      GEONAMES_CACHE_DIR: join(app.getPath('userData'), 'geonames-cache'),
    },
    stdio: 'pipe',
    serviceName: 'geo-import',
  });
  splash.on('closed', () => processo.kill());

  const scrivi = (riga: string) => {
    if (!splash.isDestroyed()) splash.webContents.send('riga', riga);
  };
  for (const flusso of [processo.stdout, processo.stderr]) {
    if (flusso) createInterface({ input: flusso }).on('line', scrivi);
  }

  const codice = await new Promise<number>((esce) => processo.once('exit', esce));
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
    title: 'undicesimacasa',
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
      'undicesimacasa',
      errore instanceof Error ? errore.message : String(errore),
    );
    return existsSync(databasePath) ? 'pronto' : 'assente';
  }
}

function creaFinestra(url: string): void {
  finestra = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
  });
  finestra.webContents.setWindowOpenHandler(({ url: esterno }) => {
    if (esterno.startsWith('http:') || esterno.startsWith('https:')) {
      void shell.openExternal(esterno);
    }
    return { action: 'deny' };
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
      'undicesimacasa',
      errore instanceof Error ? errore.message : String(errore),
    );
    app.quit();
    return;
  }

  server.once('exit', (codice) => {
    if (!chiusuraVoluta) {
      dialog.showErrorBox('undicesimacasa', `Il server interno si è arrestato (codice ${codice}).`);
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
