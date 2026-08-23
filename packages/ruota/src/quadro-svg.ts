/**
 * Il quadro vedico come stringa SVG.
 *
 * A differenza della ruota non ha un gemello interattivo, ed è una scelta: la
 * ruota ne ha uno perché ci si sceglie un corpo e se ne isolano gli aspetti,
 * mentre qui non c'è niente di equivalente da offrire — le drishti si contano
 * a segni interi, non sono linee da illuminare. La pagina inserisce quindi
 * **questo stesso disegno**, con la garanzia che il file scaricato e quello a
 * schermo siano lo stesso oggetto. Se un giorno servisse l'interattività, la
 * geometria è già condivisa in `quadro.ts`, che è ciò che renderebbe economico
 * quel cambio.
 *
 * Le tre differenze dal disegno di pagina della ruota valgono anche qui: i
 * colori sono scritti e non ereditati da `var()`, sotto tutto c'è un
 * rettangolo di fondo, e non ci sono bersagli del tocco.
 */

import { SIGN_ELEMENT, SIGN_GLYPH } from './glyphs.js';
import { CHIARA, type Palette } from './palette.js';
import {
  celleQuadro,
  GRAHA_SIGLA,
  QUADRO_SIZE,
  type CellaQuadro,
  type Punto,
  type SquareChart,
  type StileQuadro,
} from './quadro.js';

/** Margine attorno al riquadro: qui niente sporge, serve solo a non tagliare il bordo. */
export const QUADRO_PADDING = 16;

/** I corpi dei caratteri. Nel file non c'è un foglio di stile: ogni misura sta sul nodo. */
const CORPO = {
  glifoSegno: 22,
  numeroCasa: 13,
  sigla: 20,
} as const;

/** Quante sigle stanno su una riga prima di andare a capo. */
const SIGLE_PER_RIGA = 3;

/** Distanza fra due righe di contenuto, in punti. */
const INTERLINEA = 24;

/**
 * Quanto il contenuto di una cella si scosta dal baricentro verso il centro
 * del quadro.
 *
 * Serve ai triangoli d'angolo dello stile del nord: il loro baricentro cade a
 * due terzi verso l'angolo retto, cioè verso lo spigolo esterno, e tre sigle
 * scritte lì sfiorano il bordo. Un dodicesimo di tragitto verso il centro le
 * riporta dentro senza spostarle abbastanza da farle sembrare fuori posto.
 *
 * Sta qui e non in `quadro.ts` di proposito: il baricentro di un poligono è un
 * fatto e resta quello: dove convenga scrivere è una scelta del disegno.
 */
const RIENTRO = 0.12;

const FONT = "'DejaVu Sans', system-ui, sans-serif";

export interface OpzioniQuadro {
  palette?: Palette;
  /**
   * Quale dei due stili. Default: `sud`.
   *
   * Il predefinito è quello che si disegna sempre. Lo stile del nord ha le
   * case fisse e senza lagna non si può disegnare affatto: farlo scegliere
   * esplicitamente evita che un tema senza ora di nascita sollevi da un
   * predefinito che chi chiama non ha scelto.
   */
  stile?: StileQuadro;
  /** Descrizione per chi non vede il disegno. */
  label?: string;
}

/**
 * Disegna il quadro e restituisce un documento SVG completo.
 *
 * Autosufficiente come quello della ruota: si apre in un browser, in un editor
 * vettoriale o si rasterizza.
 *
 * Prende un `SquareChart`, che un `VargaChart` del motore soddisfa così com'è:
 * lo stesso disegno vale per la carta rashi — che è il varga D-1 — e per tutte
 * le divisionali.
 */
export function quadroSvg(chart: SquareChart, opzioni: OpzioniQuadro = {}): string {
  const { palette = CHIARA, stile = 'sud', label } = opzioni;

  const celle = celleQuadro(chart, stile);
  const descrizione =
    label ??
    `Quadro vedico in stile ${stile === 'nord' ? 'nord-indiano' : 'sud-indiano'}, ` +
      'con i nove graha nei dodici segni';

  const pezzi: string[] = [
    `<rect x="${-QUADRO_PADDING}" y="${-QUADRO_PADDING}" width="${
      QUADRO_SIZE + QUADRO_PADDING * 2
    }" height="${QUADRO_SIZE + QUADRO_PADDING * 2}" fill="${palette.sfondo}"/>`,
  ];

  for (const cella of celle) pezzi.push(...disegnaCella(cella, stile, palette));

  const vista = `${-QUADRO_PADDING} ${-QUADRO_PADDING} ${QUADRO_SIZE + QUADRO_PADDING * 2} ${
    QUADRO_SIZE + QUADRO_PADDING * 2
  }`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vista}" width="${
      QUADRO_SIZE + QUADRO_PADDING * 2
    }" height="${QUADRO_SIZE + QUADRO_PADDING * 2}" font-family="${FONT}" role="img" aria-label="${esc(
      descrizione,
    )}">`,
    `<title>${esc(descrizione)}</title>`,
    ...pezzi,
    '</svg>',
  ].join('\n');
}

