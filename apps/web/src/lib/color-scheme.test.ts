import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COLOR_SCHEME_KEY,
  nextColorScheme,
  parseColorScheme,
  resolveColorScheme,
} from './color-scheme';

describe('COLOR_SCHEME_KEY', () => {
  it('è ripetuta alla lettera nello script in linea di app.html', () => {
    // La costante si compone da `SITE_NAME`, lo script in linea no: gira prima
    // di ogni import, per non far lampeggiare la pagina, e la chiave se la
    // scrive a mano. Cambiare il nome del sito senza toccare `app.html` non
    // romperebbe niente di visibile — perderebbe soltanto l'aspetto scelto, a
    // ogni caricamento, e in silenzio. Questo test è l'unico posto dove le due
    // copie si guardano in faccia.
    const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

    expect(html).toContain(`localStorage.getItem('${COLOR_SCHEME_KEY}')`);
  });
});

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
