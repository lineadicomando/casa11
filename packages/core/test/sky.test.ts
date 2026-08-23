import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { ChartError } from '../src/errors.js';
import { formatSkyCompact } from '../src/format.js';
import { computeSky } from '../src/sky.js';
import type { Place, SkyMoment } from '../src/types.js';

const ISTANTE: SkyMoment = { date: '2026-08-01', time: '18:30', timezone: 'Europe/Rome' };

const ROMA: Place = { latitude: 41.9028, longitude: 12.4964 };
const TOKYO: Place = { latitude: 35.6762, longitude: 139.6503 };

function longitudes(bodies: readonly { id: string; longitude: number }[]): Record<string, number> {
  return Object.fromEntries(bodies.map((body) => [body.id, body.longitude]));
}

/**
 * Le avvertenze che riguardano la domanda posta, senza quella su quali
 * effemeridi siano in uso.
 *
 * Il ripiego su Moshier dipende da un file scaricabile e facoltativo, non da
 * come il cielo è stato chiesto: contarlo legherebbe questi test a com'è fatta
 * la macchina che li esegue, e su un clone appena fatto — dove le effemeridi
 * non ci sono ancora — li farebbe fallire senza che niente sia rotto.
 */
function avvertenzeDelCielo(warnings: readonly string[]): string[] {
  return warnings.filter((warning) => !warning.includes('effemeridi Moshier'));
}

describe('computeSky', () => {
  it('calcola corpi e aspetti anche senza luogo', () => {
    const sky = computeSky(ISTANTE);

    expect(sky.bodies.length).toBeGreaterThan(0);
    expect(sky.houses).toHaveLength(0);
    expect(sky.angles).toBeUndefined();
    expect(sky.siderealTime).toBeUndefined();
    expect(sky.sect).toBeUndefined();
    expect(sky.place).toBeUndefined();

    // Nessuna avvertenza: il luogo mancante è una scelta, non un'anomalia.
    expect(avvertenzeDelCielo(sky.warnings)).toHaveLength(0);
  });

  it('dà le stesse posizioni da Roma e da Tokyo, ma case diverse', () => {
    const roma = computeSky(ISTANTE, { place: ROMA });
    const tokyo = computeSky(ISTANTE, { place: TOKYO });

    // Le longitudini eclittiche sono geocentriche: il luogo non le tocca.
    expect(longitudes(tokyo.bodies)).toEqual(longitudes(roma.bodies));
    expect(tokyo.aspects).toEqual(roma.aspects);

    // Quel che cambia è l'orientamento rispetto all'orizzonte.
    expect(tokyo.angles?.ascendant).not.toBeCloseTo(roma.angles!.ascendant, 1);
    expect(tokyo.siderealTime?.formatted).not.toBe(roma.siderealTime?.formatted);
  });

  it('con luogo e ora produce assi, dodici case e il settore', () => {
    const sky = computeSky(ISTANTE, { place: ROMA });

    expect(sky.houses).toHaveLength(12);
    expect(sky.angles).toBeDefined();
    expect(sky.houseSystem).toBe('placidus');
    expect(sky.siderealTime).toBeDefined();

    // Il 1° agosto alle 18:30 a Roma il Sole è ancora alto: settore diurno.
    expect(sky.sect).toBe('diurna');

    for (const body of sky.bodies) {
      expect(body.house).toBeGreaterThanOrEqual(1);
      expect(body.house).toBeLessThanOrEqual(12);
    }
  });

  it('con il luogo ma senza ora rinuncia ad assi e case, e lo dichiara', () => {
    const sky = computeSky({ date: '2026-08-01', timezone: 'Europe/Rome' }, { place: ROMA });

    expect(sky.houses).toHaveLength(0);
    expect(sky.angles).toBeUndefined();
    // Il tempo siderale resta: è un dato del momento, non una cuspide inventata.
    expect(sky.siderealTime).toBeDefined();

    const avvertenze = avvertenzeDelCielo(sky.warnings);
    expect(avvertenze).toHaveLength(2);
    expect(avvertenze[0]).toContain('mezzogiorno locale');
    expect(avvertenze[1]).toContain('Assi e case non calcolati');
  });

  it('coincide con il tema natale calcolato per lo stesso istante e luogo', () => {
    // È la verifica che il cielo non sia un secondo motore: stessa domanda,
    // stessa risposta, a meno di quel che riguarda la nascita.
    const sky = computeSky(ISTANTE, { place: ROMA });
    const natal = computeNatalChart({ ...ISTANTE, ...ROMA });

    expect(longitudes(sky.bodies)).toEqual(longitudes(natal.bodies));
    expect(sky.aspects).toEqual(natal.aspects);
    expect(sky.angles?.ascendant).toBeCloseTo(natal.angles!.ascendant, 10);
    expect(sky.siderealTime).toEqual(natal.siderealTime);
    expect(sky.sect).toBe(natal.sect);
  });

  it('rifiuta coordinate fuori intervallo', () => {
    expect(() => computeSky(ISTANTE, { place: { latitude: 91, longitude: 0 } })).toThrow(ChartError);
    expect(() => computeSky(ISTANTE, { place: { latitude: 0, longitude: 200 } })).toThrow(
      /Longitudine 200/,
    );
  });

  it('include gli aspetti minori solo se richiesti', () => {
    const senza = computeSky(ISTANTE);
    const con = computeSky(ISTANTE, { minorAspects: true });

    expect(con.aspects.length).toBeGreaterThanOrEqual(senza.aspects.length);
    expect(senza.aspects.some((aspect) => aspect.aspect === 'quinconce')).toBe(false);
  });
});

describe('formatSkyCompact', () => {
  it('omette assi e cuspidi quando manca il luogo, e dice perché', () => {
    const testo = formatSkyCompact(computeSky(ISTANTE));

    expect(testo).toContain('CIELO — 2026-08-01 18:30 (Europe/Rome, UTC+02:00)');
    expect(testo).toContain('Senza luogo');
    expect(testo).toContain('CORPI');
    expect(testo).toContain('ASPETTI');
    expect(testo).not.toContain('ASSI');
    expect(testo).not.toContain('CUSPIDI');
  });

  it('con il luogo mostra assi, cuspidi e tempo siderale', () => {
    const testo = formatSkyCompact(computeSky(ISTANTE, { place: ROMA }));

    expect(testo).toContain('Luogo: 41.9028N 12.4964E');
    expect(testo).toContain('Case: placidus');
    expect(testo).toContain('Tempo siderale:');
    expect(testo).toContain('ASSI');
    expect(testo).toContain('CUSPIDI');
  });
});
