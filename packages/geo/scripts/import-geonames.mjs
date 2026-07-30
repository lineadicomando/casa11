#!/usr/bin/env node
/**
 * Costruisce il database locale delle località a partire dai dump GeoNames.
 *
 * Sorgenti (licenza CC BY 4.0, https://www.geonames.org/):
 *   cities500.zip         località con più di 500 abitanti (~14 MB compressi)
 *   admin1CodesASCII.txt  nomi delle suddivisioni di primo livello
 *   countryInfo.txt       nomi estesi dei paesi
 *
 * Il database risultante NON è versionato: è un artefatto rigenerabile.
 * Va eseguito una volta sola, e di nuovo solo per aggiornare il dataset.
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const BASE_URL = process.env.GEONAMES_BASE_URL ?? 'https://download.geonames.org/export/dump/';

const packageRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dataDir = join(packageRoot, 'data');
const cacheDir = join(dataDir, 'cache');
const databasePath = process.env.GEONAMES_DB_PATH ?? join(dataDir, 'geonames.db');

/** Indici delle colonne di cities500.txt, secondo il tracciato GeoNames. */
const COL = {
  id: 0,
  name: 1,
  asciiName: 2,
  alternateNames: 3,
  latitude: 4,
  longitude: 5,
  countryCode: 8,
  admin1: 10,
  population: 14,
  timezone: 17,
};

function normalizeName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\u0060]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchCached(fileName) {
  const cached = join(cacheDir, fileName);
  try {
    const info = await stat(cached);
    if (info.size > 0) {
      console.log(`  ${fileName.padEnd(22)} da cache (${mb(info.size)})`);
      return readFile(cached);
    }
  } catch {
    // non in cache: si scarica
  }

  process.stdout.write(`  ${fileName.padEnd(22)} scarico ... `);
  const response = await fetch(`${BASE_URL}${fileName}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} su ${BASE_URL}${fileName}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(cached, buffer);
  console.log(`ok (${mb(buffer.length)})`);
  return buffer;
}

/**
 * Estrae l'unico file contenuto in un archivio ZIP.
 *
 * Implementato qui invece di dipendere da una libreria o dal binario `unzip`:
 * l'archivio ha una sola voce e serve solo il caso deflate/stored. Si legge
 * il record di fine directory centrale per ottenere posizione e dimensioni
 * reali — i campi dell'header locale possono essere azzerati negli archivi
 * scritti in streaming.
 */
function extractSingleZipEntry(buffer) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  // Il commento finale può essere lungo fino a 64 KB: si cerca all'indietro.
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('Archivio ZIP non valido: record di fine directory assente.');

  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
    throw new Error('Archivio ZIP non valido: directory centrale assente.');
  }

  const method = buffer.readUInt16LE(centralOffset + 10);
  const compressedSize = buffer.readUInt32LE(centralOffset + 20);
  const nameLength = buffer.readUInt16LE(centralOffset + 28);
  const extraLength = buffer.readUInt16LE(centralOffset + 30);
  const commentLength = buffer.readUInt16LE(centralOffset + 32);
  const localOffset = buffer.readUInt32LE(centralOffset + 42);
  const entryName = buffer.toString('utf8', centralOffset + 46, centralOffset + 46 + nameLength);
  void extraLength;
  void commentLength;

  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error('Archivio ZIP non valido: header locale assente.');
  }
  const localNameLength = buffer.readUInt16LE(localOffset + 26);
  const localExtraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const data = buffer.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return { name: entryName, content: data };
  if (method === 8) return { name: entryName, content: inflateRawSync(data) };
  throw new Error(`Metodo di compressione ZIP ${method} non supportato.`);
}

function parseCountryNames(text) {
  const names = new Map();
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const fields = line.split('\t');
    if (fields[0] && fields[4]) names.set(fields[0], fields[4]);
  }
  return names;
}

function parseAdmin1Names(text) {
  const names = new Map();
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const fields = line.split('\t');
    // fields[0] è nella forma "IT.07", fields[1] il nome esteso.
    if (fields[0] && fields[1]) names.set(fields[0], fields[1]);
  }
  return names;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });

  console.log(`Dataset GeoNames → ${databasePath}\n`);
  const [citiesZip, admin1Text, countryText] = await Promise.all([
    fetchCached('cities500.zip'),
    fetchCached('admin1CodesASCII.txt'),
    fetchCached('countryInfo.txt'),
  ]);

  const countryNames = parseCountryNames(countryText.toString('utf8'));
  const admin1Names = parseAdmin1Names(admin1Text.toString('utf8'));

  process.stdout.write('\n  estraggo cities500.zip ... ');
  const entry = extractSingleZipEntry(citiesZip);
  console.log(`ok (${entry.name}, ${mb(entry.content.length)})`);

  await rm(databasePath, { force: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    ${(await readFile(join(packageRoot, 'schema.sql'), 'utf8')).trim()}
  `);

  const insertLocation = database.prepare(
    `INSERT INTO locations (id, name, country_code, country, region,
                            latitude, longitude, timezone, population)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertName = database.prepare(
    'INSERT INTO location_names (location_id, search_name) VALUES (?, ?)',
  );

  process.stdout.write('  importo ... ');
  database.exec('BEGIN');

  let locations = 0;
  let nameRows = 0;
  for (const line of entry.content.toString('utf8').split('\n')) {
    if (line.trim() === '') continue;
    const f = line.split('\t');

    const id = Number(f[COL.id]);
    const timezone = f[COL.timezone];
    const name = f[COL.name];
    const countryCode = f[COL.countryCode];
    // Senza fuso orario la località è inutilizzabile per un tema natale.
    if (!Number.isFinite(id) || !name || !countryCode || !timezone) continue;

    const admin1Key = `${countryCode}.${f[COL.admin1] ?? ''}`;
    insertLocation.run(
      id,
      name,
      countryCode,
      countryNames.get(countryCode) ?? countryCode,
      admin1Names.get(admin1Key) ?? null,
      Number(f[COL.latitude]),
      Number(f[COL.longitude]),
      timezone,
      Number(f[COL.population]) || 0,
    );
    locations += 1;

    // Nome ufficiale, translitterazione ASCII ed esonimi: tutti cercabili.
    const variants = new Set([name, f[COL.asciiName] ?? '', ...(f[COL.alternateNames] ?? '').split(',')]);
    for (const variant of variants) {
      const normalized = normalizeName(variant);
      if (normalized.length === 0 || normalized.length > 120) continue;
      insertName.run(id, normalized);
      nameRows += 1;
    }
  }

  const insertMeta = database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  insertMeta.run('source', 'GeoNames cities500 (CC BY 4.0)');
  insertMeta.run('imported_at', new Date().toISOString());
  insertMeta.run('locations', String(locations));
  insertMeta.run('search_names', String(nameRows));

  database.exec('COMMIT');
  database.exec('ANALYZE');
  database.close();

  const info = await stat(databasePath);
  console.log(`ok\n`);
  console.log(`  località:      ${locations.toLocaleString('it-IT')}`);
  console.log(`  nomi cercabili: ${nameRows.toLocaleString('it-IT')}`);
  console.log(`  database:      ${mb(info.size)}`);
  console.log(`\nFatto. Cache dei sorgenti in ${cacheDir} (eliminabile).`);
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

try {
  await main();
} catch (error) {
  console.error(`\nImportazione fallita: ${error.message}`);
  process.exitCode = 1;
}
