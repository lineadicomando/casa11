import { describe, expect, it } from 'vitest';
import { computeDistribution } from '../src/distribution.js';
import { computeNatalChart } from '../src/chart.js';
import { computeSky } from '../src/sky.js';
import { SIGN_ELEMENT, SIGN_MODALITY, ZODIAC_SIGNS } from '../src/constants.js';
import type { CelestialBody, ZodiacSign } from '../src/types.js';

/**
 * Il tema di riferimento del progetto.
 *
 * I valori attesi qui sotto sono ricavati **a mano** dai segni che questo tema
 * produce, non copiati da un'esecuzione: è la differenza fra una verifica e uno
 * specchio. I segni sono quelli documentati nel README.
 */
const NASCITA = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

/** Un corpo finto: alla distribuzione servono solo `id` e `sign`. */
function corpo(id: CelestialBody['id'], sign: ZodiacSign): CelestialBody {
  return {
    id,
    name: id,
    longitude: 0,
    latitude: 0,
    distance: 1,
    speed: 1,
    retrograde: false,
    sign,
    signDegree: 0,
  };
}

describe('le mappe dei segni', () => {
  it('classificano tutti e dodici i segni', () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(SIGN_ELEMENT[sign], sign).toBeDefined();
      expect(SIGN_MODALITY[sign], sign).toBeDefined();
    }
  });

  it('distribuiscono i segni tre per elemento e quattro per modalità', () => {
    const perElemento = new Map<string, number>();
    const perModalita = new Map<string, number>();

    for (const sign of ZODIAC_SIGNS) {
      perElemento.set(SIGN_ELEMENT[sign], (perElemento.get(SIGN_ELEMENT[sign]) ?? 0) + 1);
      perModalita.set(SIGN_MODALITY[sign], (perModalita.get(SIGN_MODALITY[sign]) ?? 0) + 1);
    }

    expect([...perElemento.values()]).toEqual([3, 3, 3, 3]);
    expect([...perModalita.values()]).toEqual([4, 4, 4]);
  });

  it('associa a ogni elemento la terna canonica', () => {
    expect(ZODIAC_SIGNS.filter((s) => SIGN_ELEMENT[s] === 'fuoco')).toEqual([
      'ariete',
      'leone',
      'sagittario',
    ]);
    expect(ZODIAC_SIGNS.filter((s) => SIGN_MODALITY[s] === 'cardinale')).toEqual([
      'ariete',
      'cancro',
      'bilancia',
      'capricorno',
    ]);
  });
});

describe('computeDistribution', () => {
  it('separa i pianeti dai punti calcolati', () => {
    const distribution = computeDistribution({
      bodies: [
        corpo('sole', 'ariete'),
        corpo('luna', 'cancro'),
        corpo('nodo-nord', 'ariete'),
        corpo('chirone', 'toro'),
      ],
    });

    expect(distribution.planets.counted).toEqual(['sole', 'luna']);
    expect(distribution.points.counted).toEqual(['nodo-nord', 'chirone']);
    expect(distribution.planets.elements).toEqual({ fuoco: 1, terra: 0, aria: 0, acqua: 1 });
    expect(distribution.points.elements).toEqual({ fuoco: 1, terra: 1, aria: 0, acqua: 0 });
  });

  it('conta la Parte di Fortuna fra i punti', () => {
    const distribution = computeDistribution({
      bodies: [corpo('sole', 'ariete')],
      partOfFortune: { longitude: 45, sign: 'toro', signDegree: 15 },
    });

    expect(distribution.points.counted).toEqual(['fortuna']);
    expect(distribution.points.elements.terra).toBe(1);
  });

  it('degli assi conta soltanto Ascendente e Medio Cielo', () => {
    const distribution = computeDistribution({
      bodies: [],
      // ASC 0° Ariete (fuoco, cardinale), MC 270° Capricorno (terra, cardinale).
      angles: { ascendant: 0, midheaven: 270, descendant: 180, imumCoeli: 90 },
    });

    expect(distribution.angles.counted).toEqual(['ascendente', 'medio-cielo']);
    expect(distribution.angles.elements).toEqual({ fuoco: 1, terra: 1, aria: 0, acqua: 0 });
    expect(distribution.angles.modalities.cardinale).toBe(2);
  });

  it('lascia i gruppi a zero quando non c’è niente da contare', () => {
    const distribution = computeDistribution({ bodies: [] });

    expect(distribution.planets.counted).toEqual([]);
    expect(distribution.angles.elements).toEqual({ fuoco: 0, terra: 0, aria: 0, acqua: 0 });
    expect(distribution.points.modalities).toEqual({ cardinale: 0, fisso: 0, mobile: 0 });
  });
});

