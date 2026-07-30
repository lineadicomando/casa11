import { normalizeName, openDatabase } from './database.js';
import { GeoError, type Location, type SearchOptions } from './types.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

interface LocationRow {
  id: number;
  name: string;
  country_code: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number;
  exact: number;
}

/**
 * Cerca località per nome, restituendo i candidati ordinati per rilevanza.
 *
 * La disambiguazione è **esplicita**: la funzione non sceglie per te fra le
 * decine di "Roma" del mondo, restituisce l'elenco. È la premessa per l'uso
 * da agente — indovinare qui produce temi natali sbagliati in silenzio.
 *
 * Ordinamento: prima le corrispondenze esatte, poi per popolazione decrescente.
 */
export function searchLocations(query: string, options: SearchOptions = {}): Location[] {
  const normalized = normalizeName(query);
  if (normalized.length === 0) {
    throw new GeoError('QUERY_VUOTA', 'La stringa di ricerca è vuota.');
  }

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const database = openDatabase(options.databasePath);

  try {
    const conditions = ['n.search_name LIKE ? ESCAPE \'\\\''];
    const parameters: (string | number)[] = [`${escapeLike(normalized)}%`];

    if (options.countryCode) {
      conditions.push('l.country_code = ?');
      parameters.push(options.countryCode.toUpperCase());
    }

    // `MAX(...)` sul flag di corrispondenza esatta: una località può avere più
    // nomi alternativi, ci interessa il migliore fra questi.
    const statement = database.prepare(`
      SELECT l.id, l.name, l.country_code, l.country, l.region,
             l.latitude, l.longitude, l.timezone, l.population,
             MAX(CASE WHEN n.search_name = ? THEN 1 ELSE 0 END) AS exact
      FROM location_names n
      JOIN locations l ON l.id = n.location_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY l.id
      ORDER BY exact DESC, l.population DESC, l.name ASC
      LIMIT ?
    `);

    const rows = statement.all(normalized, ...parameters, limit) as unknown as LocationRow[];
    return rows.map(toLocation);
  } finally {
    database.close();
  }
}

/** Restituisce una località dal suo identificatore GeoNames. */
export function getLocation(id: number, options: SearchOptions = {}): Location | undefined {
  const database = openDatabase(options.databasePath);
  try {
    const row = database
      .prepare(
        `SELECT id, name, country_code, country, region,
                latitude, longitude, timezone, population, 1 AS exact
         FROM locations WHERE id = ?`,
      )
      .get(id) as unknown as LocationRow | undefined;
    return row ? toLocation(row) : undefined;
  } finally {
    database.close();
  }
}

/** Metadati dell'importazione: versione del dataset, data, numero di località. */
export function databaseInfo(options: SearchOptions = {}): Record<string, string> {
  const database = openDatabase(options.databasePath);
  try {
    const rows = database.prepare('SELECT key, value FROM metadata').all() as unknown as {
      key: string;
      value: string;
    }[];
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } finally {
    database.close();
  }
}

function toLocation(row: LocationRow): Location {
  const location: Location = {
    id: row.id,
    name: row.name,
    countryCode: row.country_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    population: row.population,
  };
  if (row.region) location.region = row.region;
  return location;
}

/** I metacaratteri di LIKE vanno neutralizzati, altrimenti "St. %" fa da jolly. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
