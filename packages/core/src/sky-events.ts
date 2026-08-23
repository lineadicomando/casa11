/**
 * Gli eventi di un corpo solo: dove entra e dove si ferma.
 *
 * A differenza degli incontri, che sono rapporti fra due corpi, un ingresso e
 * una stazione riguardano un pianeta e basta — e sono le due cose che
 * cambiano il tono di un periodo senza che nessun aspetto si perfezioni.
 *
 * Il metodo è lo stesso di `roots.ts`: si cerca dove una funzione continua del
 * tempo cambia segno. Cambia solo la funzione — la distanza da un confine di
 * segno per gli ingressi, la velocità stessa per le stazioni.
 */

import { DEFAULT_PASSAGE_BODIES, MEAN_DAILY_MOTION, ZODIAC_SIGNS } from './constants.js';
import { zodiacContext } from './ayanamsa.js';
import { computeBodies, initEphemeris, type EphemerisContext } from './ephemeris.js';
import { degreeInSign, normalize360, signOf, signedDifference } from './math.js';
import { bisect, julianDayToISO, resolveRange, stepFor } from './roots.js';
import type { BodyId, PassageRange, SignIngress, SkyEventOptions, Station } from './types.js';

interface Sample {
  julianDay: number;
  longitude: number;
  speed: number;
}

/**
 * Trova gli ingressi nei segni nell'arco dato.
 *
 * Un pianeta lento che cambia segno è una notizia più grande di quasi ogni
 * aspetto: Plutone lo fa due volte per generazione.
 */
export function findSignIngresses(
  range: PassageRange,
  options: SkyEventOptions = {},
): { ingresses: SignIngress[]; warnings: string[] } {
  const context = zodiacContext(initEphemeris(options.ephemerisPath), options);
  const warnings: string[] = [...context.warnings];
  const { start, end } = resolveRange(range);

  const ingresses: SignIngress[] = [];

  for (const bodyId of options.bodies ?? DEFAULT_PASSAGE_BODIES) {
    const samples = sample(bodyId, start, end, context, warnings);

    for (let i = 1; i < samples.length; i += 1) {
      const before = samples[i - 1]!;
      const after = samples[i]!;

      const left = signIndex(before.longitude);
      const entered = signIndex(after.longitude);
      if (left === entered) continue;

      // Fra due campioni il corpo percorre pochi gradi per costruzione: un
      // solo confine può cadere in mezzo, e sapere quale non richiede altro
      // che il verso del moto.
      const forward = signedDifference(after.longitude, before.longitude) > 0;
      const boundary = 30 * (forward ? entered : left);

      const exact = bisect(before.julianDay, after.julianDay, (julianDay) => {
        const body = bodyAt(bodyId, julianDay, context);
        return body ? signedDifference(body.longitude, boundary) : null;
      });
      if (exact === null) continue;

      ingresses.push({
        body: bodyId,
        sign: ZODIAC_SIGNS[entered]!,
        from: ZODIAC_SIGNS[left]!,
        exact: julianDayToISO(exact),
        local: julianDayToISO(exact, range.timezone),
        retrograde: !forward,
      });
    }
  }

  ingresses.sort((a, b) => a.exact.localeCompare(b.exact));
  return { ingresses, warnings };
}

/**
 * Trova le stazioni nell'arco dato.
 *
 * Una stazione è una radice della velocità, non della posizione: il pianeta
 * non arriva da nessuna parte, si ferma. Sole e Luna non ne hanno mai, e
 * chiederle per loro restituisce un elenco vuoto, che è la risposta giusta.
 */
export function findStations(
  range: PassageRange,
  options: SkyEventOptions = {},
): { stations: Station[]; warnings: string[] } {
  const context = zodiacContext(initEphemeris(options.ephemerisPath), options);
  const warnings: string[] = [...context.warnings];
  const { start, end } = resolveRange(range);

  const stations: Station[] = [];

  for (const bodyId of options.bodies ?? DEFAULT_PASSAGE_BODIES) {
    const samples = sample(bodyId, start, end, context, warnings);

    for (let i = 1; i < samples.length; i += 1) {
      const before = samples[i - 1]!;
      const after = samples[i]!;
      if (before.speed === 0 || before.speed * after.speed > 0) continue;

      const exact = bisect(before.julianDay, after.julianDay, (julianDay) => {
        const body = bodyAt(bodyId, julianDay, context);
        return body ? body.speed : null;
      });
      if (exact === null) continue;

      const body = bodyAt(bodyId, exact, context);
      if (!body) continue;

      stations.push({
        body: bodyId,
        direction: before.speed > 0 ? 'retrograda' : 'diretta',
        exact: julianDayToISO(exact),
        local: julianDayToISO(exact, range.timezone),
        longitude: body.longitude,
        sign: signOf(body.longitude),
        signDegree: degreeInSign(body.longitude),
      });
    }
  }

  stations.sort((a, b) => a.exact.localeCompare(b.exact));
  return { stations, warnings };
}

/** In quale dei dodici settori di 30° cade una longitudine. */
function signIndex(longitude: number): number {
  return Math.floor(normalize360(longitude) / 30);
}

function sample(
  bodyId: BodyId,
  from: number,
  to: number,
  context: EphemerisContext,
  warnings: string[],
): Sample[] {
  const step = stepFor(MEAN_DAILY_MOTION[bodyId] ?? 1);
  const samples: Sample[] = [];

  for (let jd = from; jd < to + step; jd += step) {
    const julianDay = Math.min(jd, to);
    const body = bodyAt(bodyId, julianDay, context);
    if (!body) {
      warnings.push(`${bodyId}: posizione non calcolabile, eventi non cercati.`);
      return [];
    }
    samples.push({ julianDay, longitude: body.longitude, speed: body.speed });
  }

  return samples;
}

function bodyAt(
  bodyId: BodyId,
  julianDay: number,
  context: EphemerisContext,
): { longitude: number; speed: number } | undefined {
  const { bodies } = computeBodies(julianDay, [bodyId], context);
  return bodies[0];
}
