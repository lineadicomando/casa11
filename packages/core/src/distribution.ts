/**
 * La distribuzione dei punti di una carta fra elementi e modalità.
 *
 * È un conteggio, non una lettura: dice quanti corpi cadono in segni di fuoco,
 * non che cosa questo significhi. La differenza è la stessa che passa fra il
 * settore diurno e il carattere di chi è nato di giorno — il motore produce il
 * primo e tace sul secondo.
 *
 * Il punto delicato non è contare, è **decidere che cosa contare**, e su quello
 * le scuole non concordano. Qui la decisione non si prende: i gruppi restano
 * separati e ciascuno porta l'elenco di ciò che ha contato. Vedi `Distribution`
 * in `types.ts`.
 */

import { PLANETS, SIGN_ELEMENT, SIGN_MODALITY } from './constants.js';
import { signOf } from './math.js';
import type {
  Angles,
  CelestialBody,
  ChartPoint,
  Distribution,
  DistributionGroup,
  Element,
  Modality,
  NatalPointId,
  ZodiacSign,
} from './types.js';

/**
 * Quel che alla distribuzione serve di una carta.
 *
 * Un tipo strutturale invece di `NatalChart`, perché il cielo di un istante si
 * conta allo stesso modo pur non essendo un tema: non ha Parte di Fortuna, e
 * senza luogo non ha nemmeno gli assi.
 */
export interface DistributionInput {
  bodies: readonly CelestialBody[];
  angles?: Angles;
  partOfFortune?: ChartPoint;
}

/** Un gruppo vuoto: tutti gli elementi e tutte le modalità a zero. */
function emptyGroup(): DistributionGroup {
  return {
    elements: { fuoco: 0, terra: 0, aria: 0, acqua: 0 },
    modalities: { cardinale: 0, fisso: 0, mobile: 0 },
    counted: [],
  };
}

function add(group: DistributionGroup, id: NatalPointId, sign: ZodiacSign): void {
  const element: Element = SIGN_ELEMENT[sign];
  const modality: Modality = SIGN_MODALITY[sign];

  group.elements[element] += 1;
  group.modalities[modality] += 1;
  group.counted.push(id);
}

/**
 * Conta i punti della carta per elemento e per modalità.
 *
 * I corpi non calcolabili semplicemente non ci sono — in modalità Moshier
 * Chirone manca — e il conteggio lo riflette senza dirlo due volte: `counted`
 * elenca quello che c'era.
 *
 * Degli assi si contano l'Ascendente e il Medio Cielo, non i loro opposti.
 * Discendente e Fondo Cielo sono determinati dai primi due e non aggiungono
 * nulla che non sia già stato contato: metterli dentro raddoppierebbe il peso
 * degli assi facendolo sembrare un dato in più.
 */
export function computeDistribution(input: DistributionInput): Distribution {
  const distribution: Distribution = {
    planets: emptyGroup(),
    points: emptyGroup(),
    angles: emptyGroup(),
  };

  for (const body of input.bodies) {
    const group = PLANETS.includes(body.id) ? distribution.planets : distribution.points;
    add(group, body.id, body.sign);
  }

  if (input.partOfFortune) {
    add(distribution.points, 'fortuna', input.partOfFortune.sign);
  }

  if (input.angles) {
    add(distribution.angles, 'ascendente', signOf(input.angles.ascendant));
    add(distribution.angles, 'medio-cielo', signOf(input.angles.midheaven));
  }

  return distribution;
}
