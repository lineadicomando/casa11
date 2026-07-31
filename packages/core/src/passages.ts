import { DateTime } from 'luxon';
import { ASPECTS, DEFAULT_PASSAGE_BODIES, MEAN_DAILY_MOTION, TRANSIT_ORB_BONUS, TRANSIT_ORBS } from './constants.js';
import { computeBodies, initEphemeris, type EphemerisContext } from './ephemeris.js';
import { ChartError } from './errors.js';
import { normalize360 } from './math.js';
import { natalTargets } from './transits.js';
import { resolveTime } from './time.js';
import type { AspectDefinition } from './constants.js';
import type {
  BodyId,
  NatalChart,
  NatalPointId,
  PassageOptions,
  PassageRange,
  TransitPassage,
} from './types.js';

/** Gradi di moto per passo di campionamento: più fitto di così è sprecato. */
const STEP_DEGREES = 2;
/** Estremi del passo, in giorni: sotto non serve, sopra si rischia di saltare. */
const MIN_STEP_DAYS = 0.2;
const MAX_STEP_DAYS = 10;
/** Un minuto: sotto questa soglia l'istante esatto non si affina oltre. */
const PRECISION_DAYS = 1 / 1440;
/** Oltre questo arco la finestra non è più una finestra. */
const MAX_WINDOW_DAYS = 1095;
/** L'orbita più larga concessa a un transito: congiunzione più i due luminari. */
const WIDEST_ORB = 4;

interface Sample {
  julianDay: number;
  longitude: number;
}

/**
 * Trova gli istanti in cui i transiti si perfezionano nell'arco dato.
 *
 * È la domanda a cui un quadro istantaneo non può rispondere: *quando*, e
 * *quante volte*. Un pianeta lento che passa in retrogradazione tocca lo
 * stesso punto natale tre volte nel giro di un anno, e quel ritmo — avanti,
 * indietro, avanti — è ciò che rende leggibile un periodo lungo.
 *
 * Il metodo è quello classico per le radici di una funzione continua:
 * si campiona lo scarto dall'angolo esatto a passo commisurato alla velocità
 * del corpo, si cerca dove cambia segno, e lì si dimezza l'intervallo fino al
 * minuto. Un aspetto sfiorato e non raggiunto — il corpo inverte il moto
 * appena prima — non produce cambi di segno e non viene elencato, che è il
 * risultato corretto.
 */
export function findTransitPassages(
  natal: NatalChart,
  range: PassageRange,
  options: PassageOptions = {},
): { passages: TransitPassage[]; warnings: string[] } {
  const context = initEphemeris(options.ephemerisPath);
  const warnings: string[] = [...context.warnings];

  const start = resolveTime({ date: range.from, time: '00:00', timezone: range.timezone });
  const end = resolveTime({ date: range.to, time: '23:59', timezone: range.timezone });
  if (end.time.julianDayUT <= start.time.julianDayUT) {
    throw new ChartError(
      'INTERVALLO_NON_VALIDO',
      `Intervallo vuoto: "${range.to}" non è successivo a "${range.from}".`,
    );
  }

  const definitions = options.minorAspects ? ASPECTS : ASPECTS.filter((a) => a.major);
  const targets = natalTargets(natal, options.targets, warnings);
  const bodies = options.bodies ?? DEFAULT_PASSAGE_BODIES;

  const passages: (TransitPassage & { julianDay: number })[] = [];

  for (const bodyId of bodies) {
    // Si campiona oltre gli estremi: un aspetto esatto il primo giorno era in
    // orbita già prima, e senza quel margine la sua finestra risulterebbe
    // aperta soltanto perché non è stata guardata.
    const margin = Math.min(MAX_WINDOW_DAYS, WIDEST_ORB / (MEAN_DAILY_MOTION[bodyId] ?? 1));
    const samples = sampleLongitudes(
      bodyId,
      start.time.julianDayUT - margin,
      end.time.julianDayUT + margin,
      context,
      warnings,
    );
    if (samples.length < 2) continue;

    for (const target of targets) {
      for (const definition of definitions) {
        for (const angle of signedAngles(definition.angle)) {
          const found = passagesOf(
            bodyId, target, definition, angle, samples, context, range, options,
          );
          // Il margine serviva alle finestre: i passaggi che cadono lì dentro
          // sono fuori dall'arco richiesto e non vanno elencati.
          passages.push(
            ...found.filter(
              (passage) =>
                passage.julianDay >= start.time.julianDayUT &&
                passage.julianDay <= end.time.julianDayUT,
            ),
          );
        }
      }
    }
  }

  passages.sort((a, b) => a.exact.localeCompare(b.exact));
  // `julianDay` è servito al filtro e non fa parte del risultato pubblico.
  return {
    passages: passages.map(({ julianDay: _, ...passage }) => passage),
    warnings,
  };
}

