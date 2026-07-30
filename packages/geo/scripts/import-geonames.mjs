#!/usr/bin/env node
/**
 * Costruisce il database locale delle località a partire dai dump GeoNames.
 *
 * Sorgenti (licenza CC BY 4.0, https://www.geonames.org/):
 *   cities500.zip         località con più di 500 abitanti (~13 MB compressi)
 *   admin1CodesASCII.txt  suddivisioni di primo livello
 *   countryInfo.txt       paesi
 *   alternateNames.zip    nomi tradotti, tutte le lingue (~200 MB compressi)
 *
 * L'ultimo file è grande e decompresso supera il gigabyte: viene letto in
 * streaming e filtrato alla sola lingua italiana, mai caricato in memoria.
 * Copre città, regioni e paesi, quindi risolve tutti e tre i livelli del
 * nome visualizzato con un'unica sorgente.
 *
 * Il database risultante NON è versionato: è un artefatto rigenerabile.
 */
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createInflateRaw, inflateRawSync } from 'node:zlib';

const BASE_URL = process.env.GEONAMES_BASE_URL ?? 'https://download.geonames.org/export/dump/';

/** Lingua delle traduzioni da importare. */
const LANG = 'it';

const packageRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dataDir = join(packageRoot, 'data');
const cacheDir = join(dataDir, 'cache');
const databasePath = process.env.GEONAMES_DB_PATH ?? join(dataDir, 'geonames.db');

