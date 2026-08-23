/**
 * La geometria del quadro vedico, nei due stili in cui si disegna.
 *
 * Sta fuori dalla resa per la stessa ragione di `wheel.ts`: **è la parte che
 * si sbaglia in silenzio.** Un rombo venti punti fuori posto non fa fallire
 * niente, si vede soltanto — e nello stile del nord, dove le case stanno ferme
 * e i segni si spostano, invertire il verso di conteggio produce un disegno
 * impeccabile e completamente falso.
 *
 * ## I due stili
 *
 * **Sud**: una griglia 4×4 di cui si usano le dodici celle di bordo. **I segni
 * sono fissi** — l'Ariete sta sempre nella stessa casella — e a muoversi sono
 * le case, che partono da quella del lagna e proseguono in senso orario.
 *
 * **Nord**: un quadrato coi due diagonali e il rombo che unisce i punti medi
 * dei lati, da cui quattro rombi e otto triangoli. **Le case sono fisse** — la
 * prima è sempre il rombo in alto — e a muoversi sono i segni, in senso
 * antiorario.
 *
 * ## Perché una funzione sola
 *
 * La differenza fra i due è quale asse si inchioda alla pagina, non che cosa
 * si dice. Il conteggio delle case è **lo stesso identico calcolo** in
 * entrambi, e `caseDalLagna` è l'unico posto in cui vive: è questo, in codice,
 * il fatto che la differenza sia di presentazione e non di dottrina. Finché le
 * case si contano a segni interi — e il motore il tema vedico lo calcola così
 * e basta — dalle celle di uno stile si ricavano quelle dell'altro senza
 * perdere niente.
 */

import type { BodyId, ZodiacSign } from './types.js';
import { ZODIAC_ORDER } from './glyphs.js';

/** Lo stile del quadro: quello del nord o quello del sud dell'India. */
export type StileQuadro = 'nord' | 'sud';

/**
 * Quel che al quadro serve di una carta.
 *
 * Un tipo strutturale, come `WheelChart`: un `VargaChart` del motore lo
 * soddisfa senza conversioni, e vale quindi per la carta rashi — che è il
 * varga D-1 — come per tutte le divisionali. È il motivo per cui un renderer
 * solo le disegna tutte.
 */
export interface SquareChart {
  positions: readonly { id: BodyId; sign: ZodiacSign }[];
  /** Il segno del lagna. Assente se il tema non ha un Ascendente. */
  ascendant?: ZodiacSign;
}

/**
 * I nove graha, e nessun altro.
 *
 * Il quadro **filtra**, e non è la stessa scelta fatta per i nakshatra. Là si
 * trattava di una divisione del cerchio, che ogni longitudine ha per
 * costruzione, e togliere Urano sarebbe stato il motore a decidere chi conta.
 * Qui si tratta di una **forma con una dottrina attaccata**: il Jyotisha ne
 * conta nove, ed è più vecchio dei tre moderni di qualche millennio. Urano
 * dentro un nord-indiano si vede subito che non ci va.
 *
 * È lo stesso confine delle drishti, dove l'esclusione è del sistema e non
 * nostra.
 */
export const GRAHA: readonly BodyId[] = [
  'sole',
  'luna',
  'mercurio',
  'venere',
  'marte',
  'giove',
  'saturno',
  'nodo-nord',
  'nodo-sud',
];

/**
 * Le sigle a due lettere con cui i graha si scrivono dentro una cella.
 *
 * Non i glifi di `BODY_GLYPH`: in una casella che al massimo è un ottavo del
 * riquadro ce ne stanno tre o quattro per riga, e la convenzione dei quadri
 * vedici è questa. Rahu e Ketu, non i nodi.
 */
export const GRAHA_SIGLA: Readonly<Partial<Record<BodyId, string>>> = {
  sole: 'Su',
  luna: 'Mo',
  marte: 'Ma',
  mercurio: 'Me',
  giove: 'Ju',
  venere: 'Ve',
  saturno: 'Sa',
  'nodo-nord': 'Ra',
  'nodo-sud': 'Ke',
};

/** Il lato del riquadro, in punti. Come la ruota, per stare nelle stesse cornici. */
export const QUADRO_SIZE = 800;