/**
 * Gli angoli firmati di un aspetto.
 *
 * Un trigono si perfeziona due volte per giro: quando il transitante è 120°
 * avanti al punto natale e quando gli è 120° indietro. Trattarli come due
 * bersagli distinti evita di ragionare su una separazione ripiegata in
 * [0, 180], che nei punti di ripiegamento non è derivabile.
 */
function signedAngles(angle: number): number[] {
  return angle === 0 || angle === 180 ? [angle] : [angle, -angle];
}

function sampleLongitudes(
  bodyId: BodyId,
  from: number,
  to: number,
  context: EphemerisContext,
  warnings: string[],
): Sample[] {
  const motion = MEAN_DAILY_MOTION[bodyId] ?? 1;
  const step = Math.min(MAX_STEP_DAYS, Math.max(MIN_STEP_DAYS, STEP_DEGREES / motion));

  const samples: Sample[] = [];
  for (let jd = from; jd < to + step; jd += step) {
    const longitude = longitudeAt(bodyId, Math.min(jd, to), context);
    if (longitude === null) {
      warnings.push(`${bodyId}: posizione non calcolabile, passaggi non cercati.`);
      return [];
    }
    samples.push({ julianDay: Math.min(jd, to), longitude });
  }
  return samples;
}

function passagesOf(
  bodyId: BodyId,
  target: { id: NatalPointId; longitude: number },
  definition: AspectDefinition,
  signedAngle: number,
  samples: readonly Sample[],
  context: EphemerisContext,
  range: PassageRange,
  options: PassageOptions,
): (TransitPassage & { julianDay: number })[] {
  const found: (TransitPassage & { julianDay: number })[] = [];
  const gap = (longitude: number): number =>
    signedDifference(signedDifference(longitude, target.longitude), signedAngle);

  const orbLimit =
    (options.orbs?.[definition.id] ?? TRANSIT_ORBS[definition.id]) +
    (TRANSIT_ORB_BONUS[bodyId] ?? 0) +
    (TRANSIT_ORB_BONUS[target.id] ?? 0);

  for (let i = 1; i < samples.length; i += 1) {
    const before = samples[i - 1]!;
    const after = samples[i]!;
    const g0 = gap(before.longitude);
    const g1 = gap(after.longitude);

    // Un salto ampio è il giro completo che si richiude, non un aspetto:
    // fra due campioni il corpo si sposta di pochi gradi per costruzione.
    if (Math.abs(g1 - g0) > 90) continue;
    if (g0 === 0 || g0 * g1 > 0) continue;

    const exact = bisect(bodyId, before.julianDay, after.julianDay, gap, context);
    if (exact === null) continue;

    const body = bodyAt(bodyId, exact, context);
    if (!body) continue;

    const passage: TransitPassage & { julianDay: number } = {
      julianDay: exact,
      transiting: bodyId,
      natal: target.id,
      aspect: definition.id,
      angle: definition.angle,
      exact: julianDayToISO(exact),
      local: julianDayToISO(exact, range.timezone),
      retrograde: body.speed < 0,
    };

    const window = windowAround(i, exact, orbLimit, samples, gap, bodyId, context, range.timezone);
    if (window) passage.window = window;

    found.push(passage);
  }

  return found;
}

