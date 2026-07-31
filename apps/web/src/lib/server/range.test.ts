import { describe, expect, it } from 'vitest';
import { MAX_RANGE_DAYS, resolvePassageRange } from './range';

function capture(run: () => unknown): { status: number; body: { message: string; code?: string } } {
  try {
    run();
  } catch (thrown) {
    return thrown as { status: number; body: { message: string; code?: string } };
  }
  throw new Error('non è stato sollevato nessun errore');
}

const ADESSO = new Date('2026-07-31T23:30:00Z');
const params = (query: string): URLSearchParams => new URLSearchParams(query);

describe('resolvePassageRange', () => {
  it('prende l arco dalla richiesta quando c è', () => {
    const { range, explicit } = resolvePassageRange(
      params('from=2026-01-01&to=2026-12-31'),
      'Europe/Rome',
      ADESSO,
    );

    expect(range).toEqual({ from: '2026-01-01', to: '2026-12-31', timezone: 'Europe/Rome' });
    expect(explicit).toBe(true);
  });

  it('parte da oggi e arriva a un anno dopo', () => {
    const { range, explicit } = resolvePassageRange(params(''), 'Europe/Rome', ADESSO);

    // Nel fuso di Roma quell'istante è già il primo agosto.
    expect(range.from).toBe('2026-08-01');
    expect(range.to).toBe('2027-08-01');
    expect(explicit).toBe(false);
  });

  it('completa l arco quando manca solo la fine', () => {
    const { range } = resolvePassageRange(params('from=2030-03-15'), 'Europe/Rome', ADESSO);

    expect(range.to).toBe('2031-03-15');
  });

  it('rifiuta un arco rovesciato', () => {
    const result = capture(() =>
      resolvePassageRange(params('from=2026-12-31&to=2026-01-01'), 'Europe/Rome', ADESSO),
    );

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('INTERVALLO_NON_VALIDO');
  });

  it('mette un tetto alla durata, che è ciò che costa', () => {
    const result = capture(() =>
      resolvePassageRange(params('from=2026-01-01&to=2036-01-01'), 'Europe/Rome', ADESSO),
    );

    expect(result.body.code).toBe('INTERVALLO_TROPPO_LUNGO');
    expect(result.body.message).toContain(String(MAX_RANGE_DAYS));
  });

  it('accetta un arco lungo esattamente quanto il tetto', () => {
    const { range } = resolvePassageRange(
      params('from=2026-01-01&to=2029-01-01'),
      'Europe/Rome',
      ADESSO,
    );

    expect(range.to).toBe('2029-01-01');
  });

  it('rifiuta una data malformata', () => {
    expect(capture(() => resolvePassageRange(params('from=01/01/2026'), 'Europe/Rome', ADESSO)).status).toBe(400);
  });
});
