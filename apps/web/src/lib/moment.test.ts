import { describe, expect, it } from 'vitest';
import { isCompleteMoment, nowMoment, shiftDate, shiftMoment, type MomentInput } from './moment';

const ADESSO = new Date('2026-07-31T23:30:00Z');

const TRANSITO: MomentInput = {
  date: '2026-08-15',
  time: '09:00',
  timezone: 'Europe/Rome',
};

describe('nowMoment', () => {
  it('propone l istante presente nel fuso di chi guarda', () => {
    expect(nowMoment(ADESSO, 'Europe/Rome')).toEqual({
      date: '2026-08-01',
      time: '01:30',
      timezone: 'Europe/Rome',
    });
  });

  it('legge lo stesso istante secondo l orologio del posto', () => {
    // Chi chiede «adesso» da New York non sta chiedendo il giorno di Roma.
    const newYork = nowMoment(ADESSO, 'America/New_York');

    expect(newYork.date).toBe('2026-07-31');
    expect(newYork.time).toBe('19:30');
  });
});

describe('isCompleteMoment', () => {
  it('richiede il giorno', () => {
    expect(isCompleteMoment({ ...TRANSITO, date: '' })).toBe(false);
  });

  it('non richiede l ora, che il motore sa surrogare dichiarandolo', () => {
    expect(isCompleteMoment({ ...TRANSITO, time: '' })).toBe(true);
  });
});

describe('shiftDate', () => {
  it('sposta di un giorno, di una settimana, di un mese, di un anno', () => {
    expect(shiftDate('2026-08-15', 'day', 1)).toBe('2026-08-16');
    expect(shiftDate('2026-08-15', 'week', 1)).toBe('2026-08-22');
    expect(shiftDate('2026-08-15', 'month', 1)).toBe('2026-09-15');
    expect(shiftDate('2026-08-15', 'year', 1)).toBe('2027-08-15');
  });

  it('va anche indietro, scavalcando l inizio dell anno', () => {
    expect(shiftDate('2026-01-01', 'day', -1)).toBe('2025-12-31');
    expect(shiftDate('2026-01-15', 'month', -1)).toBe('2025-12-15');
  });

  it('aggancia a fine mese invece di far traboccare i giorni', () => {
    // Senza aggancio il 31 gennaio più un mese sarebbe il 3 marzo.
    expect(shiftDate('2026-01-31', 'month', 1)).toBe('2026-02-28');
    expect(shiftDate('2026-03-31', 'month', -1)).toBe('2026-02-28');
    expect(shiftDate('2026-08-31', 'month', 1)).toBe('2026-09-30');
  });

  it('conosce gli anni bisestili da entrambe le parti', () => {
    expect(shiftDate('2028-01-31', 'month', 1)).toBe('2028-02-29');
    // Il 29 febbraio non esiste l'anno dopo: l'aggancio lo porta al 28.
    expect(shiftDate('2028-02-29', 'year', 1)).toBe('2029-02-28');
  });

  it('torna sul giorno di partenza, finché il giorno esiste in ogni mese', () => {
    expect(shiftDate(shiftDate('2026-08-28', 'month', 1), 'month', -1)).toBe('2026-08-28');
  });

  it('non si ricorda del giorno che ha agganciato', () => {
    // Dal 31 agosto si va al 30 settembre, e indietro si torna al 30 agosto:
    // l'aggancio non conserva un giorno d'ancoraggio, come nessun calendario.
    expect(shiftDate(shiftDate('2026-08-31', 'month', 1), 'month', -1)).toBe('2026-08-30');
  });
});

describe('shiftMoment', () => {
  it('muove il giorno e lascia stare l ora e il fuso', () => {
    expect(shiftMoment(TRANSITO, 'day', 1)).toEqual({
      date: '2026-08-16',
      time: '09:00',
      timezone: 'Europe/Rome',
    });
  });

  it('tiene l ora da parete attraverso il cambio d ora', () => {
    // Il 25 ottobre 2026 a Roma finisce l'ora legale. Sommando un giorno di
    // millisecondi le 02:30 diventerebbero le 01:30: qui non succede, perché
    // a muoversi è il giorno sul calendario e non un punto sulla linea del tempo.
    const vigilia: MomentInput = { date: '2026-10-24', time: '02:30', timezone: 'Europe/Rome' };

    expect(shiftMoment(vigilia, 'day', 1)).toEqual({
      date: '2026-10-25',
      time: '02:30',
      timezone: 'Europe/Rome',
    });
  });

  it('non inventa un giorno quando il modulo non ne ha uno', () => {
    const vuoto: MomentInput = { ...TRANSITO, date: '' };

    expect(shiftMoment(vuoto, 'day', 1)).toEqual(vuoto);
  });
});
