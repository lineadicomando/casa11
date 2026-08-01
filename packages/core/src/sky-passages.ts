import {
  ASPECTS,
  DEFAULT_PASSAGE_BODIES,
  MEAN_DAILY_MOTION,
  TRANSIT_ORB_BONUS,
  TRANSIT_ORBS,
} from './constants.js';
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
import type { AspectDefinition } from './constants.js';
import type { BodyId, PassageRange, SkyPassage, SkyPassageOptions } from './types.js';

/**
 * Velocità relativa minima ammessa nel calcolo del margine.
 *
 * Due corpi di moto medio quasi uguale impiegherebbero un tempo enorme ad
 * aprire e chiudere un'orbita: senza questo pavimento la divisione produrrebbe
 * un margine sconfinato, e comunque oltre i tre anni la finestra non esiste.
 */
const MIN_RELATIVE_MOTION = 0.001;

interface PairSample {
  julianDay: number;
  faster: number;
  slower: number;
}

/**
 * Trova gli istanti in cui due corpi in cielo formano un aspetto esatto.
 *
 * È il calendario del cielo, non quello di una persona: la congiunzione fra
 * Saturno e Nettuno, il novilunio, il momento in cui Marte raggiunge Giove.
 * Nessuna nascita, quindi nessun transito — solo il cielo che si muove.
 *
 * La differenza dai passaggi sui punti natali sta tutta nella funzione di cui
 * si cerca la radice: là un termine solo si muoveva, contro una posizione
 * ferma per sempre; qui si muovono entrambi, e il passo di campionamento va
 * commisurato alla velocità **relativa**. Un passo tarato sul più lento dei
 * due mancherebbe gli incontri.
 *
 * @example
 * ```ts
 * const { passages } = findSkyPassages(
 *   { from: '2026-01-01', to: '2026-12-31', timezone: 'Europe/Rome' },
 *   { bodies: ['sole', 'luna'] },   // le lunazioni dell'anno
 * );
 * ```
 */
