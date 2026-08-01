import { describe, expect, it } from 'vitest';
import { MEAN_DAILY_MOTION } from '../src/constants.js';
import { ChartError } from '../src/errors.js';
import { formatSkyPassagesCompact } from '../src/format.js';
import { angularSeparation } from '../src/math.js';
import { computeSky } from '../src/sky.js';
import { findSkyPassages } from '../src/sky-passages.js';
import type { PassageRange, SkyPassage } from '../src/types.js';

const ANNO_2026: PassageRange = { from: '2026-01-01', to: '2026-12-31', timezone: 'UTC' };

/** La separazione effettiva fra i due corpi all'istante dichiarato esatto. */
function separationAt(passage: SkyPassage): number {
  const sky = computeSky({
    date: passage.exact.slice(0, 10),
    time: passage.exact.slice(11, 16),
    timezone: 'UTC',
  });

  const faster = sky.bodies.find((body) => body.id === passage.faster)!;
  const slower = sky.bodies.find((body) => body.id === passage.slower)!;
  return angularSeparation(faster.longitude, slower.longitude);
}

describe('findSkyPassages', () => {
  it('trova le lunazioni senza saperne niente', () => {
    // Novilunio e plenilunio sono la congiunzione e l'opposizione fra Sole e
    // Luna: se il metodo è giusto escono da soli, senza codice dedicato.
    const { passages } = findSkyPassages(ANNO_2026, { bodies: ['sole', 'luna'] });

    const noviluni = passages.filter((p) => p.aspect === 'congiunzione');
    const pleniluni = passages.filter((p) => p.aspect === 'opposizione');

    expect(noviluni).toHaveLength(12);
    expect(pleniluni).toHaveLength(13);

    // Riferimento indipendente: il novilunio del 18 gennaio 2026 cade alle
    // 19:52 UT secondo le effemeridi pubblicate.
    expect(noviluni[0]?.exact).toBe('2026-01-18T19:52Z');
  });

  it('colloca l istante dove l angolo è davvero esatto', () => {
    // Verifica incrociata contro l'altro calcolo del pacchetto: al momento
    // dichiarato, la separazione deve essere quella dell'aspetto.
    const { passages } = findSkyPassages(
      { from: '2026-01-01', to: '2026-06-30', timezone: 'UTC' },
      { bodies: ['sole', 'luna', 'marte'] },
    );

    expect(passages.length).toBeGreaterThan(20);
    for (const passage of passages) {
      // Un paio di primi d'arco: l'istante è arrotondato al minuto, e in un
      // minuto la Luna percorre mezzo primo.
      expect(Math.abs(separationAt(passage) - passage.angle) * 60).toBeLessThan(2);
    }
  });

  it('trova la congiunzione fra Saturno e Nettuno del 2026', () => {
    const { passages } = findSkyPassages(
      { from: '2024-01-01', to: '2027-12-31', timezone: 'UTC' },
      { bodies: ['saturno', 'nettuno'] },
    );

    const congiunzioni = passages.filter((p) => p.aspect === 'congiunzione');
    expect(congiunzioni).toHaveLength(1);
    expect(congiunzioni[0]?.exact.slice(0, 10)).toBe('2026-02-20');
    // Due pianeti lenti restano in orbita per settimane, non per anni: la
    // finestra si chiude e quindi c'è.
    expect(congiunzioni[0]?.window?.start.slice(0, 10)).toBe('2026-01-24');
    expect(congiunzioni[0]?.window?.end.slice(0, 10)).toBe('2026-03-16');
  });

  it('conta tre volte l incontro quando il più veloce retrograda', () => {
    // È il motivo per cui il calendario esiste: nell'autunno 2028 Mercurio
    // raggiunge Giove, torna indietro sopra di lui e lo raggiunge di nuovo.
    const { passages } = findSkyPassages(
      { from: '2028-08-01', to: '2028-11-30', timezone: 'UTC' },
      { bodies: ['mercurio', 'giove'] },
    );

    const congiunzioni = passages.filter((p) => p.aspect === 'congiunzione');
    expect(congiunzioni).toHaveLength(3);
    expect(congiunzioni.map((p) => p.retrograde.faster)).toEqual([false, true, false]);
    // Giove intanto prosegue: non è lui a tornare indietro.
    expect(congiunzioni.every((p) => p.retrograde.slower === false)).toBe(true);
  });

  it('elenca ogni coppia una volta sola, con il più veloce da un lato', () => {
    const { passages } = findSkyPassages(ANNO_2026);

    expect(passages.length).toBeGreaterThan(100);
    for (const passage of passages) {
      expect(MEAN_DAILY_MOTION[passage.faster]).toBeGreaterThan(MEAN_DAILY_MOTION[passage.slower]);
    }

    // La Luna resta fuori per impostazione predefinita: da sola raddoppierebbe
    // l'elenco in poche settimane.
    expect(passages.some((p) => p.faster === 'luna' || p.slower === 'luna')).toBe(false);
  });

  it('ordina l elenco nel tempo', () => {
    const { passages } = findSkyPassages(ANNO_2026, { bodies: ['sole', 'marte', 'giove'] });
    const istanti = passages.map((p) => p.exact);

    expect([...istanti].sort()).toEqual(istanti);
  });

  it('include gli aspetti minori solo se richiesti', () => {
    // Una lunazione li percorre tutti: è l'arco che li mette alla prova.
    const arco: PassageRange = { from: '2026-01-01', to: '2026-01-31', timezone: 'UTC' };
    const senza = findSkyPassages(arco, { bodies: ['sole', 'luna'] });
    const con = findSkyPassages(arco, { bodies: ['sole', 'luna'], minorAspects: true });

    expect(senza.passages.some((p) => p.aspect === 'quinconce')).toBe(false);
    expect(con.passages.length).toBeGreaterThan(senza.passages.length);
  });

  it('rifiuta un intervallo rovesciato', () => {
    expect(() =>
      findSkyPassages({ from: '2026-12-31', to: '2026-01-01', timezone: 'UTC' }),
    ).toThrow(ChartError);
  });
});

describe('formatSkyPassagesCompact', () => {
  it('mostra il moto di entrambi i corpi', () => {
    const { passages } = findSkyPassages(
      { from: '2028-08-01', to: '2028-11-30', timezone: 'Europe/Rome' },
      { bodies: ['mercurio', 'giove'] },
    );

    const testo = formatSkyPassagesCompact(passages, {
      from: '2028-08-01',
      to: '2028-11-30',
      timezone: 'Europe/Rome',
    });

    expect(testo).toContain('INCONTRI IN CIELO — dal 2028-08-01 al 2028-11-30 (Europe/Rome)');
    expect(testo).toContain('Mercurio');
    // Il moto è una coppia: il primo carattere è del più veloce.
    expect(testo).toMatch(/congiunzione\s+Giove\s+R\/D/);
  });

  it('lo dice quando non si perfeziona niente', () => {
    const arco: PassageRange = { from: '2026-01-01', to: '2026-01-02', timezone: 'UTC' };
    const testo = formatSkyPassagesCompact([], arco);

    expect(testo).toContain('nessun aspetto si perfeziona');
  });
});
