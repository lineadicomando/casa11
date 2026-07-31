import type { AspectId, BodyId, NatalPointId, TransitAspect } from '@undicesimacasa/core';
import { describe, expect, it } from 'vitest';
import { byOrb, collapseNodalAxis } from './nodal-axis';

function aspect(
  transiting: BodyId,
  name: AspectId,
  natal: NatalPointId,
  orb: number,
): TransitAspect {
  return {
    aspect: name,
    angle: 0,
    transiting,
    natal,
    orb,
    applying: true,
    retrograde: false,
  };
}

describe('collapseNodalAxis', () => {
  it('tiene la lettura più parlante fra le due', () => {
    // Stesso contatto: il transito sta toccando il Nodo Sud, e dirlo così
    // significa di più che chiamarlo opposizione al Nodo Nord.
    const righe = collapseNodalAxis([
      aspect('saturno', 'opposizione', 'nodo-nord', 1.2),
      aspect('saturno', 'congiunzione', 'nodo-sud', 1.2),
    ], byOrb);

    expect(righe).toHaveLength(1);
    expect(righe[0]).toMatchObject({ aspect: 'congiunzione', natal: 'nodo-sud' });
  });

  it('preferisce il trigono al sestile che gli fa da riflesso', () => {
    const righe = collapseNodalAxis([
      aspect('sole', 'trigono', 'nodo-nord', 1),
      aspect('sole', 'sestile', 'nodo-sud', 1),
    ], byOrb);

    expect(righe.map((r) => r.aspect)).toEqual(['trigono']);
  });

  it('sul quadrato, che si riflette in sé stesso, sceglie il Nodo Nord', () => {
    const righe = collapseNodalAxis([
      aspect('mercurio', 'quadrato', 'nodo-nord', 1.13),
      aspect('mercurio', 'quadrato', 'nodo-sud', 1.13),
    ], byOrb);

    expect(righe).toHaveLength(1);
    expect(righe[0]?.natal).toBe('nodo-nord');
  });

  it('lascia stare la riga che il riflesso non ce l ha', () => {
    // Succede davvero: l'aspetto riflesso può cadere fuori dalla propria
    // orbita, che è più stretta. Allora quella riga è sola e resta.
    const righe = collapseNodalAxis([aspect('sole', 'trigono', 'nodo-nord', 2.4)], byOrb);

    expect(righe).toHaveLength(1);
  });

  it('non accorpa contatti di corpi diversi né orbite diverse', () => {
    const righe = collapseNodalAxis([
      aspect('sole', 'congiunzione', 'nodo-nord', 1),
      aspect('marte', 'opposizione', 'nodo-sud', 1),
      aspect('venere', 'congiunzione', 'nodo-nord', 1),
      aspect('venere', 'opposizione', 'nodo-sud', 1.9),
    ], byOrb);

    expect(righe).toHaveLength(4);
  });

  it('non tocca gli aspetti che non riguardano i nodi', () => {
    const altri = [
      aspect('giove', 'congiunzione', 'ascendente', 0.4),
      aspect('luna', 'quadrato', 'sole', 1.1),
    ];

    expect(collapseNodalAxis(altri, byOrb)).toEqual(altri);
  });
});
