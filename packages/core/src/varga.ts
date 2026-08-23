/**
 * I varga: lo stesso cielo riletto su una scala più fine.
 *
 * Un varga divide ogni segno in *n* parti e assegna a ciascuna un segno,
 * secondo una regola che cambia da varga a varga. Ne esce una carta nuova, con
 * gli stessi corpi in posti diversi — il D-9 di una nascita è una seconda
 * carta, non una colonna della prima.
 *
 * A che cosa serva ciascuno è interpretazione e sta a chi legge. Che cosa
 * ciascuno *sia* è aritmetica, e sta qui.
 *
 * **La regola viaggia col risultato.** Non è un vezzo: fra le sedici divisioni
 * classiche le scuole divergono su più d'una, e un segno consegnato senza la
 * regola che l'ha prodotto non si può ricontrollare. Chi segue una convenzione
 * diversa dalla nostra deve poterlo vedere subito, invece di scoprirlo
 * confrontando i risultati con un altro programma.
 *
 * Le regole hanno forme diverse, e vale la pena vederle accanto:
 * - **D-1** non divide niente: è il segno stesso.
 * - **D-3** procede per trigoni: primo terzo al segno, secondo al quinto da
 *   lui, terzo al nono.
 * - **D-9** parte da dove dice la **modalità**: dal segno stesso se cardinale,
 *   dal nono se fisso, dal quinto se mobile.
 * - **D-10** e i suoi parenti si biforcano su **pari e dispari**.
 * - **D-12** parte sempre dal segno stesso e prosegue.
 * - **D-30** abbandona le parti uguali: cinque tratti di ampiezza diversa,
 *   rovesciati fra segni pari e dispari.
 */

import { ZODIAC_SIGNS } from './constants.js';
import { ChartError } from './errors.js';
import { degreeInSign, normalize360 } from './math.js';
import { grahaName, requireSidereal } from './nakshatra.js';
import type { NatalChart, VargaChart, VargaId, ZodiacSign } from './types.js';

interface VargaDefinition {
  id: VargaId;
  /** Il nome sanscrito, che non si traduce. */
  name: string;
  /** In quante parti divide un segno. */
  divisions: number;
  /** La regola in una riga, che viaggia col risultato. */
  rule: string;
  /** L'indice del segno, 0-11, da indice del segno di partenza e grado dentro. */
  signIndex: (sign: number, degree: number) => number;
}

/** Il segno all'indice dato, con il giro chiuso. */
const at = (index: number): ZodiacSign => ZODIAC_SIGNS[((index % 12) + 12) % 12] as ZodiacSign;

/**
 * I tratti del trimsamsa nei segni dispari, con il segno che ciascuno assegna.
 *
 * Cinque e non trenta, e di ampiezza diversa: è il varga che smette di dividere
 * in parti uguali. Ogni tratto porta il segno del pianeta che lo regge — Marte
 * l'Ariete, Saturno l'Acquario, e così via, tutti segni dispari.
 */
const TRIMSAMSA_ODD: readonly { until: number; sign: number }[] = [
  { until: 5, sign: 0 }, // Marte — Ariete
  { until: 10, sign: 10 }, // Saturno — Acquario
  { until: 18, sign: 8 }, // Giove — Sagittario
  { until: 25, sign: 2 }, // Mercurio — Gemelli
  { until: 30, sign: 6 }, // Venere — Bilancia
];

/** Gli stessi cinque rovesciati, con i segni pari dei medesimi pianeti. */
const TRIMSAMSA_EVEN: readonly { until: number; sign: number }[] = [
  { until: 5, sign: 1 }, // Venere — Toro
  { until: 12, sign: 5 }, // Mercurio — Vergine
  { until: 20, sign: 11 }, // Giove — Pesci
  { until: 25, sign: 9 }, // Saturno — Capricorno
  { until: 30, sign: 7 }, // Marte — Scorpione
];

