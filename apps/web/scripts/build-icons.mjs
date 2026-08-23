/**
 * Le immagini a punti del sito: le icone dell'installazione e l'anteprima dei
 * collegamenti condivisi.
 *
 * Né Safari né il manifesto guardano l'SVG: senza questi file chi aggiunge il
 * sito alla schermata iniziale si ritrova un rettangolo bianco con dentro una
 * miniatura della pagina, e su Android l'installazione non viene nemmeno
 * offerta. Un'anteprima, allo stesso modo, vuole un PNG — nessuna piattaforma
 * disegna un SVG. Sono i soli posti in tutto il progetto in cui servano
 * immagini a punti, e non ha senso versionarne copie che poi divergono dal
 * disegno: si generano dal favicon, che è la fonte.
 *
 * Gira prima del `build` e prima del `dev`, e non fa niente quando i PNG sono
 * già più recenti di ciò da cui vengono — un avvio di sviluppo non deve pagare
 * una rasterizzazione per un file che nessuno ha toccato.
 */

import { Resvg } from '@resvg/resvg-js';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = dirname(fileURLToPath(import.meta.url));
const SORGENTE = join(QUI, '..', 'static', 'favicon.svg');
const STATIC = join(QUI, '..', 'static');

/**
 * Da che cosa dipendono i PNG: il disegno e **questo script**.
 *
 * Il secondo non è pignoleria. Le misure e la geometria dell'icona mascherabile
 * — la stretta, il fondo pieno — stanno qui e non nel favicon: cambiarle senza
 * toccare l'SVG lascerebbe in circolazione i PNG di prima, che è il modo
 * peggiore di sbagliare — nessun errore, e l'icona vecchia.
 */
const FONTI = [SORGENTE, fileURLToPath(import.meta.url)];

/**
 * Quanto la stella si stringe nell'icona mascherabile.
 *
 * Una `maskable` viene ritagliata dalla piattaforma con la forma che preferisce
 * — cerchio, goccia, quadrato smussato — e può mangiarsi il 20% di ogni lato:
 * quello che deve sopravvivere sta nel cerchio centrale all'80%. Nel favicon la
 * stella arriva a 27 su 64 di raggio, cioè 0,84 di diametro, e una maschera
 * tonda le taglierebbe le punte. Da 27 a 19 il diametro scende a 0,59, dentro
 * lo 0,8 con dell'aria intorno invece che al pelo.
 */
const STRETTA = 19 / 27;

/**
 * Le uscite. `mascherabile` distingue le due forme del disegno: il favicon così
 * com'è, oppure la stella rimontata a sagoma piena per la maschera.
 */
const ICONE = [
  // 180 punti: la misura che iOS chiede agli schermi a tripla densità, ed è la
  // più grande fra quelle che chiede. Le altre le ricava lui riducendo, che è
  // l'operazione che riesce bene; ingrandire no.
  { file: 'apple-touch-icon.png', lato: 180, mascherabile: false },
  // Le due misure che il manifesto dichiara: 192 è quella dell'icona sulla
  // schermata iniziale di Android, 512 quella della schermata di avvio, ed è
  // anche il minimo che i browser chiedono per offrire l'installazione.
  { file: 'icon-192.png', lato: 192, mascherabile: false },
  { file: 'icon-512.png', lato: 512, mascherabile: false },
  { file: 'icon-maskable-512.png', lato: 512, mascherabile: true },
];

/** `true` se il PNG esiste ed è più recente di tutto ciò da cui dipende. */
async function aggiornato(destinazione) {
  try {
    const [uscita, ...entrate] = await Promise.all([
      stat(destinazione),
      ...FONTI.map((fonte) => stat(fonte)),
    ]);
    return entrate.every((entrata) => uscita.mtimeMs >= entrata.mtimeMs);
  } catch {
    return false;
  }
}

/**
 * Prende dal favicon la stella e il colore del suo riquadro.
 *
 * Estrarli invece di riscriverli qui è ciò che tiene una sorgente sola: il
 * tracciato della stella è dodici punte di coordinate, e una seconda copia
 * diverge alla prima correzione. Se il disegno cambia forma — due tracciati, un
 * `<g>` intorno — l'estrazione fallisce a voce alta invece di produrre in
 * silenzio un'icona sbagliata.
 */
function scomponi(svg) {
  const stelle = svg.match(/<path\b[^>]*\/>/g) ?? [];
  if (stelle.length !== 1) {
    throw new Error(
      `favicon.svg: atteso un solo <path>, trovati ${stelle.length}. ` +
        'Il disegno è cambiato: aggiornare questo script.',
    );
  }

  const fondo = svg.match(/<rect\b[^>]*\bfill="([^"]+)"/);
  if (!fondo) {
    throw new Error('favicon.svg: nessun <rect> con un fill da cui prendere il fondo.');
  }

  return { stella: stelle[0], fondo: fondo[1] };
}

/**
 * La stella su un quadrato pieno, senza angoli arrotondati.
 *
 * L'arrotondamento del favicon qui è di troppo per due volte: la piattaforma
 * applica già la propria maschera, e due smussi sovrapposti lasciano una
 * frangia scura lungo il bordo. Il fondo invece resta e deve arrivare fino al
 * taglio, perché è quello che tiene l'oro leggibile — vedi il commento dentro
 * `favicon.svg`.
 */
