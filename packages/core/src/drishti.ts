/**
 * Le drishti: lo sguardo che un graha getta su un altro.
 *
 * Non sono gli aspetti dell'astrologia occidentale con altri nomi, e conviene
 * dire subito in che cosa differiscono, perché è tutto.
 *
 * **Si contano a segni interi, non a gradi.** Non c'è orbita: un graha guarda
 * un intero segno, e con esso tutto ciò che vi si trova. Due pianeti a
 * ventinove gradi di distanza dentro lo stesso rapporto di segni si guardano
 * quanto due che ne distano uno.
 *
 * **Sono direzionali.** Si contano sempre in avanti nello zodiaco, quindi che
 * A guardi B non vuol dire che B guardi A. Saturno in Ariete guarda i Gemelli,
 * che gli sono terzi; ma dai Gemelli l'Ariete è l'undicesimo, e nessuno guarda
 * l'undicesima. In `aspects.ts` un aspetto è un fatto simmetrico fra due
 * longitudini; qui è un rapporto con un verso, e per questo il tipo dice `from`
 * e `to` e non li si può scambiare.
 *
 * **Cadono anche sul vuoto.** Un graha che guarda una casa disabitata la
 * guarda lo stesso, ed è un dato che in questo sistema si usa: per questo i
 * segni bersagliati si riportano tutti, non solo quelli occupati.
 *
 * La regola di base è che ognuno guarda il settimo da sé — il segno opposto.
 * Tre ne hanno altre due ciascuno: Marte la quarta e l'ottava, Giove la quinta
 * e la nona, Saturno la terza e la decima.
 */

import { ZODIAC_SIGNS } from './constants.js';
import { grahaName, requireSidereal } from './nakshatra.js';
import type {
  BodyId,
  Drishti,
  DrishtiChart,
  DrishtiOptions,
  DrishtiTarget,
  NatalChart,
  NodeDrishti,
  ZodiacSign,
} from './types.js';

/** Il settimo da sé: la drishti che hanno tutti. */
const FULL: readonly number[] = [7];

/**
 * Le case guardate da ciascuno, oltre la settima che è di tutti.
 *
 * I nove graha e nessun altro. Urano, Nettuno e Plutone non compaiono, e qui
 * l'esclusione non è una scelta del motore come nella tabella dei nakshatra: là
 * si trattava di una divisione del cerchio, che vale per ogni longitudine; qui
 * di una dottrina su corpi precisi, e quei tre non ne fanno parte. Attribuire
 * loro una drishti vorrebbe dire inventarne una.
 */
const SPECIAL: Readonly<Partial<Record<BodyId, readonly number[]>>> = {
  marte: [4, 8],
  giove: [5, 9],
  saturno: [3, 10],
};

/** I sette classici, che una drishti ce l'hanno per certo. */
const CLASSICAL: readonly BodyId[] = [
  'sole',
  'luna',
  'mercurio',
  'venere',
  'marte',
  'giove',
  'saturno',
];

/** Le case che un graha guarda, secondo la convenzione scelta per i nodi. */
export function housesSeenBy(graha: BodyId, nodes: NodeDrishti): readonly number[] {
  if (graha === 'nodo-nord' || graha === 'nodo-sud') {
    // Nessuna nella forma classica: Parashara la drishti la dà ai sette, e
    // quella dei nodi è aggiunta più tarda.
    return nodes === 'gioviana' ? [5, 7, 9] : [];
  }
  if (!CLASSICAL.includes(graha)) return [];

  return [...FULL, ...(SPECIAL[graha] ?? [])].sort((a, b) => a - b);
}

/**
 * Le drishti di un tema.
 *
 * Prende il tema già calcolato, come le dasha, e vuole che sia siderale: le
 * case si contano a segni interi dal segno del graha, e in un tema tropicale
 * quei segni sono altri.
 *
 * @example
 * ```ts
 * const tema = computeNatalChart(nascita, { zodiac: 'siderale' });
 * const sguardi = computeDrishti(tema);
 * ```
 */
export function computeDrishti(
  chart: NatalChart,
  options: DrishtiOptions = {},
): DrishtiChart {
  requireSidereal(chart.zodiac, 'Le drishti');

  const nodes = options.nodes ?? 'nessuna';
  const warnings: string[] = [];

  // Chi occupa quale segno, per non ricercarlo a ogni sguardo.
  const occupanti = new Map<number, BodyId[]>();
  for (const body of chart.bodies) {
    const indice = signIndexOf(body.sign);
    occupanti.set(indice, [...(occupanti.get(indice) ?? []), body.id]);
  }

  const lagna = chart.angles ? signIndexOf(signAt(chart.angles.ascendant)) : null;
  if (lagna === null) {
    warnings.push(
      "Tema senza ora di nascita: il lagna non c'è, quindi le drishti dicono chi guarda " +
        'chi ma non su quali case cadano.',
    );
  }

  const aspects: Drishti[] = [];
  const signs: DrishtiChart['signs'] = [];

  for (const body of chart.bodies) {
    const case_ = housesSeenBy(body.id, nodes);
    if (case_.length === 0) continue;

    const partenza = signIndexOf(body.sign);

    for (const house of case_) {
      // La casa `n` è `n-1` segni avanti: il segno di partenza è la prima.
      const bersaglio = (partenza + house - 1) % 12;
      const sign = ZODIAC_SIGNS[bersaglio] as ZodiacSign;

      signs.push({ from: body.id, fromName: grahaName(body.id, body.name), house, sign });

      for (const occupante of occupanti.get(bersaglio) ?? []) {
        aspects.push(cast(chart, body.id, occupante, house));
      }

      if (lagna === bersaglio) aspects.push(cast(chart, body.id, 'lagna', house));
    }
  }

  return { nodes, aspects, signs, warnings };
}

function cast(
  chart: NatalChart,
  from: BodyId,
  to: DrishtiTarget,
  house: number,
): Drishti {
  const nomeDi = (id: BodyId): string =>
    grahaName(id, chart.bodies.find((body) => body.id === id)?.name ?? id);

  return {
    from,
    fromName: nomeDi(from),
    to,
    toName: to === 'lagna' ? 'Lagna' : nomeDi(to),
    house,
  };
}

/** L'indice 0-11 di un segno. */
function signIndexOf(sign: ZodiacSign): number {
  return ZODIAC_SIGNS.indexOf(sign);
}

/** Il segno di una longitudine, senza passare per `math.ts`. */
function signAt(longitude: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)] as ZodiacSign;
}