export const VARGAS: readonly VargaDefinition[] = [
  {
    id: 'd1',
    name: 'Rashi',
    divisions: 1,
    rule: 'Il segno stesso: è la carta di partenza, e vale come varga perché la serie comincia da lei.',
    signIndex: (sign) => sign,
  },
  {
    id: 'd3',
    name: 'Drekkana',
    divisions: 3,
    rule: 'Tre parti da 10°. La prima al segno stesso, la seconda al quinto da lui, la terza al nono: i suoi trigoni.',
    signIndex: (sign, degree) => sign + Math.floor(degree / 10) * 4,
  },
  {
    id: 'd9',
    name: 'Navamsa',
    divisions: 9,
    rule:
      "Nove parti da 3°20'. Si parte dal segno stesso se è cardinale, dal nono se è fisso, " +
      'dal quinto se è mobile — cioè, detto altrimenti, da Ariete per i segni di fuoco, ' +
      'Capricorno per la terra, Bilancia per l\'aria, Cancro per l\'acqua.',
    signIndex: (sign, degree) => {
      // 0 cardinale, 1 fisso, 2 mobile: la modalità si legge dall'indice.
      const salto = [0, 8, 4][sign % 3] as number;
      return sign + salto + Math.floor(degree / (30 / 9));
    },
  },
  {
    id: 'd10',
    name: 'Dasamsa',
    divisions: 10,
    rule: 'Dieci parti da 3°. Nei segni dispari si parte dal segno stesso, nei pari dal nono da lui.',
    signIndex: (sign, degree) => {
      const inizio = sign % 2 === 0 ? sign : sign + 8;
      return inizio + Math.floor(degree / 3);
    },
  },
  {
    id: 'd12',
    name: 'Dwadasamsa',
    divisions: 12,
    rule: "Dodici parti da 2°30'. Si parte sempre dal segno stesso e si prosegue in ordine.",
    signIndex: (sign, degree) => sign + Math.floor(degree / 2.5),
  },
  {
    id: 'd30',
    name: 'Trimsamsa',
    divisions: 30,
    rule:
      'Cinque tratti di ampiezza disuguale, non trenta parti. Nei segni dispari 5° a Marte ' +
      "(Ariete), 5° a Saturno (Acquario), 8° a Giove (Sagittario), 7° a Mercurio (Gemelli), " +
      '5° a Venere (Bilancia); nei pari lo stesso ordine rovesciato, coi segni pari dei ' +
      'medesimi pianeti.',
    signIndex: (sign, degree) => {
      const tratti = sign % 2 === 0 ? TRIMSAMSA_ODD : TRIMSAMSA_EVEN;
      const tratto = tratti.find((parte) => degree < parte.until) ?? tratti[tratti.length - 1];
      return (tratto as { sign: number }).sign;
    },
  },
];

/** La definizione di un varga, o un errore che elenca quelli che ci sono. */
export function findVarga(id: VargaId): VargaDefinition {
  const definition = VARGAS.find((varga) => varga.id === id);
  if (!definition) {
    throw new ChartError(
      'VARGA_NON_VALIDO',
      `Varga "${id}" non disponibile. Calcolati: ${VARGAS.map((v) => v.id).join(', ')}.`,
    );
  }
  return definition;
}

/**
 * Il segno che una longitudine **siderale** occupa in un varga.
 *
 * Prende una longitudine nuda come `nakshatraOf`: vale per un corpo, per una
 * cuspide o per il lagna allo stesso modo.
 */
export function vargaSignOf(siderealLongitude: number, id: VargaId): ZodiacSign {
  const definition = findVarga(id);
  const longitude = normalize360(siderealLongitude);

  return at(definition.signIndex(Math.floor(longitude / 30), degreeInSign(longitude)));
}

/**
 * La carta di un varga: dove finiscono i corpi e il lagna.
 *
 * Le case non ci sono, e non è una mancanza. In un varga si contano dal lagna
 * a segni interi, quindi la casa di un corpo si ricava dal suo segno e da
 * quello del lagna senza altro calcolo: darle qui vorrebbe dire scegliere una
 * domificazione dove il sistema non ne prevede.
 */
export function computeVarga(chart: NatalChart, id: VargaId): VargaChart {
  requireSidereal(chart.zodiac, `Il varga ${id.toUpperCase()}`);

  const definition = findVarga(id);

  const result: VargaChart = {
    varga: definition.id,
    name: definition.name,
    divisions: definition.divisions,
    rule: definition.rule,
    positions: chart.bodies.map((body) => ({
      id: body.id,
      name: grahaName(body.id, body.name),
      sign: vargaSignOf(body.longitude, id),
    })),
  };

  if (chart.angles) result.ascendant = vargaSignOf(chart.angles.ascendant, id);

  return result;
}
