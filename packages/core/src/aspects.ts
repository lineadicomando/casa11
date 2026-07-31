import {
  ASPECTS,
  LUMINARIES,
  LUMINARY_ORB_BONUS,
  NON_ASPECTING_PAIRS,
  type AspectDefinition,
} from './constants.js';
import { angularSeparation } from './math.js';
import type { Aspect, AspectPoint, BodyId, CelestialBody, PointAspect } from './types.js';

/** Passo temporale, in giorni, per stabilire se un aspetto è applicativo. */
const APPLYING_PROBE_DAYS = 0.05;

/**
 * I luminari per confronto diretto: `LUMINARIES` è tipizzata su `BodyId`,
 * mentre qui gli identificatori sono stringhe qualsiasi — un asse natale non
 * è un corpo celeste.
 */
const LUMINARY_IDS = new Set<string>(LUMINARIES);

export interface AspectOptions {
  /** Includi semisestile, quinconce, semiquadrato e sesquiquadrato. */
  minorAspects?: boolean;
}

/**
 * Calcola la matrice degli aspetti fra i corpi di uno stesso tema.
 *
 * Ogni coppia compare una volta sola, con il corpo più veloce come `from`,
 * così che la direzione dell'aspetto (applicativo / separativo) sia leggibile.
 */
export function computeAspects(
  bodies: readonly CelestialBody[],
  options: AspectOptions = {},
): Aspect[] {
  const definitions = definitionsFor(options);
  const aspects: Aspect[] = [];

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      if (!a || !b) continue;
      if (isNonAspectingPair(a.id, b.id)) continue;

      const aspect = aspectBetween(a, b, definitions);
      if (aspect) aspects.push(aspect);
    }
  }

  return sortByOrb(aspects);
}

/**
 * Calcola gli aspetti fra due insiemi di punti distinti: ognuno del primo
 * contro ognuno del secondo.
 *
 * Le due esclusioni che valgono dentro un tema qui non valgono più. Un punto
 * si confronta anche con il proprio omonimo — il Sole in transito congiunto
 * al Sole natale è il ritorno solare — e la coppia dei nodi non è più
 * ridondante: il Nodo Nord che passa sul Nodo Sud di nascita è un transito,
 * non una tautologia.
 *
 * `from` è l'insieme in movimento e `to` quello di riferimento, che nei
 * transiti ha velocità nulla: da lì discende il verso di `applying`.
 */
export function computeCrossAspects<From extends string, To extends string>(
  from: readonly AspectPoint<From>[],
  to: readonly AspectPoint<To>[],
  options: AspectOptions = {},
): PointAspect<From, To>[] {
  const definitions = definitionsFor(options);
  const aspects: PointAspect<From, To>[] = [];

  for (const moving of from) {
    for (const fixed of to) {
      const aspect = aspectBetween(moving, fixed, definitions);
      if (aspect) aspects.push(aspect);
    }
  }

  return sortByOrb(aspects);
}

/**
 * L'aspetto fra due punti, o `null` se non ne formano nessuno.
 *
 * Le orbite non si sovrappongono fra aspetti diversi: al primo che combacia
 * ci si ferma.
 */
function aspectBetween<From extends string, To extends string>(
  a: AspectPoint<From>,
  b: AspectPoint<To>,
  definitions: readonly AspectDefinition[],
): PointAspect<From, To> | null {
  const separation = angularSeparation(a.longitude, b.longitude);
  const maxOrbBonus = orbBonus(a.id) + orbBonus(b.id);

  for (const definition of definitions) {
    const orb = Math.abs(separation - definition.angle);
    if (orb > definition.orb + maxOrbBonus) continue;

    return {
      aspect: definition.id,
      angle: definition.angle,
      from: a.id,
      to: b.id,
      orb,
      applying: isApplying(a, b, definition.angle),
    };
  }

  return null;
}

function definitionsFor(options: AspectOptions): readonly AspectDefinition[] {
  return options.minorAspects ? ASPECTS : ASPECTS.filter((a) => a.major);
}

/** L'aspetto più stretto per primo: è quello che pesa di più nella lettura. */
function sortByOrb<T extends { orb: number }>(aspects: T[]): T[] {
  return aspects.sort((x, y) => x.orb - y.orb);
}

/**
 * Un aspetto è applicativo se, avanzando di un piccolo passo temporale,
 * lo scarto dall'angolo esatto diminuisce.
 *
 * Vale anche con un punto fermo — un asse, una posizione natale — perché a
 * muovere lo scarto basta uno dei due.
 */
function isApplying(a: AspectPoint, b: AspectPoint, angle: number): boolean {
  const now = Math.abs(angularSeparation(a.longitude, b.longitude) - angle);
  const later = Math.abs(
    angularSeparation(
      a.longitude + a.speed * APPLYING_PROBE_DAYS,
      b.longitude + b.speed * APPLYING_PROBE_DAYS,
    ) - angle,
  );
  return later < now;
}

function orbBonus(id: string): number {
  return LUMINARY_IDS.has(id) ? LUMINARY_ORB_BONUS : 0;
}

function isNonAspectingPair(a: BodyId, b: BodyId): boolean {
  return NON_ASPECTING_PAIRS.some(
    ([first, second]) => (first === a && second === b) || (first === b && second === a),
  );
}
