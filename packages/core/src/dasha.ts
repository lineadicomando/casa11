/**
 * Le dasha vimshottari: il tempo diviso in periodi retti da un graha.
 *
 * *Vimshottari* vuol dire centoventi, e tanti sono gli anni del ciclo intero.
 * I nove graha se li dividono in parti disuguali e fisse — Ketu 7, Venere 20,
 * Sole 6, Luna 10, Marte 7, Rahu 18, Giove 16, Saturno 19, Mercurio 17 — e la
 * somma fa centoventi esatti. Ogni periodo si suddivide nei nove secondo le
 * stesse proporzioni, e così all'infinito: qui ci si ferma al terzo ordine.
 *
 * Dove la catena cominci lo dice il **nakshatra della Luna alla nascita**;
 * quanto ne resti lo dice il punto esatto in cui la Luna si trovava dentro
 * quel nakshatra. È l'unico calcolo del motore in cui un secondo d'arco vale
 * ore di calendario: 13°20' di nakshatra valgono fino a vent'anni di dasha,
 * quindi un secondo d'arco vale circa tre ore e mezza.
 *
 * **Questa è la cosa più simile a una previsione che il motore emetta**, e
 * resta aritmetica: dice quando comincia un periodo, non che cosa succederà
 * dentro. Il precedente è `TransitPassage`, che da sempre dà istanti futuri
 * esatti. Che cosa significhi un periodo di Saturno è di chi legge.
 */

import { ChartError } from './errors.js';
import { nakshatraOf, NAKSHATRA_SPAN, VIMSHOTTARI_ORDER, requireSidereal } from './nakshatra.js';
import { julianDayToISO } from './roots.js';
import type {
  BodyId,
  DashaPeriod,
  DashaYear,
  NatalChart,
  VimshottariDasha,
  VimshottariOptions,
} from './types.js';

/**
 * Gli anni di ciascun graha. Sommano a centoventi, ed è la sola cosa che di
 * questa tabella si possa verificare senza consultare un libro.
 */
export const VIMSHOTTARI_YEARS: Readonly<Partial<Record<BodyId, number>>> = {
  'nodo-sud': 7,
  venere: 20,
  sole: 6,
  luna: 10,
  marte: 7,
  'nodo-nord': 18,
  giove: 16,
  saturno: 19,
  mercurio: 17,
};

/** Il ciclo intero, in anni. */
export const VIMSHOTTARI_TOTAL = 120;

/** Quanti giorni valga un anno, per ciascuna delle due convenzioni. */
export const DASHA_DAYS_PER_YEAR: Readonly<Record<DashaYear, number>> = {
  solare: 365.25,
  savana: 360,
};

/**
 * La catena vimshottari di un tema.
 *
 * Prende il tema e non i dati di nascita, come i transiti e per la stessa
 * ragione: così lo zodiaco è quello del tema e non lo si può contraddire. Il
 * tema dev'essere siderale — un nakshatra tropicale non è un nakshatra — e
 * deve contenere la Luna.
 *
 * @example
 * ```ts
 * const tema = computeNatalChart(nascita, { zodiac: 'siderale' });
 * const dasha = computeVimshottari(tema, { levels: 2 });
 * ```
 */
