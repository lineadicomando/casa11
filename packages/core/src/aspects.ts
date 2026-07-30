import { ASPECTS, LUMINARIES, LUMINARY_ORB_BONUS, NON_ASPECTING_PAIRS } from './constants.js';
import { angularSeparation } from './math.js';
import type { Aspect, BodyId, CelestialBody } from './types.js';

/** Passo temporale, in giorni, per stabilire se un aspetto è applicativo. */
const APPLYING_PROBE_DAYS = 0.05;

export interface AspectOptions {
  /** Includi semisestile, quinconce, semiquadrato e sesquiquadrato. */
  minorAspects?: boolean;
}

/**
 * Calcola la matrice degli aspetti fra i corpi dati.
 *
 * Ogni coppia compare una volta sola, con il corpo più veloce come `from`,
 * così che la direzione dell'aspetto (applicativo / separativo) sia leggibile.
 */
export function computeAspects(
  bodies: readonly CelestialBody[],
  options: AspectOptions = {},
): Aspect[] {
  const definitions = options.minorAspects ? ASPECTS : ASPECTS.filter((a) => a.major);
  const aspects: Aspect[] = [];

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      if (!a || !b) continue;
      if (isNonAspectingPair(a.id, b.id)) continue;

      const separation = angularSeparation(a.longitude, b.longitude);
      const maxOrbBonus = orbBonus(a.id) + orbBonus(b.id);

      for (const definition of definitions) {
        const orb = Math.abs(separation - definition.angle);
        if (orb > definition.orb + maxOrbBonus) continue;

        aspects.push({
          aspect: definition.id,
          angle: definition.angle,
          from: a.id,
          to: b.id,
          orb,
          applying: isApplying(a, b, definition.angle),
        });
        // Le orbite non si sovrappongono fra aspetti diversi: al primo che
        // combacia si passa alla coppia successiva.
        break;
      }
    }
  }

  return aspects.sort((x, y) => x.orb - y.orb);
}

/**
 * Un aspetto è applicativo se, avanzando di un piccolo passo temporale,
 * lo scarto dall'angolo esatto diminuisce.
 */
function isApplying(a: CelestialBody, b: CelestialBody, angle: number): boolean {
  const now = Math.abs(angularSeparation(a.longitude, b.longitude) - angle);
  const later = Math.abs(
    angularSeparation(
      a.longitude + a.speed * APPLYING_PROBE_DAYS,
      b.longitude + b.speed * APPLYING_PROBE_DAYS,
    ) - angle,
  );
  return later < now;
}

function orbBonus(id: BodyId): number {
  return LUMINARIES.includes(id) ? LUMINARY_ORB_BONUS : 0;
}

function isNonAspectingPair(a: BodyId, b: BodyId): boolean {
  return NON_ASPECTING_PAIRS.some(
    ([first, second]) => (first === a && second === b) || (first === b && second === a),
  );
}
