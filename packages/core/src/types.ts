/**
 * Tipi pubblici del motore di calcolo.
 *
 * Tutte le longitudini eclittiche sono in gradi decimali nell'intervallo [0, 360).
 * Le latitudini geografiche sono positive a Nord, le longitudini geografiche
 * positive a Est (convenzione Swiss Ephemeris).
 */

export type ZodiacSign =
  | 'ariete'
  | 'toro'
  | 'gemelli'
  | 'cancro'
  | 'leone'
  | 'vergine'
  | 'bilancia'
  | 'scorpione'
  | 'sagittario'
  | 'capricorno'
  | 'acquario'
  | 'pesci';

export type BodyId =
  | 'sole'
  | 'luna'
  | 'mercurio'
  | 'venere'
  | 'marte'
  | 'giove'
  | 'saturno'
  | 'urano'
  | 'nettuno'
  | 'plutone'
  | 'nodo-nord'
  | 'nodo-sud'
  | 'lilith'
  | 'chirone';

export type HouseSystem =
  | 'placidus'
  | 'koch'
  | 'segni-interi'
  | 'equale'
  | 'regiomontano'
  | 'campano'
  | 'porfirio'
  | 'topocentrico'
  | 'alcabizio';

export type AspectId =
  | 'congiunzione'
  | 'opposizione'
  | 'trigono'
  | 'quadrato'
  | 'sestile'
  | 'semisestile'
  | 'quinconce'
  | 'semiquadrato'
  | 'sesquiquadrato';

/** Modalità di calcolo effettivamente usata dal motore. */
export type EphemerisMode = 'swisseph' | 'moshier';

/** Dati di nascita in ora **locale**: la conversione a UT è fatta dal motore. */
export interface BirthData {
  /** Data locale, formato ISO `YYYY-MM-DD`. */
  date: string;
  /**
   * Ora locale, formato `HH:mm` o `HH:mm:ss`.
   * Se omessa la carta viene calcolata a mezzogiorno locale e le case,
   * gli assi e la posizione della Luna vanno considerati indicativi.
   */
  time?: string;
  /** Latitudine in gradi decimali, positiva a Nord. */
  latitude: number;
  /** Longitudine in gradi decimali, positiva a Est. */
  longitude: number;
  /** Identificatore IANA del fuso orario, es. `Europe/Rome`. */
  timezone: string;
  /** Altitudine in metri sul livello del mare (usata solo dal sistema topocentrico). */
  altitude?: number;
}

export interface ChartOptions {
  /** Sistema di domificazione. Default: `placidus`. */
  houseSystem?: HouseSystem;
  /** Includi gli aspetti minori (semisestile, quinconce, semiquadrato, sesquiquadrato). */
  minorAspects?: boolean;
  /** Corpi da calcolare. Default: tutti tranne Chirone e Lilith. */
  bodies?: BodyId[];
  /**
   * Formula della Parte di Fortuna.
   *
   * `settore` (default) inverte Sole e Luna nei temi notturni, secondo la
   * tradizione ellenistica e medievale. `diurna` usa sempre ASC + Luna − Sole:
   * è la semplificazione adottata da parte dei programmi moderni, utile solo
   * per confrontare i risultati con essi.
   */
  partOfFortuneFormula?: 'settore' | 'diurna';
  /** Percorso della cartella con i file `.se1`. Default: variabile d'ambiente o `<pkg>/ephe`. */
  ephemerisPath?: string;
}

/** Esito della conversione ora locale → tempo universale. */
export interface ResolvedTime {
  /** Giorno giuliano in Tempo Universale, l'input di tutti i calcoli. */
  julianDayUT: number;
  /** Istante UTC in formato ISO 8601. */
  utc: string;
  /** Istante locale in formato ISO 8601 con offset. */
  local: string;
  /** Scarto dal UTC in minuti, come risultante dal database tzdata storico. */
  offsetMinutes: number;
  /** `false` quando l'ora di nascita non è stata fornita. */
  timeKnown: boolean;
}

export interface CelestialBody {
  id: BodyId;
  name: string;
  /** Longitudine eclittica in gradi decimali [0, 360). */
  longitude: number;
  /** Latitudine eclittica in gradi decimali. */
  latitude: number;
  /** Distanza dalla Terra in unità astronomiche. */
  distance: number;
  /** Velocità in longitudine, gradi/giorno. Negativa se retrogrado. */
  speed: number;
  retrograde: boolean;
  sign: ZodiacSign;
  /** Posizione all'interno del segno, [0, 30). */
  signDegree: number;
  /** Casa occupata, 1-12. Assente se l'ora di nascita è ignota. */
  house?: number;
}

/**
 * Un punto calcolato: non un corpo celeste ma una posizione derivata da altri
 * elementi del tema. Non ha moto proprio, quindi non ha velocità né
 * retrogradazione.
 */
export interface ChartPoint {
  longitude: number;
  sign: ZodiacSign;
  /** Posizione all'interno del segno, [0, 30). */
  signDegree: number;
  /** Casa occupata, 1-12. */
  house?: number;
}

/**
 * Settore del tema: diurno se il Sole è sopra l'orizzonte al momento della
 * nascita, notturno altrimenti.
 *
 * Determina la formula della Parte di Fortuna ed è un dato interpretativo di
 * per sé nell'astrologia tradizionale.
 */
export type Sect = 'diurna' | 'notturna';

/** Tempo siderale locale: la posizione del cielo rispetto al luogo. */
export interface SiderealTime {
  /** Ore decimali, [0, 24). */
  hours: number;
  /** Formato `HH:mm:ss`. */
  formatted: string;
}

export interface House {
  /** Numero della casa, 1-12. */
  number: number;
  /** Longitudine eclittica della cuspide. */
  longitude: number;
  sign: ZodiacSign;
  signDegree: number;
}

export interface Angles {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;
  /** Assente, con avvertenza, se le effemeridi non lo riportano. */
  vertex?: number;
}

export interface Aspect {
  aspect: AspectId;
  /** Angolo esatto dell'aspetto in gradi. */
  angle: number;
  from: BodyId;
  to: BodyId;
  /** Scarto dall'angolo esatto, in gradi. */
  orb: number;
  /** `true` se l'aspetto si sta perfezionando, `false` se si sta separando. */
  applying: boolean;
}

export interface NatalChart {
  input: BirthData;
  time: ResolvedTime;
  houseSystem: HouseSystem;
  ephemerisMode: EphemerisMode;
  bodies: CelestialBody[];
  /** Vuoto se l'ora di nascita è ignota. */
  houses: House[];
  /** Assente se l'ora di nascita è ignota. */
  angles?: Angles;
  /**
   * Parte di Fortuna. Assente se l'ora di nascita è ignota: dipende
   * dall'Ascendente.
   */
  partOfFortune?: ChartPoint;
  /** Settore diurno o notturno. Assente se l'ora di nascita è ignota. */
  sect?: Sect;
  /**
   * Tempo siderale locale all'istante di nascita.
   *
   * Serve a verificare a colpo d'occhio che la conversione oraria sia
   * avvenuta correttamente: è il dato da cui discendono Ascendente e case.
   */
  siderealTime: SiderealTime;
  aspects: Aspect[];
  /**
   * Avvertimenti non bloccanti: ora ambigua o inesistente per il cambio
   * ora legale, ripiego sulle effemeridi Moshier, corpi non calcolabili,
   * sistema di case non applicabile alla latitudine.
   */
  warnings: string[];
}
