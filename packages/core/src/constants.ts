import type {
  AspectId,
  BodyId,
  Element,
  HouseSystem,
  Modality,
  NatalPointId,
  ZodiacSign,
} from './types.js';

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

/**
 * L'elemento di ciascun segno: la triplicità.
 *
 * Non è interpretazione ma classificazione, e su questa non esiste scuola che
 * dissenta — l'Ariete è di fuoco da Tolomeo in poi. Quel che è interpretazione
 * comincia un passo più in là, quando dal conteggio si tirano conclusioni: e
 * quello il motore non lo fa.
 */
export const SIGN_ELEMENT: Readonly<Record<ZodiacSign, Element>> = {
  ariete: 'fuoco',
  leone: 'fuoco',
  sagittario: 'fuoco',
  toro: 'terra',
  vergine: 'terra',
  capricorno: 'terra',
  gemelli: 'aria',
  bilancia: 'aria',
  acquario: 'aria',
  cancro: 'acqua',
  scorpione: 'acqua',
  pesci: 'acqua',
};

/** La modalità di ciascun segno: la quadruplicità. */
export const SIGN_MODALITY: Readonly<Record<ZodiacSign, Modality>> = {
  ariete: 'cardinale',
  cancro: 'cardinale',
  bilancia: 'cardinale',
  capricorno: 'cardinale',
  toro: 'fisso',
  leone: 'fisso',
  scorpione: 'fisso',
  acquario: 'fisso',
  gemelli: 'mobile',
  vergine: 'mobile',
  sagittario: 'mobile',
  pesci: 'mobile',
};

/**
 * I dieci fra luminari e pianeti, senza i punti calcolati.
 *
 * È il gruppo su cui quasi tutti concordano quando si conta la distribuzione:
 * ciò che sta oltre — nodi, Lilith, Chirone, la Parte di Fortuna — dipende
 * dalla scuola, e per questo viene contato a parte invece che escluso.
 */
export const PLANETS: readonly BodyId[] = [
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

/**
 * Corpi in transito predefiniti: i dieci pianeti e il Nodo Nord.
 *
 * Il Nodo Sud è escluso perché in transito è l'opposizione esatta del Nord:
 * ogni sua riga sarebbe una riga già presente, letta al contrario. Resta
 * disponibile come bersaglio natale, dove invece dice qualcosa di suo.
 */
export const DEFAULT_TRANSIT_BODIES: readonly BodyId[] = [
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
];

/**
 * Nomi dei bersagli natali che non sono corpi celesti: quelli dei corpi
 * stanno già in `BODIES`.
 *
 * «Fortuna» e non «Parte di Fortuna» per la stessa ragione per cui la resa
 * compatta abbrevia: è una colonna, non una frase.
 */
export const NATAL_POINT_NAMES: Readonly<Record<Exclude<NatalPointId, BodyId>, string>> = {
  ascendente: 'Ascendente',
  'medio-cielo': 'Medio Cielo',
  discendente: 'Discendente',
  'fondo-cielo': 'Fondo Cielo',
  fortuna: 'Fortuna',
};

/**
 * Corpi predefiniti del calendario dei passaggi.
 *
 * Come i transitanti, **meno la Luna**: percorre lo zodiaco in ventisette
 * giorni, quindi perfeziona qualche migliaio di aspetti all'anno. Un elenco
 * così non è un calendario, è rumore — e chi la vuole la chiede per nome.
 */
export const DEFAULT_PASSAGE_BODIES: readonly BodyId[] = DEFAULT_TRANSIT_BODIES.filter(
  (id) => id !== 'luna',
);

/**
 * L'ordine caldeo: i sette pianeti classici per velocità apparente decrescente
 * vista dalla Terra.
 *
 * Regge la successione delle ore planetarie. Ventiquattro ore avanzano di tre
 * posizioni nella catena, ed è da questo scarto che nasce l'ordine dei giorni
 * della settimana — che infatti non è quello dei pianeti.
 */
export const CHALDEAN_ORDER: readonly BodyId[] = [
  'saturno',
  'giove',
  'marte',
  'sole',
  'venere',
  'mercurio',
  'luna',
];

/**
 * Il pianeta che regge ciascun giorno della settimana, da domenica a sabato.
 *
 * L'ordine sopravvive intatto nei nomi italiani dei giorni — lunedì la Luna,
 * martedì Marte, fino a sabato che è il giorno di Saturno sotto il nome del
 * sabato ebraico.
 */
export const WEEKDAY_RULERS: readonly BodyId[] = [
  'sole',
  'luna',
  'marte',
  'mercurio',
  'giove',
  'venere',
  'saturno',
];

/**
 * Moto medio diurno in gradi, per corpo.
 *
 * Non serve al calcolo delle posizioni — quelle vengono dalle effemeridi — ma
 * a scegliere ogni quanto campionare quando si cerca l'istante esatto di un
 * aspetto: un passo buono per Plutone sprecherebbe migliaia di calcoli sulla
 * Luna, e uno buono per la Luna mancherebbe i passaggi di Plutone.
 */
export const MEAN_DAILY_MOTION: Readonly<Record<BodyId, number>> = {
  sole: 0.9856,
  luna: 13.176,
  mercurio: 1.383,
  venere: 1.202,
  marte: 0.524,
  giove: 0.083,
  saturno: 0.033,
  urano: 0.012,
  nettuno: 0.006,
  plutone: 0.004,
  'nodo-nord': 0.053,
  'nodo-sud': 0.053,
  lilith: 0.111,
  chirone: 0.05,
};

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

/**
 * I luminari ricevono un'orbita più ampia, secondo la prassi corrente.
 * Il bonus vale per ciascun corpo della coppia: un aspetto fra Sole e Luna
 * ne somma due, cioè +4°.
 */
export const LUMINARIES: readonly BodyId[] = ['sole', 'luna'];
export const LUMINARY_ORB_BONUS = 2;

/**
 * Orbite dei transiti, molto più strette di quelle natali.
 *
 * Non è una preferenza: con l'orbita natale di 8° un transito di Saturno
 * resterebbe «in aspetto» per mesi di fila, e il quadro del momento
 * diventerebbe un elenco di contatti permanenti che non distingue il giorno
 * in cui l'aspetto si perfeziona da quello prima e da quello dopo.
 */
export const TRANSIT_ORBS: Readonly<Record<AspectId, number>> = {
  congiunzione: 2,
  opposizione: 2,
  trigono: 2,
  quadrato: 2,
  sestile: 1.5,
  semisestile: 1,
  quinconce: 1,
  semiquadrato: 1,
  sesquiquadrato: 1,
};

/**
 * Gradi aggiuntivi per i luminari nei transiti, sommati per ciascun lato
 * della coppia.
 *
 * Vale in entrambi i versi, non solo per il corpo in movimento: un contatto
 * che tocca il Sole o la Luna natali conta di più, e gli si concede più
 * spazio tanto quanto se ne concede alla Luna che passa.
 */
export const TRANSIT_ORB_BONUS: Readonly<Record<string, number>> = {
  luna: 1,
  sole: 0.5,
};

/**
 * Punti calcolati (non corpi fisici) per i quali non ha senso parlare di
 * aspetto reciproco: il Nodo Sud è per definizione all'opposizione del Nord.
 */
export const NON_ASPECTING_PAIRS: readonly (readonly [BodyId, BodyId])[] = [
  ['nodo-nord', 'nodo-sud'],
];