describe('la distribuzione del tema di riferimento', () => {
  const chart = computeNatalChart(NASCITA);

  /*
   * I dieci pianeti di questo tema, con il loro segno:
   *   Sole Pesci (acqua, mobile)        Giove Leone (fuoco, fisso)
   *   Luna Leone (fuoco, fisso)         Saturno Ariete (fuoco, cardinale)
   *   Mercurio Acquario (aria, fisso)   Urano Vergine (terra, mobile)
   *   Venere Acquario (aria, fisso)     Nettuno Scorpione (acqua, fisso)
   *   Marte Ariete (fuoco, cardinale)   Plutone Vergine (terra, mobile)
   */
  it('conta i dieci pianeti per elemento', () => {
    expect(chart.distribution.planets.elements).toEqual({
      fuoco: 4,
      terra: 2,
      aria: 2,
      acqua: 2,
    });
  });

  it('conta i dieci pianeti per modalità', () => {
    expect(chart.distribution.planets.modalities).toEqual({
      cardinale: 2,
      fisso: 5,
      mobile: 3,
    });
  });

  it('conta ogni pianeta una volta sola', () => {
    const gruppo = chart.distribution.planets;
    const somma = (valori: Record<string, number>) =>
      Object.values(valori).reduce((a, b) => a + b, 0);

    expect(gruppo.counted).toHaveLength(10);
    expect(somma(gruppo.elements)).toBe(10);
    expect(somma(gruppo.modalities)).toBe(10);
    expect(new Set(gruppo.counted).size).toBe(10);
  });

  // ASC 10°30' Leone (fuoco, fisso), MC 29°04' Ariete (fuoco, cardinale).
  it('conta gli assi del tema', () => {
    expect(chart.distribution.angles.elements.fuoco).toBe(2);
    expect(chart.distribution.angles.modalities).toEqual({
      cardinale: 1,
      fisso: 1,
      mobile: 0,
    });
  });

  it('include la Parte di Fortuna fra i punti', () => {
    expect(chart.distribution.points.counted).toContain('fortuna');
  });

  it('non conta niente in `counted` che non sia nella carta', () => {
    const tutti = [
      ...chart.distribution.planets.counted,
      ...chart.distribution.points.counted,
    ];
    const presenti = new Set<string>([
      ...chart.bodies.map((body) => body.id),
      ...(chart.partOfFortune ? ['fortuna'] : []),
    ]);

    for (const id of tutti) expect(presenti.has(id), id).toBe(true);
  });
});

describe('la distribuzione senza ora di nascita', () => {
  const chart = computeNatalChart({ ...NASCITA, time: undefined });

  it('lascia vuoto il gruppo degli assi', () => {
    expect(chart.distribution.angles.counted).toEqual([]);
    expect(chart.distribution.angles.elements.fuoco).toBe(0);
  });

  it('conta comunque i pianeti', () => {
    expect(chart.distribution.planets.counted).toHaveLength(10);
  });

  it('non conta la Parte di Fortuna, che senza Ascendente non esiste', () => {
    expect(chart.distribution.points.counted).not.toContain('fortuna');
  });
});

describe('la distribuzione del cielo di un istante', () => {
  const momento = { date: '2026-08-15', time: '09:00', timezone: 'Europe/Rome' };

  it('conta i pianeti anche senza luogo', () => {
    const sky = computeSky(momento);

    expect(sky.distribution.planets.counted).toHaveLength(10);
    expect(sky.distribution.angles.counted).toEqual([]);
  });

  it('conta gli assi quando il luogo li rende calcolabili', () => {
    const sky = computeSky(momento, { place: { latitude: 40.8518, longitude: 14.2681 } });

    expect(sky.distribution.angles.counted).toEqual(['ascendente', 'medio-cielo']);
  });
});
