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

/**
 * Un istante in ora **locale**: la conversione a Tempo Universale è fatta dal
 * motore.
 *
 * Non è per forza una nascita — lo stesso istante descrive il momento di cui
 * si vogliono i transiti — e non porta coordinate: quelle servono alle case,
 * non alla conversione oraria.
 */
export interface LocalMoment {
  /** Data locale, formato ISO `YYYY-MM-DD`. */
  date: string;
  /** Ora locale, formato `HH:mm` o `HH:mm:ss`. Se omessa vale mezzogiorno locale. */
  time?: string;
  /** Identificatore IANA del fuso orario, es. `Europe/Rome`. */
  timezone: string;
}

/**
 * Un punto sulla superficie terrestre.
 *
 * Le longitudini eclittiche sono geocentriche: a Roma e a Tokyo un pianeta è
 * allo stesso grado dello zodiaco. Il luogo serve soltanto a orientare il
 * cielo rispetto all'orizzonte, cioè agli assi e alle case.
 *
 * È un tipo a sé, e non due campi sciolti, perché latitudine e longitudine
 * non hanno senso separate: una firma che le accettasse singolarmente
 * lascerebbe passare mezzo luogo.
 */
export interface Place {
  /** Latitudine in gradi decimali, positiva a Nord. */
  latitude: number;
  /** Longitudine in gradi decimali, positiva a Est. */
  longitude: number;
  /** Altitudine in metri sul livello del mare (usata solo dal sistema topocentrico). */
  altitude?: number;
}

