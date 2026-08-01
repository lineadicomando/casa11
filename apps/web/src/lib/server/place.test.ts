import { describe, expect, it } from 'vitest';
import { resolveOptionalPlace } from './place';

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

describe('resolveOptionalPlace', () => {
  it('non è un errore che il luogo manchi', () => {
    expect(resolveOptionalPlace(params(''))).toBeNull();
    expect(resolveOptionalPlace(params('date=2026-08-01'))).toBeNull();
  });

  it('accetta due coordinate senza chiedere un fuso', () => {
    // Il fuso è dell'istante, non del posto: due coordinate non dicono che
    // ore siano, e nel cielo non devono.
    expect(resolveOptionalPlace(params('latitude=41.9&longitude=12.5'))).toEqual({
      latitude: 41.9,
      longitude: 12.5,
    });
  });

  it('rifiuta mezzo luogo', () => {
    const result = capture(() => resolveOptionalPlace(params('latitude=41.9')));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('LUOGO_INCOMPLETO');
  });

  it('rifiuta una coordinata fuori intervallo invece di lasciarla passare', () => {
    const result = capture(() => resolveOptionalPlace(params('latitude=91&longitude=12.5')));

    expect(result.body.code).toBe('COORDINATE_NON_VALIDE');
  });
});
