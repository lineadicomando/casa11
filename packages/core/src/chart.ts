import { computeAspects } from './aspects.js';
import { DEFAULT_BODIES } from './constants.js';
import { computeBodies, initEphemeris } from './ephemeris.js';
import { ChartError } from './errors.js';
import { computeHouses, houseOf } from './houses.js';
import { chartSect, computePartOfFortune } from './points.js';
import { localSiderealTime } from './sidereal.js';
import { resolveTime } from './time.js';
import type { BirthData, ChartOptions, NatalChart } from './types.js';

/**
 * Calcola un tema natale completo.
 *
 * Il risultato è puramente astronomico: posizioni, case, assi e aspetti.
 * Non contiene interpretazioni — quelle restano a carico del consumatore
 * (interfaccia web, agente, generatore di testi).
 *
 * @example
 * ```ts
 * const chart = computeNatalChart({
 *   date: '1968-03-12',
 *   time: '14:30',
 *   latitude: 40.8518,
 *   longitude: 14.2681,
 *   timezone: 'Europe/Rome',
 * });
 * ```
 */
export function computeNatalChart(birth: BirthData, options: ChartOptions = {}): NatalChart {
  validateCoordinates(birth);

  const houseSystem = options.houseSystem ?? 'placidus';
  const bodyIds = options.bodies ?? DEFAULT_BODIES;

  const context = initEphemeris(options.ephemerisPath);
  const { time, warnings: timeWarnings } = resolveTime(birth);
  const { bodies, warnings: bodyWarnings } = computeBodies(time.julianDayUT, bodyIds, context);

  const warnings = [...context.warnings, ...timeWarnings, ...bodyWarnings];

  const chart: NatalChart = {
    input: birth,
    time,
    houseSystem,
    ephemerisMode: context.mode,
    bodies,
    houses: [],
    siderealTime: localSiderealTime(time.julianDayUT, birth.longitude),
    aspects: computeAspects(bodies, { minorAspects: options.minorAspects ?? false }),
    warnings,
  };

  // Senza ora di nascita le case sono prive di significato: la cuspide
  // dell'Ascendente ruota di 360° nell'arco della giornata.
  if (time.timeKnown) {
    const houseResult = computeHouses(
      time.julianDayUT,
      birth.latitude,
      birth.longitude,
      houseSystem,
      context,
    );
    chart.houses = houseResult.houses;
    chart.angles = houseResult.angles;
    warnings.push(...houseResult.warnings);

    for (const body of chart.bodies) {
      body.house = houseOf(body.longitude, houseResult.houses);
    }

    // La Parte di Fortuna dipende dall'Ascendente e dai due luminari: senza
    // uno dei tre non è calcolabile, e l'assenza va segnalata invece di
    // restituire un punto arbitrario.
    const sun = chart.bodies.find((body) => body.id === 'sole');
    const moon = chart.bodies.find((body) => body.id === 'luna');

    if (sun && moon) {
      const sect = chartSect(sun.longitude, houseResult.angles.descendant);
      const fortune = computePartOfFortune(
        houseResult.angles.ascendant,
        sun.longitude,
        moon.longitude,
        sect,
        options.partOfFortuneFormula ?? 'settore',
      );
      fortune.house = houseOf(fortune.longitude, houseResult.houses);

      chart.sect = sect;
      chart.partOfFortune = fortune;
    } else {
      warnings.push(
        'Parte di Fortuna non calcolabile: richiede Sole e Luna fra i corpi calcolati.',
      );
    }
  }

  return chart;
}

function validateCoordinates(birth: BirthData): void {
  if (!Number.isFinite(birth.latitude) || birth.latitude < -90 || birth.latitude > 90) {
    throw new ChartError(
      'COORDINATE_NON_VALIDE',
      `Latitudine ${birth.latitude} fuori intervallo: attesa fra -90 e 90.`,
    );
  }
  if (!Number.isFinite(birth.longitude) || birth.longitude < -180 || birth.longitude > 180) {
    throw new ChartError(
      'COORDINATE_NON_VALIDE',
      `Longitudine ${birth.longitude} fuori intervallo: attesa fra -180 e 180.`,
    );
  }
}
