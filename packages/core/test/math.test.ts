import { describe, expect, it } from 'vitest';
import { formatDegrees } from '../src/math.js';

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
