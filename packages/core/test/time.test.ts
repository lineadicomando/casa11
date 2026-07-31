import { describe, expect, it } from 'vitest';
import { ChartError } from '../src/errors.js';
import { resolveTime, toJulianDay } from '../src/time.js';

/**
 * La conversione ora locale → UT è il punto in cui si sbagliano i temi natali.
 * Un'ora di errore sposta l'Ascendente di circa 15 gradi, cioè mezzo segno.
 */
describe('resolveTime', () => {
  it('applica CET quando l\'ora legale non è in vigore', () => {
    const { time } = resolveTime({
      date: '1968-03-12',
      time: '14:30',
      latitude: 40.8518,
      longitude: 14.2681,
      timezone: 'Europe/Rome',
    });

    // L'Italia nel 1968 adottava l'ora legale dal 26 maggio: a marzo vale CET.
    expect(time.offsetMinutes).toBe(60);
    expect(time.utc).toBe('1968-03-12T13:30:00Z');
    expect(time.timeKnown).toBe(true);
  });

  it('applica CEST durante l\'ora legale', () => {
    const { time } = resolveTime({
      date: '1968-07-15',
      time: '14:30',
      latitude: 40.8518,
      longitude: 14.2681,
      timezone: 'Europe/Rome',
    });

    expect(time.offsetMinutes).toBe(120);
    expect(time.utc).toBe('1968-07-15T12:30:00Z');
  });

  it('usa il tempo medio locale per le date precedenti al 1893', () => {
    const { time } = resolveTime({
      date: '1880-06-15',
      time: '12:00',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
    });

    // Roma passò a CET solo il 31 ottobre 1893. Prima valeva il tempo medio
    // locale, circa +0:50 — non l'ora di fuso.
    expect(time.offsetMinutes).toBeGreaterThan(0);
    expect(time.offsetMinutes).toBeLessThan(60);
  });

  it('segnala un\'ora inesistente al passaggio all\'ora legale', () => {
    const { warnings } = resolveTime({
      date: '2024-03-31',
      time: '02:30',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
    });

    expect(warnings.some((w) => w.includes('non è mai esistita'))).toBe(true);
  });

  it('segnala un\'ora ambigua al ritorno all\'ora solare', () => {
    const { warnings } = resolveTime({
      date: '2024-10-27',
      time: '02:30',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
    });

    expect(warnings.some((w) => w.includes('ambigua'))).toBe(true);
  });

  it('non emette avvisi per un orario ordinario', () => {
    const { warnings } = resolveTime({
      date: '2024-06-15',
      time: '09:15',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
    });

    expect(warnings).toEqual([]);
  });

  it('ripiega su mezzogiorno locale quando l\'ora è ignota', () => {
    const { time, warnings } = resolveTime({
      date: '1968-03-12',
      latitude: 40.8518,
      longitude: 14.2681,
      timezone: 'Europe/Rome',
    });

    expect(time.timeKnown).toBe(false);
    expect(time.utc).toBe('1968-03-12T11:00:00Z');
    // La conversione riesce e non ha nulla da segnalare: che cosa comporti
    // l'ora mancante lo dice chi sa di che istante si tratti.
    expect(warnings).toEqual([]);
  });

  it('rifiuta fusi orari sconosciuti', () => {
    expect(() =>
      resolveTime({
        date: '2000-01-01',
        time: '12:00',
        latitude: 0,
        longitude: 0,
        timezone: 'Europa/Roma',
      }),
    ).toThrow(ChartError);
  });

  it('rifiuta date malformate', () => {
    expect(() =>
      resolveTime({
        date: '12/03/1968',
        time: '14:30',
        latitude: 0,
        longitude: 0,
        timezone: 'Europe/Rome',
      }),
    ).toThrow(/DATA_NON_VALIDA|formato/);
  });
});

describe('toJulianDay', () => {
  it('riproduce l\'epoca J2000', () => {
    // 1° gennaio 2000, 12:00 UT → JD 2451545.0 per definizione.
    expect(toJulianDay(2000, 1, 1, 12)).toBeCloseTo(2451545.0, 6);
  });

  it('gestisce gennaio e febbraio come mesi 13 e 14 dell\'anno precedente', () => {
    // Valore di riferimento da Meeus, Astronomical Algorithms, esempio 7.a.
    expect(toJulianDay(1957, 10, 4, 19.5)).toBeCloseTo(2436116.31, 2);
  });

  it('avanza di mezzo giorno ogni 12 ore', () => {
    expect(toJulianDay(2024, 6, 15, 12) - toJulianDay(2024, 6, 15, 0)).toBeCloseTo(0.5, 9);
  });
});
