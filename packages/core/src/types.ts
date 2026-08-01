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

export interface SkyPassageOptions {
  /** Corpi da seguire. Default: `DEFAULT_PASSAGE_BODIES`, cioè senza la Luna. */
  bodies?: BodyId[];
  /** Includi gli aspetti minori. */
  minorAspects?: boolean;
  /** Orbite per aspetto: valgono per la finestra, non per l'istante esatto. */
  orbs?: Partial<Record<AspectId, number>>;
  /** Percorso della cartella con i file `.se1`. */
  ephemerisPath?: string;
}

/**
 * Un aspetto fra due corpi in cielo che si perfeziona.
 *
 * I due lati si distinguono per **velocità media** e non per moto istantaneo:
 * è il più veloce a raggiungere il più lento, ed è la convenzione con cui si
 * nomina un incontro. Presa sul moto del momento, la coppia si scambierebbe i
 * ruoli a ogni retrogradazione, e lo stesso aspetto comparirebbe ora in un
 * verso ora nell'altro.
 */
export interface SkyPassage {
  faster: BodyId;
  slower: BodyId;
  aspect: AspectId;
  /** Angolo esatto dell'aspetto in gradi. */
  angle: number;
  /** Istante UTC in cui l'aspetto è esatto, ISO 8601. */
  exact: string;
  /** Lo stesso istante nel fuso richiesto. */
  local: string;
  /**
   * Quale dei due è retrogrado in quell'istante.
   *
   * È la ragione per cui uno stesso aspetto può perfezionarsi più volte: due
   * corpi che si inseguono si incontrano una volta sola, ma se uno dei due
   * torna indietro si incontrano tre.
   */
  retrograde: { faster: boolean; slower: boolean };
  /**
   * Intervallo in cui l'aspetto resta entro l'orbita.
   *
   * Assente quando non si chiude entro tre anni: fra due pianeti lenti un
   * contatto dura più di quanto abbia senso chiamare finestra.
   */
  window?: { start: string; end: string };
}

export interface SkyEventOptions {
  /** Corpi da seguire. Default: `DEFAULT_PASSAGE_BODIES`, cioè senza la Luna. */
  bodies?: BodyId[];
  /** Percorso della cartella con i file `.se1`. */
  ephemerisPath?: string;
}

/**
 * Il passaggio di un corpo da un segno al successivo.
 *
 * Non è sempre un progresso: un pianeta che retrograda rientra nel segno da
 * cui era uscito, e più tardi lo lascia di nuovo. Ogni attraversamento è un
 * evento a sé, e `from` dice da dove arriva proprio perché il verso non è
 * scontato.
 */
export interface SignIngress {
  body: BodyId;
  /** Il segno in cui entra. */
  sign: ZodiacSign;
  /** Il segno che lascia. */
  from: ZodiacSign;
  /** Istante UTC dell'attraversamento, ISO 8601. */
  exact: string;
  /** Lo stesso istante nel fuso richiesto. */
  local: string;
  /** `true` se entra andando all'indietro. */
  retrograde: boolean;
}

/**
 * L'istante in cui un corpo si ferma e inverte il moto.
 *
 * La longitudine è parte dell'evento e non un dettaglio: è il grado su cui il
 * pianeta indugia per giorni, e su cui tornerà due volte.
 */
