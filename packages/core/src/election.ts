/**
 * L'elezione: scegliere il momento invece di leggerlo.
 *
 * Un tema natale riceve un istante e lo interpreta; qui l'istante è quello che
 * si cerca, e il calcolo restituisce di che cosa è fatto il tempo in un certo
 * luogo — le ore planetarie, l'Ascendente che scorre, i tratti in cui la Luna
 * non conclude più nulla.
 *
 * **Non c'è nessun giudizio qui dentro.** Il motore non dice quale ora sia
 * propizia: dice quale pianeta la regge, che grado sorge, se la Luna è vuota di
 * corso. La scelta appartiene a chi legge, ed è per questo che il risultato è
 * un calendario e non una classifica.
 *
 * Tre cose che rendono l'elezione diversa dal resto del motore:
 * - **dipende dal luogo più di ogni altro calcolo.** Alba e tramonto muovono
 *   tutto, e a parità di istante un'ora planetaria di Palermo non è quella di
 *   Oslo;
 * - **le ore non durano un'ora.** Il giorno si divide comunque in dodici parti,
 *   che d'estate sono lunghe e d'inverno corte, e la notte per differenza;
 * - **il giorno comincia all'alba**, non a mezzanotte: il reggitore di lunedì
 *   entra in carica quando il Sole sorge, non quando scatta la data.
 */

import { DateTime } from 'luxon';
import { CHALDEAN_ORDER, WEEKDAY_RULERS } from './constants.js';
import { ChartError } from './errors.js';
import { computeHouses } from './houses.js';
import { initEphemeris, type EphemerisContext } from './ephemeris.js';
import { degreeInSign, signOf } from './math.js';
import { findSignIngresses } from './sky-events.js';
import { findSkyPassages } from './sky-passages.js';
import { julianDayToISO, resolveRange } from './roots.js';
import { riseOrSet } from './rise.js';
import type {
  BodyId,
  ElectionOptions,
  ElectionResult,
  PassageRange,
  Place,
  PlanetaryHour,
  VoidOfCourse,
} from './types.js';

/**
 * Oltre questo arco l'elenco smette di essere consultabile: sono ventiquattro
 * ore planetarie al giorno, e un trimestre ne farebbe più di duemila.
 */
export const MAX_ELECTION_DAYS = 31;

/**
 * I corpi il cui incontro conta per dire che la Luna «conclude» qualcosa.
 *
 * Sono i sette classici meno la Luna stessa: il vuoto di corso è una dottrina
 * ellenistica, e allargarla ai pianeti scoperti dopo il Settecento cambierebbe
 * silenziosamente il risultato di una regola che ha un'origine precisa. Chi la
 * vuole moderna passa `bodies` e se ne assume la scelta.
 */
const DEFAULT_VOID_BODIES: readonly BodyId[] = [
  'sole',
  'mercurio',
  'venere',
  'marte',
  'giove',
  'saturno',
];

/** Giorni di margine attorno all'arco: la Luna sta in un segno due giorni e mezzo. */
const VOID_MARGIN_DAYS = 4;

/** Il vuoto di corso con gli estremi in giorni giuliani, per confrontarlo con le ore. */
type VoidPeriod = VoidOfCourse & { startJulianDay: number; endJulianDay: number };

/**
 * Costruisce il calendario elettivo di un luogo per un arco di giorni.
 *
 * @example
 * ```ts
 * const { hours, voids } = findElectionHours(
 *   { from: '2029-08-24', to: '2029-08-26', timezone: 'Europe/Rome' },
 *   { latitude: 38.1166, longitude: 13.3636 },
 * );
 * ```
 */
