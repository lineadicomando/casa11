import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import type { BodyId, NatalChart, ZodiacSign } from '../src/types.js';

/**
 * Confronto con una fonte indipendente.
 *
 * I valori attesi provengono da Astro-Seek, uno dei programmi in linea più
 * usati dagli astrologi, per un tema reale: 2 giugno 1978 alle 15:15 a Palermo.
 * Le coordinate sono quelle dichiarate dalla fonte (38°08'N 13°20'E) e non
 * quelle del nostro dataset, che dista un chilometro e mezzo: le case
 * dipendono dalle coordinate, quindi confrontarle a punti diversi misurerebbe
 * la differenza fra i due centroidi, non la correttezza del calcolo.
 *
 * Il caso è scelto bene anche per il tempo: giugno 1978 con ora legale
 * italiana in vigore, quindi lo scarto dal Tempo Universale è di due ore.
 *
 * Tolleranza: un primo d'arco. Sotto quella soglia nessuna orbita, cuspide o
 * interpretazione cambia.
 */
const TOLLERANZA_PRIMI = 1;

const NASCITA = {
  date: '1978-06-02',
  time: '15:15',
  latitude: 38.1333,
  longitude: 13.3333,
  timezone: 'Europe/Rome',
};

/** [segno, gradi, primi, casa] come riportati dalla fonte. */
const CORPI: Record<string, [ZodiacSign, number, number, number]> = {
  sole: ['gemelli', 11, 38, 9],
  luna: ['toro', 4, 55, 7],
  mercurio: ['toro', 27, 51, 8],
  venere: ['cancro', 13, 44, 10],
  marte: ['leone', 23, 47, 11],
  giove: ['cancro', 9, 26, 9],
  saturno: ['leone', 24, 53, 11],
  urano: ['scorpione', 13, 15, 2],
  nettuno: ['sagittario', 17, 5, 3],
  plutone: ['bilancia', 14, 1, 1],
  'nodo-nord': ['bilancia', 2, 28, 12],
  chirone: ['toro', 7, 35, 8],
};

/** [numero, segno, gradi, primi] come riportati dalla fonte. */
const CUSPIDI: [number, ZodiacSign, number, number][] = [
  [1, 'bilancia', 10, 21],
  [2, 'scorpione', 7, 33],
  [3, 'sagittario', 8, 24],
  [4, 'capricorno', 11, 42],
  [5, 'acquario', 14, 43],
  [6, 'pesci', 14, 41],
  [7, 'ariete', 10, 21],
  [8, 'toro', 7, 33],
  [9, 'gemelli', 8, 24],
  [10, 'cancro', 11, 42],
  [11, 'leone', 14, 43],
  [12, 'vergine', 14, 41],
];

const RETROGRADI: BodyId[] = ['urano', 'nettuno', 'plutone', 'nodo-nord'];

let chart: NatalChart;
try {
  chart = computeNatalChart(NASCITA, {
    bodies: [...(Object.keys(CORPI) as BodyId[]), 'lilith'],
  });
} catch (error) {
  throw new Error(`Calcolo del tema di riferimento fallito: ${String(error)}`);
}

/** Scarto in primi d'arco fra il valore calcolato e quello atteso. */
function scartoPrimi(gradiCalcolati: number, gradiAttesi: number, primiAttesi: number): number {
  return Math.abs(gradiCalcolati - (gradiAttesi + primiAttesi / 60)) * 60;
}

describe('confronto con Astro-Seek — Palermo, 2 giugno 1978, 15:15', () => {
  it('converte l\'ora legale italiana correttamente', () => {
    // La fonte dichiara 15:15 CEST = 13:15 UT.
    expect(chart.time.utc).toBe('1978-06-02T13:15:00Z');
    expect(chart.time.offsetMinutes).toBe(120);
  });

  it('calcola il tempo siderale locale dichiarato dalla fonte', () => {
    // Astro-Seek riporta 06:50:56. Un secondo di scarto è arrotondamento.
    expect(chart.siderealTime.hours * 3600).toBeCloseTo(6 * 3600 + 50 * 60 + 56, -0.5);
    expect(chart.siderealTime.formatted).toMatch(/^06:50:5[4-8]$/);
  });

  it.each(Object.entries(CORPI))(
    'colloca %s alla posizione attesa',
    (id, [segno, gradi, primi, casa]) => {
      const body = chart.bodies.find((candidate) => candidate.id === id);

      expect(body, `${id} non calcolato`).toBeDefined();
      expect(body!.sign).toBe(segno);
      expect(scartoPrimi(body!.signDegree, gradi, primi)).toBeLessThan(TOLLERANZA_PRIMI);
      expect(body!.house).toBe(casa);
    },
  );

  it.each(RETROGRADI)('riconosce %s come retrogrado', (id) => {
    expect(chart.bodies.find((body) => body.id === id)?.retrograde).toBe(true);
  });

  it.each(CUSPIDI)('colloca la cuspide %i alla posizione attesa', (numero, segno, gradi, primi) => {
    const house = chart.houses[numero - 1];

    expect(house).toBeDefined();
    expect(house!.sign).toBe(segno);
    expect(scartoPrimi(house!.signDegree, gradi, primi)).toBeLessThan(TOLLERANZA_PRIMI);
  });

  it('riconosce il tema come diurno', () => {
    // Il Sole è in nona casa, sopra l'orizzonte.
    expect(chart.sect).toBe('diurna');
  });

  it('calcola la Parte di Fortuna alla posizione attesa', () => {
    // Astro-Seek: 3°38' Vergine, casa 11.
    expect(chart.partOfFortune).toBeDefined();
    expect(chart.partOfFortune!.sign).toBe('vergine');
    expect(scartoPrimi(chart.partOfFortune!.signDegree, 3, 38)).toBeLessThan(TOLLERANZA_PRIMI);
    expect(chart.partOfFortune!.house).toBe(11);
  });

  it('colloca Lilith in casa 10, coerentemente con le cuspidi della fonte', () => {
    // La fonte dichiara Lilith in casa 10, che va da 11°42' Cancro a
    // 14°43' Leone: solo una posizione in Cancro è compatibile.
    const lilith = chart.bodies.find((body) => body.id === 'lilith');

    expect(lilith?.sign).toBe('cancro');
    expect(lilith?.house).toBe(10);
  });
});

describe('formula della Parte di Fortuna', () => {
  it('coincide con quella diurna su un tema diurno', () => {
    // Sui temi diurni le due convenzioni danno lo stesso risultato: la
    // differenza emerge solo di notte.
    const diurna = computeNatalChart(NASCITA, { partOfFortuneFormula: 'diurna' });

    expect(diurna.partOfFortune!.longitude).toBeCloseTo(chart.partOfFortune!.longitude, 6);
  });

  it('inverte i luminari su un tema notturno', () => {
    // Stesso luogo e data, ma alle tre di notte: il Sole è sotto l'orizzonte.
    const notte = { ...NASCITA, time: '03:00' };
    const perSettore = computeNatalChart(notte);
    const sempreDiurna = computeNatalChart(notte, { partOfFortuneFormula: 'diurna' });

    expect(perSettore.sect).toBe('notturna');
    expect(perSettore.partOfFortune!.longitude).not.toBeCloseTo(
      sempreDiurna.partOfFortune!.longitude,
      3,
    );
  });
});
