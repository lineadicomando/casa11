import { computeCrossAspects } from './aspects.js';
import { DEFAULT_TRANSIT_BODIES, TRANSIT_ORB_BONUS, TRANSIT_ORBS } from './constants.js';
import { computeBodies, initEphemeris } from './ephemeris.js';
import { houseOf } from './houses.js';
import { resolveTime } from './time.js';
import type {
  AspectPoint,
  NatalChart,
  NatalPointId,
  TransitAspect,
  TransitChart,
  TransitMoment,
  TransitOptions,
} from './types.js';

/**
 * Assi bersagliati per impostazione predefinita.
 *
 * Discendente e Fondo Cielo restano fuori: sono l'opposizione esatta di
 * Ascendente e Medio Cielo, quindi ogni transito che li tocca compare già
 * nell'elenco come aspetto all'asse opposto. Chi li vuole comunque li chiede
 * per nome in `options.targets`.
 */
const DEFAULT_ANGLE_TARGETS: readonly NatalPointId[] = ['ascendente', 'medio-cielo'];

/**
 * Calcola i transiti a un istante su un tema natale già calcolato.
 *
 * Prende il tema e non i dati di nascita: evita di ricalcolarlo e garantisce
 * che le case in cui i transiti cadono siano quelle che la persona ha sotto
 * gli occhi, nello stesso sistema di domificazione.
 *
 * Il risultato è astronomico come il tema: posizioni e aspetti, nessuna
 * previsione. Un transito è una fase, non un evento con una data.
 *
 * @example
 * ```ts
 * const natal = computeNatalChart(nascita);
 * const transits = computeTransits(natal, {
 *   date: '2026-07-31',
 *   timezone: 'Europe/Rome',
 * });
 * ```
 */
export function computeTransits(
  natal: NatalChart,
  moment: TransitMoment,
  options: TransitOptions = {},
): TransitChart {
  const context = initEphemeris(options.ephemerisPath);
  const { time, warnings: timeWarnings } = resolveTime(moment);
  const bodyIds = options.bodies ?? DEFAULT_TRANSIT_BODIES;
  const { bodies: transiting, warnings: bodyWarnings } = computeBodies(
    time.julianDayUT,
    bodyIds,
    context,
  );

  const warnings = [...context.warnings, ...timeWarnings, ...bodyWarnings];

  if (!time.timeKnown) {
    warnings.push(
      'Ora del transito non fornita: le posizioni sono calcolate a mezzogiorno locale. ' +
        "Nell'arco della giornata solo la Luna si sposta sensibilmente, di circa 13 gradi.",
    );
  }

  // Le case sono quelle di nascita: un transito si legge nel settore del tema
  // in cui cade, non in una domificazione propria dell'istante.
  if (natal.houses.length === 12) {
    for (const body of transiting) {
      body.house = houseOf(body.longitude, natal.houses);
    }
  } else {
    warnings.push(
      "Tema natale senza ora: i transiti non hanno case in cui cadere né assi da toccare, " +
        'e restano i soli aspetti ai corpi.',
    );
  }

  const targets = resolveTargets(natal, options.targets, warnings);

  const aspects = computeCrossAspects(transiting, targets, {
    minorAspects: options.minorAspects ?? false,
    orbs: { ...TRANSIT_ORBS, ...options.orbs },
    orbBonuses: TRANSIT_ORB_BONUS,
  }).map<TransitAspect>((aspect) => ({
    aspect: aspect.aspect,
    angle: aspect.angle,
    transiting: aspect.from,
    natal: aspect.to,
    orb: aspect.orb,
    applying: aspect.applying,
    retrograde: transiting.find((body) => body.id === aspect.from)?.retrograde ?? false,
  }));

  return {
    input: moment,
    time,
    ephemerisMode: context.mode,
    transiting,
    aspects,
    warnings,
  };
}

/**
 * I punti natali da bersagliare, con la loro longitudine.
 *
 * Hanno velocità nulla anche quando corrispondono a un corpo che nel tema si
 * muoveva: una posizione di nascita è ferma per sempre, e da questo dipende
 * il verso di `applying` — è il transito che si avvicina, non l'incontro.
 *
 * Un bersaglio richiesto e non disponibile — Chirone che non è fra i corpi
 * calcolati, un asse in un tema senza ora — produce un avviso e viene
 * saltato: è la stessa scelta che il motore fa per i corpi non calcolabili.
 */
function resolveTargets(
  natal: NatalChart,
  requested: readonly NatalPointId[] | undefined,
  warnings: string[],
): AspectPoint<NatalPointId>[] {
  const available = new Map<NatalPointId, number>();

  for (const body of natal.bodies) available.set(body.id, body.longitude);
  if (natal.angles) {
    available.set('ascendente', natal.angles.ascendant);
    available.set('medio-cielo', natal.angles.midheaven);
    available.set('discendente', natal.angles.descendant);
    available.set('fondo-cielo', natal.angles.imumCoeli);
  }
  if (natal.partOfFortune) available.set('fortuna', natal.partOfFortune.longitude);

  const ids =
    requested ??
    [
      ...natal.bodies.map((body) => body.id),
      ...(natal.angles ? DEFAULT_ANGLE_TARGETS : []),
    ];

  const points: AspectPoint<NatalPointId>[] = [];
  for (const id of ids) {
    const longitude = available.get(id);
    if (longitude === undefined) {
      warnings.push(`Bersaglio "${id}" non presente nel tema natale: transiti non calcolati su di esso.`);
      continue;
    }
    points.push({ id, longitude, speed: 0 });
  }

  return points;
}
