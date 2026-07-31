import type { CelestialBody, NatalChart, TransitChart } from '@undicesimacasa/core';
import { describe, expect, it } from 'vitest';
import {
  CENTER,
  natalPointLongitude,
  natalWheelPoints,
  polar,
  radiiFor,
  spread,
  transitWheelPoints,
  type WheelPoint,
} from './wheel';

function body(id: string, longitude: number, extra: Partial<CelestialBody> = {}): CelestialBody {
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
    ...extra,
  } as CelestialBody;
}

function point(id: string, longitude: number): WheelPoint {
  return { id, glyph: '☉', longitude, retrograde: false, label: id };
}

describe('polar', () => {
  it('pone a sinistra la longitudine su cui è ruotata la carta', () => {
    // Ore 9: è lì che va l'Ascendente, per convenzione della carta occidentale.
    const ascendente = polar(123, 100, 123);

    expect(ascendente.x).toBeCloseTo(CENTER - 100, 6);
    expect(ascendente.y).toBeCloseTo(CENTER, 6);
  });

  it('fa scendere le longitudini crescenti verso il Fondo Cielo', () => {
    // Un quarto di zodiaco dopo l'Ascendente si è in fondo alla ruota.
    const quarto = polar(90, 100, 0);

    expect(quarto.x).toBeCloseTo(CENTER, 6);
    expect(quarto.y).toBeCloseTo(CENTER + 100, 6);
  });

  it('tiene i punti sul cerchio del raggio dato', () => {
    for (const longitude of [0, 47, 180, 359.5]) {
      const { x, y } = polar(longitude, 250, 33);
      expect(Math.hypot(x - CENTER, y - CENTER)).toBeCloseTo(250, 6);
    }
  });
});

describe('spread', () => {
  it('non tocca i glifi già distanti', () => {
    const placed = spread([point('a', 10), point('b', 100)], 7);

    expect(placed.map((p) => p.display)).toEqual([10, 100]);
  });

  it('allontana i glifi troppo vicini fino alla distanza minima', () => {
    const placed = spread([point('a', 100), point('b', 102)], 7);

    expect(placed[1]!.display - placed[0]!.display).toBeCloseTo(7, 6);
    // Restano centrati sulla posizione che occupavano.
    expect((placed[0]!.display + placed[1]!.display) / 2).toBeCloseTo(101, 6);
  });

  it('lascia intatta la longitudine vera', () => {
    // Il trattino indicatore e le linee degli aspetti puntano a quella: un
    // glifo spostato non deve spostare anche la posizione che dichiara.
    const placed = spread([point('a', 100), point('b', 102)], 7);

    expect(placed.map((p) => p.point.longitude)).toEqual([100, 102]);
  });

  it('separa anche a cavallo dello zero dell Ariete', () => {
    const placed = spread([point('a', 359), point('b', 1)], 7);
    const [first, second] = placed.map((p) => p.display) as [number, number];
    const gap = (second - first + 360) % 360;

    expect(Math.min(gap, 360 - gap)).toBeCloseTo(7, 6);
  });

  it('distanzia uno stellium senza sovrapposizioni residue', () => {
    const placed = spread(
      [point('a', 100), point('b', 101), point('c', 102), point('d', 103)],
      7,
    );

    for (let i = 1; i < placed.length; i += 1) {
      expect(placed[i]!.display - placed[i - 1]!.display).toBeGreaterThanOrEqual(7 - 1e-6);
    }
  });

  it('regge un punto solo e nessun punto', () => {
    expect(spread([point('a', 10)], 7).map((p) => p.display)).toEqual([10]);
    expect(spread([], 7)).toEqual([]);
  });
});

describe('radiiFor', () => {
  it('stringe gli anelli interni per far posto ai transiti', () => {
    const semplice = radiiFor(false);
    const doppia = radiiFor(true);

    expect(semplice.outerBodies).toBeUndefined();
    expect(doppia.outerBodies).toBeGreaterThan(doppia.houses);
    expect(doppia.bodies).toBeLessThan(semplice.bodies);
    expect(doppia.aspects).toBeLessThan(semplice.aspects);
  });

  it('tiene i transitanti dentro la fascia dei segni', () => {
    const doppia = radiiFor(true);

    expect(doppia.outerBodies!).toBeLessThan(doppia.zodiacInner);
    expect(doppia.houseSpanOuter).toBeLessThan(doppia.outerBodies!);
  });

  it('chiede più gradi ai glifi dell anello più stretto', () => {
    // A parità di angolo, un raggio minore lascia un arco più corto.
    const doppia = radiiFor(true);

    expect(doppia.separation).toBeGreaterThan(doppia.outerSeparation);
  });
});

describe('natalWheelPoints', () => {
  const chart = {
    bodies: [body('sole', 10, { name: 'Sole', house: 3, sign: 'ariete', signDegree: 10 })],
    partOfFortune: { longitude: 200, sign: 'bilancia', signDegree: 20, house: 9 },
  } as unknown as NatalChart;

  it('descrive a parole ogni punto, per chi non vede il disegno', () => {
    const [sole] = natalWheelPoints(chart);

    expect(sole!.label).toBe('Sole a 10 gradi ariete, casa 3');
  });

  it('aggiunge la Parte di Fortuna, che non è un corpo', () => {
    const fortuna = natalWheelPoints(chart).find((p) => p.id === 'fortuna');

    expect(fortuna?.longitude).toBe(200);
    expect(fortuna?.label).toContain('Parte di Fortuna');
  });

  it('la omette quando il tema non ce l ha', () => {
    const senza = { bodies: chart.bodies } as unknown as NatalChart;

    expect(natalWheelPoints(senza).some((p) => p.id === 'fortuna')).toBe(false);
  });
});

describe('transitWheelPoints', () => {
  it('dichiara nell etichetta che il corpo è in transito', () => {
    const transits = {
      transiting: [body('marte', 50, { name: 'Marte', house: 11, retrograde: true, signDegree: 20 })],
    } as unknown as TransitChart;

    const [marte] = transitWheelPoints(transits);

    expect(marte!.label).toContain('in transito');
    expect(marte!.retrograde).toBe(true);
  });
});

describe('natalPointLongitude', () => {
  const chart = {
    bodies: [body('sole', 10)],
    angles: { ascendant: 100, midheaven: 10, descendant: 280, imumCoeli: 190 },
    partOfFortune: { longitude: 200 },
  } as unknown as NatalChart;

  it('risolve i corpi e gli assi', () => {
    expect(natalPointLongitude(chart, 'sole')).toBe(10);
    expect(natalPointLongitude(chart, 'ascendente')).toBe(100);
    expect(natalPointLongitude(chart, 'fondo-cielo')).toBe(190);
    expect(natalPointLongitude(chart, 'fortuna')).toBe(200);
  });

  it('tace sugli assi di un tema senza ora, invece di dire zero', () => {
    // Una longitudine inventata darebbe una linea tirata verso 0° Ariete,
    // che sembra un aspetto e non lo è.
    const senzaOra = { bodies: chart.bodies } as unknown as NatalChart;

    expect(natalPointLongitude(senzaOra, 'ascendente')).toBeUndefined();
    expect(natalPointLongitude(senzaOra, 'chirone')).toBeUndefined();
  });
});