export function findElectionHours(
  range: PassageRange,
  place: Place,
  options: ElectionOptions = {},
): ElectionResult {
  // Il calendario elettivo resta tropicale, e non per dimenticanza. Le ore
  // planetarie non hanno zodiaco — sono divisioni dell'arco diurno — e le due
  // cose che un segno ce l'hanno, l'Ascendente dell'ora e il vuoto di corso,
  // appartengono a una tradizione ellenistica e medievale che nel siderale non
  // si trasporta: il vuoto di corso siderale non è una tecnica di nessuno. Il
  // corrispettivo indiano è il panchanga, che è un altro calcolo, non questo
  // con un'origine spostata.
  const context = initEphemeris(options.ephemerisPath);
  const warnings: string[] = [...context.warnings];
  const { start, end } = resolveRange(range);

  if (end - start > MAX_ELECTION_DAYS) {
    throw new ChartError(
      'INTERVALLO_NON_VALIDO',
      `Arco di ${Math.ceil(end - start)} giorni: l'elezione ne ammette al massimo ${MAX_ELECTION_DAYS}, ` +
        'perché ogni giorno porta ventiquattro ore planetarie.',
    );
  }

  // Un reggitore sconosciuto non produrrebbe nessun errore, solo un elenco
  // vuoto: chi ha scritto «urano» crederebbe che quel mese non abbia ore sue,
  // e non che nessun mese ne abbia mai.
  const estranei = (options.rulers ?? []).filter((id) => !CHALDEAN_ORDER.includes(id));
  if (estranei.length > 0) {
    throw new ChartError(
      'CORPO_SCONOSCIUTO',
      `Nessuna ora è retta da ${estranei.join(', ')}: reggono soltanto i sette pianeti ` +
        `dell'ordine caldeo (${CHALDEAN_ORDER.join(', ')}).`,
    );
  }

  const periods = findVoidsOfCourse(range, start, end, options, warnings);
  const hours = buildPlanetaryHours(range, place, start, end, periods, options, context, warnings);

  const filters: NonNullable<ElectionResult['filters']> = {};
  if (options.rulers) filters.rulers = [...options.rulers];
  if (options.skipMoonVoid) filters.skipMoonVoid = true;

  return {
    range,
    place,
    hours,
    // I giorni giuliani servivano a intersecare i vuoti con le ore: fuori di
    // qui il risultato parla solo in ISO, come il resto del motore.
    voids: periods.map(({ startJulianDay: _start, endJulianDay: _end, ...period }) => period),
    // Dichiarati insieme al risultato: un elenco filtrato che non dica di
    // esserlo si legge come un elenco completo, e sessanta ore invece di
    // settecento sembrerebbero tutte quelle che esistono.
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    warnings,
  };
}

/**
 * Le ore planetarie che intersecano l'arco.
 *
 * Si risale all'alba che apre il giorno planetario in cui cade `start` — che
 * può essere quella del giorno prima, se l'arco comincia a mezzanotte — e da lì
 * si procede alba dopo alba.
 */
