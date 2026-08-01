import { computeAspects } from './aspects.js';
import { DEFAULT_BODIES } from './constants.js';
import { computeBodies, initEphemeris } from './ephemeris.js';
import { computeHouses, houseOf } from './houses.js';
import { validatePlace } from './place.js';
import { chartSect } from './points.js';
import { localSiderealTime } from './sidereal.js';
import { resolveTime } from './time.js';
import type { SkyChart, SkyMoment, SkyOptions } from './types.js';

/**
 * Calcola il cielo a un istante.
 *
 * Non è un tema natale con la data di oggi, e non sono transiti: un transito
 * è un rapporto — un pianeta che passa *su qualcosa* — e qui non c'è nessuna
 * nascita su cui passare. È il cielo e basta, come lo si leggerebbe da
 * un'effemeride: posizioni, moti e aspetti reciproci.
 *
 * Il luogo è facoltativo perché le longitudini eclittiche sono geocentriche.
 * Con un luogo si aggiungono tempo siderale, assi e case — ma queste ultime
 * vogliono anche l'ora, senza la quale l'Ascendente compie un giro completo
 * nell'arco della giornata.
 *
 * @example
 * ```ts
 * const sky = computeSky(currentMoment('Europe/Rome'));
 * ```
 */
export function computeSky(moment: SkyMoment, options: SkyOptions = {}): SkyChart {
  const { place } = options;
  if (place) validatePlace(place);

  const context = initEphemeris(options.ephemerisPath);
  const { time, warnings: timeWarnings } = resolveTime(moment);
  const { bodies, warnings: bodyWarnings } = computeBodies(
    time.julianDayUT,
    options.bodies ?? DEFAULT_BODIES,
    context,
  );

  const warnings = [...context.warnings, ...timeWarnings, ...bodyWarnings];

  if (!time.timeKnown) {
    warnings.push(
      'Ora non indicata: il cielo è quello di mezzogiorno locale. La Luna percorre ' +
        'circa 13° al giorno, quindi la sua posizione va presa per approssimata.',
    );
  }

  const sky: SkyChart = {
    input: moment,
    time,
    ephemerisMode: context.mode,
    bodies,
    houses: [],
    aspects: computeAspects(bodies, { minorAspects: options.minorAspects ?? false }),
    warnings,
  };

  // Senza luogo il cielo è completo così: le posizioni valgono ovunque, ed è
  // proprio questo a rendere la sezione utile senza chiedere dove si è.
  if (!place) return sky;

  sky.place = place;
  sky.siderealTime = localSiderealTime(time.julianDayUT, place.longitude);

  if (!time.timeKnown) {
    warnings.push(
      "Assi e case non calcolati: al luogo va aggiunta l'ora. A mezzogiorno " +
        "sarebbero inventati, non approssimati.",
    );
    return sky;
  }

  const houseSystem = options.houseSystem ?? 'placidus';
  const houseResult = computeHouses(
    time.julianDayUT,
    place.latitude,
    place.longitude,
    houseSystem,
    context,
  );

  sky.houseSystem = houseSystem;
  sky.houses = houseResult.houses;
  sky.angles = houseResult.angles;
  warnings.push(...houseResult.warnings);

  for (const body of sky.bodies) {
    body.house = houseOf(body.longitude, houseResult.houses);
  }

  // Il settore qui non è un dato interpretativo ma una constatazione: dice se
  // in quel momento, in quel posto, il Sole è sopra l'orizzonte.
  const sun = sky.bodies.find((body) => body.id === 'sole');
  if (sun) sky.sect = chartSect(sun.longitude, houseResult.angles.descendant);

  return sky;
}
