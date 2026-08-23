import { describe, expect, it } from 'vitest';
import { cacheKey, isApiRequest } from './cache-policy';

const SITO = 'https://undicesimacasa.example';

describe('isApiRequest', () => {
  it('riconosce le chiamate al motore', () => {
    expect(isApiRequest(new URL('/api/chart?date=1980-05-03', SITO))).toBe(true);
    expect(isApiRequest(new URL('/api/locations?q=roma', SITO))).toBe(true);
    expect(isApiRequest(new URL('/api/transits/passages?from=2026-01-01', SITO))).toBe(true);
    expect(isApiRequest(new URL('/api', SITO))).toBe(true);
  });

  it('lascia fuori le pagine', () => {
    expect(isApiRequest(new URL('/', SITO))).toBe(false);
    expect(isApiRequest(new URL('/transiti', SITO))).toBe(false);
    expect(isApiRequest(new URL('/privacy', SITO))).toBe(false);
  });

  it('non si fa ingannare da un percorso che comincia allo stesso modo', () => {
    // Non esistono oggi, ma un `/apixyz` finito in cache per via di un
    // confronto per prefisso sarebbe il genere di errore che non si vede.
    expect(isApiRequest(new URL('/apixyz', SITO))).toBe(false);
    expect(isApiRequest(new URL('/apine', SITO))).toBe(false);
  });
});

describe('cacheKey', () => {
  it('conserva la pagina, non i dati di nascita che ha nell\'indirizzo', () => {
    const indirizzo = new URL('/?date=1980-05-03&time=14:30&locationId=3169070', SITO);
    expect(cacheKey(indirizzo)).toBe(`${SITO}/`);
    expect(cacheKey(indirizzo)).not.toContain('1980');
  });

  it('tiene distinte le sezioni', () => {
    expect(cacheKey(new URL('/transiti?date=1980-05-03', SITO))).toBe(`${SITO}/transiti`);
    expect(cacheKey(new URL('/vedica?date=1980-05-03', SITO))).toBe(`${SITO}/vedica`);
  });

  it('butta anche il frammento', () => {
    expect(cacheKey(new URL('/privacy#cookie', SITO))).toBe(`${SITO}/privacy`);
  });
});
