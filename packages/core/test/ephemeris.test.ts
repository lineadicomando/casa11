import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { initEphemeris, resetEphemerisCache } from '../src/ephemeris.js';
import type { BirthData } from '../src/types.js';

const EPHE_DIR = fileURLToPath(new URL('../ephe', import.meta.url));
const NO_EPHE_DIR = '/tmp/dodicisegni-cartella-inesistente';

/** I file `.se1` non sono versionati: i test che li richiedono si autoescludono. */
const hasEphemerisFiles = existsSync(`${EPHE_DIR}/sepl_18.se1`);

const BIRTH: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

beforeEach(resetEphemerisCache);
afterEach(resetEphemerisCache);

describe('ripiego sulle effemeridi Moshier', () => {
  it('funziona senza alcun file di effemeridi', () => {
    const context = initEphemeris(NO_EPHE_DIR);

    expect(context.mode).toBe('moshier');
    expect(context.path).toBeNull();
    expect(context.asteroidsAvailable).toBe(false);
    expect(context.warnings.some((w) => w.includes('Moshier'))).toBe(true);
  });

  it('calcola comunque un tema completo', () => {
    const chart = computeNatalChart(BIRTH, { ephemerisPath: NO_EPHE_DIR });

    expect(chart.ephemerisMode).toBe('moshier');
    expect(chart.bodies.length).toBeGreaterThan(0);
    expect(chart.houses).toHaveLength(12);
  });

  it('omette Chirone segnalandolo, invece di far fallire il calcolo', () => {
    const chart = computeNatalChart(BIRTH, {
      bodies: ['sole', 'chirone'],
      ephemerisPath: NO_EPHE_DIR,
    });

    expect(chart.bodies.map((b) => b.id)).toEqual(['sole']);
    expect(chart.warnings.some((w) => w.includes('Chirone non calcolabile'))).toBe(true);
  });
});

describe.skipIf(!hasEphemerisFiles)('modalità Swiss Ephemeris', () => {
  it('rileva i file e attiva il modo swisseph', () => {
    const context = initEphemeris(EPHE_DIR);

    expect(context.mode).toBe('swisseph');
    expect(context.path).toBe(EPHE_DIR);
  });

  it('calcola Chirone quando il file degli asteroidi è presente', () => {
    const chart = computeNatalChart(BIRTH, { bodies: ['sole', 'chirone'], ephemerisPath: EPHE_DIR });

    const chiron = chart.bodies.find((b) => b.id === 'chirone');
    expect(chiron).toBeDefined();
    expect(chiron?.longitude).toBeGreaterThanOrEqual(0);
    expect(chiron?.longitude).toBeLessThan(360);
  });

  it('concorda con Moshier entro pochi secondi d\'arco', () => {
    // Verifica che il ripiego non degradi il risultato oltre l'accettabile:
    // in astrologia anche un minuto d'arco è irrilevante, ma uno scarto
    // grande segnalerebbe un errore di configurazione.
    resetEphemerisCache();
    const swiss = computeNatalChart(BIRTH, {
      bodies: ['sole', 'luna', 'plutone'],
      ephemerisPath: EPHE_DIR,
    });
    resetEphemerisCache();
    const moshier = computeNatalChart(BIRTH, {
      bodies: ['sole', 'luna', 'plutone'],
      ephemerisPath: NO_EPHE_DIR,
    });

    for (const body of swiss.bodies) {
      const other = moshier.bodies.find((b) => b.id === body.id);
      expect(other).toBeDefined();
      const arcSeconds = Math.abs(body.longitude - other!.longitude) * 3600;
      expect(arcSeconds).toBeLessThan(5);
    }
  });
});
