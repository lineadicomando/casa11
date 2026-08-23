/**
 * La ruota rasterizzata.
 *
 * Sta in un punto d'ingresso separato — `@undicesimacasa/ruota/png` — e non
 * nell'indice: porta con sé un modulo nativo, e il bundle del browser non deve
 * avere modo di incontrarlo. Chi disegna nella pagina importa dalla radice e
 * questo file non lo vede nemmeno.
 *
 * Serve a una cosa sola, ma è quella che il resto non sa fare: un agente non
 * *vede* un SVG, lo legge come testo. Per mostrare la carta in una
 * conversazione ci vuole un raster, e per un raster ci vuole un font vero.
 */

import { Resvg } from '@resvg/resvg-js';
import { existsSync } from 'node:fs';
import { quadroSvg, QUADRO_PADDING, type OpzioniQuadro } from './quadro-svg.js';
import { QUADRO_SIZE, type SquareChart } from './quadro.js';
import { ruotaSvg, type OpzioniDisegno } from './svg.js';
import { PADDING, SIZE, type WheelChart } from './wheel.js';

/**
 * Dove cercare i font, oltre a quelli che il sistema dichiara.
 *
 * `loadSystemFonts` da solo **non basta su Linux**: per trovare i font
 * installati si appoggia a fontconfig, che in un'immagine `slim` non c'è —
 * i file `.ttf` sono lì, in `/usr/share/fonts`, e nessuno li guarda. Il
 * risultato non è un ripiego su un font qualunque: è un PNG in cui il testo
 * *non viene disegnato affatto*. Niente glifi, niente numeri delle case,
 * niente sigle degli assi — una ruota di sole linee, che sembra un disegno
 * riuscito finché non la si legge.
 *
 * Elencare le cartelle standard costa un `existsSync` e toglie di mezzo il
 * problema. Le inesistenti si scartano: passarle a resvg non è un errore, ma
 * un elenco onesto dice meglio che cosa è stato davvero cercato.
 */
const CARTELLE_DI_SISTEMA = [
  '/usr/share/fonts',
  '/usr/local/share/fonts',
  '/System/Library/Fonts',
  '/Library/Fonts',
];

/**
 * Larghezza predefinita, in punti.
 *
 * Il doppio del riquadro di vista, che è la stessa scala del pulsante «Scarica
 * PNG» nella pagina: regge lo zoom e la stampa senza che i glifi si sgranino.
 */
export const LARGHEZZA_PREDEFINITA = (SIZE + PADDING * 2) * 2;

export interface OpzioniPng extends OpzioniDisegno {
  /** Larghezza dell'immagine in punti. L'altezza segue, il disegno è quadrato. */
  larghezza?: number;
  /**
   * Cartelle in cui cercare i font, **in aggiunta** a quelle standard.
   *
   * Non serve indicarle per il caso normale: vedi `CARTELLE_DI_SISTEMA`, che
   * copre le posizioni consuete. Serve a chi tiene i font altrove.
   */
  cartelleFont?: readonly string[];
}

/**
 * Disegna la ruota e la rasterizza.
 *
 * Restituisce i byte del PNG. Chi deve passarli a un agente li codifica in
 * base64; chi li deve salvare li scrive così come sono.
 */
export function ruotaPng(chart: WheelChart, opzioni: OpzioniPng = {}): Buffer {
  const { larghezza = LARGHEZZA_PREDEFINITA, cartelleFont, ...disegno } = opzioni;

  return rasterizza(ruotaSvg(chart, disegno), larghezza, cartelleFont);
}

export interface OpzioniQuadroPng extends OpzioniQuadro {
  /** Larghezza dell'immagine in punti. L'altezza segue, il disegno è quadrato. */
  larghezza?: number;
  /** Cartelle in cui cercare i font, in aggiunta a quelle standard. */
  cartelleFont?: readonly string[];
}

/** Larghezza predefinita del quadro. Stessa scala della ruota. */
export const LARGHEZZA_QUADRO = (QUADRO_SIZE + QUADRO_PADDING * 2) * 2;

/** Disegna il quadro vedico e lo rasterizza. */
export function quadroPng(chart: SquareChart, opzioni: OpzioniQuadroPng = {}): Buffer {
  const { larghezza = LARGHEZZA_QUADRO, cartelleFont, ...disegno } = opzioni;

  return rasterizza(quadroSvg(chart, disegno), larghezza, cartelleFont);
}

/**
 * Da SVG a PNG, con i font trovati davvero.
 *
 * Una funzione sola per i due disegni, e non è pulizia: la parte di valore qui
 * è l'elenco delle cartelle — senza, su un'immagine `slim` il PNG esce **senza
 * testo**, e sembra un disegno riuscito finché non lo si legge. Duplicarla
 * significherebbe che un giorno uno dei due la perde.
 */
function rasterizza(
  svg: string,
  larghezza: number,
  cartelleFont: readonly string[] | undefined,
): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: larghezza },
    font: {
      loadSystemFonts: true,
      fontDirs: cartelleFont ? [...cartelleFont, ...cartelleEsistenti()] : cartelleEsistenti(),
      // Se il font nominato nell'SVG manca, meglio ripiegare su un font di
      // testo qualunque che sulla scelta predefinita di resvg, che su una
      // macchina spoglia può non esistere affatto.
      defaultFontFamily: 'DejaVu Sans',
    },
  });

  return Buffer.from(resvg.render().asPng());
}

/** Le cartelle standard che esistono davvero su questa macchina. */
function cartelleEsistenti(): string[] {
  return CARTELLE_DI_SISTEMA.filter((cartella) => existsSync(cartella));
}