function disegnaCella(cella: CellaQuadro, stile: StileQuadro, palette: Palette): string[] {
  const pezzi: string[] = [];
  const colore = palette.elementi[SIGN_ELEMENT[cella.sign]];

  // Il bordo del lagna prende l'accento e uno spessore doppio. Nel nord la
  // prima casa sta sempre in alto e il segno sarebbe superfluo; si marca
  // ugualmente, perché chi non conosce la disposizione a memoria non ha altro
  // modo di trovarla.
  pezzi.push(
    `<path d="${percorso(cella.polygon)}" fill="${colore}" fill-opacity="${
      cella.lagna ? 0.14 : 0.05
    }" stroke="${cella.lagna ? palette.accento : palette.quadrante}" stroke-width="${
      cella.lagna ? 2.5 : 1.25
    }"/>`,
  );

  // Il segno del lagna porta anche la diagonale d'angolo, che è il modo in cui
  // lo si marca nei quadri del sud da sempre. Nel nord non si usa: là il lagna
  // è la posizione stessa.
  if (cella.lagna && stile === 'sud') pezzi.push(diagonaleDelLagna(cella.polygon, palette));

  // Il contenuto in righe centrate sul baricentro: l'intestazione col segno e
  // la casa, poi le sigle dei graha. Una pila sola invece di ancoraggi diversi
  // per rombi e triangoli — le forme cambiano, il blocco no.
  const sigle = cella.bodies
    .map((graha) => GRAHA_SIGLA[graha] ?? graha)
    .reduce<string[]>((linee, sigla) => {
      const ultima = linee[linee.length - 1];
      if (ultima && ultima.split(' ').length < SIGLE_PER_RIGA) {
        linee[linee.length - 1] = `${ultima} ${sigla}`;
      } else {
        linee.push(sigla);
      }
      return linee;
    }, []);

  // Il blocco è alto quanto l'intestazione più le righe di sigle, e si centra
  // sull'ancoraggio invece di partire da lì: una cella con tre graha e una
  // vuota devono sembrare riempite allo stesso modo.
  const ancora = versoIlCentro(cella.centro);
  const primaRiga = ancora.y - (sigle.length * INTERLINEA) / 2;

  pezzi.push(
    intestazione(cella, ancora.x, primaRiga, colore, palette),
    ...sigle.map((riga, indice) =>
      testo(ancora.x, primaRiga + (indice + 1) * INTERLINEA, riga, CORPO.sigla, palette.testo),
    ),
  );

  return pezzi;
}

/** Il baricentro tirato di un poco verso il centro del quadro. Vedi `RIENTRO`. */
function versoIlCentro(punto: Punto): Punto {
  const centro = QUADRO_SIZE / 2;
  return {
    x: punto.x + (centro - punto.x) * RIENTRO,
    y: punto.y + (centro - punto.y) * RIENTRO,
  };
}

/** Il glifo del segno e, se c'è, il numero della casa: su una riga sola. */
function intestazione(
  cella: CellaQuadro,
  x: number,
  y: number,
  colore: string,
  palette: Palette,
): string {
  if (cella.house === undefined) {
    return testo(x, y, SIGN_GLYPH[cella.sign], CORPO.glifoSegno, colore);
  }

  // Il numero sta a destra del glifo, più piccolo e più tenue: dice una cosa
  // che nel sud si muove e nel nord è già nella posizione, quindi non deve
  // contendere l'occhio al segno.
  return [
    testo(x - 11, y, SIGN_GLYPH[cella.sign], CORPO.glifoSegno, colore),
    testo(x + 14, y, String(cella.house), CORPO.numeroCasa, palette.testoTenue),
  ].join('\n');
}

/**
 * La diagonale che nel quadro del sud marca la casella del lagna.
 *
 * Va dall'angolo in alto a sinistra della cella verso l'interno, tagliandone
 * un triangolo: è la convenzione con cui questi quadri si stampano, e vale
 * come segno d'orientamento per chi la sa leggere.
 */
function diagonaleDelLagna(polygon: readonly Punto[], palette: Palette): string {
  const xs = polygon.map((punto) => punto.x);
  const ys = polygon.map((punto) => punto.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const lato = Math.max(...xs) - x;
  const taglio = lato * 0.32;

  return `<path d="M ${n(x)} ${n(y + taglio)} L ${n(x + taglio)} ${n(y)}" stroke="${
    palette.accento
  }" stroke-width="2" fill="none"/>`;
}

function percorso(polygon: readonly Punto[]): string {
  const punti = polygon.map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${n(punto.x)} ${n(punto.y)}`);
  return `${punti.join(' ')} Z`;
}

function testo(
  x: number,
  y: number,
  contenuto: string,
  corpoCarattere: number,
  colore: string,
): string {
  return `<text x="${n(x)}" y="${n(
    y,
  )}" font-size="${corpoCarattere}" fill="${colore}" text-anchor="middle" dominant-baseline="central">${esc(
    contenuto,
  )}</text>`;
}

function n(valore: number): string {
  return String(Math.round(valore * 100) / 100);
}

function esc(testoGrezzo: string): string {
  return testoGrezzo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
