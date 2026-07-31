import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { computeTransits } from '../src/transits.js';
import { angularSeparation } from '../src/math.js';
import type { BirthData, NatalChart, NatalPointId, TransitMoment } from '../src/types.js';

const NAPOLI: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

const natal: NatalChart = computeNatalChart(NAPOLI);

const OGGI: TransitMoment = { date: '2024-06-15', time: '12:00', timezone: 'Europe/Rome' };

/** La longitudine di un bersaglio natale, corpo o asse che sia. */
function longitudeOf(chart: NatalChart, id: NatalPointId): number {
  if (id === 'ascendente') return chart.angles!.ascendant;
  if (id === 'medio-cielo') return chart.angles!.midheaven;
  return chart.bodies.find((body) => body.id === id)?.longitude ?? Number.NaN;
}

describe('computeTransits', () => {
  it('riporta il Sole sulla sua posizione natale al compleanno', () => {
    // Il ritorno solare è l'invariante più forte dei transiti: verificabile
    // senza riferimenti esterni, perché la data di nascita lo fissa da sé.
    const transits = computeTransits(natal, {
      date: '2024-03-12',
      time: '12:00',
      timezone: 'Europe/Rome',
    });

    const ritorno = transits.aspects.find((a) => a.transiting === 'sole' && a.natal === 'sole');

    expect(ritorno?.aspect).toBe('congiunzione');
    // Il Sole avanza di circa un grado al giorno e la data anniversaria non
    // cade sull'istante esatto del ritorno: un grado scarso di scarto.
    expect(ritorno?.orb).toBeLessThan(1.5);
  });

  it('misura gli aspetti sulla separazione fra transitante e punto natale', () => {
    const transits = computeTransits(natal, OGGI, { minorAspects: true });

    for (const aspect of transits.aspects) {
      const moving = transits.transiting.find((body) => body.id === aspect.transiting)!;
      const separation = angularSeparation(moving.longitude, longitudeOf(natal, aspect.natal));
      expect(Math.abs(separation - aspect.angle)).toBeCloseTo(aspect.orb, 6);
    }
  });

  it('colloca i transitanti nelle case del tema natale', () => {
    const transits = computeTransits(natal, OGGI);

    for (const body of transits.transiting) {
      expect(body.house).toBeGreaterThanOrEqual(1);
      expect(body.house).toBeLessThanOrEqual(12);
    }
  });

  it('usa orbite molto più strette di quelle natali', () => {
    const transits = computeTransits(natal, OGGI, { minorAspects: true });

    // Il massimo concesso è 2° (congiunzione) più 1° per ciascun luminare
    // della coppia. Con le orbite natali si arriverebbe a 12°.
    for (const aspect of transits.aspects) {
      expect(aspect.orb).toBeLessThanOrEqual(4);
    }
  });

  it('accetta orbite su misura, che sostituiscono quelle predefinite', () => {
    const stretto = computeTransits(natal, OGGI, { orbs: { congiunzione: 0 } });

    expect(stretto.aspects.some((a) => a.aspect === 'congiunzione')).toBe(false);
    // Gli altri aspetti non sono toccati dalla sostituzione.
    expect(stretto.aspects.length).toBeGreaterThan(0);
  });

  it('bersaglia gli assi natali, non solo i corpi', () => {
    const transits = computeTransits(natal, OGGI, { targets: ['ascendente'] });

    expect(transits.aspects.length).toBeGreaterThan(0);
    expect(transits.aspects.every((a) => a.natal === 'ascendente')).toBe(true);
  });

  it('lascia fuori dai transitanti il Nodo Sud, che duplicherebbe il Nord', () => {
    const transits = computeTransits(natal, OGGI);

    expect(transits.transiting.some((body) => body.id === 'nodo-nord')).toBe(true);
    expect(transits.transiting.some((body) => body.id === 'nodo-sud')).toBe(false);
  });

  it('calcola i soli corpi richiesti', () => {
    const transits = computeTransits(natal, OGGI, { bodies: ['luna'] });

    expect(transits.transiting.map((body) => body.id)).toEqual(['luna']);
  });

  it('avvisa e prosegue se un bersaglio non è nel tema', () => {
    const transits = computeTransits(natal, OGGI, { targets: ['sole', 'chirone'] });

    expect(transits.warnings.some((w) => w.includes('chirone'))).toBe(true);
    expect(transits.aspects.every((a) => a.natal === 'sole')).toBe(true);
  });

  it('segnala come retrogrado il corpo che lo è a quell istante', () => {
    const transits = computeTransits(natal, OGGI);

    for (const aspect of transits.aspects) {
      const moving = transits.transiting.find((body) => body.id === aspect.transiting)!;
      expect(aspect.retrograde).toBe(moving.retrograde);
    }
  });

  describe('senza ora del transito', () => {
    const senzaOra = computeTransits(natal, { date: '2024-06-15', timezone: 'Europe/Rome' });

    it('ripiega su mezzogiorno locale e lo dice', () => {
      expect(senzaOra.time.timeKnown).toBe(false);
      expect(senzaOra.warnings.some((w) => w.includes('mezzogiorno locale'))).toBe(true);
    });

    it('avverte che nella giornata si sposta soprattutto la Luna', () => {
      const mezzanotte = computeTransits(natal, {
        date: '2024-06-15',
        time: '00:00',
        timezone: 'Europe/Rome',
      });

      const scarto = (id: string): number =>
        angularSeparation(
          senzaOra.transiting.find((b) => b.id === id)!.longitude,
          mezzanotte.transiting.find((b) => b.id === id)!.longitude,
        );

      expect(scarto('luna')).toBeGreaterThan(5);
      expect(scarto('saturno')).toBeLessThan(0.1);
    });
  });

  describe('su un tema natale senza ora', () => {
    const senzaOraNatale = computeNatalChart({
      date: NAPOLI.date,
      latitude: NAPOLI.latitude,
      longitude: NAPOLI.longitude,
      timezone: NAPOLI.timezone,
    });
    const transits = computeTransits(senzaOraNatale, OGGI);

    it('non colloca i transitanti in nessuna casa, e lo dice', () => {
      expect(transits.transiting.every((body) => body.house === undefined)).toBe(true);
      expect(transits.warnings.some((w) => w.includes('senza ora'))).toBe(true);
    });

    it('non bersaglia assi che non esistono', () => {
      expect(transits.aspects.some((a) => a.natal === 'ascendente')).toBe(false);
      // I corpi restano bersagliabili: è il caso d'uso di un tema senza ora.
      expect(transits.aspects.length).toBeGreaterThan(0);
    });
  });
});
