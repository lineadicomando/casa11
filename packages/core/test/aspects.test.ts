import { describe, expect, it } from 'vitest';
import { computeAspects, computeCrossAspects } from '../src/aspects.js';
import { degreeInSign, signOf } from '../src/math.js';
import type { AspectPoint, BodyId, CelestialBody } from '../src/types.js';

/**
 * Corpi sintetici invece che calcolati: gli aspetti sono geometria pura, e
 * posizioni scelte a tavolino rendono le soglie delle orbite verificabili
 * al grado — cosa che un tema reale non permette.
 */
function body(id: BodyId, longitude: number, speed = 1): CelestialBody {
  return {
    id,
    name: id,
    longitude,
    latitude: 0,
    distance: 1,
    speed,
    retrograde: speed < 0,
    sign: signOf(longitude),
    signDegree: degreeInSign(longitude),
  };
}

function point<Id extends string>(id: Id, longitude: number, speed = 0): AspectPoint<Id> {
  return { id, longitude, speed };
}

describe('computeAspects', () => {
  it('riconosce un aspetto e ne misura lo scarto dall angolo esatto', () => {
    const aspects = computeAspects([body('marte', 10), body('giove', 128)]);

    expect(aspects).toHaveLength(1);
    expect(aspects[0]).toMatchObject({ aspect: 'trigono', from: 'marte', to: 'giove', angle: 120 });
    expect(aspects[0]?.orb).toBeCloseTo(2, 6);
  });

  it('tace quando la separazione eccede l orbita prevista', () => {
    // Sestile a 60°, orbita 5: a 66° la coppia non è in aspetto.
    expect(computeAspects([body('marte', 10), body('giove', 76)])).toHaveLength(0);
  });

  it('allarga l orbita quando la coppia comprende un luminare', () => {
    // Congiunzione: orbita 8, più 2 per ciascun luminare della coppia.
    expect(computeAspects([body('sole', 10), body('marte', 19)])).toHaveLength(1);
    expect(computeAspects([body('venere', 10), body('marte', 19)])).toHaveLength(0);
  });

  it('non produce aspetti fra Nodo Nord e Nodo Sud', () => {
    const aspects = computeAspects([body('nodo-nord', 10), body('nodo-sud', 190)], {
      minorAspects: true,
    });

    expect(aspects).toHaveLength(0);
  });

  it('omette gli aspetti minori se non richiesti', () => {
    const bodies = [body('marte', 10), body('giove', 40)];

    expect(computeAspects(bodies)).toHaveLength(0);
    expect(computeAspects(bodies, { minorAspects: true })[0]?.aspect).toBe('semisestile');
  });

  it('ordina per orbita crescente', () => {
    const aspects = computeAspects([
      body('marte', 0),
      body('giove', 94), // quadrato, orbita 4
      body('saturno', 181), // opposizione, orbita 1
      body('urano', 62), // sestile, orbita 2
    ]);

    expect(aspects.map((a) => a.orb)).toEqual([...aspects.map((a) => a.orb)].sort((x, y) => x - y));
    expect(aspects[0]?.to).toBe('saturno');
  });
});

describe('computeCrossAspects', () => {
  it('confronta ogni punto del primo insieme con ognuno del secondo', () => {
    const aspects = computeCrossAspects(
      [point('sole', 100, 1), point('marte', 10, 0.5)],
      [point('sole', 100), point('luna', 190)],
    );

    expect(aspects).toHaveLength(4);
    expect(aspects.map((a) => `${a.from}-${a.to}`).sort()).toEqual([
      'marte-luna',
      'marte-sole',
      'sole-luna',
      'sole-sole',
    ]);
  });

  it('riconosce il ritorno di un corpo sulla propria posizione natale', () => {
    const aspects = computeCrossAspects([point('sole', 100, 1)], [point('sole', 100)]);

    expect(aspects[0]).toMatchObject({ aspect: 'congiunzione', from: 'sole', to: 'sole' });
    expect(aspects[0]?.orb).toBeCloseTo(0, 6);
  });

  it('confronta i due nodi fra insiemi diversi, dove non sono ridondanti', () => {
    const aspects = computeCrossAspects([point('nodo-nord', 10, -0.05)], [point('nodo-sud', 10)]);

    expect(aspects[0]?.aspect).toBe('congiunzione');
  });

  it('accetta bersagli che non sono corpi celesti', () => {
    const aspects = computeCrossAspects(
      [point('marte', 100, 0.5)],
      [point('ascendente', 10), point('medio-cielo', 280)],
    );

    expect(aspects.map((a) => a.to).sort()).toEqual(['ascendente', 'medio-cielo']);
  });

  describe('direzione rispetto a un bersaglio fermo', () => {
    const natal = [point('sole', 0)];

    it('è applicativa se il transitante si avvicina all angolo esatto', () => {
      const aspects = computeCrossAspects([point('saturno', 118, 0.03)], natal);
      expect(aspects[0]?.applying).toBe(true);
    });

    it('è separativa se se ne allontana', () => {
      const aspects = computeCrossAspects([point('saturno', 118, -0.03)], natal);
      expect(aspects[0]?.applying).toBe(false);
    });

    it('è applicativa anche in moto retrogrado, se lo scarto si stringe', () => {
      const aspects = computeCrossAspects([point('saturno', 122, -0.03)], natal);
      expect(aspects[0]?.applying).toBe(true);
    });
  });

  it('non produce nulla se uno dei due insiemi è vuoto', () => {
    expect(computeCrossAspects([point('sole', 100, 1)], [])).toHaveLength(0);
    expect(computeCrossAspects([], [point('sole', 100)])).toHaveLength(0);
  });
});