/** Indici delle colonne di cities500.txt, secondo il tracciato GeoNames. */
const CITY = {
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

/** Indici delle colonne di alternateNames.txt. */
const ALT = {
  geonameId: 1,
  language: 2,
  name: 3,
  isPreferred: 4,
  isShort: 5,
  isColloquial: 6,
  isHistoric: 7,
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

/**
 * Qualificatori amministrativi da togliere ai nomi italiani delle suddivisioni.
 *
 * GeoNames riporta la denominazione ufficiale ("Regione Emilia-Romagna",
 * "Cantone di Zurigo", "Città-Stato di Amburgo"), corretta ma prolissa in un
 * elenco di scelta, dove la riga è già "Città, Regione, Paese". Si tiene il
 * solo toponimo, che è ciò che una persona riconosce.
 */
const ADMIN_QUALIFIER =
  /^(?:Regione(?:\s+autonoma)?|Provincia(?:\s+autonoma)?\s+di|Provincia|Città\s+metropolitana\s+di|Città-Stato\s+di|Cantone\s+di|Canton|Stato\s+(?:federato\s+)?di|Land|Contea\s+di|Distretto\s+di|Dipartimento\s+di|Comunità\s+autonoma\s+(?:di|del|della))\s+/i;

function stripAdminQualifier(name) {
  if (!name) return name;
  const stripped = name.replace(ADMIN_QUALIFIER, '').trim();
  // Se resta vuoto il qualificatore *era* il nome: si tiene l'originale.
  return stripped.length > 0 ? stripped : name;
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Scarica in cache, in streaming: i file grandi non passano dalla memoria. */
async function fetchCached(fileName) {
  const cached = join(cacheDir, fileName);
  try {
    const info = await stat(cached);
    if (info.size > 0) {
      console.log(`  ${fileName.padEnd(22)} da cache (${mb(info.size)})`);
      return cached;
    }
  } catch {
    // non in cache: si scarica
  }

  process.stdout.write(`  ${fileName.padEnd(22)} scarico ... `);
  const response = await fetch(`${BASE_URL}${fileName}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} su ${BASE_URL}${fileName}`);
  if (!response.body) throw new Error(`risposta senza corpo per ${fileName}`);

  const handle = await open(cached, 'w');
  try {
    await pipeline(Readable.fromWeb(response.body), handle.createWriteStream());
  } finally {
    await handle.close();
  }
  console.log(`ok (${mb((await stat(cached)).size)})`);
  return cached;
}

/**
 * Enumera le voci di un archivio ZIP leggendone la directory centrale.
 *
 * Restituisce posizione e lunghezza dei dati compressi invece del contenuto:
 * per gli archivi grandi la decompressione deve avvenire in streaming.
 * La directory centrale sta in fondo al file e riporta le dimensioni reali —
 * i campi dell'header locale possono essere azzerati negli archivi scritti
 * in streaming.
 *
 * L'enumerazione è necessaria, non un lusso: alternateNames.zip contiene
 * due file, e il primo non è quello che serve.
 */
async function listZipEntries(path) {
  const size = (await stat(path)).size;
  const tailLength = Math.min(size, 65_557);
  const handle = await open(path, 'r');

  try {
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, size - tailLength);

    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i -= 1) {
      if (tail.readUInt32LE(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) throw new Error('Archivio ZIP non valido: record di fine directory assente.');

    const count = tail.readUInt16LE(eocd + 10);
    const centralSize = tail.readUInt32LE(eocd + 12);
    const centralOffset = tail.readUInt32LE(eocd + 16);
    if (centralOffset === 0xffffffff || centralSize === 0xffffffff) {
      throw new Error('Archivi ZIP64 non supportati.');
    }

    const central = Buffer.alloc(centralSize);
    await handle.read(central, 0, centralSize, centralOffset);

    const entries = [];
    let cursor = 0;
    for (let i = 0; i < count; i += 1) {
      if (central.readUInt32LE(cursor) !== 0x02014b50) {
        throw new Error('Archivio ZIP non valido: voce di directory centrale malformata.');
      }
      const nameLength = central.readUInt16LE(cursor + 28);
      const extraLength = central.readUInt16LE(cursor + 30);
      const commentLength = central.readUInt16LE(cursor + 32);

      entries.push({
        name: central.toString('utf8', cursor + 46, cursor + 46 + nameLength),
        method: central.readUInt16LE(cursor + 10),
        compressedSize: central.readUInt32LE(cursor + 20),
        localOffset: central.readUInt32LE(cursor + 42),
      });

      cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  } finally {
    await handle.close();
  }
}

/**
 * Individua una voce per nome, con l'estensione esatta dei dati compressi.
 *
 * L'header locale va riletto perché i campi variabili possono avere lunghezza
 * diversa da quella registrata nella directory centrale.
 */
async function locateZipEntry(path, entryName) {
  const entries = await listZipEntries(path);
  const entry = entries.find((candidate) => candidate.name === entryName);
  if (!entry) {
    throw new Error(
      `Voce "${entryName}" non trovata in ${path}. Presenti: ${entries.map((e) => e.name).join(', ')}`,
    );
  }
  if (entry.method !== 0 && entry.method !== 8) {
    throw new Error(`Metodo di compressione ZIP ${entry.method} non supportato.`);
  }

  const handle = await open(path, 'r');
  try {
    const local = Buffer.alloc(30);
    await handle.read(local, 0, 30, entry.localOffset);
    if (local.readUInt32LE(0) !== 0x04034b50) {
      throw new Error('Archivio ZIP non valido: header locale assente.');
    }
    const start = entry.localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
    return { ...entry, start, end: start + entry.compressedSize - 1 };
  } finally {
    await handle.close();
  }
}

/** Legge riga per riga una voce di un archivio ZIP, senza mai bufferizzarla. */
async function* zipEntryLines(path, entryName) {
  const entry = await locateZipEntry(path, entryName);

  // Il flusso è limitato all'estensione esatta dei dati compressi, quindi
  // l'inflate non incontra il descrittore né la directory centrale in coda.
  const raw = createReadStream(path, { start: entry.start, end: entry.end });
  const source = entry.method === 8 ? raw.pipe(createInflateRaw()) : raw;

  for await (const line of createInterface({ input: source, crlfDelay: Infinity })) {
    yield line;
  }
}

/** Legge un'intera voce in memoria. Solo per i file piccoli. */
async function readWholeZipEntry(path, entryName) {
  const entry = await locateZipEntry(path, entryName);
  const handle = await open(path, 'r');
  try {
    const compressed = Buffer.alloc(entry.end - entry.start + 1);
    await handle.read(compressed, 0, compressed.length, entry.start);
    const content = entry.method === 8 ? inflateRawSync(compressed) : compressed;
    return { name: entry.name, content };
  } finally {
    await handle.close();
  }
}

function parseCountries(text) {
  const byCode = new Map();
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const f = line.split('\t');
    // 0: ISO, 4: nome, 16: geonameid del paese
    if (f[0] && f[4]) byCode.set(f[0], { name: f[4], geonameId: Number(f[16]) || 0 });
  }
  return byCode;
}

function parseAdmin1(text) {
  const byKey = new Map();
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const f = line.split('\t');
    // 0: chiave "IT.07", 1: nome, 3: geonameid della suddivisione
    if (f[0] && f[1]) byKey.set(f[0], { name: f[1], geonameId: Number(f[3]) || 0 });
  }
  return byKey;
}

/**
 * Estrae i nomi italiani per gli identificatori richiesti.
 *
 * Fra più varianti vince quella marcata `isPreferredName`; a parità si tiene
 * la prima. Si scartano le forme colloquiali e quelle storiche, che sono
 * corrette ma inadatte a un elenco di scelta ("Urbe" per Roma).
 */
async function collectTranslations(path, wantedIds) {
  const names = new Map();
  const preferred = new Set();
  let scanned = 0;

  for await (const line of zipEntryLines(path, 'alternateNames.txt')) {
    scanned += 1;
    if (scanned % 2_000_000 === 0) {
      process.stdout.write(`\r  traduzioni ... ${(scanned / 1e6).toFixed(0)}M righe esaminate`);
    }

    // Filtro sulla lingua prima dello split: è la condizione più selettiva
    // e risparmia di spezzare oltre sedici milioni di righe.
    if (!line.includes(`\t${LANG}\t`)) continue;

    const f = line.split('\t');
    if (f[ALT.language] !== LANG) continue;

    const id = Number(f[ALT.geonameId]);
    if (!wantedIds.has(id)) continue;
    if (f[ALT.isColloquial] === '1' || f[ALT.isHistoric] === '1') continue;

    const name = f[ALT.name];
    if (!name) continue;

    const isPreferred = f[ALT.isPreferred] === '1';
    if (isPreferred) {
      names.set(id, name);
      preferred.add(id);
    } else if (!preferred.has(id) && !names.has(id)) {
      names.set(id, name);
    }
  }

  process.stdout.write(`\r  traduzioni ... ${(scanned / 1e6).toFixed(1)}M righe esaminate, ${names.size} nomi italiani\n`);
  return names;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  console.log(`Dataset GeoNames → ${databasePath}\n`);

  const citiesPath = await fetchCached('cities500.zip');
  const admin1Path = await fetchCached('admin1CodesASCII.txt');
  const countryPath = await fetchCached('countryInfo.txt');
  const alternatePath = await fetchCached('alternateNames.zip');

  const countries = parseCountries(await readFile(countryPath, 'utf8'));
  const admin1 = parseAdmin1(await readFile(admin1Path, 'utf8'));

  process.stdout.write('\n  estraggo cities500.zip ... ');
  const cities = await readWholeZipEntry(citiesPath, 'cities500.txt');
  console.log(`ok (${cities.name}, ${mb(cities.content.length)})`);

  // Prima passata: raccoglie le città e tutti gli identificatori da tradurre.
  const rows = [];
  const wantedIds = new Set();
  for (const line of cities.content.toString('utf8').split('\n')) {
    if (line.trim() === '') continue;
    const f = line.split('\t');

    const id = Number(f[CITY.id]);
    const name = f[CITY.name];
    const countryCode = f[CITY.countryCode];
    const timezone = f[CITY.timezone];
    // Senza fuso orario la località è inutilizzabile per un tema natale.
    if (!Number.isFinite(id) || !name || !countryCode || !timezone) continue;

    rows.push({
      id,
      name,
      countryCode,
      timezone,
      admin1Key: `${countryCode}.${f[CITY.admin1] ?? ''}`,
      latitude: Number(f[CITY.latitude]),
      longitude: Number(f[CITY.longitude]),
      population: Number(f[CITY.population]) || 0,
      variants: [name, f[CITY.asciiName] ?? '', ...(f[CITY.alternateNames] ?? '').split(',')],
    });
    wantedIds.add(id);
  }
  for (const country of countries.values()) if (country.geonameId) wantedIds.add(country.geonameId);
  for (const region of admin1.values()) if (region.geonameId) wantedIds.add(region.geonameId);

  console.log(`  ${rows.length.toLocaleString('it-IT')} località, ${wantedIds.size.toLocaleString('it-IT')} identificatori da tradurre\n`);

  const italian = await collectTranslations(alternatePath, wantedIds);

  await rm(databasePath, { force: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    ${(await readFile(join(packageRoot, 'schema.sql'), 'utf8')).trim()}
  `);

  const insertLocation = database.prepare(
    `INSERT INTO locations (id, name_en, name_it, country_code, country_en, country_it,
                            region_en, region_it, latitude, longitude, timezone, population)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertName = database.prepare(
    'INSERT INTO location_names (location_id, search_name) VALUES (?, ?)',
  );

  process.stdout.write('  scrivo il database ... ');
  database.exec('BEGIN');

  let nameRows = 0;
  let translatedCities = 0;
  for (const row of rows) {
    const country = countries.get(row.countryCode);
    const region = admin1.get(row.admin1Key);
    const nameIt = italian.get(row.id) ?? null;
    if (nameIt) translatedCities += 1;

    insertLocation.run(
      row.id,
      row.name,
      nameIt,
      row.countryCode,
      country?.name ?? row.countryCode,
      (country?.geonameId && italian.get(country.geonameId)) || null,
      region?.name ?? null,
      stripAdminQualifier((region?.geonameId && italian.get(region.geonameId)) || null),
      row.latitude,
      row.longitude,
      row.timezone,
      row.population,
    );

    // Ogni nome conosciuto è cercabile, compresa la variante italiana:
    // si deve poter cercare sia "Munich" sia "Monaco di Baviera".
    const variants = new Set(row.variants);
    if (nameIt) variants.add(nameIt);
    for (const variant of variants) {
      const normalized = normalizeName(variant);
      if (normalized.length === 0 || normalized.length > 120) continue;
      insertName.run(row.id, normalized);
      nameRows += 1;
    }
  }

  const insertMeta = database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  insertMeta.run('source', 'GeoNames cities500 + alternateNames (CC BY 4.0)');
  insertMeta.run('imported_at', new Date().toISOString());
  insertMeta.run('locations', String(rows.length));
  insertMeta.run('search_names', String(nameRows));
  insertMeta.run('translated_it', String(translatedCities));

  database.exec('COMMIT');
  database.exec('ANALYZE');

  // Il WAL serve solo a scrivere in fretta qui: dopo l'importazione il
  // database non cambia più. Lasciarlo in modalità WAL lo renderebbe però
  // inapribile da un mount in sola lettura — SQLite deve poter creare il file
  // `-shm` anche per leggere — cioè esattamente il caso del container.
  database.exec('PRAGMA journal_mode = DELETE;');
  database.close();

  const info = await stat(databasePath);
  console.log('ok\n');
  console.log(`  località:        ${rows.length.toLocaleString('it-IT')}`);
  console.log(`  con nome italiano: ${translatedCities.toLocaleString('it-IT')}`);
  console.log(`  nomi cercabili:  ${nameRows.toLocaleString('it-IT')}`);
  console.log(`  database:        ${mb(info.size)}`);
  console.log(`\nFatto. Cache dei sorgenti in ${cacheDir} (eliminabile, ~215 MB).`);
}

try {
  await main();
} catch (error) {
  console.error(`\nImportazione fallita: ${error.message}`);
  process.exitCode = 1;
}
