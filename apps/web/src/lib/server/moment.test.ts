import { describe, expect, it } from 'vitest';
import { resolveTransitMoment } from './moment';

/** Estrae status e corpo da un errore sollevato da `error()`. */
function capture(run: () => unknown): { status: number; body: { message: string; code?: string } } {
  try {
    run();
  } catch (thrown) {
    return thrown as { status: number; body: { message: string; code?: string } };
  }
  throw new Error('non è stato sollevato nessun errore');
}

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

/** Un istante fisso, per non dipendere dall'orologio di chi esegue i test. */
const ADESSO = new Date('2026-07-31T23:30:00Z');

describe('resolveTransitMoment', () => {
  it('prende l istante dalla richiesta quando c è', () => {
    const { moment, explicit } = resolveTransitMoment(
      params('transitDate=2026-08-15&transitTime=09:00&transitTimezone=America/New_York'),
      'Europe/Rome',
      ADESSO,
    );

    expect(moment).toEqual({
      date: '2026-08-15',
      time: '09:00',
      timezone: 'America/New_York',
    });
    expect(explicit).toBe(true);
  });

  it('lascia l ora al motore quando è indicato il solo giorno', () => {
    // Il ripiego su mezzogiorno, e l'avvertenza che lo accompagna, sono del
    // motore: qui l'ora semplicemente non c'è.
    const { moment } = resolveTransitMoment(params('transitDate=2026-08-15'), 'Europe/Rome', ADESSO);

    expect(moment).toEqual({ date: '2026-08-15', timezone: 'Europe/Rome' });
  });

  it('senza giorno vale adesso, ora compresa', () => {
    const { moment, explicit } = resolveTransitMoment(params(''), 'Europe/Rome', ADESSO);

    expect(moment).toEqual({ date: '2026-08-01', time: '01:30', timezone: 'Europe/Rome' });
    expect(explicit).toBe(false);
  });

  it('legge adesso nel fuso richiesto, non in quello del server', () => {
    // Lo stesso istante è già il primo agosto a Roma e ancora il trentuno
    // luglio a New York: il giorno dipende da dove si guarda.
    const roma = resolveTransitMoment(params(''), 'Europe/Rome', ADESSO);
    const newYork = resolveTransitMoment(params('transitTimezone=America/New_York'), 'Europe/Rome', ADESSO);

    expect(roma.moment.date).toBe('2026-08-01');
    expect(newYork.moment.date).toBe('2026-07-31');
    expect(newYork.moment.time).toBe('19:30');
  });

  it('applica l ora richiesta al giorno corrente', () => {
    const { moment, explicit } = resolveTransitMoment(
      params('transitTime=06:00'),
      'Europe/Rome',
      ADESSO,
    );

    expect(moment).toEqual({ date: '2026-08-01', time: '06:00', timezone: 'Europe/Rome' });
    // Il giorno resta quello di oggi: la risposta invecchia comunque.
    expect(explicit).toBe(false);
  });

  it('eredita il fuso della nascita', () => {
    const { moment } = resolveTransitMoment(
      params('transitDate=2026-08-15'),
      'Asia/Tokyo',
      ADESSO,
    );

    expect(moment.timezone).toBe('Asia/Tokyo');
  });

  it('distingue la data del transito da quella di nascita quando è malformata', () => {
    const result = capture(() =>
      resolveTransitMoment(params('transitDate=15/08/2026'), 'Europe/Rome', ADESSO),
    );

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('DATA_TRANSITO_NON_VALIDA');
    expect(result.body.message).toContain('transitDate');
  });

  it('rifiuta un ora malformata', () => {
    const result = capture(() =>
      resolveTransitMoment(params('transitDate=2026-08-15&transitTime=9.00'), 'Europe/Rome', ADESSO),
    );

    expect(result.body.code).toBe('ORA_TRANSITO_NON_VALIDA');
  });

  it('rifiuta un fuso sconosciuto invece di fallire da dentro', () => {
    // Senza questo controllo l'identificatore ignoto arriverebbe a Intl e
    // diventerebbe un 500: è invece una richiesta da correggere.
    const result = capture(() =>
      resolveTransitMoment(params('transitTimezone=Europa/Roma'), 'Europe/Rome', ADESSO),
    );

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('FUSO_TRANSITO_NON_VALIDO');
  });

  it('ignora i parametri vuoti come se non ci fossero', () => {
    const { moment, explicit } = resolveTransitMoment(
      params('transitDate=&transitTime=&transitTimezone='),
      'Europe/Rome',
      ADESSO,
    );

    expect(moment.date).toBe('2026-08-01');
    expect(explicit).toBe(false);
  });
});
