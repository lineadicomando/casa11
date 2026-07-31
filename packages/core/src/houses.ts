import sweph from 'sweph';
import { HOUSE_SYSTEM_CODES } from './constants.js';
import { ChartError } from './errors.js';
import { arcForward, degreeInSign, normalize360, signOf } from './math.js';
import type { EphemerisContext } from './ephemeris.js';
import type { Angles, House, HouseSystem } from './types.js';

export interface HouseResult {
  houses: House[];
  angles: Angles;
  warnings: string[];
}

/**
 * Calcola le dodici cuspidi e gli assi.
 *
 * Alle latitudini polari Placidus e Koch non sono definiti: Swiss Ephemeris
 * ripiega automaticamente su Porfirio e lo segnala. L'avviso viene propagato
 * invece di essere silenziato, perché cambia il significato del risultato.
 */
export function computeHouses(
  julianDayUT: number,
  latitude: number,
  longitude: number,
  system: HouseSystem,
  context: EphemerisContext,
): HouseResult {
  const code = HOUSE_SYSTEM_CODES[system];
  if (!code) {
    throw new ChartError(
      'SISTEMA_CASE_NON_VALIDO',
      `Sistema di case "${system}" non riconosciuto. Valori ammessi: ${Object.keys(HOUSE_SYSTEM_CODES).join(', ')}.`,
    );
  }

  const warnings: string[] = [];
  // `houses_ex2` invece di `houses_ex`: è l'unica variante che espone il campo
  // `error`, dove Swiss Ephemeris segnala il ripiego su un sistema alternativo.
  const result = sweph.houses_ex2(julianDayUT, context.flags, latitude, longitude, code);

  if (result.flag < 0) {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      `Calcolo delle case fallito: ${result.error || 'errore sconosciuto'}.`,
    );
  }
  if (result.error) {
    warnings.push(
      `Domificazione: ${result.error} ` +
        `(alle latitudini estreme Swiss Ephemeris ripiega su un sistema alternativo).`,
    );
  }

  const cusps = result.data.houses;
  if (cusps.length !== 12) {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      `Attese 12 cuspidi, ricevute ${cusps.length}. ` +
        'Il sistema di case Gauquelin (36 settori) non è supportato.',
    );
  }

  const houses: House[] = cusps.map((cusp, index) => {
    const value = normalize360(cusp);
    return {
      number: index + 1,
      longitude: value,
      sign: signOf(value),
      signDegree: degreeInSign(value),
    };
  });

  const points = result.data.points;
  const ascendant = normalize360(requirePoint(points, 0, 'Ascendente'));
  const midheaven = normalize360(requirePoint(points, 1, 'Medio Cielo'));

  const angles: Angles = {
    ascendant,
    midheaven,
    descendant: normalize360(ascendant + 180),
    imumCoeli: normalize360(midheaven + 180),
  };

  // `points[3]` è il Vertex. Se manca, lo si omette e lo si segnala:
  // sostituirlo in silenzio con un altro punto sarebbe un dato inventato.
  const vertex = points[3];
  if (typeof vertex === 'number' && Number.isFinite(vertex)) {
    angles.vertex = normalize360(vertex);
  } else {
    warnings.push('Vertex non riportato dalle effemeridi: omesso dagli assi.');
  }

  return { houses, angles, warnings };
}

/**
 * Determina in quale casa cade una longitudine eclittica.
 *
 * Le case hanno ampiezza variabile (in Placidus anche molto), quindi non basta
 * dividere per 30: si cerca il settore fra due cuspidi consecutive percorrendo
 * lo zodiaco in senso antiorario.
 */
export function houseOf(longitude: number, houses: readonly House[]): number | undefined {
  if (houses.length !== 12) return undefined;

  for (let i = 0; i < 12; i += 1) {
    const start = houses[i]?.longitude;
    const end = houses[(i + 1) % 12]?.longitude;
    if (start === undefined || end === undefined) return undefined;

    const span = arcForward(start, end);
    const offset = arcForward(start, longitude);
    // `span` è 0 solo in caso di cuspidi coincidenti (degenere): lo si salta.
    if (span > 0 && offset < span) return i + 1;
  }
  return undefined;
}

function requirePoint(points: readonly number[], index: number, label: string): number {
  const value = points[index];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ChartError('ERRORE_EFFEMERIDI', `${label} non calcolabile.`);
  }
  return value;
}