/** Dati di nascita in ora **locale**: la conversione a UT è fatta dal motore. */
export interface BirthData extends LocalMoment, Place {
  /**
   * Ora locale, formato `HH:mm` o `HH:mm:ss`.
   * Se omessa la carta viene calcolata a mezzogiorno locale e le case,
   * gli assi e la posizione della Luna vanno considerati indicativi.
   */
  time?: string;
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

/**
 * Un punto capace di formare aspetti.
 *
 * Non deve essere un corpo celeste: a un asse o a una cuspide bastano una
 * longitudine e una velocità nulla. Il tipo esiste perché gli aspetti si
 * calcolano anche fra insiemi appartenenti a **temi diversi** — i transiti
 * aspettano le posizioni di nascita — e lì `CelestialBody` sarebbe una
 * richiesta eccessiva.
 */
export interface AspectPoint<Id extends string = string> {
  id: Id;
  /** Longitudine eclittica in gradi decimali [0, 360). */
  longitude: number;
  /** Velocità in longitudine, gradi/giorno. Zero per un punto fermo. */
  speed: number;
}

export interface PointAspect<From extends string = string, To extends string = From> {
  aspect: AspectId;
  /** Angolo esatto dell'aspetto in gradi. */
  angle: number;
  from: From;
  to: To;
  /** Scarto dall'angolo esatto, in gradi. */
  orb: number;
  /** `true` se l'aspetto si sta perfezionando, `false` se si sta separando. */
  applying: boolean;
}

/** Aspetto fra due corpi dello stesso tema. */
export type Aspect = PointAspect<BodyId>;

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

/** L'istante di cui si vuole il cielo, in ora locale. */
export type SkyMoment = LocalMoment;

export interface SkyOptions {
  /** Luogo di osservazione. Se assente: niente assi, niente case. */
  place?: Place;
  /** Sistema di domificazione. Default: `placidus`. Vale solo con un luogo. */
  houseSystem?: HouseSystem;
  /** Includi gli aspetti minori. */
  minorAspects?: boolean;
  /** Corpi da calcolare. Default: tutti tranne Chirone e Lilith. */
  bodies?: BodyId[];
  /** Percorso della cartella con i file `.se1`. */
  ephemerisPath?: string;
}

/**
 * Il cielo a un istante, senza nessuna nascita a cui riferirlo.
 *
 * Non è un `NatalChart` con la data di oggi: quello pretende un luogo, e qui
 * il luogo è facoltativo. Non sono transiti: un transito è un rapporto con un
 * tema, e qui il tema non c'è. È la pagina di un'effemeride.
 */
export interface SkyChart {
  input: SkyMoment;
  /** Il luogo da cui il cielo è guardato, se ne è stato indicato uno. */
  place?: Place;
  time: ResolvedTime;
  ephemerisMode: EphemerisMode;
  bodies: CelestialBody[];
  /** Vuoto senza luogo o senza ora: in un giorno le cuspidi fanno un giro intero. */
  houses: House[];
  /** Assente alle stesse condizioni delle case. */
  angles?: Angles;
  /** Presente solo se le case sono state calcolate. */
  houseSystem?: HouseSystem;
  /** Presente solo con un luogo: è locale, dipende dalla longitudine. */
  siderealTime?: SiderealTime;
  /** Diurno se il Sole è sopra l'orizzonte. Richiede gli assi. */
  sect?: Sect;
  /** Aspetti reciproci fra i corpi, con le orbite di un tema. */
  aspects: Aspect[];
  /**
   * Avvertimenti non bloccanti: ora non indicata, luogo senza ora, ripiego
   * sulle effemeridi Moshier, corpi non calcolabili.
   */
  warnings: string[];
}

/**
 * Ciò che, in un tema natale, può ricevere un transito: un corpo, un asse o
 * la Parte di Fortuna.
 *
 * Non è `BodyId` perché un transito sull'Ascendente è fra i più significativi
 * che esistano, e l'Ascendente non è un corpo celeste.
 */
export type NatalPointId =
  | BodyId
  | 'ascendente'
  | 'medio-cielo'
  | 'discendente'
  | 'fondo-cielo'
  | 'fortuna';

/** L'istante di cui si vogliono i transiti, in ora locale. */
export type TransitMoment = LocalMoment;

export interface TransitOptions {
  /** Corpi in transito. Default: `DEFAULT_TRANSIT_BODIES`. */
  bodies?: BodyId[];
  /**
   * Punti natali da bersagliare. Default: i corpi del tema più Ascendente e
   * Medio Cielo. Un bersaglio assente dal tema produce un avviso, non un errore.
   */
  targets?: NatalPointId[];
  /** Includi gli aspetti minori (semisestile, quinconce, semiquadrato, sesquiquadrato). */
  minorAspects?: boolean;
  /**
   * Orbite per aspetto, in gradi: sostituiscono `TRANSIT_ORBS` per i soli
   * aspetti nominati.
   */
  orbs?: Partial<Record<AspectId, number>>;
  /** Percorso della cartella con i file `.se1`. Default: variabile d'ambiente o `<pkg>/ephe`. */
  ephemerisPath?: string;
}

/**
 * Un aspetto fra un corpo in transito e un punto del tema natale.
 *
 * I due lati non sono intercambiabili — uno si muove e l'altro è fermo per
 * sempre — quindi si chiamano `transiting` e `natal` invece di `from` e `to`.
 */
export interface TransitAspect {
  aspect: AspectId;
  /** Angolo esatto dell'aspetto in gradi. */
  angle: number;
  transiting: BodyId;
  natal: NatalPointId;
  /** Scarto dall'angolo esatto, in gradi. */
  orb: number;
  /**
   * `true` se l'aspetto si sta perfezionando. Dipende dal solo corpo in
   * transito: il punto natale è fermo.
   */
  applying: boolean;
  /** Il corpo in transito è retrogrado all'istante considerato. */
  retrograde: boolean;
}

/** L'arco di tempo su cui cercare i passaggi, in date locali. */
export interface PassageRange {
  /** Primo giorno, `YYYY-MM-DD`. */
  from: string;
  /** Ultimo giorno, incluso. */
  to: string;
  /** Fuso in cui vanno letti i due estremi. */
  timezone: string;
}

export interface PassageOptions {
  /** Corpi in transito. Default: `DEFAULT_PASSAGE_BODIES`, cioè senza la Luna. */
  bodies?: BodyId[];
  /** Punti natali da bersagliare. Default: i corpi del tema più Ascendente e Medio Cielo. */
  targets?: NatalPointId[];
  /** Includi gli aspetti minori. */
  minorAspects?: boolean;
  /** Orbite per aspetto: valgono per la finestra, non per l'istante esatto. */
  orbs?: Partial<Record<AspectId, number>>;
  /** Percorso della cartella con i file `.se1`. */
  ephemerisPath?: string;
}

/**
 * Un aspetto che si perfeziona: l'istante in cui il transitante raggiunge
 * esattamente l'angolo, non l'intervallo in cui gli è vicino.
 *
 * Un corpo lento che passa in retrogradazione perfeziona lo stesso aspetto
 * tre volte — avanti, indietro, avanti — e sono tre passaggi distinti, non
 * uno lungo: è la struttura che rende leggibile un anno.
 */
export interface TransitPassage {
  transiting: BodyId;
  natal: NatalPointId;
  aspect: AspectId;
  /** Angolo esatto dell'aspetto in gradi. */
  angle: number;
  /** Istante UTC in cui l'aspetto è esatto, ISO 8601. */
  exact: string;
  /** Lo stesso istante nel fuso richiesto. */
  local: string;
  /** Il transitante è retrogrado in quel momento. */
  retrograde: boolean;
  /**
   * Intervallo in cui l'aspetto resta entro l'orbita.
   *
   * Assente quando non si chiude entro tre anni: succede ai pianeti lenti,
   * per cui il contatto dura più di quanto abbia senso chiamare finestra.
   */
  window?: { start: string; end: string };
}

export interface TransitChart {
  input: TransitMoment;
  time: ResolvedTime;
  ephemerisMode: EphemerisMode;
  /**
   * Posizioni all'istante del transito. `house` è la casa **natale** in cui il
   * corpo cade, ed è assente se il tema di nascita non ha case.
   */
  transiting: CelestialBody[];
  aspects: TransitAspect[];
  /**
   * Avvertimenti non bloccanti: ora del transito non fornita, tema natale
   * senza case, bersagli richiesti e non disponibili, corpi non calcolabili.
   */
  warnings: string[];
}
