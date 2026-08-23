import { describe, expect, it } from 'vitest';
import { formatHours } from '../src/sidereal.js';

describe('formatHours', () => {
  it('formatta ore, minuti e secondi', () => {
    expect(formatHours(3.5125)).toBe('03:30:45');
  });

  it("riporta sui minuti l'arrotondamento dei secondi a 60", () => {
    expect(formatHours(3 + 40.9999999 / 60)).toBe('03:41:00');
  });

  it('riporta sulle ore il minuto che a sua volta arriva a 60', () => {
    expect(formatHours(3 + 59.9999999 / 60)).toBe('04:00:00');
  });

  it('riparte da zero quando il riporto arriva a ventiquattro ore', () => {
    expect(formatHours(23.9999999)).toBe('00:00:00');
  });

  /**
   * Il riporto scritto come `h + (m + 1) / 60` e riformattato non terminava
   * per ventiquattro minuti su sessanta, e il tema natale ne moriva con un
   * `RangeError` invece che con un errore di dominio. Si prova ogni minuto,
   * perché quali fossero i ventiquattro dipende dalla virgola mobile e non da
   * una proprietà che si possa nominare.
   */
  it('termina per ogni minuto in cui i secondi arrotondano a 60', () => {
    for (let minuto = 0; minuto < 60; minuto++) {
      const ore = 3 + (minuto + 0.9999999) / 60;
      expect(formatHours(ore)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });
});
