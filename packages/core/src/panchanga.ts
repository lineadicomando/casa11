/**
 * Il panchanga: le cinque parti del calendario indiano.
 *
 * *Pañcāṅga* vuol dire «cinque membra», e sono tithi, vara, nakshatra, yoga e
 * karana. Non è un tema: è la qualità di un istante in un luogo, e si consulta
 * come da noi si consulta il calendario prima di fissare qualcosa.
 *
 * **Tutto discende da due longitudini soltanto**, quella del Sole e quella
 * della Luna, e da un'alba. Tre delle cinque parti sono una divisione della
 * loro distanza o della loro somma; il nakshatra è dove cade la Luna; la vara
 * è il giorno della settimana, che comincia quando il Sole sorge.
 *
 * Da quel poco discende anche una distinzione che vale la pena tenere a mente:
 * **tithi e karana non dipendono dall'ayanamsa**, perché una differenza fra
 * due longitudini non cambia se si spostano entrambe. Nakshatra e yoga sì — e
 * lo yoga il doppio degli altri, perché usa la somma.
 */

import { WEEKDAY_RULERS } from './constants.js';
import { ayanamsaAt, DEFAULT_AYANAMSA, zodiacContext } from './ayanamsa.js';
import { computeBodies, initEphemeris } from './ephemeris.js';
import { normalize360 } from './math.js';
import { nakshatraOf, NAKSHATRA_SPAN } from './nakshatra.js';
import { validatePlace } from './place.js';
import { riseOrSet } from './rise.js';
import { julianDayToISO } from './roots.js';
import { resolveTime } from './time.js';
import { ChartError } from './errors.js';
import type { EphemerisContext } from './ephemeris.js';
import type {
  Karana,
  LocalMoment,
  Panchanga,
  PanchangaOptions,
  PanchangaYoga,
  Place,
  Tithi,
  Vara,
} from './types.js';

/**
 * L'alba del panchanga è quella degli almanacchi, non quella geometrica delle
 * ore planetarie: lembo superiore e rifrazione. Sono quattro minuti, e sono
 * quelli in cui la vara calcolata qui coinciderebbe o no con quella stampata.
 */
const VISIBILE = { visible: true } as const;

/** Dodici gradi: l'ampiezza di un tithi. */
const TITHI_SPAN = 12;

/** Sei gradi: mezzo tithi. */
const KARANA_SPAN = 6;

/**
 * I quindici nomi di un paksha.
 *
 * Il quindicesimo cambia a seconda della metà: a fine crescente c'è la Luna
 * piena, a fine calante la Luna nuova, e non sono lo stesso giorno con due
 * nomi ma i due estremi del ciclo.
 */
const TITHI_NAMES: readonly string[] = [
  'Pratipada',
  'Dvitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dvadashi',
  'Trayodashi',
  'Chaturdashi',
];

/** I sette karana che girano, otto volte per mese lunare. */
const MOVABLE_KARANAS: readonly string[] = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti',
];

const YOGA_NAMES: readonly string[] = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shula',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyana',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
];

/** I sette giorni, da Ravivara, che è la domenica. */
const VARA_NAMES: readonly string[] = [
  'Ravivara',
  'Somavara',
  'Mangalavara',
  'Budhavara',
  'Guruvara',
  'Shukravara',
  'Shanivara',
];

/**
 * Il panchanga di un istante in un luogo.
 *
 * Il luogo è obbligatorio e non facoltativo come nel cielo: senza un orizzonte
 * non c'è un'alba, e senza un'alba manca una delle cinque parti. Un panchanga
 * con quattro membra sarebbe un'altra cosa con lo stesso nome.
 *
 * @example
 * ```ts
 * const oggi = computePanchanga(currentMoment('Asia/Kolkata'), {
 *   latitude: 28.6139,
 *   longitude: 77.209,
 * });
 * ```
 */
export function computePanchanga(
  moment: LocalMoment,
  place: Place,
  options: PanchangaOptions = {},
): Panchanga {
  validatePlace(place);

  const ayanamsaId = options.ayanamsa ?? DEFAULT_AYANAMSA;
  const context = zodiacContext(initEphemeris(options.ephemerisPath), {
    zodiac: 'siderale',
    ayanamsa: ayanamsaId,
  });
  const { time, warnings: timeWarnings } = resolveTime(moment);
  const { bodies, warnings: bodyWarnings } = computeBodies(
    time.julianDayUT,
    ['sole', 'luna'],
    context,
  );

  const warnings = [...context.warnings, ...timeWarnings, ...bodyWarnings];

  if (!time.timeKnown) {
    warnings.push(
      "Ora non indicata: il panchanga è quello di mezzogiorno locale. Un tithi dura " +
        'fra le ventidue e le ventisette ore, quindi a un altro momento della giornata ' +
        'può già esserne cominciato un altro.',
    );
  }

  const sun = bodies.find((body) => body.id === 'sole');
  const moon = bodies.find((body) => body.id === 'luna');
  if (!sun || !moon) {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      'Panchanga non calcolabile: servono Sole e Luna, e almeno uno dei due manca.',
    );
  }

  // La distanza fra Luna e Sole regge tithi e karana; la somma regge lo yoga.
  const elongation = normalize360(moon.longitude - sun.longitude);
  const sum = normalize360(moon.longitude + sun.longitude);

  const vara = varaAt(time.julianDayUT, place, moment.timezone, context);
  if (!vara) {
    warnings.push(
      "Vara non calcolabile: in questo luogo e in questa data il Sole non sorge. " +
        'Oltre i circoli polari resta sotto o sopra l\'orizzonte per settimane, e il ' +
        'giorno che comincia con l\'alba non comincia.',
    );
  }

  return {
    input: moment,
    place,
    time,
    ephemerisMode: context.mode,
    zodiac: 'siderale',
    ayanamsa: ayanamsaAt(time.julianDayUT, context, ayanamsaId),
    sun: sun.longitude,
    moon: moon.longitude,
    tithi: tithiOf(elongation),
    ...(vara ? { vara } : {}),
    nakshatra: nakshatraOf(moon.longitude),
    yoga: yogaOf(sum),
    karana: karanaOf(elongation),
    warnings,
  };
}

