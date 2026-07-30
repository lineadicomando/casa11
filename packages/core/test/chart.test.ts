import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { ChartError } from '../src/errors.js';
import { formatChartCompact } from '../src/format.js';
import { angularSeparation } from '../src/math.js';
import type { BirthData } from '../src/types.js';

const NAPOLI: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

describe('computeNatalChart', () => {
  it('colloca il Sole alla longitudine attesa per l\'epoca J2000', () => {
    // Riferimento indipendente: la longitudine eclittica apparente del Sole
    // il 1° gennaio 2000 alle 12:00 UT è ~280,46° (10° Capricorno).
    const chart = computeNatalChart({
      date: '2000-01-01',
      time: '12:00',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    });

    const sun = chart.bodies.find((body) => body.id === 'sole');
    expect(sun).toBeDefined();
    expect(sun?.longitude).toBeCloseTo(280.46, 0);
    expect(sun?.sign).toBe('capricorno');
  });

  it('produce dodici case e i quattro assi quando l\'ora è nota', () => {
    const chart = computeNatalChart(NAPOLI);

    expect(chart.houses).toHaveLength(12);
    expect(chart.angles).toBeDefined();

    for (const house of chart.houses) {
      expect(house.longitude).toBeGreaterThanOrEqual(0);
      expect(house.longitude).toBeLessThan(360);
    }

    const { ascendant, descendant, midheaven, imumCoeli } = chart.angles!;
    expect(angularSeparation(ascendant, descendant)).toBeCloseTo(180, 6);
    expect(angularSeparation(midheaven, imumCoeli)).toBeCloseTo(180, 6);
  });

  it('assegna ogni corpo a una casa fra 1 e 12', () => {
    const chart = computeNatalChart(NAPOLI);

    for (const body of chart.bodies) {
      expect(body.house).toBeDefined();
      expect(body.house).toBeGreaterThanOrEqual(1);
      expect(body.house).toBeLessThanOrEqual(12);
    }
  });

  it('omette case e assi quando l\'ora di nascita è ignota', () => {
    const chart = computeNatalChart({
      date: NAPOLI.date,
      latitude: NAPOLI.latitude,
      longitude: NAPOLI.longitude,
      timezone: NAPOLI.timezone,
    });

    expect(chart.houses).toEqual([]);
    expect(chart.angles).toBeUndefined();
    expect(chart.bodies.every((body) => body.house === undefined)).toBe(true);
    // I pianeti restano calcolati: è il caso d'uso di una carta senza ora.
    expect(chart.bodies.length).toBeGreaterThan(0);
  });

  it('pone il Nodo Sud esattamente all\'opposizione del Nodo Nord', () => {
    const chart = computeNatalChart(NAPOLI);

    const north = chart.bodies.find((b) => b.id === 'nodo-nord');
    const south = chart.bodies.find((b) => b.id === 'nodo-sud');
    expect(north).toBeDefined();
    expect(south).toBeDefined();
    expect(angularSeparation(north!.longitude, south!.longitude)).toBeCloseTo(180, 6);
  });

  it('rileva il moto retrogrado', () => {
    // Mercurio è retrogrado dal 30 dicembre 2023 al 2 gennaio 2024 (e oltre).
    const chart = computeNatalChart({
      date: '2024-01-01',
      time: '12:00',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
    });

    const mercury = chart.bodies.find((b) => b.id === 'mercurio');
    expect(mercury?.retrograde).toBe(true);
    expect(mercury?.speed).toBeLessThan(0);
  });

  it('calcola aspetti coerenti con la separazione angolare', () => {
    const chart = computeNatalChart(NAPOLI, { minorAspects: true });

    for (const aspect of chart.aspects) {
      const from = chart.bodies.find((b) => b.id === aspect.from)!;
      const to = chart.bodies.find((b) => b.id === aspect.to)!;
      const separation = angularSeparation(from.longitude, to.longitude);
      expect(Math.abs(separation - aspect.angle)).toBeCloseTo(aspect.orb, 6);
    }
  });

  it('non produce aspetti fra Nodo Nord e Nodo Sud', () => {
    const chart = computeNatalChart(NAPOLI, { minorAspects: true });

    const nodePair = chart.aspects.find(
      (a) =>
        (a.from === 'nodo-nord' && a.to === 'nodo-sud') ||
        (a.from === 'nodo-sud' && a.to === 'nodo-nord'),
    );
    expect(nodePair).toBeUndefined();
  });

  it('cambia le cuspidi al cambiare del sistema di domificazione', () => {
    const placidus = computeNatalChart(NAPOLI, { houseSystem: 'placidus' });
    const wholeSign = computeNatalChart(NAPOLI, { houseSystem: 'segni-interi' });

    // Nei segni interi ogni cuspide cade a 0° di segno.
    for (const house of wholeSign.houses) {
      expect(house.signDegree).toBeCloseTo(0, 6);
    }
    // L'Ascendente non dipende dal sistema di case.
    expect(placidus.angles?.ascendant).toBeCloseTo(wholeSign.angles!.ascendant, 6);
  });

  it('rifiuta coordinate fuori intervallo', () => {
    expect(() => computeNatalChart({ ...NAPOLI, latitude: 120 })).toThrow(ChartError);
    expect(() => computeNatalChart({ ...NAPOLI, longitude: -400 })).toThrow(ChartError);
  });
});

describe('formatChartCompact', () => {
  it('rende il tema in forma tabellare leggibile', () => {
    const output = formatChartCompact(computeNatalChart(NAPOLI));

    expect(output).toContain('TEMA NATALE');
    expect(output).toContain('CORPI');
    expect(output).toContain('Sole');
    expect(output).toContain('ASSI');
    expect(output).toContain('ASPETTI');
  });

  it('resta sensibilmente più compatto del JSON completo', () => {
    const chart = computeNatalChart(NAPOLI);
    const compact = formatChartCompact(chart);
    const json = JSON.stringify(chart);

    expect(compact.length).toBeLessThan(json.length / 2);
  });
});
