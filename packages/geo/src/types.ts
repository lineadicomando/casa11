/**
 * Una località con tutto ciò che serve a calcolare un tema natale:
 * coordinate e — soprattutto — il fuso orario IANA, senza il quale
 * la conversione a Tempo Universale non è possibile.
 */
export interface Location {
  /** Identificatore GeoNames, stabile fra le versioni del dataset. */
  id: number;
  /** Nome nella grafia locale, es. `Roma`. */
  name: string;
  /** Codice ISO 3166-1 alpha-2, es. `IT`. */
  countryCode: string;
  /** Nome esteso del paese, es. `Italy`. */
  country: string;
  /** Suddivisione di primo livello, es. `Latium`. Assente se non mappata. */
  region?: string;
  /** Latitudine in gradi decimali, positiva a Nord. */
  latitude: number;
  /** Longitudine in gradi decimali, positiva a Est. */
  longitude: number;
  /** Identificatore IANA, es. `Europe/Rome`. */
  timezone: string;
  /** Popolazione secondo GeoNames: usata per ordinare i risultati. */
  population: number;
}

export interface SearchOptions {
  /** Numero massimo di risultati. Default 10, massimo 50. */
  limit?: number;
  /** Restringe la ricerca a un paese (ISO 3166-1 alpha-2, es. `IT`). */
  countryCode?: string;
  /** Percorso del database SQLite. Default: variabile d'ambiente o `<pkg>/data/geonames.db`. */
  databasePath?: string;
}

export type GeoErrorCode = 'DATABASE_ASSENTE' | 'QUERY_VUOTA' | 'DATABASE_CORROTTO';

export class GeoError extends Error {
  readonly code: GeoErrorCode;

  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.name = 'GeoError';
    this.code = code;
  }
}
