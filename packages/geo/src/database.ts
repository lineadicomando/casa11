import { existsSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { GeoError } from './types.js';

/**
 * Carica lo schema SQL condiviso.
 *
 * Sorgente unica in `schema.sql` alla radice del pacchetto: lo stesso file è
 * letto dallo script di importazione, così che le due copie non divergano.
 */
export function loadSchema(): string {
  return readFileSync(fileURLToPath(new URL('../schema.sql', import.meta.url)), 'utf8');
}

export function defaultDatabasePath(): string {
  return (
    process.env['GEONAMES_DB_PATH'] ?? fileURLToPath(new URL('../data/geonames.db', import.meta.url))
  );
}

/**
 * Apre il database in sola lettura.
 *
 * Se il file non esiste solleva un errore con istruzioni esplicite: il
 * dataset non è versionato e va importato una volta sola.
 */
export function openDatabase(databasePath?: string): DatabaseSync {
  const path = databasePath ?? defaultDatabasePath();

  if (!existsSync(path)) {
    throw new GeoError(
      'DATABASE_ASSENTE',
      `Database delle località non trovato in ${path}. ` +
        'Eseguilo una volta con `npm run geo:import -w @undicesimacasa/geo` ' +
        '(scarica ~14 MB da GeoNames e costruisce il database locale).',
    );
  }

  try {
    return new DatabaseSync(path, { readOnly: true });
  } catch (error) {
    throw new GeoError(
      'DATABASE_CORROTTO',
      `Impossibile aprire ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Normalizza un nome per la ricerca: minuscolo, senza segni diacritici,
 * spaziatura compattata.
 *
 * Usata sia in fase di importazione sia in fase di ricerca: devono
 * applicare esattamente la stessa trasformazione, altrimenti le voci
 * accentate diventano irraggiungibili.
 */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\u0060]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
