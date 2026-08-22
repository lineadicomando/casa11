/**
 * Il cielo che compare dietro la pagina quando si fa il giro intero del
 * pulsante dell'aspetto.
 *
 * **Non è astronomia, ed è deliberato.** Le costellazioni qui dentro hanno la
 * forma giusta e nient'altro: nessuna coordinata vera, nessuna stagione,
 * nessun moto che corrisponda a qualcosa. È lo stesso confine che tiene
 * `core` lontano dall'interpretazione, guardato dall'altra parte — là si
 * calcola e non si racconta, qui si disegna e non si calcola. Un ornamento che
 * fingesse di essere un dato sarebbe la cosa peggiore che questo file possa
 * diventare.
 *
 * Quel che sta qui è puro — numeri e geometria — perché è la parte che si può
 * sbagliare e quindi si può provare. Il `<canvas>` che la dipinge, il tempo che
 * scorre e la scheda che passa in secondo piano stanno in
 * `CieloStellato.svelte`.
 */

import { COLOR_SCHEMES } from './color-scheme';

/** Un punto qualunque, in pixel o in frazioni a seconda di chi lo tiene. */
export interface Punto {
  x: number;
  y: number;
}

/**
 * Una figura del cielo: le sue stelle in un riquadro unitario e le linee che
 * le uniscono.
 *
 * Le coordinate vanno da 0 a 1 sul lato lungo e stanno dentro il riquadro sul
 * corto: la proporzione della figura è quella che le danno i suoi punti, e chi
 * la disegna la scala con un fattore solo per non deformarla.
 */
export interface Costellazione {
  nome: string;
  stelle: readonly Punto[];
  /** Coppie di indici dentro `stelle`. */
  segmenti: readonly (readonly [number, number])[];
}

/**
 * Le sei che si riconoscono a colpo d'occhio.
 *
 * Il criterio non è la brillantezza né la stagione: è che la sagoma si legga
 * anche piccola e storta in un angolo dello schermo. Un carro, una W, una
 * croce, una cintura di tre stelle in fila, un uncino, una coppa — chi le
 * conosce le nomina, chi non le conosce vede comunque delle forme e non del
 * rumore.
 */
export const COSTELLAZIONI: readonly Costellazione[] = [
  {
    nome: 'Orsa Maggiore',
    stelle: [
      { x: 0.0, y: 0.3 },
      { x: 0.15, y: 0.22 },
      { x: 0.3, y: 0.19 },
      { x: 0.46, y: 0.26 },
      { x: 0.53, y: 0.5 },
      { x: 0.79, y: 0.54 },
      { x: 0.84, y: 0.28 },
    ],
    segmenti: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    nome: 'Cassiopea',
    stelle: [
      { x: 0.0, y: 0.18 },
      { x: 0.23, y: 0.54 },
      { x: 0.5, y: 0.16 },
      { x: 0.76, y: 0.56 },
      { x: 1.0, y: 0.12 },
    ],
    segmenti: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    nome: 'Orione',
    stelle: [
      { x: 0.2, y: 0.06 },
      { x: 0.72, y: 0.1 },
      { x: 0.34, y: 0.46 },
      { x: 0.46, y: 0.49 },
      { x: 0.58, y: 0.52 },
      { x: 0.26, y: 0.9 },
      { x: 0.78, y: 0.94 },
    ],
    segmenti: [
      [0, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
    ],
  },
  {
    nome: 'Cigno',
    stelle: [
      { x: 0.52, y: 0.0 },
      { x: 0.5, y: 0.4 },
      { x: 0.46, y: 1.0 },
      { x: 0.0, y: 0.48 },
      { x: 1.0, y: 0.34 },
    ],
    segmenti: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
  },
  {
    nome: 'Scorpione',
    stelle: [
      { x: 0.04, y: 0.04 },
      { x: 0.19, y: 0.11 },
      { x: 0.33, y: 0.16 },
      { x: 0.43, y: 0.33 },
      { x: 0.5, y: 0.53 },
      { x: 0.55, y: 0.72 },
      { x: 0.69, y: 0.84 },
      { x: 0.85, y: 0.79 },
      { x: 0.92, y: 0.62 },
    ],
    segmenti: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ],
  },
  {
    nome: 'Corona Boreale',
    stelle: [
      { x: 0.0, y: 0.1 },
      { x: 0.13, y: 0.42 },
      { x: 0.32, y: 0.6 },
      { x: 0.55, y: 0.62 },
      { x: 0.76, y: 0.48 },
      { x: 0.93, y: 0.2 },
    ],
    segmenti: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },
];

/** Una stella del fondo: posizione in frazioni del riquadro, non in pixel. */
export interface Stella {
  x: number;
  y: number;
  /** Raggio in pixel a densità 1. */
  raggio: number;
  /** Quanto brilla da ferma, da 0 a 1. */
  luce: number;
  /** Da che punto del suo scintillio comincia: senza, il cielo pulserebbe tutto insieme. */
  fase: number;
  /** Quanto è veloce a scintillare. Le stelle non respirano allo stesso ritmo. */
  ritmo: number;
}

