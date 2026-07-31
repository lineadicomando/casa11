import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { ChartError } from '../src/errors.js';
import { findTransitPassages } from '../src/passages.js';
import type { BirthData, NatalChart, PassageRange } from '../src/types.js';

const NAPOLI: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

const natal: NatalChart = computeNatalChart(NAPOLI);

const ANNO: PassageRange = { from: '2026-01-01', to: '2026-12-31', timezone: 'Europe/Rome' };

describe('findTransitPassages', () => {
  it('trova i tre passaggi del ritorno di Saturno, con quello di mezzo retrogrado', () => {
    // È la prova che il calendario serve a qualcosa: un quadro istantaneo
    // vede un contatto, qui se ne vedono tre e si legge il ritmo del periodo.
    // Saturno ha un ciclo di ventinove anni e mezzo: nato nel 1968, la
    // persona lo rivede nel 2026-27.
    const { passages } = findTransitPassages(
      natal,
      { from: '2026-01-01', to: '2027-12-31', timezone: 'Europe/Rome' },
      { bodies: ['saturno'], targets: ['saturno'] },
    );

    expect(passages).toHaveLength(3);
    expect(passages.every((p) => p.aspect === 'congiunzione')).toBe(true);
    expect(passages.map((p) => p.retrograde)).toEqual([false, true, false]);
    expect(passages.map((p) => p.local.slice(0, 7))).toEqual(['2026-06', '2026-09', '2027-02']);
  });

  it('riporta il ritorno solare al compleanno, una volta l anno', () => {
    const { passages } = findTransitPassages(natal, ANNO, {
      bodies: ['sole'],
      targets: ['sole'],
    });

    // Otto in tutto: in un anno il Sole passa una volta sulla propria
    // posizione, una all'opposizione, e due per ciascuno degli aspetti che
    // si perfezionano da entrambi i lati — trigono, quadrato, sestile.
    expect(passages).toHaveLength(8);

    const ritorno = passages.filter((p) => p.aspect === 'congiunzione');
    expect(ritorno).toHaveLength(1);
    // Il Sole avanza di circa un grado al giorno: l'istante esatto del
    // ritorno cade a ridosso della data di nascita, non necessariamente su.
    expect(ritorno[0]?.local.slice(0, 7)).toBe('2026-03');
    expect(Number(ritorno[0]?.local.slice(8, 10))).toBeGreaterThanOrEqual(10);
    expect(Number(ritorno[0]?.local.slice(8, 10))).toBeLessThanOrEqual(13);
  });

  it('mette i passaggi in ordine di tempo', () => {
    const { passages } = findTransitPassages(natal, ANNO, { bodies: ['marte'] });

    const istanti = passages.map((p) => p.exact);
    expect(istanti).toEqual([...istanti].sort());
  });

  it('non elenca nulla fuori dall intervallo richiesto', () => {
    // Il calcolo campiona anche oltre gli estremi, per sapere dove si aprono
    // e si chiudono le finestre: quel margine non deve affiorare nell'elenco.
    const { passages } = findTransitPassages(natal, ANNO, { bodies: ['giove'] });

    for (const passage of passages) {
      expect(passage.local >= '2026-01-01').toBe(true);
      expect(passage.local <= '2026-12-32').toBe(true);
    }
  });

  it('circonda ogni passaggio con la finestra in cui resta in orbita', () => {
    const { passages } = findTransitPassages(natal, ANNO, {
      bodies: ['saturno'],
      targets: ['saturno'],
    });

    const passage = passages[0]!;
    expect(passage.window).toBeDefined();
    expect(passage.window!.start < passage.local).toBe(true);
    expect(passage.window!.end > passage.local).toBe(true);
  });

  it('lascia fuori la Luna, che da sola riempirebbe il calendario', () => {
    const { passages } = findTransitPassages(natal, ANNO);
    expect(passages.some((p) => p.transiting === 'luna')).toBe(false);

    // Chi la vuole la chiede: in un mese perfeziona già decine di aspetti.
    const conLuna = findTransitPassages(
      natal,
      { from: '2026-01-01', to: '2026-01-31', timezone: 'Europe/Rome' },
      { bodies: ['luna'] },
    );
    expect(conLuna.passages.length).toBeGreaterThan(20);
  });

  it('cerca anche gli aspetti minori se richiesti', () => {
    const maggiori = findTransitPassages(natal, ANNO, { bodies: ['giove'] });
    const tutti = findTransitPassages(natal, ANNO, { bodies: ['giove'], minorAspects: true });

    expect(tutti.passages.length).toBeGreaterThan(maggiori.passages.length);
  });

  it('rispetta i bersagli richiesti', () => {
    const { passages } = findTransitPassages(natal, ANNO, {
      bodies: ['marte'],
      targets: ['ascendente'],
    });

    expect(passages.length).toBeGreaterThan(0);
    expect(passages.every((p) => p.natal === 'ascendente')).toBe(true);
  });

  it('rifiuta un intervallo rovesciato invece di restituire il vuoto', () => {
    expect(() =>
      findTransitPassages(natal, {
        from: '2026-12-31',
        to: '2026-01-01',
        timezone: 'Europe/Rome',
      }),
    ).toThrow(ChartError);
  });

  it('dà l istante in UT e nel fuso richiesto, che sono lo stesso momento', () => {
    const { passages } = findTransitPassages(
      natal,
      { from: '2026-06-01', to: '2026-06-30', timezone: 'America/New_York' },
      { bodies: ['saturno'], targets: ['saturno'] },
    );

    const passage = passages[0]!;
    expect(Date.parse(passage.local)).toBe(Date.parse(passage.exact));
    expect(passage.exact).toMatch(/Z$/);
  });
});
