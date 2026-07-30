/**
 * @temanatale/core — motore di calcolo del tema natale.
 *
 * Libreria pura: nessuna dipendenza da HTTP, framework web o MCP.
 * Gli adattatori (API REST, server MCP, interfaccia) la consumano dall'esterno.
 */

export { computeNatalChart } from './chart.js';
export { computeAspects, type AspectOptions } from './aspects.js';
export { computeHouses, houseOf, type HouseResult } from './houses.js';
export {
  computeBodies,
  findBody,
  initEphemeris,
  resetEphemerisCache,
  type EphemerisContext,
} from './ephemeris.js';
export { resolveTime, toJulianDay, type TimeResolution } from './time.js';
export { formatChartCompact } from './format.js';
export { ChartError, type ChartErrorCode } from './errors.js';

export {
  angularSeparation,
  arcForward,
  degreeInSign,
  formatDegrees,
  formatZodiacal,
  normalize360,
  signOf,
} from './math.js';

export {
  ASPECTS,
  BODIES,
  DEFAULT_BODIES,
  HOUSE_SYSTEM_CODES,
  SIGN_ABBR,
  ZODIAC_SIGNS,
  type AspectDefinition,
  type BodyDefinition,
} from './constants.js';

export type {
  Angles,
  Aspect,
  AspectId,
  BirthData,
  BodyId,
  CelestialBody,
  ChartOptions,
  EphemerisMode,
  House,
  HouseSystem,
  NatalChart,
  ResolvedTime,
  ZodiacSign,
} from './types.js';