export function findSkyPassages(
  range: PassageRange,
  options: SkyPassageOptions = {},
): { passages: SkyPassage[]; warnings: string[] } {
  const context = initEphemeris(options.ephemerisPath);
  const warnings: string[] = [...context.warnings];

  const { start, end } = resolveRange(range);
  const definitions = options.minorAspects ? ASPECTS : ASPECTS.filter((a) => a.major);
  const bodies = options.bodies ?? DEFAULT_PASSAGE_BODIES;

  const passages: (SkyPassage & { julianDay: number })[] = [];

  for (const [faster, slower] of pairsBySpeed(bodies)) {
    // Il passo segue la somma delle due velocità e non la loro differenza:
    // in retrogradazione i due si avvicinano più in fretta di quanto dicano i
    // moti medi, e un passo tarato sulla differenza salterebbe l'incontro.
    const step = stepFor(motion(faster) + motion(slower));
    // Il margine invece segue la differenza, che è il ritmo con cui un'orbita
    // si apre e si chiude: senza, un aspetto esatto il primo giorno avrebbe
    // una finestra spalancata solo perché non è stata guardata prima.
    const margin = Math.min(
      MAX_WINDOW_DAYS,
      WIDEST_ORB / Math.max(MIN_RELATIVE_MOTION, Math.abs(motion(faster) - motion(slower))),
    );

    const samples = samplePair(faster, slower, start - margin, end + margin, step, context, warnings);
    if (samples.length < 2) continue;

    for (const definition of definitions) {
      for (const angle of signedAngles(definition.angle)) {
        const found = passagesOf(faster, slower, definition, angle, samples, context, range, options);
        // Il margine serviva alle finestre: quel che cade lì dentro è fuori
        // dall'arco richiesto e non va elencato.
        passages.push(
          ...found.filter((passage) => passage.julianDay >= start && passage.julianDay <= end),
        );
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
 * Le coppie da esaminare, ordinate al loro interno per velocità media.
 *
 * Ogni coppia compare una volta sola: un aspetto fra due corpi è reciproco, e
 * elencarlo nei due versi lo raddoppierebbe senza aggiungere niente.
 */
function pairsBySpeed(bodies: readonly BodyId[]): [BodyId, BodyId][] {
  const ordered = [...new Set(bodies)].sort((a, b) => motion(b) - motion(a));
  const pairs: [BodyId, BodyId][] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      pairs.push([ordered[i]!, ordered[j]!]);
    }
  }

  return pairs;
}

function motion(bodyId: BodyId): number {
  return MEAN_DAILY_MOTION[bodyId] ?? 1;
}

function samplePair(
  faster: BodyId,
  slower: BodyId,
  from: number,
  to: number,
  step: number,
  context: EphemerisContext,
  warnings: string[],
): PairSample[] {
  const samples: PairSample[] = [];

  for (let jd = from; jd < to + step; jd += step) {
    const julianDay = Math.min(jd, to);
    const pair = longitudesAt(faster, slower, julianDay, context);
    if (pair === null) {
      warnings.push(`${faster} e ${slower}: posizioni non calcolabili, incontri non cercati.`);
      return [];
    }
    samples.push({ julianDay, ...pair });
  }

  return samples;
}

function passagesOf(
  faster: BodyId,
  slower: BodyId,
  definition: AspectDefinition,
  signedAngle: number,
  samples: readonly PairSample[],
  context: EphemerisContext,
  range: PassageRange,
  options: SkyPassageOptions,
): (SkyPassage & { julianDay: number })[] {
  const found: (SkyPassage & { julianDay: number })[] = [];

  const gap = (pair: { faster: number; slower: number }): number =>
    signedDifference(signedDifference(pair.faster, pair.slower), signedAngle);

  /** Lo stesso scarto come funzione del tempo: è ciò di cui si cerca la radice. */
  const gapAt =
    (f: (value: number) => number) =>
    (julianDay: number): number | null => {
      const pair = longitudesAt(faster, slower, julianDay, context);
      return pair === null ? null : f(gap(pair));
    };

  const orbLimit =
    (options.orbs?.[definition.id] ?? TRANSIT_ORBS[definition.id]) +
    (TRANSIT_ORB_BONUS[faster] ?? 0) +
    (TRANSIT_ORB_BONUS[slower] ?? 0);

  for (let i = 1; i < samples.length; i += 1) {
    const g0 = gap(samples[i - 1]!);
    const g1 = gap(samples[i]!);

    // Un salto ampio è il giro completo che si richiude, non un incontro: fra
    // due campioni i due corpi si scostano di pochi gradi per costruzione.
    if (Math.abs(g1 - g0) > 90) continue;
    if (g0 === 0 || g0 * g1 > 0) continue;

    const exact = bisect(samples[i - 1]!.julianDay, samples[i]!.julianDay, gapAt((g) => g));
    if (exact === null) continue;

    const moving = motionAt(faster, slower, exact, context);
    if (moving === null) continue;

    const passage: SkyPassage & { julianDay: number } = {
      julianDay: exact,
      faster,
      slower,
      aspect: definition.id,
      angle: definition.angle,
      exact: julianDayToISO(exact),
      local: julianDayToISO(exact, range.timezone),
      retrograde: moving,
    };

    const window = windowAround(i, exact, orbLimit, samples, gap, gapAt);
    if (window) passage.window = { start: julianDayToISO(window.start, range.timezone), end: julianDayToISO(window.end, range.timezone) };

    found.push(passage);
  }

  return found;
}

/**
 * L'intervallo attorno all'istante esatto in cui l'aspetto resta in orbita.
 *
 * Si cammina all'indietro e in avanti sui campioni già calcolati — gratis — e
 * si dimezza solo l'ultimo intervallo, quello in cui l'orbita si apre o si
 * chiude. Se il bordo non arriva entro tre anni la finestra non c'è: fra Urano
 * e Nettuno durerebbe più a lungo di quanto la parola significhi.
 */
function windowAround(
  index: number,
  exact: number,
  orbLimit: number,
  samples: readonly PairSample[],
  gap: (pair: PairSample) => number,
  gapAt: (f: (value: number) => number) => (julianDay: number) => number | null,
): { start: number; end: number } | undefined {
  const edge = (direction: -1 | 1): number | null => {
    let i = direction === -1 ? index - 1 : index;
    while (i >= 0 && i < samples.length) {
      const sample = samples[i]!;
      if (Math.abs(sample.julianDay - exact) > MAX_WINDOW_DAYS) return null;
      if (Math.abs(gap(sample)) > orbLimit) {
        const [lo, hi] =
          direction === -1 ? [sample.julianDay, exact] : [exact, sample.julianDay];
        return bisect(lo, hi, gapAt((g) => Math.abs(g) - orbLimit));
      }
      i += direction;
    }
    return null;
  };

  const start = edge(-1);
  const end = edge(1);
  if (start === null || end === null) return undefined;

  return { start, end };
}

function longitudesAt(
  faster: BodyId,
  slower: BodyId,
  julianDay: number,
  context: EphemerisContext,
): { faster: number; slower: number } | null {
  const { bodies } = computeBodies(julianDay, [faster, slower], context);
  const a = bodies.find((body) => body.id === faster);
  const b = bodies.find((body) => body.id === slower);
  return a && b ? { faster: a.longitude, slower: b.longitude } : null;
}

function motionAt(
  faster: BodyId,
  slower: BodyId,
  julianDay: number,
  context: EphemerisContext,
): { faster: boolean; slower: boolean } | null {
  const { bodies } = computeBodies(julianDay, [faster, slower], context);
  const a = bodies.find((body) => body.id === faster);
  const b = bodies.find((body) => body.id === slower);
  return a && b ? { faster: a.speed < 0, slower: b.speed < 0 } : null;
}
