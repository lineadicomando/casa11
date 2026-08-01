/**
 * La geometria della ruota.
 *
 * Sta fuori dal componente per due ragioni. È la parte che si sbaglia in
 * silenzio — un glifo qualche grado fuori posto non fa fallire nulla, si vede
 * soltanto — e quindi va messa alla prova; ed è la stessa per la ruota
 * semplice del tema e per la bi-ruota dei transiti, che cambiano solo nei
 * raggi degli anelli.
 *
 * Del motore di calcolo si importano i soli **tipi**: un import di valore ne
 * trascinerebbe l'intero grafo nel bundle del browser.
 */

import type {
  Angles,
  Aspect,
  CelestialBody,
  ChartPoint,
  House,
  NatalPointId,
  TransitChart,
} from '@undicesimacasa/core';
import { BODY_GLYPH, POINT_GLYPH } from './glyphs';

/**
 * Quel che alla ruota serve di una carta.
 *
 * Un tipo strutturale invece di `NatalChart`, perché la stessa ruota disegna
 * il cielo di un istante — che non ha nascita, e quindi nemmeno Parte di
 * Fortuna. Elencare qui i campi usati dice anche quanto poco ne serva.
 */
export interface WheelChart {
  bodies: readonly CelestialBody[];
  houses: readonly House[];
  angles?: Angles;
  partOfFortune?: ChartPoint;
  aspects: readonly Aspect[];
}

export const SIZE = 800;
export const CENTER = SIZE / 2;
/** Margine attorno al riquadro: le etichette degli assi sporgono dal cerchio. */
export const PADDING = 26;

/** I raggi degli anelli concentrici, dall'esterno verso l'interno. */
export interface WheelRadii {
  zodiacOuter: number;
  zodiacInner: number;
  /** Anello dei corpi in transito. Assente nella ruota semplice. */
  outerBodies?: number;
  /** Dove cominciano le cuspidi: sotto l'anello esterno, se c'è. */
  houseSpanOuter: number;
  houses: number;
  /**
   * Raggio dei numeri delle case.
   *
   * Sta **fuori** dalla fascia dei corpi: alla loro stessa altezza un pianeta
   * a metà casa finiva sopra il numero, e a metà casa i pianeti ci vanno
   * spesso. Qui il numero è invece alla massima distanza dalle due cuspidi
   * che lo delimitano, perché lo si disegna a metà del settore.
   */
  houseNumbers: number;
  bodies: number;
  aspects: number;
  /** Distanza angolare minima fra due glifi dell'anello dei corpi. */
  separation: number;
  /** La stessa, per l'anello esterno: più largo, quindi tollera meno gradi. */
  outerSeparation: number;
}

const SINGLE: WheelRadii = {
  zodiacOuter: 390,
  zodiacInner: 335,
  houseSpanOuter: 335,
  houses: 300,
  houseNumbers: 316,
  bodies: 268,
  aspects: 232,
  separation: 7,
  outerSeparation: 7,
};

/**
 * Con due insiemi di corpi gli anelli interni si stringono per far posto ai
 * transiti, che stanno fuori: è la convenzione della bi-ruota, e mette i
 * transitanti dalla parte del cielo che si muove.
 *
 * I glifi dell'anello interno vogliono più gradi di separazione proprio
 * perché il raggio è minore: a parità di angolo l'arco è più corto.
 */
const DOUBLE: WheelRadii = {
  zodiacOuter: 390,
  zodiacInner: 335,
  outerBodies: 306,
  houseSpanOuter: 282,
  houses: 258,
  houseNumbers: 270,
  bodies: 228,
  aspects: 196,
  separation: 8,
  outerSeparation: 6,
};

export function radiiFor(withOuterRing: boolean): WheelRadii {
  return withOuterRing ? DOUBLE : SINGLE;
}

/**
 * Converte una longitudine eclittica in coordinate sullo schermo.
 *
 * L'origine è a sinistra — dove si pone `rotation`, cioè l'Ascendente — e le
 * longitudini crescenti scendono verso il basso, verso il Fondo Cielo, come
 * in una carta tracciata a mano.
 */
export function polar(
  longitude: number,
  radius: number,
  rotation: number,
): { x: number; y: number } {
  const angle = ((180 + (longitude - rotation)) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER - radius * Math.sin(angle),
  };
}

/**
 * Percorso di un arco lungo il cerchio degli aspetti.
 *
 * Serve alle congiunzioni. Disegnate come corda, fra due longitudini che
 * quasi coincidono, si riducono a un punto invisibile — e nei transiti la
 * congiunzione è l'aspetto che conta di più. L'arco invece si vede, e la sua
 * ampiezza **è** l'orbita: dice qualcosa invece di essere un espediente.
 *
 * `minSpan` gli dà una lunghezza minima, perché un'orbita di pochi primi
 * resterebbe comunque invisibile.
 */
