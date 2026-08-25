import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadSchema, normalizeName } from '../src/database.js';
import { databaseInfo, getLocation, searchLocations } from '../src/search.js';
import { GeoError } from '../src/types.js';

/**
 * I test usano un database costruito al volo invece del dataset GeoNames
 * completo (90 MB, non versionato): restano rapidi e riproducibili in CI.
 */
let directory: string;
let databasePath: string;

interface Fixture {
  id: number;
  nameEn: string;
  nameIt: string | null;
  countryCode: string;
  countryEn: string;
  countryIt: string | null;
  regionEn: string | null;
  regionIt: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number;
  names: string[];
}

const FIXTURES: Fixture[] = [
  {
    id: 3169070,
    nameEn: 'Rome',
    nameIt: 'Roma',
    countryCode: 'IT',
    countryEn: 'Italy',
    countryIt: 'Italia',
    regionEn: 'Lazio',
    regionIt: 'Lazio',
    latitude: 41.8919,
    longitude: 12.5113,
    timezone: 'Europe/Rome',
    population: 2_318_895,
    names: ['Rome', 'Roma', 'Rom'],
  },
  {
    id: 4219762,
    nameEn: 'Rome',
    // Le città senza esonimo italiano restano al nome internazionale.
    nameIt: null,
    countryCode: 'US',
    countryEn: 'United States',
    countryIt: 'Stati Uniti',
    regionEn: 'Georgia',
    regionIt: 'Georgia',
    latitude: 34.257,
    longitude: -85.1647,
    timezone: 'America/New_York',
    population: 36_323,
    names: ['Rome'],
  },
  {
    id: 2867714,
    nameEn: 'Munich',
    nameIt: 'Monaco di Baviera',
    countryCode: 'DE',
    countryEn: 'Germany',
    countryIt: 'Germania',
    regionEn: 'Bavaria',
    regionIt: 'Baviera',
    latitude: 48.1374,
    longitude: 11.5755,
    timezone: 'Europe/Berlin',
    population: 1_505_005,
    names: ['Munich', 'München', 'Monaco di Baviera'],
  },
  {
    id: 2657896,
    nameEn: 'Zürich',
    nameIt: 'Zurigo',
    countryCode: 'CH',
    countryEn: 'Switzerland',
    countryIt: 'Svizzera',
    regionEn: 'Zurich',
    regionIt: 'Zurigo',
    latitude: 47.3667,
    longitude: 8.55,
    timezone: 'Europe/Zurich',
    population: 415_367,
    names: ['Zürich', 'Zurigo', 'Zurich'],
  },
];

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'dodicisegni-geo-'));
  databasePath = join(directory, 'test.db');

  const database = new DatabaseSync(databasePath);
  database.exec(loadSchema());

  const insertLocation = database.prepare(
    `INSERT INTO locations (id, name_en, name_it, country_code, country_en, country_it,
                            region_en, region_it, latitude, longitude, timezone, population)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertName = database.prepare(
    'INSERT INTO location_names (location_id, search_name) VALUES (?, ?)',
  );

  for (const fixture of FIXTURES) {
    insertLocation.run(
      fixture.id,
      fixture.nameEn,
      fixture.nameIt,
      fixture.countryCode,
      fixture.countryEn,
      fixture.countryIt,
      fixture.regionEn,
      fixture.regionIt,
      fixture.latitude,
      fixture.longitude,
      fixture.timezone,
      fixture.population,
    );
    for (const name of fixture.names) insertName.run(fixture.id, normalizeName(name));
  }

  const insertMeta = database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  insertMeta.run('source', 'fixture di test');
  insertMeta.run('locations', String(FIXTURES.length));
  database.close();
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('normalizeName', () => {
  it('rimuove i segni diacritici e uniforma le maiuscole', () => {
    expect(normalizeName('Zürich')).toBe('zurich');
    expect(normalizeName('MÜNCHEN')).toBe('munchen');
    expect(normalizeName("L'Aquila")).toBe("l'aquila");
  });

  it('compatta la spaziatura', () => {
    expect(normalizeName('  San   Giovanni  ')).toBe('san giovanni');
  });

  it('uniforma gli apostrofi tipografici', () => {
    expect(normalizeName('L’Aquila')).toBe(normalizeName("L'Aquila"));
  });
});

describe('searchLocations', () => {
  it('restituisce tutti gli omonimi, senza scegliere per il chiamante', () => {
    const results = searchLocations('Rome', { databasePath });

    // Due "Rome" distinte: la disambiguazione spetta a chi consuma il risultato.
    expect(results).toHaveLength(2);
    expect(new Set(results.map((r) => r.countryCode))).toEqual(new Set(['IT', 'US']));
  });

  it('ordina per popolazione decrescente', () => {
    const results = searchLocations('Rome', { databasePath });

    expect(results[0]?.countryCode).toBe('IT');
    expect(results[0]?.population).toBeGreaterThan(results[1]!.population);
  });

  it('trova per esonimo', () => {
    expect(searchLocations('Monaco di Baviera', { databasePath })[0]?.id).toBe(2867714);
    expect(searchLocations('Zurigo', { databasePath })[0]?.id).toBe(2657896);
    expect(searchLocations('Roma', { databasePath })[0]?.countryCode).toBe('IT');
  });

  it('ignora accenti e maiuscole nella query', () => {
    const withAccent = searchLocations('München', { databasePath });
    const withoutAccent = searchLocations('MUNCHEN', { databasePath });

    expect(withAccent[0]?.id).toBe(2867714);
    expect(withoutAccent[0]?.id).toBe(2867714);
  });

  it('cerca per prefisso', () => {
    expect(searchLocations('Zur', { databasePath }).map((r) => r.id)).toContain(2657896);
  });

  it('restituisce sempre il fuso orario IANA', () => {
    for (const result of searchLocations('Rome', { databasePath })) {
      expect(result.timezone).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$/);
    }
  });

  it('filtra per paese', () => {
    const results = searchLocations('Rome', { databasePath, countryCode: 'us' });

    expect(results).toHaveLength(1);
    expect(results[0]?.region).toBe('Georgia');
  });

  it('rispetta il limite e lo mantiene entro il massimo', () => {
    expect(searchLocations('Rome', { databasePath, limit: 1 })).toHaveLength(1);
    expect(() => searchLocations('Rome', { databasePath, limit: 9999 })).not.toThrow();
  });

  it('tratta i metacaratteri di LIKE come testo, non come jolly', () => {
    // Senza escape, "%" corrisponderebbe a qualunque località.
    expect(searchLocations('%', { databasePath })).toHaveLength(0);
    expect(searchLocations('_ome', { databasePath })).toHaveLength(0);
  });

  it('rifiuta una query vuota', () => {
    expect(() => searchLocations('   ', { databasePath })).toThrow(GeoError);
  });

  it('segnala in modo esplicito un database assente', () => {
    expect(() => searchLocations('Rome', { databasePath: '/tmp/non-esiste.db' })).toThrow(
      /geo:import/,
    );
  });
});

describe('lingua dei nomi restituiti', () => {
  it('usa l\'italiano come impostazione predefinita', () => {
    const [rome] = searchLocations('Roma', { databasePath, countryCode: 'IT' });

    expect(rome?.name).toBe('Roma');
    expect(rome?.country).toBe('Italia');
  });

  it('restituisce i nomi internazionali con lang inglese', () => {
    const [rome] = searchLocations('Roma', { databasePath, countryCode: 'IT', lang: 'en' });

    expect(rome?.name).toBe('Rome');
    expect(rome?.country).toBe('Italy');
    expect(rome?.region).toBe('Lazio');
  });

  it('traduce anche le località straniere', () => {
    const [munich] = searchLocations('Munich', { databasePath });

    expect(munich?.name).toBe('Monaco di Baviera');
    expect(munich?.region).toBe('Baviera');
    expect(munich?.country).toBe('Germania');
  });

  it('ricade sul nome internazionale quando manca la variante italiana', () => {
    // La maggior parte dei centri non ha un esonimo: mostrare un campo vuoto
    // sarebbe peggio del nome internazionale.
    const [romeUs] = searchLocations('Rome', { databasePath, countryCode: 'US' });

    expect(romeUs?.name).toBe('Rome');
    expect(romeUs?.country).toBe('Stati Uniti');
  });

  it('cerca su tutte le lingue a prescindere da lang', () => {
    // Si deve poter digitare "Munich" e ricevere "Monaco di Baviera".
    expect(searchLocations('Munich', { databasePath, lang: 'it' })[0]?.name).toBe(
      'Monaco di Baviera',
    );
    expect(searchLocations('Monaco di Baviera', { databasePath, lang: 'en' })[0]?.name).toBe(
      'Munich',
    );
  });
});

describe('getLocation', () => {
  it('restituisce la località dal suo identificatore GeoNames', () => {
    const location = getLocation(3169070, { databasePath });

    expect(location?.name).toBe('Roma');
    expect(location?.timezone).toBe('Europe/Rome');
  });

  it('rispetta la lingua richiesta', () => {
    expect(getLocation(3169070, { databasePath, lang: 'en' })?.name).toBe('Rome');
  });

  it('restituisce undefined per un identificatore sconosciuto', () => {
    expect(getLocation(1, { databasePath })).toBeUndefined();
  });
});

describe('databaseInfo', () => {
  it('espone i metadati dell\'importazione', () => {
    expect(databaseInfo({ databasePath })['locations']).toBe(String(FIXTURES.length));
  });
});