/** Una costellazione posata sullo schermo: angolo alto-sinistro e scala, in pixel. */
export interface Figura {
  costellazione: Costellazione;
  x: number;
  y: number;
  /** Il lato del riquadro unitario, in pixel. */
  lato: number;
}

/**
 * Sorteggio riproducibile.
 *
 * `Math.random` andrebbe bene per un fondale, ma non per un test: qui il seme
 * si può fissare, e allora «le figure non si sovrappongono» diventa una cosa
 * che si verifica invece che una cosa che si spera. È mulberry32, trenta righe
 * di aritmetica a 32 bit — non serve altro per spargere dei puntini.
 */
export function sorteggio(seme: number): () => number {
  let stato = seme >>> 0;
  return () => {
    stato = (stato + 0x6d2b79f5) >>> 0;
    let t = stato;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fra(caso: () => number, minimo: number, massimo: number): number {
  return minimo + caso() * (massimo - minimo);
}

/**
 * Quante stelle per un cielo di quest'area, in pixel quadri.
 *
 * Una densità e non un numero: lo stesso conteggio che riempie un telefono
 * lascia vuoto uno schermo largo, e quello che riempie lo schermo largo fa del
 * telefono una zuppa di puntini. Il minimo e il massimo servono ai due estremi,
 * dove la proporzione da sola darebbe un pugno di stelle o qualche migliaio.
 */
export function quanteStelle(larghezza: number, altezza: number): number {
  const dalla = Math.round((larghezza * altezza) / 5200);
  return Math.min(460, Math.max(90, dalla));
}

export function seminaStelle(quante: number, caso: () => number): Stella[] {
  const stelle: Stella[] = [];
  for (let i = 0; i < quante; i += 1) {
    stelle.push({
      x: caso(),
      y: caso(),
      // Poche grosse e molte minute: elevando al cubo un numero fra 0 e 1 la
      // maggioranza finisce vicino al minimo, ed è quello che fa un cielo —
      // qualche stella che si vede e una polvere che si intuisce.
      raggio: 0.35 + caso() ** 3 * 1.35,
      luce: fra(caso, 0.22, 0.92),
      fase: caso() * Math.PI * 2,
      ritmo: fra(caso, 0.35, 1.1),
    });
  }
  return stelle;
}

/**
 * Posa le costellazioni sullo schermo senza farle accavallare.
 *
 * Lo schermo si divide in celle e ogni figura ne prende una, sorteggiata: è il
 * modo più semplice di garantire che due sagome non si sovrappongano, e la
 * garanzia vale per costruzione invece che per tentativi. Dentro la cella la
 * figura si sposta e si ridimensiona quel tanto che basta perché la griglia non
 * si veda; il margine che le si lascia intorno è ciò che tiene lo scarto dentro
 * la cella.
 *
 * Le figure sono più delle celle solo se lo schermo è minuscolo: in quel caso
 * ne entrano quante ce ne stanno, e le altre restano fuori per questa volta.
 */
export function disponiFigure(
  larghezza: number,
  altezza: number,
  caso: () => number,
  costellazioni: readonly Costellazione[] = COSTELLAZIONI,
): Figura[] {
  const colonne = Math.max(1, Math.min(3, Math.floor(larghezza / 320)));
  const righe = Math.max(1, Math.min(3, Math.floor(altezza / 260)));
  const celle: number[] = [];
  for (let i = 0; i < colonne * righe; i += 1) celle.push(i);

  // Fisher-Yates: le costellazioni non devono cadere sempre nello stesso
  // angolo, e togliere una cella dal mazzo è ciò che impedisce a due figure di
  // finire nella stessa.
  for (let i = celle.length - 1; i > 0; i -= 1) {
    const j = Math.floor(caso() * (i + 1));
    [celle[i], celle[j]] = [celle[j]!, celle[i]!];
  }

  const larghezzaCella = larghezza / colonne;
  const altezzaCella = altezza / righe;
  const figure: Figura[] = [];

  for (const [indice, costellazione] of costellazioni.entries()) {
    const cella = celle[indice];
    if (cella === undefined) break;

    // Il lato non supera mai i tre quarti della cella più stretta: il resto è
    // il margine che permette alla figura di spostarsi restando a casa sua.
    const massimo = Math.min(larghezzaCella, altezzaCella) * 0.72;
    const lato = massimo * fra(caso, 0.72, 1);
    const colonna = cella % colonne;
    const riga = Math.floor(cella / colonne);

    figure.push({
      costellazione,
      x: colonna * larghezzaCella + caso() * (larghezzaCella - lato),
      y: riga * altezzaCella + caso() * (altezzaCella - lato),
      lato,
    });
  }

  return figure;
}

/**
 * Quanto cielo scorre in un secondo, in frazioni della larghezza.
 *
 * Un giro in poco più di tre minuti. È la misura di tutto l'effetto: più
 * veloce e diventa uno screensaver che chiede attenzione mentre si legge una
 * tabella di aspetti, più lento e sembra un'immagine ferma.
 */
export const DERIVA = 0.0052;

/** Riporta dentro `[minimo, minimo + ampiezza)` quel che ne è uscito da un lato. */
export function avvolgi(valore: number, minimo: number, ampiezza: number): number {
  return (((valore - minimo) % ampiezza) + ampiezza) % ampiezza + minimo;
}

/** Di quanto è arrivata la deriva, in frazioni di larghezza, dopo `secondi`. */
export function deriva(secondi: number): number {
  return secondi * DERIVA;
}

/** Quanto una stella scintilla intorno alla propria luce. */
export const SCINTILLIO = 0.3;

/** La luce di una stella in questo istante, fra 0 e 1. */
export function luce(stella: Stella, secondi: number): number {
  const onda = Math.sin(secondi * stella.ritmo + stella.fase);
  return Math.min(1, Math.max(0, stella.luce + onda * SCINTILLIO * stella.luce));
}

/** Un colore come terna, perché lo scintillio ne cambia la trasparenza a ogni fotogramma. */
export type Colore = readonly [number, number, number];

export interface Tavolozza {
  /** Il fondo, in alto e in basso: fra i due ci va una sfumatura verticale. */
  cieloAlto: Colore;
  cieloBasso: Colore;
  /** La polvere di stelle. */
  stella: Colore;
  /** Le stelle che fanno parte di una figura: si devono distinguere dal fondo. */
  figura: Colore;
  /** Le linee fra loro. */
  linea: Colore;
  /**
   * Quanto sono marcate quelle linee.
   *
   * Sta nella tavolozza e non fra le costanti perché una trama d'oro che sul
   * nero è già una linea, sulla carta è ancora un'ombra: alla stessa
   * trasparenza le due figure non si somigliano affatto.
   */
  trama: number;
  /**
   * Quanto tutto l'insieme è forte, da 0 a 1.
   *
   * Serve al fondo chiaro, dove il cielo è fatto di segni scuri su carta e non
   * di luci sul nero: la stessa opacità che sul nero è una stella, sulla crema
   * è una macchia.
   */
  intensita: number;
}

/**
 * Due cieli, uno per aspetto.
 *
 * **Scuro**: la notte. Il fondo parte da un nero appena più profondo di
 * `--sfondo` e ci ritorna in basso, così il cielo non è un riquadro incollato
 * sopra la pagina ma la pagina stessa che si apre; le stelle hanno il colore
 * del testo, le costellazioni quello dell'oro del marchio.
 *
 * **Chiaro**: una carta celeste stampata. Sulla crema una notte vera sarebbe un
 * buco nero in mezzo al foglio, quindi il cielo si rovescia — inchiostro d'oro
 * in ombra su carta, come una tavola in un libro di astronomia. Gli stessi due
 * valori di `--oro` in `app.css`, che è il colore che questo sito usa da sempre
 * per il cielo.
 */
export const TAVOLOZZE: Record<'light' | 'dark', Tavolozza> = {
  dark: {
    cieloAlto: [8, 8, 12],
    cieloBasso: [26, 25, 23],
    stella: [235, 231, 222],
    figura: [250, 178, 25],
    linea: [250, 178, 25],
    trama: 0.3,
    intensita: 1,
  },
  light: {
    cieloAlto: [216, 204, 180],
    cieloBasso: [250, 248, 244],
    stella: [111, 106, 96],
    figura: [154, 102, 8],
    linea: [154, 102, 8],
    trama: 0.5,
    intensita: 0.9,
  },
};

/** Un colore e la sua trasparenza, pronti per il `canvas`. */
export function tinta(colore: Colore, alfa: number): string {
  const a = Math.min(1, Math.max(0, alfa));
  return `rgba(${colore[0]}, ${colore[1]}, ${colore[2]}, ${a.toFixed(3)})`;
}

/**
 * Quanti clic fanno un giro del pulsante dell'aspetto.
 *
 * Non è tre per scelta: è la lunghezza del ciclo. Chi lo preme tante volte
 * quante sono le luci torna esattamente da dove era partito — la pagina ha lo
 * stesso aspetto di prima, e proprio lì compare qualcos'altro. Se un giorno gli
 * aspetti diventassero quattro, l'easter egg si aspetterebbe quattro clic senza
 * che nessuno debba ricordarsi di venirlo a cambiare.
 */
export const GIRO = COLOR_SCHEMES.length;

/**
 * Quanto può passare fra un clic e il successivo perché contino come un gesto
 * solo.
 *
 * Senza questo limite basterebbe cambiare aspetto tre volte in mezza giornata
 * per ritrovarsi il cielo addosso senza capire da dove sia arrivato. Un secondo
 * e due decimi è largo per chi arriva da tastiera e stretto abbastanza da non
 * raccogliere due ripensamenti lontani.
 */
export const RESPIRO = 1200;

/**
 * A che punto del giro siamo, dopo un clic arrivato all'istante `ora`.
 *
 * Riparte da uno appena il gesto si interrompe: un clic isolato non è il primo
 * di una serie finché non ne arriva un altro subito dopo.
 */
export function contaScatti(scatti: number, ultimo: number | null, ora: number): number {
  if (ultimo === null || ora - ultimo > RESPIRO) return 1;
  return scatti + 1;
}
