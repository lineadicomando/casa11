/**
 * La palette che segue il tema della pagina.
 *
 * `quadroSvg` scrive i colori nel documento invece di ereditarli, ed è giusto
 * per un file: fuori dalla pagina non c'è nessuna custom property da
 * risolvere. Ma **dentro** la pagina quel comportamento è sbagliato — un
 * quadro coi colori del tema chiaro su un fondo scuro si legge male e non
 * cambia quando si preme il pulsante della luce.
 *
 * I valori di una `Palette` sono stringhe di colore, e in un SVG inline
 * `var(--x)` è una stringa di colore valida: passando le custom property della
 * pagina il disegno segue il tema da sé, senza leggere `prefers-color-scheme`,
 * senza osservare l'attributo su `<html>` e senza ricalcolarsi a ogni scatto.
 *
 * È la stessa cosa che `ChartWheel.svelte` fa scrivendo `var()` a mano nei
 * propri nodi: là il disegno è del componente, qui viene da una funzione, e la
 * palette è il punto in cui glielo si dice.
 *
 * **Non serve a chi scarica il file.** Quello lo disegna il server con `CHIARA`
 * o `SCURA`, che sono colori veri.
 */

import type { Palette } from '@undicesimacasa/ruota';

export const PALETTE_PAGINA: Palette = {
  sfondo: 'var(--sfondo)',
  testo: 'var(--testo)',
  testoTenue: 'var(--testo-tenue)',
  accento: 'var(--accento)',
  quadrante: 'var(--quadrante)',
  quadranteForte: 'var(--quadrante-forte)',
  elementi: {
    fuoco: 'var(--elemento-fuoco)',
    terra: 'var(--elemento-terra)',
    aria: 'var(--elemento-aria)',
    acqua: 'var(--elemento-acqua)',
  },
  // Il quadro non disegna aspetti — le drishti si contano a segni interi, non
  // sono linee — ma il tipo li vuole, e lasciarli vuoti sarebbe una palette a
  // metà per il prossimo che la riusa.
  aspetti: {
    congiunzione: 'var(--aspetto-neutro)',
    opposizione: 'var(--aspetto-tensione)',
    quadrato: 'var(--aspetto-tensione)',
    trigono: 'var(--aspetto-fluidita)',
    sestile: 'var(--aspetto-fluidita)',
    semisestile: 'var(--aspetto-minore)',
    quinconce: 'var(--aspetto-minore)',
    semiquadrato: 'var(--aspetto-minore)',
    sesquiquadrato: 'var(--aspetto-minore)',
  },
};