function buildPlanetaryHours(
  range: PassageRange,
  place: Place,
  start: number,
  end: number,
  voids: readonly VoidPeriod[],
  options: ElectionOptions,
  context: EphemerisContext,
  warnings: string[],
): PlanetaryHour[] {
  const hours: PlanetaryHour[] = [];

  const first = riseOrSet('rise', start - 1, place, context);
  if (first === null) {
    warnings.push(
      'Alba non calcolabile per questo luogo e questo periodo: alle latitudini polari ' +
        'il Sole può non sorgere né tramontare, e senza alba non ci sono ore planetarie.',
    );
    return hours;
  }

  // L'alba trovata partendo da un giorno prima può essere ancora troppo
  // indietro: si avanza finché il giorno planetario non contiene `start`.
  let sunrise = first;
  for (;;) {
    const next = riseOrSet('rise', sunrise + 0.5, place, context);
    if (next === null || next > start) break;
    sunrise = next;
  }

  while (sunrise < end) {
    const sunset = riseOrSet('set', sunrise, place, context);
    const nextSunrise = riseOrSet('rise', sunrise + 0.5, place, context);
    if (sunset === null || nextSunrise === null) {
      warnings.push('Tramonto o alba successiva non calcolabili: il giorno è stato saltato.');
      break;
    }

    const ruler = rulerOfDay(sunrise, range.timezone);
    const dayLength = (sunset - sunrise) / 12;
    const nightLength = (nextSunrise - sunset) / 12;

    for (let i = 0; i < 24; i += 1) {
      const diurnal = i < 12;
      const hourStart = diurnal ? sunrise + i * dayLength : sunset + (i - 12) * nightLength;
      const hourEnd = hourStart + (diurnal ? dayLength : nightLength);
      if (hourEnd <= start || hourStart >= end) continue;

      // I due filtri si applicano prima di descrivere l'ora e non dopo, così
      // le cuspidi si calcolano solo per le ore che resteranno. Il risparmio è
      // modesto — un mese intero costa comunque meno di due decimi di secondo
      // — ma scartare a valle costringerebbe a costruire per intero
      // settecento oggetti destinati a essere buttati.
      const hourRuler = chaldeanRuler(ruler, i);
      if (options.rulers && !options.rulers.includes(hourRuler)) continue;

      const moonVoid = voids.some(
        (period) => period.startJulianDay < hourEnd && period.endJulianDay > hourStart,
      );
      if (moonVoid && options.skipMoonVoid) continue;

      hours.push(
        describeHour(
          hourStart,
          hourEnd,
          hourRuler,
          diurnal,
          (i % 12) + 1,
          range.timezone,
          place,
          moonVoid,
          context,
          warnings,
        ),
      );
    }

    sunrise = nextSunrise;
  }

  return hours;
}

function describeHour(
  hourStart: number,
  hourEnd: number,
  ruler: BodyId,
  diurnal: boolean,
  index: number,
  timezone: string,
  place: Place,
  moonVoid: boolean,
  context: EphemerisContext,
  warnings: string[],
): PlanetaryHour {
  const houses = computeHouses(hourStart, place.latitude, place.longitude, 'placidus', context);
  // Gli assi non dipendono dal sistema di case: Placidus è qui solo perché
  // `computeHouses` ne vuole uno, e ciò che se ne usa è il solo Ascendente.
  for (const warning of houses.warnings) {
    if (!warnings.includes(warning)) warnings.push(warning);
  }
  const ascendant = houses.angles.ascendant;

  return {
    ruler,
    diurnal,
    index,
    start: julianDayToISO(hourStart),
    end: julianDayToISO(hourEnd),
    local: {
      start: julianDayToISO(hourStart, timezone),
      end: julianDayToISO(hourEnd, timezone),
    },
    minutes: Math.round((hourEnd - hourStart) * 1440),
    ascendant: {
      longitude: ascendant,
      sign: signOf(ascendant),
      signDegree: degreeInSign(ascendant),
    },
    moonVoid,
  };
}

/**
 * I tratti in cui la Luna è vuota di corso.
 *
 * Vuota di corso significa che non perfezionerà più alcun aspetto maggiore
 * prima di lasciare il segno in cui si trova: il tempo fra l'ultimo contatto e
 * l'ingresso successivo. La tradizione ci sconsiglia di cominciare qualcosa,
 * per una ragione che il calcolo non contiene e non deve contenere.
 *
 * Si ricava per intero da due calendari che il motore già sa fare — gli
 * ingressi della Luna nei segni e i suoi incontri con gli altri corpi — presi
 * su un arco allargato: il vuoto in corso all'inizio del periodo comincia
 * prima del periodo stesso.
 */