export interface Punto {
  x: number;
  y: number;
}

/** Una delle dodici celle del quadro. */
export interface CellaQuadro {
  /** Il segno che la cella tiene. */
  sign: ZodiacSign;
  /**
   * La casa, 1-12, contata dal lagna a segni interi.
   *
   * Assente quando il tema non ha un lagna: allora le celle ci sono lo stesso
   * — i segni non dipendono dall'ora di nascita — ma non sono case di
   * nessuno.
   */
  house?: number;
  /** Il poligono della cella, in punti sul riquadro `QUADRO_SIZE`. */
  polygon: readonly Punto[];
  /** Il baricentro: dove va il contenuto della cella. */
  centro: Punto;
  /** I graha che stanno in quel segno, nell'ordine dei nove. */
  bodies: readonly BodyId[];
  /** `true` per la cella che ospita il lagna. */
  lagna: boolean;
}

/**
 * La casa di un segno, contata dal lagna.
 *
 * Il segno del lagna è la prima, il successivo la seconda, e così via a segni
 * interi. **Un calcolo solo per tutti e due gli stili**: è la differenza fra
 * come i due quadri si disegnano e come si leggono, che non esiste.
 */
export function caseDalLagna(sign: ZodiacSign, ascendant: ZodiacSign): number {
  const scarto = ZODIAC_ORDER.indexOf(sign) - ZODIAC_ORDER.indexOf(ascendant);
  return ((scarto % 12) + 12) % 12 + 1;
}

/**
 * Le dodici celle di un quadro, nell'ordine in cui vanno disegnate.
 *
 * Nello stile del sud l'ordine è quello dei segni, che sono fissi; in quello
 * del nord è quello delle case, che sono fisse. In entrambi i casi le celle
 * sono dodici e coprono il riquadro.
 *
 * Lo stile del nord **richiede un lagna**: le sue caselle sono case, e senza
 * un Ascendente non c'è una prima casa da mettere in alto. Chiederlo lo stesso
 * è un errore di programmazione, non un dato mancante, e quindi solleva invece
 * di ripiegare — un quadro del nord con la prima casa messa a caso sarebbe
 * indistinguibile da uno giusto.
 */
export function celleQuadro(chart: SquareChart, stile: StileQuadro): CellaQuadro[] {
  if (stile === 'nord' && !chart.ascendant) {
    throw new Error(
      'Il quadro del nord ha le case fisse: senza lagna non c\'è una prima casa da ' +
        'mettere in alto. Con un tema senza ora di nascita si può disegnare solo lo ' +
        'stile del sud, dove a essere fissi sono i segni.',
    );
  }

  const abitanti = graharPerSegno(chart);
  const { ascendant } = chart;

  if (stile === 'sud') {
    return ZODIAC_ORDER.map((sign, indice) => {
      const polygon = cellaDellaGriglia(CASELLE_SUD[indice] as readonly [number, number]);
      return {
        sign,
        ...(ascendant ? { house: caseDalLagna(sign, ascendant) } : {}),
        polygon,
        centro: baricentro(polygon),
        bodies: abitanti.get(sign) ?? [],
        lagna: sign === ascendant,
      };
    });
  }

  // Nel nord si parte dalle case, che stanno ferme, e si cerca quale segno
  // cada in ciascuna: è il verso opposto del sud, e la ragione per cui i due
  // rami non si accorpano in uno.
  const partenza = ZODIAC_ORDER.indexOf(ascendant as ZodiacSign);
  return CELLE_NORD.map((polygon, indice) => {
    const sign = ZODIAC_ORDER[(partenza + indice) % 12] as ZodiacSign;
    return {
      sign,
      house: indice + 1,
      polygon,
      centro: baricentro(polygon),
      bodies: abitanti.get(sign) ?? [],
      lagna: indice === 0,
    };
  });
}

/** I graha di ciascun segno, filtrati ai nove e nel loro ordine. */
function graharPerSegno(chart: SquareChart): Map<ZodiacSign, BodyId[]> {
  const abitanti = new Map<ZodiacSign, BodyId[]>();

  for (const graha of GRAHA) {
    const position = chart.positions.find((posizione) => posizione.id === graha);
    if (!position) continue;
    abitanti.set(position.sign, [...(abitanti.get(position.sign) ?? []), graha]);
  }

  return abitanti;
}

