import { computeCrossAspects } from './aspects.js';
import { DEFAULT_TRANSIT_BODIES, TRANSIT_ORB_BONUS, TRANSIT_ORBS } from './constants.js';
import { ayanamsaAt, zodiacContext } from './ayanamsa.js';
import { computeBodies, initEphemeris } from './ephemeris.js';
import { computeHouses, houseOf } from './houses.js';
import { validatePlace } from './place.js';
import { localSiderealTime } from './sidereal.js';
import { resolveTime } from './time.js';
import type { EphemerisContext } from './ephemeris.js';
import type {
  Angles,
  AspectPoint,
  HouseSystem,
  NatalChart,
  NatalPointId,
  Place,
  ResolvedTime,
  TransitAspect,
  TransitChart,
  TransitingBody,
  TransitingPointId,
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

/** Un minuto, in giorni: il passo con cui si misura la corsa degli assi. */
const ANGLE_SPEED_STEP = 1 / 1440;

/**
 * Calcola i transiti a un istante su un tema natale già calcolato.
 *
 * Prende il tema e non i dati di nascita: evita di ricalcolarlo e garantisce
 * che le case in cui i transiti cadono siano quelle che la persona ha sotto
 * gli occhi, nello stesso sistema di domificazione.
 *
 * Con un luogo in `options.place` si aggiunge il cielo come lo si vede da lì:
 * assi e case dell'istante, tempo siderale, e i due assi fra i transitanti.
 * Non sostituisce nulla — i corpi restano dove sono per chiunque, e la casa
 * natale in cui cadono resta la colonna che si legge di solito.
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
  const { place } = options;
  if (place) validatePlace(place);

  // Lo zodiaco lo detta il tema, e non è un'opzione: un transitante tropicale
  // su un tema siderale darebbe aspetti sbagliati di tutto l'ayanamsa — più di
  // ventiquattro gradi — senza che niente lo segnali.
  //
  // Attenzione a una cosa che sembra ovvia e non lo è. Gli aspetti *dentro* un
  // tema non cambiano da uno zodiaco all'altro: un aspetto è una differenza
  // fra due longitudini prese nello stesso istante, e l'ayanamsa le sposta
  // entrambe. Un transito no. I suoi due lati stanno in due epoche diverse, e
  // l'ayanamsa fra quelle due epoche è cresciuto — cinquantun secondi d'arco
  // l'anno, cioè quasi un grado su una nascita del 1968 vista dal 2026. I
  // transiti siderali cadono quindi in istanti diversi dai tropicali, e non è
  // un errore di arrotondamento: è la precessione, ed è la ragione per cui un
  // ritorno di Saturno siderale non è quello tropicale.
  const context = zodiacContext(initEphemeris(options.ephemerisPath), {
    zodiac: natal.zodiac,
    ...(natal.ayanamsa ? { ayanamsa: natal.ayanamsa.id } : {}),
  });
  const { time, warnings: timeWarnings } = resolveTime(moment);
  const bodyIds = options.bodies ?? DEFAULT_TRANSIT_BODIES;
  const { bodies, warnings: bodyWarnings } = computeBodies(time.julianDayUT, bodyIds, context);
  // La casa dell'istante, se ci sarà, si scrive su questi stessi oggetti.
  const transiting: TransitingBody[] = bodies;

  const warnings = [...context.warnings, ...timeWarnings, ...bodyWarnings];

  if (!time.timeKnown) {
    warnings.push(
      'Ora del transito non fornita: le posizioni sono calcolate a mezzogiorno locale. ' +
        "Nell'arco della giornata solo la Luna si sposta sensibilmente, di circa 13 gradi.",
    );
  }

  // `house` resta la casa di nascita: un transito si legge anzitutto nel
  // settore del tema in cui cade, e quella lettura non dipende da dove si è.
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

  const chart: TransitChart = {
    input: moment,
    time,
    ephemerisMode: context.mode,
    zodiac: natal.zodiac,
    // L'ayanamsa dell'istante del transito, non quello del tema: cresce di
    // circa cinquantuno secondi d'arco l'anno, e su una nascita di mezzo
    // secolo fa la differenza sfiora il grado. È con questo che i transitanti
    // sono stati calcolati, quindi è questo che va riportato.
    ...(natal.ayanamsa
      ? { ayanamsa: ayanamsaAt(time.julianDayUT, context, natal.ayanamsa.id) }
      : {}),
    transiting,
    houses: [],
    aspects: [],
    warnings,
  };

  // I transitanti sono i corpi, più gli assi dell'istante quando c'è un luogo
  // che li definisca: si compone qui perché è il luogo a deciderne il numero.
  const moving: AspectPoint<TransitingPointId>[] = [...transiting];

  if (place) {
    chart.place = place;
    chart.siderealTime = localSiderealTime(time.julianDayUT, place.longitude);

    if (time.timeKnown) {
      const houseSystem = options.houseSystem ?? 'placidus';
      const domification = computeHouses(
        time.julianDayUT,
        place.latitude,
        place.longitude,
        houseSystem,
        context,
      );
      warnings.push(...domification.warnings);

      chart.houseSystem = houseSystem;
      chart.houses = domification.houses;
      chart.angles = domification.angles;

      // La seconda casa di ogni corpo: dove sta in cielo per chi è lì adesso,
      // non in quale settore della vita sta passando.
      for (const body of transiting) {
        body.transitHouse = houseOf(body.longitude, domification.houses);
      }

      moving.push(...movingAngles(domification.angles, time, place, houseSystem, context));
    } else {
      warnings.push(
        "Luogo del transito senza ora: assi e case dell'istante non calcolati. " +
          "A mezzogiorno l'Ascendente sarebbe inventato, non approssimato.",
      );
    }
  }

  const targets = natalTargets(natal, options.targets, warnings);

  chart.aspects = computeCrossAspects(moving, targets, {
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
    // Un asse non trova nessun corpo con il suo nome, e non è retrogrado: non
    // ha un moto proprio da invertire, solo la rotazione terrestre sotto.
    retrograde: transiting.find((body) => body.id === aspect.from)?.retrograde ?? false,
  }));

  return chart;
}

/**
 * Ascendente e Medio Cielo dell'istante, come punti capaci di fare aspetto.
 *
 * La velocità serve al verso di `applying`, e non è una costante da scrivere
 * a mano: l'Ascendente percorre l'eclittica a scatti — lentissimo sui segni di
 * ascensione breve, rapidissimo sugli altri — e lo scarto cresce con la
 * latitudine. Si misura dove ci si trova, come differenza fra due
 * domificazioni distanti un minuto, invece di dedurla dai 360° al giorno che
 * sono una media giusta solo all'equatore.
 *
 * Gli avvisi della seconda domificazione si scartano: sono gli stessi della
 * prima, un minuto dopo.
 */
function movingAngles(
  angles: Angles,
  time: ResolvedTime,
  place: Place,
  houseSystem: HouseSystem,
  context: EphemerisContext,
): AspectPoint<TransitingPointId>[] {
  const later = computeHouses(
    time.julianDayUT + ANGLE_SPEED_STEP,
    place.latitude,
    place.longitude,
    houseSystem,
    context,
  );

  return [
    {
      id: 'ascendente',
      longitude: angles.ascendant,
      speed: degreesPerDay(angles.ascendant, later.angles.ascendant),
    },
    {
      id: 'medio-cielo',
      longitude: angles.midheaven,
      speed: degreesPerDay(angles.midheaven, later.angles.midheaven),
    },
  ];
}

/**
 * Gradi al giorno fra due posizioni distanti un passo, per la via breve.
 *
 * In un minuto nemmeno l'Ascendente alle latitudini alte fa mezzo giro, quindi
 * l'arco più corto fra le due è sempre quello che ha davvero percorso.
 */
function degreesPerDay(from: number, to: number): number {
  return (((to - from + 540) % 360) - 180) / ANGLE_SPEED_STEP;
}

/**
 * I punti natali da bersagliare, con la loro longitudine.
 *
 * Esportata perché serve identica al calendario dei passaggi: i bersagli di
 * un istante e quelli di un anno sono gli stessi.
 *
 * Hanno velocità nulla anche quando corrispondono a un corpo che nel tema si
 * muoveva: una posizione di nascita è ferma per sempre, e da questo dipende
 * il verso di `applying` — è il transito che si avvicina, non l'incontro.
 *
 * Un bersaglio richiesto e non disponibile — Chirone che non è fra i corpi
 * calcolati, un asse in un tema senza ora — produce un avviso e viene
 * saltato: è la stessa scelta che il motore fa per i corpi non calcolabili.
 */
export function natalTargets(
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
