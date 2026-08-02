/**
 * @undicesimacasa/core — motore di calcolo del tema natale.
 *
 * Libreria pura: nessuna dipendenza da HTTP, framework web o MCP.
 * Gli adattatori (API REST, server MCP, interfaccia) la consumano dall'esterno.
 */

export { computeNatalChart } from './chart.js';
export { computeSky } from './sky.js';
export { computeTransits, natalTargets } from './transits.js';
export { findTransitPassages } from './passages.js';
export { findSkyPassages } from './sky-passages.js';
export { findSignIngresses, findStations } from './sky-events.js';
export { findElectionHours, MAX_ELECTION_DAYS } from './election.js';
export { riseOrSet } from './rise.js';
export { computeAspects, computeCrossAspects, type AspectOptions } from './aspects.js';
export { computeHouses, houseOf, type HouseResult } from './houses.js';
export {
  computeBodies,
  findBody,
  initEphemeris,
  resetEphemerisCache,
  type EphemerisContext,
} from './ephemeris.js';
export {
  currentMoment,
  resolveTime,
  systemTimezone,
  toJulianDay,
  type TimeResolution,
} from './time.js';
export { chartSect, computePartOfFortune } from './points.js';
export { localSiderealTime } from './sidereal.js';
export {
  formatChartCompact,
  formatElectionCompact,
  formatPassagesCompact,
  formatSkyCompact,
  formatSkyEventsCompact,
  formatSkyPassagesCompact,
  formatTransitsCompact,
} from './format.js';
export { ChartError, type ChartErrorCode } from './errors.js';

export {
  angularSeparation,
  arcForward,
  degreeInSign,
  formatDegrees,
  formatZodiacal,
  normalize360,
  signedDifference,
  signOf,
} from './math.js';

export {
  ASPECTS,
  BODIES,
  CHALDEAN_ORDER,
  DEFAULT_BODIES,
  DEFAULT_PASSAGE_BODIES,
  DEFAULT_TRANSIT_BODIES,
  HOUSE_SYSTEM_CODES,
  MEAN_DAILY_MOTION,
  NATAL_POINT_NAMES,
  SIGN_ABBR,
  WEEKDAY_RULERS,
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
  ElectionOptions,
  ElectionResult,
  EphemerisMode,
  House,
  HouseSystem,
  LocalMoment,
  NatalChart,
  NatalPointId,
  PassageOptions,
  PassageRange,
  Place,
  PlanetaryHour,
  PointAspect,
  ResolvedTime,
  Sect,
  SiderealTime,
  SkyChart,
  SkyMoment,
  SkyOptions,
  SkyEventOptions,
  SkyPassage,
  SkyPassageOptions,
  SignIngress,
  Station,
  TransitAspect,
  TransitChart,
  TransitingBody,
  TransitingPointId,
  TransitMoment,
  TransitPassage,
  TransitOptions,
  VoidOfCourse,
  ZodiacSign,
} from './types.js';
