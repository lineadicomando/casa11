-- Schema del database delle località.
--
-- `location_names` ha una riga per ogni nome alternativo del luogo, tutte con
-- lo stesso `location_id`: è il modo più semplice per far funzionare gli
-- esonimi ("Munich", "München", "Monaco di Baviera") con una sola query.
--
-- `search_name` contiene il nome normalizzato (minuscolo, senza segni
-- diacritici). La normalizzazione applicata in importazione e quella applicata
-- in ricerca devono coincidere: vedi `normalizeName` in src/database.ts.
--
-- I nomi sono memorizzati in due lingue. GeoNames usa come nome primario
-- l'esonimo internazionale ("Rome", "Munich"), inadatto a un'interfaccia
-- italiana; le colonne `*_it` contengono la variante italiana quando esiste.
-- La risoluzione avviene in query con COALESCE, così un consumatore che
-- preferisce l'inglese non paga nulla.

CREATE TABLE IF NOT EXISTS locations (
  id           INTEGER PRIMARY KEY,
  name_en      TEXT    NOT NULL,
  name_it      TEXT,
  country_code TEXT    NOT NULL,
  country_en   TEXT    NOT NULL,
  country_it   TEXT,
  region_en    TEXT,
  region_it    TEXT,
  latitude     REAL    NOT NULL,
  longitude    REAL    NOT NULL,
  timezone     TEXT    NOT NULL,
  population   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS location_names (
  location_id INTEGER NOT NULL REFERENCES locations(id),
  search_name TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_location_names_search
  ON location_names(search_name, location_id);

CREATE INDEX IF NOT EXISTS idx_locations_country
  ON locations(country_code);

CREATE TABLE IF NOT EXISTS metadata (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