/**
 * Le caselle della griglia del sud, per indice di segno.
 *
 * Riga e colonna in una griglia 4×4. I Pesci occupano l'angolo in alto a
 * sinistra e da lì si gira in senso orario: è la disposizione con cui questi
 * quadri si stampano da sempre, e cambiarla renderebbe illeggibile a un occhio
 * esperto un disegno per il resto corretto.
 */
const CASELLE_SUD: readonly (readonly [number, number])[] = [
  [0, 1], // ariete
  [0, 2], // toro
  [0, 3], // gemelli
  [1, 3], // cancro
  [2, 3], // leone
  [3, 3], // vergine
  [3, 2], // bilancia
  [3, 1], // scorpione
  [3, 0], // sagittario
  [2, 0], // capricorno
  [1, 0], // acquario
  [0, 0], // pesci
];

/** Il quadrato di una casella della griglia 4×4. */
function cellaDellaGriglia([riga, colonna]: readonly [number, number]): Punto[] {
  const lato = QUADRO_SIZE / 4;
  const x = colonna * lato;
  const y = riga * lato;

  return [
    { x, y },
    { x: x + lato, y },
    { x: x + lato, y: y + lato },
    { x, y: y + lato },
  ];
}

/**
 * I dodici poligoni del nord, in ordine di casa.
 *
 * Il quadrato porta i due diagonali e il rombo che unisce i punti medi dei
 * lati. Ne escono quattro rombi — in alto, a destra, in basso, a sinistra, che
 * sono la prima, la decima, la settima e la quarta casa — e otto triangoli,
 * due per angolo.
 *
 * L'ordine è **antiorario** a partire dal rombo in alto, ed è la cosa che
 * questo file esiste per non sbagliare: girare nell'altro verso dà dodici
 * caselle piene di segni sbagliati e un disegno che sembra a posto.
 */
const CELLE_NORD: readonly (readonly Punto[])[] = (() => {
  const s = QUADRO_SIZE;
  const m = s / 2;
  const q = s / 4;
  const t = (s * 3) / 4;

  // I punti notevoli: gli angoli, i punti medi dei lati, il centro, e i
  // quattro incroci fra i diagonali e i lati del rombo.
  const alto = { x: m, y: 0 };
  const destra = { x: s, y: m };
  const basso = { x: m, y: s };
  const sinistra = { x: 0, y: m };
  const centro = { x: m, y: m };
  const altoSinistra = { x: q, y: q };
  const altoDestra = { x: t, y: q };
  const bassoDestra = { x: t, y: t };
  const bassoSinistra = { x: q, y: t };

  return [
    [alto, altoDestra, centro, altoSinistra], // 1 — rombo in alto
    [{ x: 0, y: 0 }, alto, altoSinistra], // 2
    [{ x: 0, y: 0 }, altoSinistra, sinistra], // 3
    [sinistra, altoSinistra, centro, bassoSinistra], // 4 — rombo a sinistra
    [sinistra, bassoSinistra, { x: 0, y: s }], // 5
    [{ x: 0, y: s }, bassoSinistra, basso], // 6
    [basso, bassoSinistra, centro, bassoDestra], // 7 — rombo in basso
    [basso, bassoDestra, { x: s, y: s }], // 8
    [{ x: s, y: s }, bassoDestra, destra], // 9
    [destra, bassoDestra, centro, altoDestra], // 10 — rombo a destra
    [destra, altoDestra, { x: s, y: 0 }], // 11
    [{ x: s, y: 0 }, altoDestra, alto], // 12
  ];
})();

/**
 * Il baricentro di un poligono, come media dei vertici.
 *
 * Esatto per i triangoli e per i rombi, che è tutto ciò che c'è qui: la media
 * dei vertici coincide col baricentro quando il poligono è un triangolo, e per
 * simmetria quando è un rombo.
 */
export function baricentro(polygon: readonly Punto[]): Punto {
  const somma = polygon.reduce(
    (totale, punto) => ({ x: totale.x + punto.x, y: totale.y + punto.y }),
    { x: 0, y: 0 },
  );

  return { x: somma.x / polygon.length, y: somma.y / polygon.length };
}
