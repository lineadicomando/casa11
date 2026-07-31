/**
 * L'asse dei Nodi, letto una volta sola.
 *
 * I due nodi sono opposti per definizione, quindi ogni contatto a uno è anche
 * un contatto all'altro: un quadrato al Nodo Nord è un quadrato al Nodo Sud,
 * una congiunzione all'uno è un'opposizione all'altro. Nell'elenco degli
 * aspetti la coppia compare due volte e descrive un fatto solo.
 *
 * Peggio del raddoppio è la sua **incoerenza**: le due righe cadono sotto
 * nomi di aspetto diversi, e ogni nome ha la sua orbita. Un trigono al Nodo
 * Nord con 2°24' di scarto è elencato; il sestile al Nodo Sud che è lo stesso
 * identico contatto no, perché al sestile si concedono due gradi. Lo stesso
 * fatto vale una riga o due a seconda di come si chiama il suo riflesso.
 *
 * I dati restano completi — l'API li dà entrambi, e chi calcola può volerli —
 * ma la tabella ne mostra uno: questa è una scelta di lettura, non di calcolo,
 * e sta perciò nell'interfaccia.
 */

import type { AspectId, TransitAspect } from '@undicesimacasa/core';

/**
 * Quale delle due letture tenere, dalla più parlante alla meno.
 *
 * «Saturno congiunto al Nodo Sud» dice più di «Saturno opposto al Nodo Nord»,
 * benché siano la stessa cosa: la congiunzione nomina il punto che il
 * transito sta toccando davvero.
 */
const PREFERENZA: readonly AspectId[] = [
  'congiunzione',
  'opposizione',
  'quadrato',
  'trigono',
  'sestile',
  'quinconce',
  'semisestile',
  'sesquiquadrato',
  'semiquadrato',
];

/** Scarto entro cui due orbite sono la stessa orbita. */
const EPSILON = 1e-6;

export function collapseNodalAxis(aspects: readonly TransitAspect[]): TransitAspect[] {
  return aspects.filter((aspect) => {
    if (aspect.natal !== 'nodo-nord' && aspect.natal !== 'nodo-sud') return true;

    const mirror = aspects.find(
      (other) =>
        other !== aspect &&
        other.transiting === aspect.transiting &&
        other.natal === (aspect.natal === 'nodo-nord' ? 'nodo-sud' : 'nodo-nord') &&
        Math.abs(other.orb - aspect.orb) < EPSILON,
    );

    // Senza riflesso non c'è nulla da accorpare: la riga resta.
    if (!mirror) return true;

    const rank = (a: TransitAspect): number => PREFERENZA.indexOf(a.aspect);
    // A parità di nome — il quadrato, che si riflette in sé stesso — decide
    // il Nodo Nord, per avere un criterio e non un caso.
    return rank(aspect) === rank(mirror)
      ? aspect.natal === 'nodo-nord'
      : rank(aspect) < rank(mirror);
  });
}

/** `true` se l'accorpamento ha tolto qualcosa: la tabella lo dichiara. */
export function hasCollapsedNodalAxis(aspects: readonly TransitAspect[]): boolean {
  return collapseNodalAxis(aspects).length < aspects.length;
}