function mascherabile(svg) {
  const { stella, fondo } = scomponi(svg);
  const scala = STRETTA.toFixed(4);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${fondo}"/>
  <g transform="translate(32 32) scale(${scala}) translate(-32 -32)">${stella}</g>
</svg>`;
}

const svg = await readFile(SORGENTE, 'utf8');

for (const { file, lato, mascherabile: conMaschera } of ICONE) {
  const destinazione = join(STATIC, file);
  if (await aggiornato(destinazione)) continue;

  // Il favicon disegna già il proprio fondo scuro fino ai bordi, quindi non
  // serve dipingerne uno: quello che iOS non ammette è la trasparenza, e qui
  // non ce n'è. `fitTo` scala il disegno alla misura chiesta invece di
  // ritagliarlo, che è la differenza fra un'icona e un dettaglio di un'icona.
  const resvg = new Resvg(conMaschera ? mascherabile(svg) : svg, {
    fitTo: { mode: 'width', value: lato },
  });
  const png = resvg.render().asPng();

  await mkdir(STATIC, { recursive: true });
  await writeFile(destinazione, png);

  console.log(`${file} — ${lato}×${lato}, ${(png.length / 1024).toFixed(1)} kB`);
}

/**
 * L'anteprima dei collegamenti condivisi: 1200×630, il sigillo su fondo scuro.
 *
 * **Senza una riga di testo, ed è una scelta obbligata.** Questo script gira
 * nello stage di compilazione dell'immagine Docker, che è una `slim` e non ha
 * font installati: là dentro resvg non troverebbe niente con cui disegnare le
 * lettere e il PNG uscirebbe muto, senza errori. È lo stesso inciampo che il
 * `Dockerfile` risolve per la ruota installando DejaVu **nel runtime** — ma il
 * runtime è un altro stage, e questo file nasce prima. Metterci il nome
 * significherebbe portarsi i font anche nella compilazione per una stringa che
 * l'anteprima ha già: `og:title` sta scritto accanto all'immagine in ogni
 * piattaforma che la mostri, e ripeterlo nei pixel non aggiunge niente.
 *
 * Il disegno è la griglia da 100 del marchio, portata al centro della tela: i
 * due cerchi con le misure di `components/Marchio.svelte`, e al centro la
 * stella del favicon. **La fascia resta vuota**: là dentro vanno ☉ e ☽, che
 * sono glifi scritti, e riempirla d'altro non sarebbe più il marchio.
 *
 * La stella è quella piena del favicon e non quella di tratto del marchio, e
 * non è un ripiego: un'anteprima si guarda piccola — in una conversazione sta
 * su duecento punti di larghezza — e a quella misura le corde interne del
 * {12/5} si chiudono in una macchia, che è esattamente l'argomento con cui il
 * favicon le aveva già tolte. La sagoma è la stessa; vedi `static/favicon.svg`.
 */
const SOCIALE = { file: 'og.png', larghezza: 1200, altezza: 630 };

/**
 * Il diametro del sigillo sulla tela, in punti: il cerchio esterno del marchio.
 *
 * 460 su 630 d'altezza lascia un'ottantina di punti d'aria sopra e sotto. Più
 * grande il sigillo tocca i bordi in un'anteprima che le piattaforme ritagliano
 * volentieri; più piccolo diventa un bollino in mezzo al nero.
 */
const SIGILLO = 460;

/**
 * Il colore del tratto: `--testo` dell'aspetto scuro, preso da `app.css`.
 *
 * Nel marchio i cerchi valgono `currentColor` e seguono l'aspetto scelto; qui
 * di aspetti non ce n'è, perché il fondo è quello del favicon ed è scuro
 * sempre — un'immagine condivisa non sa su che pagina finirà.
 */
const TRATTO = '#ebe7de';

function anteprima(svg) {
  const { stella, fondo } = scomponi(svg);

  // Dalla griglia da 100 del marchio alla tela. Il sigillo va al centro:
  // `translate(-50 -50)` dopo la scala rimette l'origine della griglia dove
  // deve stare, che è il modo di centrare senza calcolare due offset.
  const scala = (SIGILLO / 100).toFixed(4);
  const centro = `translate(${SOCIALE.larghezza / 2} ${SOCIALE.altezza / 2}) scale(${scala}) translate(-50 -50)`;

  // La stella del favicon vive in una griglia da 64 col raggio a 27; nel
  // marchio è a 32 su 100. Questa è la conversione fra le due, e non una
  // misura scelta: cambiando il favicon cambia da sé.
  const stellaNelMarchio = `translate(50 50) scale(${(32 / 27).toFixed(4)}) translate(-32 -32)`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIALE.larghezza}" height="${SOCIALE.altezza}" viewBox="0 0 ${SOCIALE.larghezza} ${SOCIALE.altezza}">
  <rect width="${SOCIALE.larghezza}" height="${SOCIALE.altezza}" fill="${fondo}"/>
  <g transform="${centro}">
    <g fill="none" stroke="${TRATTO}" stroke-width="0.9">
      <circle cx="50" cy="50" r="47.5"/>
      <circle cx="50" cy="50" r="35.5"/>
    </g>
    <g transform="${stellaNelMarchio}">${stella}</g>
  </g>
</svg>`;
}

const destinazioneSociale = join(STATIC, SOCIALE.file);

if (!(await aggiornato(destinazioneSociale))) {
  const resvg = new Resvg(anteprima(svg), {
    fitTo: { mode: 'width', value: SOCIALE.larghezza },
  });
  const png = resvg.render().asPng();

  await writeFile(destinazioneSociale, png);

  console.log(
    `${SOCIALE.file} — ${SOCIALE.larghezza}×${SOCIALE.altezza}, ${(png.length / 1024).toFixed(1)} kB`,
  );
}