/** Il tithi da una distanza Luna-Sole già normalizzata. */
export function tithiOf(elongation: number): Tithi {
  const passati = Math.floor(elongation / TITHI_SPAN);
  const index = passati + 1;
  const paksha = index <= 15 ? 'shukla' : 'krishna';
  const numberInPaksha = index <= 15 ? index : index - 15;

  // Il quindicesimo di ogni metà ha un nome suo: Luna piena e Luna nuova.
  const name =
    numberInPaksha === 15
      ? paksha === 'shukla'
        ? 'Purnima'
        : 'Amavasya'
      : (TITHI_NAMES[numberInPaksha - 1] as string);

  return {
    index,
    name,
    paksha,
    numberInPaksha,
    degree: elongation - passati * TITHI_SPAN,
  };
}

/**
 * Il karana da una distanza Luna-Sole già normalizzata.
 *
 * La sequenza dei sessanta non è un ciclo solo. Il primo mezzo tithi del mese
 * è Kimstughna e gli ultimi tre sono Shakuni, Chatushpada e Naga: quattro
 * fissi che compaiono una volta sola. In mezzo restano cinquantasei posti, che
 * sono esattamente otto giri dei sette mobili.
 */
export function karanaOf(elongation: number): Karana {
  const passati = Math.floor(elongation / KARANA_SPAN);
  const index = passati + 1;
  const degree = elongation - passati * KARANA_SPAN;

  if (index === 1) return { index, name: 'Kimstughna', movable: false, degree };
  if (index === 58) return { index, name: 'Shakuni', movable: false, degree };
  if (index === 59) return { index, name: 'Chatushpada', movable: false, degree };
  if (index === 60) return { index, name: 'Naga', movable: false, degree };

  return {
    index,
    name: MOVABLE_KARANAS[(index - 2) % MOVABLE_KARANAS.length] as string,
    movable: true,
    degree,
  };
}

/** Lo yoga dalla somma delle due longitudini, già normalizzata. */
export function yogaOf(sum: number): PanchangaYoga {
  const passati = Math.floor(sum / NAKSHATRA_SPAN);

  return {
    index: passati + 1,
    name: YOGA_NAMES[passati] as string,
    degree: sum - passati * NAKSHATRA_SPAN,
  };
}

/**
 * La vara dell'istante: il giorno della settimana cominciato all'ultima alba.
 *
 * `null` dove un'alba non c'è. Cerca all'indietro perché il giorno in corso è
 * quello aperto dall'alba **precedente** l'istante, non da quella successiva:
 * alle tre del mattino di lunedì regge ancora la domenica.
 */
function varaAt(
  julianDayUT: number,
  place: Place,
  timezone: string,
  context: EphemerisContext,
): Vara | null {
  const sunrise = lastSunrise(julianDayUT, place, context);
  if (sunrise === null) return null;

  const local = julianDayToISO(sunrise, timezone);
  // `getUTCDay` sull'istante locale sarebbe il giorno sbagliato: si prende il
  // giorno civile del luogo, che è quello scritto nella stringa.
  const giorno = new Date(`${local.slice(0, 10)}T00:00:00Z`).getUTCDay();

  return {
    index: giorno + 1,
    name: VARA_NAMES[giorno] as string,
    lord: WEEKDAY_RULERS[giorno] as Vara['lord'],
    sunrise: julianDayToISO(sunrise),
    local,
  };
}

/** L'ultima alba non successiva all'istante, o `null` se in due giorni non ce n'è. */
function lastSunrise(
  julianDayUT: number,
  place: Place,
  context: EphemerisContext,
): number | null {
  // Un giorno e mezzo indietro: basta a coprire il giorno in corso anche alle
  // latitudini dove l'alba slitta di molto da una data all'altra.
  let candidato = riseOrSet('rise', julianDayUT - 1.5, place, context, VISIBILE);
  if (candidato === null || candidato > julianDayUT) return null;

  // Nell'intervallo cercato ci stanno due albe: si tiene la più recente fra
  // quelle già passate.
  for (;;) {
    const successiva = riseOrSet('rise', candidato + 0.1, place, context, VISIBILE);
    if (successiva === null || successiva > julianDayUT) return candidato;
    candidato = successiva;
  }
}
