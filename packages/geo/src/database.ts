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

let cached: { path: string; database: DatabaseSync } | undefined;

/**
 * Apre il database in sola lettura, riusando la connessione già aperta.
 *
 * Il dataset cambia solo quando lo si reimporta: tenere la connessione viva
 * evita il costo di apertura a ogni chiamata — l'autocomplete ne fa una per
 * battuta. Dopo una reimportazione serve `closeDatabase()` o un riavvio.
 *
 * Se il file non esiste solleva un errore con istruzioni esplicite: il
 * dataset non è versionato e va importato una volta sola.
 */
export function openDatabase(databasePath?: string): DatabaseSync {
  const path = databasePath ?? defaultDatabasePath();
  if (cached?.path === path) return cached.database;

  if (!existsSync(path)) {
    throw new GeoError(
      'DATABASE_ASSENTE',
      `Database delle località non trovato in ${path}. ` +
        'Eseguilo una volta con `npm run geo:import -w @dodicisegni/geo` ' +
        '(scarica ~215 MB da GeoNames e costruisce il database locale).',
    );
  }

  // Un percorso diverso dal precedente capita solo nei test: la vecchia
  // connessione va chiusa, non accumulata.
  closeDatabase();

  try {
    const database = new DatabaseSync(path, { readOnly: true });
    cached = { path, database };
    return database;
  } catch (error) {
    throw new GeoError(
      'DATABASE_CORROTTO',
      `Impossibile aprire ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Chiude la connessione riusata. Serve ai test e dopo una reimportazione. */
export function closeDatabase(): void {
  if (!cached) return;
  const { database } = cached;
  cached = undefined;
  try {
    database.close();
  } catch {
    // Già chiusa altrove: l'obiettivo era proprio questo.
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
