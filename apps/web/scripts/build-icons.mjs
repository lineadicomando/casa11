/**
 * L'icona per la schermata iniziale di iOS.
 *
 * Safari vuole un PNG e non guarda l'SVG: senza, chi aggiunge il sito alla
 * schermata iniziale si ritrova un rettangolo bianco con dentro una miniatura
 * della pagina. È l'unico posto in tutto il progetto in cui serva un'immagine a
 * punti, e per una sola immagine non ha senso versionarne una copia che poi
 * diverge dal disegno: si genera dal favicon, che è la fonte.
 *
 * Gira prima del `build` e prima del `dev`, e non fa niente quando il PNG è già
 * più recente del suo SVG — un avvio di sviluppo non deve pagare una
 * rasterizzazione per un file che nessuno ha toccato.
 */

import { Resvg } from '@resvg/resvg-js';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = dirname(fileURLToPath(import.meta.url));
const SORGENTE = join(QUI, '..', 'static', 'favicon.svg');
const DESTINAZIONE = join(QUI, '..', 'static', 'apple-touch-icon.png');

/**
 * 180 punti: la misura che iOS chiede agli schermi a tripla densità, ed è la
 * più grande fra quelle che chiede. Le altre le ricava lui riducendo, che è
 * l'operazione che riesce bene; ingrandire no.
 */
const LATO = 180;

/** `true` se il PNG esiste ed è più recente del disegno da cui viene. */
async function aggiornato() {
  try {
    const [sorgente, destinazione] = await Promise.all([stat(SORGENTE), stat(DESTINAZIONE)]);
    return destinazione.mtimeMs >= sorgente.mtimeMs;
  } catch {
    return false;
  }
}

if (await aggiornato()) {
  process.exit(0);
}

const svg = await readFile(SORGENTE);

// Il favicon disegna già il proprio fondo scuro fino ai bordi, quindi non
// serve dipingerne uno: quello che iOS non ammette è la trasparenza, e qui
// non ce n'è. `fitTo` scala il disegno alla misura chiesta invece di
// ritagliarlo, che è la differenza fra un'icona e un dettaglio di un'icona.
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: LATO } });
const png = resvg.render().asPng();

await mkdir(dirname(DESTINAZIONE), { recursive: true });
await writeFile(DESTINAZIONE, png);

console.log(`apple-touch-icon.png — ${LATO}×${LATO}, ${(png.length / 1024).toFixed(1)} kB`);