function findVoidsOfCourse(
  range: PassageRange,
  start: number,
  end: number,
  options: ElectionOptions,
  warnings: string[],
): VoidPeriod[] {
  const wide = widen(range, VOID_MARGIN_DAYS);
  const bodies = options.bodies ?? DEFAULT_VOID_BODIES;

  const ingresses = findSignIngresses(wide, {
    bodies: ['luna'],
    ...(options.ephemerisPath ? { ephemerisPath: options.ephemerisPath } : {}),
  });
  const meetings = findSkyPassages(wide, {
    bodies: ['luna', ...bodies],
    ...(options.ephemerisPath ? { ephemerisPath: options.ephemerisPath } : {}),
  });

  for (const warning of [...ingresses.warnings, ...meetings.warnings]) {
    if (!warnings.includes(warning)) warnings.push(warning);
  }

  // La Luna non retrograda mai: gli ingressi sono in ordine e ognuno chiude il
  // segno precedente senza ripensamenti.
  const crossings = ingresses.ingresses.map((ingress) => ({
    julianDay: isoToJulianDay(ingress.exact),
    sign: ingress.sign,
    from: ingress.from,
  }));
  const lunar = meetings.passages
    .filter((passage) => passage.faster === 'luna' || passage.slower === 'luna')
    .map((passage) => ({
      julianDay: isoToJulianDay(passage.exact),
      aspect: passage.aspect,
      body: passage.faster === 'luna' ? passage.slower : passage.faster,
    }));

  const voids: VoidPeriod[] = [];

  for (let i = 0; i < crossings.length - 1; i += 1) {
    const entered = crossings[i]!;
    const leaves = crossings[i + 1]!;

    const inside = lunar.filter(
      (meeting) => meeting.julianDay >= entered.julianDay && meeting.julianDay < leaves.julianDay,
    );
    const last = inside[inside.length - 1];
    const from = last ? last.julianDay : entered.julianDay;
    if (from >= end || leaves.julianDay <= start) continue;

    const period: VoidPeriod = {
      sign: entered.sign,
      nextSign: leaves.sign,
      start: julianDayToISO(from),
      end: julianDayToISO(leaves.julianDay),
      local: {
        start: julianDayToISO(from, range.timezone),
        end: julianDayToISO(leaves.julianDay, range.timezone),
      },
      minutes: Math.round((leaves.julianDay - from) * 1440),
      startJulianDay: from,
      endJulianDay: leaves.julianDay,
    };
    if (last) period.lastAspect = { body: last.body, aspect: last.aspect };

    voids.push(period);
  }

  return voids;
}

/**
 * Il pianeta che regge il giorno, dal giorno della settimana in cui cade
 * l'alba.
 *
 * Cade qui la ragione per cui il giorno planetario comincia col Sole che
 * sorge: fra mezzanotte e l'alba di lunedì regge ancora la domenica.
 */
function rulerOfDay(sunrise: number, timezone: string): BodyId {
  const weekday = DateTime.fromISO(julianDayToISO(sunrise), { zone: timezone }).weekday;
  // Luxon numera da lunedì=1 a domenica=7; la tavola parte dalla domenica.
  return WEEKDAY_RULERS[weekday % 7]!;
}

/**
 * Il reggitore dell'ora numero `offset` del giorno, secondo l'ordine caldeo.
 *
 * L'ordine è quello delle velocità apparenti decrescenti — Saturno, Giove,
 * Marte, Sole, Venere, Mercurio, Luna — e la prima ora del giorno è retta dal
 * pianeta del giorno. Ventiquattro ore dopo la catena si è spostata di tre
 * posizioni: è il motivo per cui i giorni della settimana hanno l'ordine che
 * hanno, e non quello dei pianeti.
 */
function chaldeanRuler(dayRuler: BodyId, offset: number): BodyId {
  const base = CHALDEAN_ORDER.indexOf(dayRuler);
  return CHALDEAN_ORDER[(base + offset) % CHALDEAN_ORDER.length]!;
}

/** L'arco allargato di `days` giorni per lato, per vedere ciò che comincia prima. */
function widen(range: PassageRange, days: number): PassageRange {
  const shift = (date: string, amount: number): string =>
    DateTime.fromISO(date, { zone: range.timezone }).plus({ days: amount }).toISODate() ?? date;

  return {
    from: shift(range.from, -days),
    to: shift(range.to, days),
    timezone: range.timezone,
  };
}

function isoToJulianDay(iso: string): number {
  return DateTime.fromISO(iso, { zone: 'utc' }).toMillis() / 86_400_000 + 2440587.5;
}
