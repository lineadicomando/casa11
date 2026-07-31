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

import type { AspectId, BodyId, NatalPointId } from '@undicesimacasa/core';

/** Ciò che basta per riconoscere il riflesso di un contatto sull'asse. */
export interface NodalRow {
  transiting: BodyId;
  natal: NatalPointId;
  aspect: AspectId;
}

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

/** Chiave di un aspetto istantaneo: l'orbita, arrotondata al secondo d'arco. */
export function byOrb(row: { orb: number }): string {
  return row.orb.toFixed(4);
}

/** Chiave di un passaggio: l'istante in cui si perfeziona. */
export function byInstant(row: { exact: string }): string {
  return row.exact;
}

/**
 * `key` distingue un contatto dall'altro: due righe sull'asse sono la stessa
 * cosa quando la chiave coincide. Per gli aspetti di un istante è l'orbita,
 * per i passaggi di un calendario è il momento in cui si perfezionano.
 */
export function collapseNodalAxis<T extends NodalRow>(
  rows: readonly T[],
  key: (row: T) => string,
): T[] {
  return rows.filter((aspect) => {
    if (aspect.natal !== 'nodo-nord' && aspect.natal !== 'nodo-sud') return true;

    const mirror = rows.find(
      (other) =>
        other !== aspect &&
        other.transiting === aspect.transiting &&
        other.natal === (aspect.natal === 'nodo-nord' ? 'nodo-sud' : 'nodo-nord') &&
        key(other) === key(aspect),
    );

    // Senza riflesso non c'è nulla da accorpare: la riga resta.
    if (!mirror) return true;

    const rank = (a: T): number => PREFERENZA.indexOf(a.aspect);
    // A parità di nome — il quadrato, che si riflette in sé stesso — decide
    // il Nodo Nord, per avere un criterio e non un caso.
    return rank(aspect) === rank(mirror)
      ? aspect.natal === 'nodo-nord'
      : rank(aspect) < rank(mirror);
  });
}

