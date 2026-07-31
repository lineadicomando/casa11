/**
 * @undicesimacasa/core — motore di calcolo del tema natale.
 *
 * Libreria pura: nessuna dipendenza da HTTP, framework web o MCP.
 * Gli adattatori (API REST, server MCP, interfaccia) la consumano dall'esterno.
 */

export { computeNatalChart } from './chart.js';
export { computeTransits } from './transits.js';
export { computeAspects, computeCrossAspects, type AspectOptions } from './aspects.js';
export { computeHouses, houseOf, type HouseResult } from './houses.js';
export {
  computeBodies,
  findBody,
  initEphemeris,
  resetEphemerisCache,
  type EphemerisContext,
} from './ephemeris.js';
export { currentMoment, resolveTime, toJulianDay, type TimeResolution } from './time.js';
export { chartSect, computePartOfFortune } from './points.js';
export { localSiderealTime } from './sidereal.js';
export { formatChartCompact, formatTransitsCompact } from './format.js';
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
  DEFAULT_TRANSIT_BODIES,
  HOUSE_SYSTEM_CODES,
  NATAL_POINT_NAMES,
  SIGN_ABBR,
  TRANSIT_ORB_BONUS,
  TRANSIT_ORBS,
  ZODIAC_SIGNS,
  type AspectDefinition,
  type BodyDefinition,
} from './constants.js';

export type {
  Angles,
  Aspect,
  AspectId,
  AspectPoint,
  BirthData,
  BodyId,
  CelestialBody,
  ChartOptions,
  ChartPoint,
  EphemerisMode,
  House,
  HouseSystem,
  LocalMoment,
  NatalChart,
  NatalPointId,
  PointAspect,
  ResolvedTime,
  Sect,
  SiderealTime,
  TransitAspect,
  TransitChart,
  TransitMoment,
  TransitOptions,
  ZodiacSign,
} from './types.js';
