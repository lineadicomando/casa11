import { describe, expect, it } from 'vitest';
import { formatDegrees, formatZodiacal } from '../src/math.js';

describe('formatDegrees', () => {
  it('formatta gradi e minuti', () => {
    expect(formatDegrees(22.05)).toBe("22°03'");
  });

  it("riporta sui gradi l'arrotondamento dei minuti a 60", () => {
    expect(formatDegrees(22.9999)).toBe("23°00'");
  });

  it('formatta anche i secondi quando richiesti', () => {
    expect(formatDegrees(12.5825, true)).toBe('12°34\'57"');
  });

  it("riporta sui minuti l'arrotondamento dei secondi a 60", () => {
    expect(formatDegrees(12.51666, true)).toBe('12°31\'00"');
  });

  it('riporta fino ai gradi quando anche i minuti traboccano', () => {
    expect(formatDegrees(12.9999999, true)).toBe('13°00\'00"');
  });
});

describe('formatZodiacal', () => {
  it('scrive il grado dentro il segno con la sigla', () => {
    expect(formatZodiacal(42.05)).toBe("12°03' Tor");
  });

  it("non scrive mai 30 gradi di un segno, che è una posizione che non esiste", () => {
    // Il Sole del 19 febbraio 1980 a mezzogiorno UT: 29,998844° dell'acquario,
    // cioè 29°59'56". Arrotondando i primi diventerebbe `30°00' Acq`.
    expect(formatZodiacal(329.998844)).toBe("29°59' Acq");
    expect(formatZodiacal(329.9999999)).toBe("29°59' Acq");
  });

  it('cede il primo e non il segno', () => {
    // Passare ai pesci cambierebbe la lettura; un primo di meno non la cambia.
    expect(formatZodiacal(329.9999999)).toContain('Acq');
    expect(formatZodiacal(330)).toBe("0°00' Pes");
  });

  it('il limite vale alla risoluzione con cui stampa', () => {
    // Con i secondi il segno arriva fino a 29°59'59", non si ferma a 29°59'00".
    expect(formatZodiacal(329.9999999, true)).toBe('29°59\'59" Acq');
  });

  it('arrotonda come sempre quando il bordo non c\'entra', () => {
    expect(formatZodiacal(12.9999)).toBe("13°00' Ari");
    expect(formatZodiacal(42.05)).toBe("12°03' Tor");
  });
});
