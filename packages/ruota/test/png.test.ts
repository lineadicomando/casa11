import type { CelestialBody, House } from '@dodicisegni/core';
import { describe, expect, it } from 'vitest';
import { CHIARA, SCURA } from '../src/palette.js';
import { ruotaPng } from '../src/png.js';
import type { WheelChart } from '../src/wheel.js';

function body(id: string, longitude: number): CelestialBody {
  return {
    id,
    name: id,
    longitude,
    latitude: 0,
    distance: 1,
    speed: 1,
    retrograde: false,
    sign: 'ariete',
    signDegree: longitude % 30,
  } as CelestialBody;
}

const CARTA: WheelChart = {
  bodies: [body('sole', 10), body('luna', 200), body('marte', 95)],
  houses: Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    longitude: i * 30,
  })) as House[],
  angles: { ascendant: 0, midheaven: 270, descendant: 180, imumCoeli: 90 },
  aspects: [],
};

describe('ruotaPng', () => {
  it('produce un PNG vero', () => {
    const png = ruotaPng(CARTA, { larghezza: 400 });

    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(png.byteLength).toBeGreaterThan(1000);
  });

  it('rispetta la larghezza chiesta', () => {
    // I byte 16-23 di un PNG sono larghezza e altezza, big-endian.
    const png = ruotaPng(CARTA, { larghezza: 500 });

    expect(png.readUInt32BE(16)).toBe(500);
    expect(png.readUInt32BE(20)).toBe(500);
  });

  /**
   * Il difetto per cui `CARTELLE_DI_SISTEMA` esiste.
   *
   * Senza un font trovato, resvg non ripiega su un carattere qualunque: non
   * disegna il testo affatto. Ne esce una ruota di sole linee — nessun glifo,
   * nessun numero di casa, nessuna sigla — che sembra un disegno riuscito
   * finché non la si legge, e che nessun errore segnala.
   *
   * Non si può controllare direttamente che i glifi ci siano, ma si può
   * confrontare: se il testo viene disegnato, una carta con dei corpi pesa più
   * della stessa carta senza. Se i font mancassero, i due file sarebbero
   * identici, perché la differenza sta tutta nei glifi.
   */
  it('disegna davvero il testo, non solo le linee', () => {
    const conGlifi = ruotaPng(CARTA, { larghezza: 600 });
    const senzaGlifi = ruotaPng({ ...CARTA, bodies: [] }, { larghezza: 600 });

    expect(conGlifi.byteLength).toBeGreaterThan(senzaGlifi.byteLength);
  });

  it('porta le opzioni del disegno fino al raster', () => {
    // Il tema non si ferma all'SVG: due fondi diversi non possono dare due
    // immagini identiche.
    const chiaro = ruotaPng(CARTA, { larghezza: 400, palette: CHIARA });
    const scuro = ruotaPng(CARTA, { larghezza: 400, palette: SCURA });

    expect(chiaro.byteLength).not.toBe(scuro.byteLength);
  });
});