export interface Station {
  body: BodyId;
  /** `retrograda` quando comincia a tornare indietro, `diretta` quando riprende. */
  direction: 'retrograda' | 'diretta';
  /** Istante UTC della stazione, ISO 8601. */
  exact: string;
  /** Lo stesso istante nel fuso richiesto. */
  local: string;
  /** Longitudine eclittica in cui si ferma. */
  longitude: number;
  sign: ZodiacSign;
  /** Posizione all'interno del segno, [0, 30). */
  signDegree: number;
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

export interface ElectionOptions {
  /**
   * Corpi il cui incontro basta a togliere la Luna dal vuoto di corso.
   * Default: i sei classici oltre alla Luna, cioè la regola nella sua forma
   * tradizionale.
   */
  bodies?: BodyId[];
  /**
   * Restringe l'elenco alle ore rette da questi pianeti.
   *
   * Serve alla leggibilità prima che alla velocità: un mese intero sono
   * settecentoquaranta ore, che nessuno consulta e che a un agente riempiono
   * il contesto. Chiedere un reggitore solo ne lascia un settimo.
   */
  rulers?: BodyId[];
  /**
   * Scarta le ore che un vuoto di corso attraversa, in tutto o in parte.
   *
   * È una scelta di chi chiede, non un consiglio del motore: i vuoti restano
   * nel risultato, perché sono la ragione per cui quelle ore mancano.
   */
  skipMoonVoid?: boolean;
  /** Percorso della cartella con i file `.se1`. */
  ephemerisPath?: string;
}

/**
 * Un'ora planetaria: una delle dodici parti in cui si divide l'arco diurno, o
 * l'arco notturno, del luogo.
 *
 * Dura sessanta minuti soltanto agli equinozi. A giugno, alle nostre
 * latitudini, un'ora diurna sfiora gli ottanta minuti e una notturna scende
 * sotto i quaranta: `minutes` dice quale delle due si sta guardando meglio di
 * qualunque etichetta.
 */
export interface PlanetaryHour {
  /** Il pianeta che la regge, secondo l'ordine caldeo. */
  ruler: BodyId;
  /** `true` fra alba e tramonto. */
  diurnal: boolean;
  /** Posizione nella dodicina, 1-12. */
  index: number;
  /** Inizio in UTC, ISO 8601. */
  start: string;
  /** Fine in UTC: coincide con l'inizio dell'ora successiva. */
  end: string;
  /** Gli stessi due istanti nel fuso richiesto. */
  local: { start: string; end: string };
  /** Durata effettiva in minuti. */
  minutes: number;
  /**
   * L'Ascendente all'inizio dell'ora.
   *
   * È il dato che si muove più in fretta di tutti: un grado ogni quattro
   * minuti, un segno intero nell'arco di due ore scarse. Vale all'istante
   * `start` e non per l'ora intera.
   */
  ascendant: { longitude: number; sign: ZodiacSign; signDegree: number };
  /** `true` se la Luna è vuota di corso durante tutta l'ora o parte di essa. */
  moonVoid: boolean;
}

/**
 * Il tratto in cui la Luna non perfeziona più alcun aspetto maggiore prima di
 * lasciare il segno.
 *
 * Dura da pochi minuti a un giorno e mezzo. La tradizione sconsiglia di
 * cominciare qualcosa mentre è in corso — il perché è interpretazione, e sta
 * a chi legge; qui c'è solo quando comincia e quando finisce.
 */
export interface VoidOfCourse {
  /** Il segno che la Luna sta attraversando mentre è vuota. */
  sign: ZodiacSign;
  /** Il segno in cui entra, chiudendo il vuoto. */
  nextSign: ZodiacSign;
  /**
   * L'ultimo aspetto perfezionato prima del vuoto.
   *
   * Assente nel caso raro in cui la Luna attraversi un segno intero senza
   * concludere nulla: allora il vuoto comincia con l'ingresso stesso.
   */
  lastAspect?: { body: BodyId; aspect: AspectId };
  /** Inizio in UTC, ISO 8601. */
  start: string;
  /** Fine in UTC: l'istante in cui la Luna cambia segno. */
  end: string;
  /** Gli stessi due istanti nel fuso richiesto. */
  local: { start: string; end: string };
  /** Durata in minuti. */
  minutes: number;
}

/**
 * Il calendario elettivo di un luogo.
 *
 * Non contiene nessuna raccomandazione, ed è deliberato: dice com'è fatto il
 * tempo — chi regge ogni ora, che grado sorge, quando la Luna è vuota — e
 * lascia la scelta a chi consuma.
 */
export interface ElectionResult {
  range: PassageRange;
  place: Place;
  hours: PlanetaryHour[];
  voids: VoidOfCourse[];
  /**
   * I filtri applicati alla richiesta, se ce n'erano.
   *
   * Viaggia col risultato perché un elenco ridotto che non dichiari di esserlo
   * si legge come completo: sessanta ore al posto di settecento sembrerebbero
   * tutte quelle che esistono.
   */
  filters?: { rulers?: BodyId[]; skipMoonVoid?: boolean };
  /**
   * Avvertimenti non bloccanti: alba o tramonto non calcolabili alle latitudini
   * polari, corpi non disponibili, ripieghi sul sistema di case.
   */
  warnings: string[];
}
