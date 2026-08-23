import { describe, expect, it } from 'vitest';
import {
  chartParameters,
  skyCalendarParameters,
  skyParameters,
  transitParameters,
} from './api';
import { emptyBirthInput, type BirthInput } from './birth';
import { isCompleteMoment, nowMoment, shiftDate, shiftMoment, type MomentInput } from './moment';

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

describe('lo zodiaco nei parametri', () => {
  it('non scrive il tropicale, che è il predefinito', () => {
    // Questi indirizzi si condividono: il valore predefinito scritto ogni
    // volta è rumore in una cosa che si incolla in un messaggio.
    const senza = chartParameters(napoli(), { houseSystem: 'placidus', minorAspects: false });
    const esplicito = chartParameters(napoli(), {
      houseSystem: 'placidus',
      minorAspects: false,
      zodiac: 'tropicale',
    });

    expect(senza.has('zodiac')).toBe(false);
    expect(esplicito.has('zodiac')).toBe(false);
  });

  it('scrive il siderale e la sua convenzione', () => {
    const parameters = chartParameters(napoli(), {
      houseSystem: 'placidus',
      minorAspects: false,
      zodiac: 'siderale',
      ayanamsa: 'raman',
    });

    expect(parameters.get('zodiac')).toBe('siderale');
    expect(parameters.get('ayanamsa')).toBe('raman');
  });

  it('non manda un ayanamsa senza il siderale, che la rotta rifiuterebbe', () => {
    const parameters = chartParameters(napoli(), {
      houseSystem: 'placidus',
      minorAspects: false,
      ayanamsa: 'raman',
    });

    expect(parameters.has('ayanamsa')).toBe(false);
  });

  it('lo porta anche nei transiti, che lo ereditano dal tema', () => {
    const parameters = transitParameters(
      napoli(),
      { houseSystem: 'placidus', minorAspects: false, zodiac: 'siderale' },
      TRANSITO,
    );

    expect(parameters.get('zodiac')).toBe('siderale');
  });

  it('nel calendario del cielo vale per i soli ingressi', () => {
    const con = skyCalendarParameters(TRANSITO, 6, 'siderale');
    const senza = skyCalendarParameters(TRANSITO, 6);

    expect(con.get('zodiac')).toBe('siderale');
    expect(senza.has('zodiac')).toBe(false);
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
