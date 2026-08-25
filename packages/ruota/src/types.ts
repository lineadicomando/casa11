/**
 * Quel poco che al disegno serve sapere di una carta.
 *
 * Questi tipi sono ridichiarati invece di essere importati da
 * `@dodicisegni/core`, e la ragione non è la stessa di `ZODIAC_ORDER` in
 * `glyphs.ts` — là si evitava un import di *valore*, qui si evita una
 * dipendenza tout court.
 *
 * Il motivo è un ciclo: la CLI `casa11` vive dentro `core`, e per salvare un
 * disegno `core` deve poter chiamare questo pacchetto. Se questo pacchetto a
 * sua volta importasse `core`, nessuno dei due potrebbe compilare per primo.
 * Rompendo la dipendenza da questo lato l'ordine diventa quello giusto anche
 * concettualmente: **il disegno non conosce il motore**, riceve una carta già
 * calcolata e non ha modo di calcolarne una.
 *
 * Sono tipi **strutturali**: un `NatalChart` di `core` li soddisfa senza
 * conversioni, perché ha quei campi e altri ancora. Elencare qui i soli campi
 * usati dice anche quanto poco al disegno serva.
 *
 * Che le due dichiarazioni restino allineate lo verifica `test/tipi.test.ts`,
 * che `core` lo importa davvero — nei test si può, perché girano dopo che
 * tutto è stato compilato.
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

export type NatalPointId =
  | BodyId
  | 'ascendente'
  | 'medio-cielo'
  | 'discendente'
  | 'fondo-cielo'
  | 'fortuna';

export type TransitingPointId = BodyId | 'ascendente' | 'medio-cielo';

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

export type Element = 'fuoco' | 'terra' | 'aria' | 'acqua';

export type Modality = 'cardinale' | 'fisso' | 'mobile';

/** Un corpo da disegnare. Del corpo calcolato si guardano solo questi campi. */
export interface CelestialBody {
  id: BodyId;
  name: string;
  longitude: number;
  retrograde: boolean;
  sign: ZodiacSign;
  /** Posizione all'interno del segno, [0, 30). */
  signDegree: number;
  /** Casa occupata, 1-12. Assente se l'ora di nascita è ignota. */
  house?: number;
}

/** Una posizione derivata: la Parte di Fortuna, che non ha moto proprio. */
export interface ChartPoint {
  longitude: number;
  sign: ZodiacSign;
  signDegree: number;
  house?: number;
}

export interface House {
  /** Numero della casa, 1-12. */
  number: number;
  /** Longitudine eclittica della cuspide. */
  longitude: number;
}

export interface Angles {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;
}

/** Un aspetto interno alla carta. */
export interface Aspect {
  aspect: AspectId;
  from: NatalPointId;
  to: NatalPointId;
  /** Scarto dall'angolo esatto, in gradi: da qui la trasparenza della linea. */
  orb: number;
}

/** Un aspetto fra un corpo in transito e un punto del tema. */
export interface TransitAspect {
  aspect: AspectId;
  transiting: TransitingPointId;
  natal: NatalPointId;
  orb: number;
}

/** Quel che dei transiti serve all'anello esterno. */
export interface TransitChart {
  transiting: readonly CelestialBody[];
  aspects: readonly TransitAspect[];
}
