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
export { computeDistribution, type DistributionInput } from './distribution.js';
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
export { AYANAMSAS, ayanamsaAt, DEFAULT_AYANAMSA, findAyanamsa, zodiacContext } from './ayanamsa.js';
export {
  GRAHA_NAMES,
  grahaName,
  NAKSHATRAS,
  NAKSHATRA_SPAN,
  nakshatraOf,
  PADA_SPAN,
  requireSidereal,
  VIMSHOTTARI_ORDER,
} from './nakshatra.js';
export {
  formatChartCompact,
  formatElectionCompact,
  formatNakshatraCompact,
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
  PLANETS,
  SIGN_ABBR,
  SIGN_ELEMENT,
  SIGN_MODALITY,
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
  AyanamsaId,
  AyanamsaInfo,
  BirthData,
  BodyId,
  CelestialBody,
  ChartOptions,
  ChartPoint,
  Distribution,
  DistributionGroup,
  ElectionOptions,
  ElectionResult,
  Element,
  EphemerisMode,
  House,
  HouseSystem,
  LocalMoment,
  Modality,
  NakshatraId,
  NakshatraPosition,
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
  Zodiac,
  ZodiacOptions,
  ZodiacSign,
} from './types.js';
