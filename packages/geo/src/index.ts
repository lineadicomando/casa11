/**
 * @dodicisegni/geo — ricerca di località con coordinate e fuso orario.
 *
 * Il dataset GeoNames è importato in un database SQLite locale: nessuna
 * chiamata di rete a runtime, nessun limite di frequenza, nessuna dipendenza
 * da un servizio esterno. Il fuso orario IANA arriva dal dataset stesso,
 * quindi una ricerca restituisce già tutto ciò che serve al calcolo.
 */

export { searchLocations, getLocation, databaseInfo } from './search.js';
export {
  closeDatabase,
  defaultDatabasePath,
  normalizeName,
  loadSchema,
  openDatabase,
} from './database.js';
export {
  GeoError,
  type GeoErrorCode,
  type LocaleCode,
  type Location,
  type SearchOptions,
} from './types.js';
