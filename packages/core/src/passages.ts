import { ASPECTS, DEFAULT_PASSAGE_BODIES, MEAN_DAILY_MOTION, TRANSIT_ORB_BONUS, TRANSIT_ORBS } from './constants.js';
import { zodiacContext } from './ayanamsa.js';
import { computeBodies, initEphemeris, type EphemerisContext } from './ephemeris.js';
import { signedDifference } from './math.js';
import {
  MAX_WINDOW_DAYS,
  WIDEST_ORB,
  bisect,
  julianDayToISO,
  resolveRange,
  signedAngles,
  stepFor,
} from './roots.js';
import { natalTargets } from './transits.js';
import type { AspectDefinition } from './constants.js';
import type {
  BodyId,
  NatalChart,
  NatalPointId,
  PassageOptions,
  PassageRange,
  TransitPassage,
} from './types.js';

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
 * Il metodo è in `roots.ts`. Qui a muoversi è un corpo solo: il punto natale è
 * fermo per sempre, e lo scarto dipende dalla sola longitudine del transitante.
 */
export function findTransitPassages(
  natal: NatalChart,
  range: PassageRange,
  options: PassageOptions = {},
): { passages: TransitPassage[]; warnings: string[] } {
  // Come nei transiti: lo zodiaco è quello del tema bersagliato.
  const context = zodiacContext(initEphemeris(options.ephemerisPath), {
    zodiac: natal.zodiac,
    ...(natal.ayanamsa ? { ayanamsa: natal.ayanamsa.id } : {}),
  });
  const warnings: string[] = [...context.warnings];

  const { start, end } = resolveRange(range);

  const definitions = options.minorAspects ? ASPECTS : ASPECTS.filter((a) => a.major);
  const targets = natalTargets(natal, options.targets, warnings);
  const bodies = options.bodies ?? DEFAULT_PASSAGE_BODIES;

  const passages: (TransitPassage & { julianDay: number })[] = [];

  for (const bodyId of bodies) {
    // Si campiona oltre gli estremi: un aspetto esatto il primo giorno era in
    // orbita già prima, e senza quel margine la sua finestra risulterebbe
    // aperta soltanto perché non è stata guardata.
    const margin = Math.min(MAX_WINDOW_DAYS, WIDEST_ORB / (MEAN_DAILY_MOTION[bodyId] ?? 1));
    const samples = sampleLongitudes(bodyId, start - margin, end + margin, context, warnings);
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
              (passage) => passage.julianDay >= start && passage.julianDay <= end,
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

function sampleLongitudes(
  bodyId: BodyId,
  from: number,
  to: number,
  context: EphemerisContext,
  warnings: string[],
): Sample[] {
  const step = stepFor(MEAN_DAILY_MOTION[bodyId] ?? 1);

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

    const exact = bisect(before.julianDay, after.julianDay, atTime(bodyId, gap, context));
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
        return bisect(lo, hi, atTime(bodyId, (l) => Math.abs(gap(l)) - orbLimit, context));
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

/** Trasporta nel tempo una funzione della longitudine di un corpo. */
function atTime(
  bodyId: BodyId,
  f: (longitude: number) => number,
  context: EphemerisContext,
): (julianDay: number) => number | null {
  return (julianDay) => {
    const longitude = longitudeAt(bodyId, julianDay, context);
    return longitude === null ? null : f(longitude);
  };
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
