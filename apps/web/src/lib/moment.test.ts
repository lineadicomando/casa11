import { describe, expect, it } from 'vitest';
import { skyParameters, transitParameters } from './api';
import { emptyBirthInput, type BirthInput } from './birth';
import { isCompleteMoment, nowMoment, type MomentInput } from './moment';

const ADESSO = new Date('2026-07-31T23:30:00Z');

function napoli(): BirthInput {
  return {
    ...emptyBirthInput(),
    date: '1968-03-12',
    time: '14:30',
    location: {
      id: 3172394,
      name: 'Napoli',
      region: 'Campania',
      country: 'Italia',
      countryCode: 'IT',
      latitude: 40.8518,
      longitude: 14.2681,
      timezone: 'Europe/Rome',
      population: 959188,
    },
  };
}

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

describe('transitParameters', () => {
  it('aggiunge l istante ai parametri del tema, senza toccarli', () => {
    const parameters = transitParameters(
      napoli(),
      { houseSystem: 'koch', minorAspects: true },
      TRANSITO,
    );

    expect(Object.fromEntries(parameters)).toEqual({
      date: '1968-03-12',
      time: '14:30',
      locationId: '3172394',
      houseSystem: 'koch',
      minorAspects: 'true',
      transitDate: '2026-08-15',
      transitTime: '09:00',
      transitTimezone: 'Europe/Rome',
    });
  });

  it('omette l ora del transito quando non è stata scelta', () => {
    // Meglio l'avvertenza del motore che un mezzogiorno implicito.
    const parameters = transitParameters(
      napoli(),
      { houseSystem: 'placidus', minorAspects: false },
      { ...TRANSITO, time: '' },
    );

    expect(parameters.has('transitTime')).toBe(false);
    expect(parameters.get('transitDate')).toBe('2026-08-15');
  });

  it('porta con sé le coordinate corrette a mano', () => {
    const birth = { ...napoli(), refineCoordinates: true, latitude: '40.9', longitude: '14.3' };
    const parameters = transitParameters(
      birth,
      { houseSystem: 'placidus', minorAspects: false },
      TRANSITO,
    );

    expect(parameters.get('latitude')).toBe('40.9');
    expect(parameters.get('longitude')).toBe('14.3');
    // La località resta, perché è lei a dare il fuso orario della nascita.
    expect(parameters.get('locationId')).toBe('3172394');
  });
});

describe('skyParameters', () => {
  it('non porta nessuna nascita: il cielo non ne ha una', () => {
    const parameters = skyParameters(TRANSITO, { houseSystem: 'placidus', minorAspects: false }, null);

    expect(Object.fromEntries(parameters)).toEqual({
      date: '2026-08-15',
      time: '09:00',
      timezone: 'Europe/Rome',
      houseSystem: 'placidus',
      minorAspects: 'false',
    });
  });

  it('manda il luogo solo se è stato scelto', () => {
    const senza = skyParameters(TRANSITO, { houseSystem: 'placidus', minorAspects: false }, null);
    const con = skyParameters(
      TRANSITO,
      { houseSystem: 'placidus', minorAspects: false },
      napoli().location,
    );

    expect(senza.has('locationId')).toBe(false);
    expect(con.get('locationId')).toBe('3172394');
    // Il fuso resta quello di chi guarda: il luogo orienta le case, non l'orologio.
    expect(con.get('timezone')).toBe('Europe/Rome');
  });

  it('omette l ora quando non è stata scelta', () => {
    const parameters = skyParameters(
      { ...TRANSITO, time: '' },
      { houseSystem: 'placidus', minorAspects: false },
      null,
    );

    expect(parameters.has('time')).toBe(false);
  });
});
