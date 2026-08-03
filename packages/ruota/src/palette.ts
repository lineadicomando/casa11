/**
 * I colori del disegno, in esadecimale.
 *
 * Nella pagina i colori della ruota sono `var(--elemento-fuoco)` e simili, e
 * `app.css` ne tiene due per ciascuno dentro `light-dark()`: là a risolverli è
 * il browser, che sa quale aspetto è in uso. Fuori dalla pagina non c'è
 * nessuno che lo sappia, e una `var()` non risolta non è un colore sbagliato —
 * è nessun colore, e l'SVG esce nero su nero.
 *
 * Qui le due metà di ogni `light-dark()` diventano due palette complete. I
 * valori sono gli stessi di `app.css` e vanno tenuti allineati a quelli: sono
 * scelti per stare sopra 4,5:1 sul proprio fondo, e ritoccarne uno solo da un
 * lato romperebbe il contrasto dall'altro.
 */

import type { AspectId, Element } from './types.js';

export interface Palette {
  /** Il foglio su cui la ruota è disegnata. Un file trasparente perde i glifi. */
  sfondo: string;
  testo: string;
  testoTenue: string;
  /** Assi e cuspidi angolari, e i corpi in transito. */
  accento: string;
  /** L'impalcatura: cerchi e tacche di grado. Si deve vedere, non leggere. */
  quadrante: string;
  /** Ciò che porta un dato: trattini di longitudine e cuspidi non angolari. */
  quadranteForte: string;
  elementi: Readonly<Record<Element, string>>;
  aspetti: Readonly<Record<AspectId, string>>;
}

export const CHIARA: Palette = {
  sfondo: '#faf8f4',
  testo: '#2b2a26',
  testoTenue: '#6f6a60',
  accento: '#b4442a',
  quadrante: '#a39e97',
  quadranteForte: '#8b8478',
  elementi: {
    fuoco: '#b8492a',
    terra: '#5f7440',
    aria: '#8a6a12',
    acqua: '#39658a',
  },
  aspetti: {
    congiunzione: '#5f5748',
    opposizione: '#b34728',
    quadrato: '#b34728',
    trigono: '#39658a',
    sestile: '#39658a',
    semisestile: '#6c6351',
    quinconce: '#6c6351',
    semiquadrato: '#6c6351',
    sesquiquadrato: '#6c6351',
  },
};

export const SCURA: Palette = {
  sfondo: '#1a1917',
  testo: '#ebe7de',
  testoTenue: '#9d968a',
  accento: '#d9704f',
  quadrante: '#5a5955',
  quadranteForte: '#736f68',
  elementi: {
    fuoco: '#e08160',
    terra: '#9ab471',
    aria: '#d4ae3a',
    acqua: '#7aa8cc',
  },
  aspetti: {
    congiunzione: '#a49a88',
    opposizione: '#e08160',
    quadrato: '#e08160',
    trigono: '#7aa8cc',
    sestile: '#7aa8cc',
    semisestile: '#9b917e',
    quinconce: '#9b917e',
    semiquadrato: '#9b917e',
    sesquiquadrato: '#9b917e',
  },
};

export type NomeTema = 'chiaro' | 'scuro';

/**
 * Il chiaro è il valore predefinito e non è una preferenza estetica: un
 * disegno esce quasi sempre per essere stampato o incollato in un documento,
 * e là il fondo è bianco.
 */
export function paletteDi(tema: NomeTema = 'chiaro'): Palette {
  return tema === 'scuro' ? SCURA : CHIARA;
}
