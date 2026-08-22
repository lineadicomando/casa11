import { describe, expect, it } from 'vitest';
import { nextColorScheme, parseColorScheme, resolveColorScheme } from './color-scheme';

describe('nextColorScheme', () => {
  it('gira in tondo partendo da automatico', () => {
    expect(nextColorScheme('auto')).toBe('light');
    expect(nextColorScheme('light')).toBe('dark');
    expect(nextColorScheme('dark')).toBe('auto');
  });
});

describe('parseColorScheme', () => {
  it('riconosce le due scelte esplicite', () => {
    expect(parseColorScheme('light')).toBe('light');
    expect(parseColorScheme('dark')).toBe('dark');
  });

  it('legge come automatico la chiave assente', () => {
    expect(parseColorScheme(null)).toBe('auto');
    expect(parseColorScheme(undefined)).toBe('auto');
  });

  it('non si fida di quello che trova scritto', () => {
    // La chiave sta nella memoria del browser: chiunque può scriverci dentro,
    // e un valore ignoto non deve lasciare la pagina senza colori.
    expect(parseColorScheme('Dark')).toBe('auto');
    expect(parseColorScheme('notte')).toBe('auto');
    expect(parseColorScheme('')).toBe('auto');
  });
});

describe('resolveColorScheme', () => {
  it('lascia stare una scelta esplicita', () => {
    expect(resolveColorScheme('light', true)).toBe('light');
    expect(resolveColorScheme('dark', false)).toBe('dark');
  });

  it('su `auto` guarda il sistema', () => {
    expect(resolveColorScheme('auto', true)).toBe('dark');
    expect(resolveColorScheme('auto', false)).toBe('light');
  });
});
