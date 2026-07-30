import type { AspectId, BodyId, HouseSystem, ZodiacSign } from './types.js';

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'ariete',
  'toro',
  'gemelli',
  'cancro',
  'leone',
  'vergine',
  'bilancia',
  'scorpione',
  'sagittario',
  'capricorno',
  'acquario',
  'pesci',
];

/** Abbreviazioni a tre lettere, per l'output tabellare compatto. */
export const SIGN_ABBR: Readonly<Record<ZodiacSign, string>> = {
  ariete: 'Ari',
  toro: 'Tor',
  gemelli: 'Gem',
  cancro: 'Can',
  leone: 'Leo',
  vergine: 'Ver',
  bilancia: 'Bil',
  scorpione: 'Sco',
  sagittario: 'Sag',
  capricorno: 'Cap',
  acquario: 'Acq',
  pesci: 'Pes',
};

/**
 * Corpi calcolabili, con il nome della costante Swiss Ephemeris corrispondente.
 * `nodo-sud` non ha una costante propria: è il nodo nord opposto di 180°.
 */
export interface BodyDefinition {
  id: BodyId;
  name: string;
  /** Nome della costante in `sweph.constants`. `null` per i corpi derivati. */
  swephConstant: string | null;
  /** Richiede il file di effemeridi degli asteroidi (`seas_18.se1`). */
  requiresAsteroidFile: boolean;
}

export const BODIES: readonly BodyDefinition[] = [
  { id: 'sole', name: 'Sole', swephConstant: 'SE_SUN', requiresAsteroidFile: false },
  { id: 'luna', name: 'Luna', swephConstant: 'SE_MOON', requiresAsteroidFile: false },
  { id: 'mercurio', name: 'Mercurio', swephConstant: 'SE_MERCURY', requiresAsteroidFile: false },
  { id: 'venere', name: 'Venere', swephConstant: 'SE_VENUS', requiresAsteroidFile: false },
  { id: 'marte', name: 'Marte', swephConstant: 'SE_MARS', requiresAsteroidFile: false },
  { id: 'giove', name: 'Giove', swephConstant: 'SE_JUPITER', requiresAsteroidFile: false },
  { id: 'saturno', name: 'Saturno', swephConstant: 'SE_SATURN', requiresAsteroidFile: false },
  { id: 'urano', name: 'Urano', swephConstant: 'SE_URANUS', requiresAsteroidFile: false },
  { id: 'nettuno', name: 'Nettuno', swephConstant: 'SE_NEPTUNE', requiresAsteroidFile: false },
  { id: 'plutone', name: 'Plutone', swephConstant: 'SE_PLUTO', requiresAsteroidFile: false },
  { id: 'nodo-nord', name: 'Nodo Nord', swephConstant: 'SE_MEAN_NODE', requiresAsteroidFile: false },
  { id: 'nodo-sud', name: 'Nodo Sud', swephConstant: null, requiresAsteroidFile: false },
  { id: 'lilith', name: 'Lilith', swephConstant: 'SE_MEAN_APOG', requiresAsteroidFile: false },
  { id: 'chirone', name: 'Chirone', swephConstant: 'SE_CHIRON', requiresAsteroidFile: true },
];

/** Insieme predefinito: i dieci pianeti tradizionali più l'asse dei nodi. */
export const DEFAULT_BODIES: readonly BodyId[] = [
  'sole',
  'luna',
  'mercurio',
  'venere',
  'marte',
  'giove',
  'saturno',
  'urano',
  'nettuno',
  'plutone',
  'nodo-nord',
  'nodo-sud',
];

/** Codici a un carattere attesi da `sweph.houses_ex`. */
export const HOUSE_SYSTEM_CODES: Readonly<Record<HouseSystem, string>> = {
  placidus: 'P',
  koch: 'K',
  'segni-interi': 'W',
  equale: 'A',
  regiomontano: 'R',
  campano: 'C',
  porfirio: 'O',
  topocentrico: 'T',
  alcabizio: 'B',
};

export interface AspectDefinition {
  id: AspectId;
  angle: number;
  /** Orbita di base in gradi, allargata per Sole e Luna. */
  orb: number;
  major: boolean;
}

export const ASPECTS: readonly AspectDefinition[] = [
  { id: 'congiunzione', angle: 0, orb: 8, major: true },
  { id: 'opposizione', angle: 180, orb: 8, major: true },
  { id: 'trigono', angle: 120, orb: 7, major: true },
  { id: 'quadrato', angle: 90, orb: 7, major: true },
  { id: 'sestile', angle: 60, orb: 5, major: true },
  { id: 'semisestile', angle: 30, orb: 2, major: false },
  { id: 'quinconce', angle: 150, orb: 3, major: false },
  { id: 'semiquadrato', angle: 45, orb: 2, major: false },
  { id: 'sesquiquadrato', angle: 135, orb: 2, major: false },
];

/** I luminari ricevono un'orbita più ampia, secondo la prassi corrente. */
export const LUMINARIES: readonly BodyId[] = ['sole', 'luna'];
export const LUMINARY_ORB_BONUS = 2;

/**
 * Punti calcolati (non corpi fisici) per i quali non ha senso parlare di
 * aspetto reciproco: il Nodo Sud è per definizione all'opposizione del Nord.
 */
export const NON_ASPECTING_PAIRS: readonly (readonly [BodyId, BodyId])[] = [
  ['nodo-nord', 'nodo-sud'],
];
