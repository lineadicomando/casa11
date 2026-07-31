import { describe, expect, it } from 'vitest';
import { formatDegrees } from './format';

describe('formatDegrees', () => {
  it('scrive gradi e primi con i primi a due cifre', () => {
    expect(formatDegrees(22.05)).toBe("22°03'");
  });

  it('azzera i primi quando non ce ne sono', () => {
    expect(formatDegrees(15)).toBe("15°00'");
  });

  it('propaga il riporto invece di scrivere 60 primi', () => {
    // 22,9999° arrotonda a 60 primi: `22°60'` non è una posizione.
    expect(formatDegrees(22.9999)).toBe("23°00'");
  });

  it('non azzera i primi appena sotto il riporto', () => {
    expect(formatDegrees(22.99)).toBe("22°59'");
  });

  it('regge lo zero', () => {
    expect(formatDegrees(0)).toBe("0°00'");
  });
});