/**
 * L'intervallo attorno all'istante esatto in cui l'aspetto resta in orbita.
 *
 * Si cammina all'indietro e in avanti sui campioni già calcolati — gratis —
 * e si dimezza solo l'ultimo intervallo, quello in cui l'orbita si apre o si
 * chiude. Se il bordo non arriva entro tre anni la finestra non c'è: per un
 * transito di Plutone durerebbe più a lungo di quanto la parola significhi.
 */
function windowAround(
  index: number,
  exact: number,
  orbLimit: number,
  samples: readonly Sample[],
  gap: (longitude: number) => number,
  bodyId: BodyId,
  context: EphemerisContext,
  timezone: string,
): { start: string; end: string } | undefined {
  const outside = (sample: Sample): boolean => Math.abs(gap(sample.longitude)) > orbLimit;
  const edge = (from: number, direction: -1 | 1): number | null => {
    let i = direction === -1 ? index - 1 : index;
    while (i >= 0 && i < samples.length) {
      const sample = samples[i]!;
      if (Math.abs(sample.julianDay - exact) > MAX_WINDOW_DAYS) return null;
      if (outside(sample)) {
        const [lo, hi] =
          direction === -1 ? [sample.julianDay, from] : [from, sample.julianDay];
        return bisect(bodyId, lo, hi, (longitude) => Math.abs(gap(longitude)) - orbLimit, context);
      }
      i += direction;
    }
    return null;
  };

  const start = edge(exact, -1);
  const end = edge(exact, 1);
  if (start === null || end === null) return undefined;

  return { start: julianDayToISO(start, timezone), end: julianDayToISO(end, timezone) };
}

/**
 * Dimezza l'intervallo finché l'istante non è determinato al minuto.
 *
 * Più in là non ha senso spingersi: le effemeridi sono esatte al secondo
 * d'arco, ma un aspetto «esatto» al secondo di tempo è una precisione che
 * nessuna lettura astrologica usa.
 */
function bisect(
  bodyId: BodyId,
  from: number,
  to: number,
  f: (longitude: number) => number,
  context: EphemerisContext,
): number | null {
  let lo = from;
  let hi = to;
  const at = (jd: number): number | null => {
    const longitude = longitudeAt(bodyId, jd, context);
    return longitude === null ? null : f(longitude);
  };

  const fLo = at(lo);
  if (fLo === null) return null;

  while (hi - lo > PRECISION_DAYS) {
    const mid = (lo + hi) / 2;
    const fMid = at(mid);
    if (fMid === null) return null;
    if (fMid === 0) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

function longitudeAt(bodyId: BodyId, julianDay: number, context: EphemerisContext): number | null {
  return bodyAt(bodyId, julianDay, context)?.longitude ?? null;
}

function bodyAt(
  bodyId: BodyId,
  julianDay: number,
  context: EphemerisContext,
): { longitude: number; speed: number } | undefined {
  const { bodies } = computeBodies(julianDay, [bodyId], context);
  return bodies[0];
}

/** Differenza fra due longitudini in (-180, 180]. */
function signedDifference(a: number, b: number): number {
  const difference = normalize360(a - b);
  return difference > 180 ? difference - 360 : difference;
}

/** Da giorno giuliano a ISO 8601, in UTC o nel fuso richiesto. */
function julianDayToISO(julianDay: number, timezone = 'utc'): string {
  const millis = (julianDay - 2440587.5) * 86_400_000;
  return (
    DateTime.fromMillis(Math.round(millis / 60_000) * 60_000, { zone: timezone }).toISO({
      suppressMilliseconds: true,
      suppressSeconds: true,
    }) ?? ''
  );
}