export function computeVimshottari(
  chart: NatalChart,
  options: VimshottariOptions = {},
): VimshottariDasha {
  requireSidereal(chart.zodiac, 'La catena delle dasha');

  const moon = chart.bodies.find((body) => body.id === 'luna');
  if (!moon) {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      'Dasha non calcolabili: la catena parte dal nakshatra della Luna, e la Luna ' +
        'non è fra i corpi del tema.',
    );
  }

  const levels = options.levels ?? 2;
  const yearLength = options.yearLength ?? 'solare';
  const daysPerYear = DASHA_DAYS_PER_YEAR[yearLength];

  const nakshatra = nakshatraOf(moon.longitude);
  // Quanto del nakshatra la Luna ha già percorso, e con esso quanto del primo
  // mahadasha era già trascorso quando la persona è nata.
  const percorso = nakshatra.degree / NAKSHATRA_SPAN;
  const anniDelSignore = yearsOf(nakshatra.lord);
  const balance = anniDelSignore * (1 - percorso);

  const warnings: string[] = [];

  if (!chart.time.timeKnown) {
    // Non si ripete che la carta è di mezzogiorno: quello lo dice già
    // l'avvertenza del tema, e le due comparivano di fila cominciando quasi
    // uguali. Qui si aggiunge solo ciò che di quel fatto vale per le dasha, ed
    // è tutt'altro ordine di grandezza.
    warnings.push(
      'Senza ora di nascita queste date non sono approssimate ma inservibili: dodici ' +
        'ore di Luna sono sei gradi e mezzo, che su un mahadasha lungo valgono quasi ' +
        'cinque anni.',
    );
  }

  if (chart.ephemerisMode === 'moshier') {
    warnings.push(
      'Effemeridi Moshier: sulla Luna scartano di un paio di secondi d\'arco dalle ' +
        'Swiss Ephemeris. Su un tema è invisibile, qui no: 13°20\' di nakshatra valgono ' +
        'fino a vent\'anni, quindi le date di inizio possono spostarsi di qualche ora. ' +
        'Scarica le effemeridi per la precisione piena.',
    );
  }

  // Il primo mahadasha è cominciato prima della nascita: si torna indietro
  // della parte già trascorsa, così l'intera catena è una successione senza
  // buchi e il primo periodo ha la durata piena che gli spetta.
  const inizioPrimo = chart.time.julianDayUT - anniDelSignore * percorso * daysPerYear;

  return {
    nakshatra,
    balance,
    yearLength,
    daysPerYear,
    levels,
    // Il primo ordine spartisce il **ciclo intero**, non gli anni del primo
    // signore: ogni mahadasha dura quanto il suo graha vale, e i nove insieme
    // fanno centoventi.
    periods: chain(nakshatra.lord, inizioPrimo, VIMSHOTTARI_TOTAL, 1, levels, {
      daysPerYear,
      timezone: chart.input.timezone,
    }),
    warnings,
  };
}

interface ChainContext {
  daysPerYear: number;
  timezone: string;
}

/**
 * I nove periodi di un ordine, a partire da un signore e da un istante.
 *
 * La stessa funzione serve tutti e tre gli ordini: un antardasha sta a un
 * mahadasha come un mahadasha sta al ciclo intero, con le stesse proporzioni.
 * Cambia solo quanto tempo c'è da spartire.
 */
function chain(
  first: BodyId,
  start: number,
  totalYears: number,
  level: 1 | 2 | 3,
  levels: number,
  context: ChainContext,
): DashaPeriod[] {
  const periods: DashaPeriod[] = [];
  const from = VIMSHOTTARI_ORDER.indexOf(first);
  let cursor = start;

  for (let i = 0; i < VIMSHOTTARI_ORDER.length; i += 1) {
    const lord = VIMSHOTTARI_ORDER[(from + i) % VIMSHOTTARI_ORDER.length] as BodyId;
    // La quota di ciascuno è la sua nel ciclo intero: un graha che vale venti
    // anni su centoventi vale un sesto di qualunque periodo lo contenga.
    const years = (totalYears * yearsOf(lord)) / VIMSHOTTARI_TOTAL;
    const end = cursor + years * context.daysPerYear;

    const period: DashaPeriod = {
      lord,
      level,
      start: julianDayToISO(cursor),
      end: julianDayToISO(end),
      local: {
        start: julianDayToISO(cursor, context.timezone),
        end: julianDayToISO(end, context.timezone),
      },
      years,
    };

    if (level < levels) {
      period.periods = chain(lord, cursor, years, (level + 1) as 1 | 2 | 3, levels, context);
    }

    periods.push(period);
    cursor = end;
  }

  return periods;
}

/** Gli anni di un graha, o un errore se non è uno dei nove. */
function yearsOf(lord: BodyId): number {
  const years = VIMSHOTTARI_YEARS[lord];
  if (years === undefined) {
    throw new ChartError(
      'CORPO_SCONOSCIUTO',
      `${lord} non è uno dei nove graha e non regge nessuna dasha.`,
    );
  }
  return years;
}

/**
 * Il periodo in corso a un certo istante, a ogni ordine calcolato.
 *
 * Dal più ampio al più stretto: mahadasha, poi antardasha, poi
 * pratyantardasha. Vuoto se l'istante cade fuori dai centoventi anni della
 * catena — che comincia prima della nascita e finisce un secolo dopo.
 */
export function dashaAt(dasha: VimshottariDasha, instantUTC: string): DashaPeriod[] {
  const catena: DashaPeriod[] = [];
  let livello: readonly DashaPeriod[] | undefined = dasha.periods;

  while (livello) {
    const corrente: DashaPeriod | undefined = livello.find(
      (period) => period.start <= instantUTC && instantUTC < period.end,
    );
    if (!corrente) break;
    catena.push(corrente);
    livello = corrente.periods;
  }

  return catena;
}