export function arcPath(
  from: number,
  to: number,
  radius: number,
  rotation: number,
  minSpan = 0,
): string {
  const forward = (to - from + 360) % 360;
  // Sempre per la via breve: fra due punti in aspetto l'arco lungo passerebbe
  // dall'altra parte della ruota.
  const [start, span] = forward <= 180 ? [from, forward] : [to, 360 - forward];

  const widened = Math.max(span, minSpan);
  const begin = start - (widened - span) / 2;
  const end = begin + widened;

  const a = polar(begin, radius, rotation);
  const b = polar(end, radius, rotation);
  // Longitudini crescenti girano in senso antiorario sullo schermo: per l'arco
  // SVG è il verso negativo, quindi sweep 0.
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 0 ${b.x} ${b.y}`;
}

/** Un corpo o un punto da disegnare sulla ruota. */
export interface WheelPoint {
  id: string;
  glyph: string;
  /** Longitudine vera: trattini e linee degli aspetti restano ancorati a questa. */
  longitude: number;
  retrograde: boolean;
  /** Descrizione a parole, per chi non vede il disegno. */
  label: string;
}

export interface PlacedPoint {
  point: WheelPoint;
  /** Longitudine di disegno del glifo, distanziata dai vicini. */
  display: number;
}

/**
 * Distanzia i glifi troppo vicini fra loro.
 *
 * A spostarsi è il solo glifo: la longitudine vera resta quella del punto,
 * così che uno stellium diventi leggibile senza mentire sulle posizioni.
 *
 * Il cerchio viene prima **tagliato nel vuoto più ampio** e steso in una
 * sequenza crescente. Su un cerchio due glifi spinti in direzioni opposte
 * possono scavalcarsi — il vicino di destra finisce a sinistra — e da lì in
 * poi ogni passata allontana la coppia sbagliata; in linea l'ordine non si
 * può perdere, perché spingere due vicini li porta al più a toccarsi.
 */
export function spread(points: readonly WheelPoint[], minSeparation: number): PlacedPoint[] {
  const sorted = [...points].sort((a, b) => a.longitude - b.longitude);
  if (sorted.length < 2) {
    return sorted.map((point) => ({ point, display: point.longitude }));
  }

  const ordered = fromWidestGap(sorted);
  const origin = ordered[0]!.longitude;
  // Coordinate stese: crescenti e non più modulari, a partire dal taglio.
  const display = ordered.map((point) => origin + ((point.longitude - origin + 360) % 360));

  for (let pass = 0; pass < 60; pass += 1) {
    let moved = false;
    for (let i = 1; i < display.length; i += 1) {
      const gap = display[i]! - display[i - 1]!;
      if (gap < minSeparation) {
        const push = (minSeparation - gap) / 2;
        display[i - 1] = display[i - 1]! - push;
        display[i] = display[i]! + push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return ordered
    .map((point, i) => ({ point, display: normalize360(display[i]!) }))
    .sort((a, b) => a.point.longitude - b.point.longitude);
}

/**
 * Rimette in fila i punti a partire da quello che segue il vuoto più ampio.
 *
 * È lì che il cerchio si può tagliare senza spezzare un gruppo: il taglio
 * cade dove i glifi non si contendono lo spazio.
 */
function fromWidestGap(sorted: readonly WheelPoint[]): WheelPoint[] {
  let seam = 0;
  let widest = -1;

  for (let i = 0; i < sorted.length; i += 1) {
    const next = sorted[(i + 1) % sorted.length]!;
    const gap = (next.longitude - sorted[i]!.longitude + 360) % 360;
    if (gap > widest) {
      widest = gap;
      seam = (i + 1) % sorted.length;
    }
  }

  return [...sorted.slice(seam), ...sorted.slice(0, seam)];
}

function normalize360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** I corpi della carta, con la Parte di Fortuna se è stata calcolata. */
export function natalWheelPoints(chart: WheelChart): WheelPoint[] {
  const points: WheelPoint[] = chart.bodies.map((body) => ({
    id: body.id,
    glyph: BODY_GLYPH[body.id],
    longitude: body.longitude,
    retrograde: body.retrograde,
    label: bodyLabel(body),
  }));

  if (chart.partOfFortune) {
    const { longitude, signDegree, sign, house } = chart.partOfFortune;
    points.push({
      id: 'fortuna',
      glyph: POINT_GLYPH.fortuna,
      longitude,
      retrograde: false,
      label: `Parte di Fortuna a ${signDegree.toFixed(0)} gradi ${sign}${house !== undefined ? `, casa ${house}` : ''}`,
    });
  }

  return points;
}

/** I corpi in transito, che vanno nell'anello esterno. */
export function transitWheelPoints(transits: TransitChart): WheelPoint[] {
  return transits.transiting.map((body) => ({
    id: body.id,
    glyph: BODY_GLYPH[body.id],
    longitude: body.longitude,
    retrograde: body.retrograde,
    label: `${bodyLabel(body)}, in transito`,
  }));
}

/**
 * La longitudine di un bersaglio natale, corpo o asse che sia.
 *
 * `undefined` quando il punto non c'è — un asse in un tema senza ora — così
 * che la linea dell'aspetto non venga tracciata verso il centro della ruota.
 */
export function natalPointLongitude(chart: WheelChart, id: NatalPointId): number | undefined {
  if (chart.angles) {
    if (id === 'ascendente') return chart.angles.ascendant;
    if (id === 'medio-cielo') return chart.angles.midheaven;
    if (id === 'discendente') return chart.angles.descendant;
    if (id === 'fondo-cielo') return chart.angles.imumCoeli;
  }
  if (id === 'fortuna') return chart.partOfFortune?.longitude;
  return chart.bodies.find((body) => body.id === id)?.longitude;
}

function bodyLabel(body: CelestialBody): string {
  const house = body.house !== undefined ? `, casa ${body.house}` : '';
  const retrograde = body.retrograde ? ', retrogrado' : '';
  return `${body.name} a ${body.signDegree.toFixed(0)} gradi ${body.sign}${house}${retrograde}`;
}
