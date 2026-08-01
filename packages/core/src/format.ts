import { BODIES, NATAL_POINT_NAMES } from './constants.js';
import { formatDegrees, formatZodiacal } from './math.js';
import type {
  Angles,
  Aspect,
  BodyId,
  CelestialBody,
  ElectionResult,
  House,
  NatalChart,
  NatalPointId,
  PassageRange,
  Place,
  SignIngress,
  SkyChart,
  SkyPassage,
  Station,
  TransitChart,
  TransitPassage,
} from './types.js';

/**
 * Rende il tema in forma tabellare compatta.
 *
 * Pensata per essere consumata da un modello linguistico: circa un ottavo
 * dei token del JSON completo, a parità di informazione astrologica.
 * Per le integrazioni programmatiche usare direttamente l'oggetto `NatalChart`.
 */
export function formatChartCompact(chart: NatalChart): string {
  const lines: string[] = [];
  const { input, time } = chart;

  const place = formatPlace(input);
  const when = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone}, UTC${formatOffset(time.offsetMinutes)})`
    : `${input.date} (ora ignota)`;

  lines.push(`TEMA NATALE — ${when} — ${place}`);
  lines.push(
    `Case: ${chart.houseSystem} | Effemeridi: ${chart.ephemerisMode} | UT: ${time.utc}`,
  );
  lines.push(
    `Tempo siderale locale: ${chart.siderealTime.formatted}` +
      (chart.sect ? ` | Settore: ${chart.sect}` : ''),
  );

  lines.push('', 'CORPI', ...bodyLines(chart.bodies));

  if (chart.partOfFortune) {
    const house =
      chart.partOfFortune.house !== undefined ? ` casa ${chart.partOfFortune.house}` : '';
    lines.push(
      `${'Fortuna'.padEnd(11)} ${formatZodiacal(chart.partOfFortune.longitude).padEnd(11)}  ${house}`,
    );
  }

  if (chart.angles) lines.push('', 'ASSI', ...angleLines(chart.angles));
  if (chart.houses.length > 0) lines.push('', 'CUSPIDI', ...cuspLines(chart.houses));

  lines.push('', 'ASPETTI', ...aspectLines(chart));
  lines.push(...warningLines(chart.warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il cielo di un istante.
 *
 * L'intestazione dice che cosa manca e perché: senza luogo non ci sono assi
 * né case, e chi legge non deve chiedersi se siano stati dimenticati.
 */
export function formatSkyCompact(sky: SkyChart): string {
  const { input, time } = sky;

  const when = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone}, UTC${formatOffset(time.offsetMinutes)})`
    : `${input.date} (ora non indicata, mezzogiorno locale)`;

  const lines = [
    `CIELO — ${when}`,
    `Effemeridi: ${sky.ephemerisMode} | UT: ${time.utc}`,
  ];

  if (sky.place) {
    const details = [`Luogo: ${formatPlace(sky.place)}`];
    if (sky.houseSystem) details.push(`Case: ${sky.houseSystem}`);
    if (sky.siderealTime) details.push(`Tempo siderale: ${sky.siderealTime.formatted}`);
    if (sky.sect) details.push(`Settore: ${sky.sect}`);
    lines.push(details.join(' | '));
  } else {
    lines.push('Senza luogo: posizioni valide ovunque, nessun asse e nessuna casa.');
  }

  lines.push('', 'CORPI', ...bodyLines(sky.bodies));

  if (sky.angles) lines.push('', 'ASSI', ...angleLines(sky.angles));
  if (sky.houses.length > 0) lines.push('', 'CUSPIDI', ...cuspLines(sky.houses));

  lines.push('', 'ASPETTI', ...aspectLines(sky));
  lines.push(...warningLines(sky.warnings));

  return lines.join('\n');
}

/**
 * Rende i transiti in forma tabellare compatta.
 *
 * Prende anche il tema natale perché senza non si possono nominare i
 * bersagli, e perché chi legge deve vedere su quale nascita sta lavorando:
 * un quadro di transiti senza la data di nascita è un cielo qualsiasi.
 */
export function formatTransitsCompact(natal: NatalChart, transits: TransitChart): string {
  const lines: string[] = [];
  const { input, time } = transits;

  const when = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone}, UTC${formatOffset(time.offsetMinutes)})`
    : `${input.date} (ora non indicata, mezzogiorno locale)`;
  const birth = natal.time.timeKnown
    ? `${natal.input.date} ${natal.input.time}`
    : `${natal.input.date} (ora ignota)`;

  lines.push(`TRANSITI — ${when}`);
  lines.push(`Tema natale: ${birth} — ${formatPlace(natal.input)}`);
  lines.push(
    `Case natali: ${natal.houseSystem} | Effemeridi: ${transits.ephemerisMode} | UT: ${time.utc}`,
  );

  // La casa è quella natale in cui il transito cade: è il senso della colonna.
  lines.push('', 'IN TRANSITO', ...bodyLines(transits.transiting));

  lines.push('', 'ASPETTI (in transito → natale)');
  if (transits.aspects.length === 0) {
    lines.push('(nessuno entro le orbite dei transiti)');
  }
  for (const aspect of transits.aspects) {
    const moving = transits.transiting.find((body) => body.id === aspect.transiting);
    const direction = aspect.applying ? 'applicativo' : 'separativo';
    lines.push(
      `${(moving?.name ?? aspect.transiting).padEnd(11)} ${aspect.aspect.padEnd(15)} ` +
        `${natalPointName(natal, aspect.natal).padEnd(11)} ` +
        `${formatDegrees(aspect.orb).padStart(7)}  ${direction}${aspect.retrograde ? '  R' : ''}`,
    );
  }

  lines.push(...warningLines(transits.warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il calendario degli incontri in cielo.
 *
 * Una riga per aspetto esatto, in ordine di tempo, con il moto di **entrambi**
 * i corpi: è quello a spiegare perché uno stesso incontro possa comparire tre
 * volte a poche settimane di distanza.
 */
export function formatSkyPassagesCompact(
  passages: readonly SkyPassage[],
  range: PassageRange,
  warnings: readonly string[] = [],
): string {
  const lines = [`INCONTRI IN CIELO — dal ${range.from} al ${range.to} (${range.timezone})`, ''];

  if (passages.length === 0) {
    lines.push('(nessun aspetto si perfeziona in questo arco di tempo)');
    return lines.join('\n');
  }

  lines.push('Data e ora locali | più veloce | aspetto | più lento | moto | finestra');
  for (const passage of passages) {
    const window = passage.window
      ? `${passage.window.start.slice(0, 10)} → ${passage.window.end.slice(0, 10)}`
      : 'oltre i tre anni';
    const motion = `${passage.retrograde.faster ? 'R' : 'D'}/${passage.retrograde.slower ? 'R' : 'D'}`;

    lines.push(
      `${passage.local.slice(0, 16).replace('T', ' ')} ` +
        `${bodyName(passage.faster).padEnd(11)} ${passage.aspect.padEnd(15)} ` +
        `${bodyName(passage.slower).padEnd(11)} ${motion}  ${window}`,
    );
  }

  lines.push(...warningLines(warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare ingressi e stazioni.
 *
 * Le due tabelle stanno insieme perché rispondono alla stessa domanda — che
 * cosa cambia nel cielo in questo periodo — e perché spesso si spiegano a
 * vicenda: un pianeta che si ferma appena dentro un segno lo lascerà di nuovo.
 */
export function formatSkyEventsCompact(
  ingresses: readonly SignIngress[],
  stations: readonly Station[],
  range: PassageRange,
  warnings: readonly string[] = [],
): string {
  const lines = [`EVENTI DEL CIELO — dal ${range.from} al ${range.to} (${range.timezone})`];

  lines.push('', 'INGRESSI NEI SEGNI');
  if (ingresses.length === 0) {
    lines.push('(nessuno in questo arco di tempo)');
  }
  for (const ingress of ingresses) {
    lines.push(
      `${ingress.local.slice(0, 16).replace('T', ' ')} ` +
        `${bodyName(ingress.body).padEnd(11)} ${ingress.from} → ${ingress.sign}` +
        `${ingress.retrograde ? '  (all\'indietro)' : ''}`,
    );
  }

  lines.push('', 'STAZIONI');
  if (stations.length === 0) {
    lines.push('(nessuna in questo arco di tempo)');
  }
  for (const station of stations) {
    lines.push(
      `${station.local.slice(0, 16).replace('T', ' ')} ` +
        `${bodyName(station.body).padEnd(11)} ${station.direction.padEnd(11)} ` +
        `${formatZodiacal(station.longitude)}`,
    );
  }

  lines.push(...warningLines(warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il calendario dei passaggi.
 *
 * Una riga per aspetto esatto, in ordine di tempo. La colonna del moto è
 * quella che dà senso all'elenco: tre righe uguali a mesi di distanza, con
 * una `R` in mezzo, sono un pianeta lento che passa e ripassa — e si legge
 * come un periodo unico, non come tre fatti separati.
 */
export function formatPassagesCompact(
  natal: NatalChart,
  passages: readonly TransitPassage[],
  range: PassageRange,
  warnings: readonly string[] = [],
): string {
  const birth = natal.time.timeKnown
    ? `${natal.input.date} ${natal.input.time}`
    : `${natal.input.date} (ora ignota)`;

  const lines = [
    `PASSAGGI — dal ${range.from} al ${range.to} (${range.timezone})`,
    `Tema natale: ${birth} — ${formatPlace(natal.input)}`,
    '',
  ];

  if (passages.length === 0) {
    lines.push('(nessun aspetto si perfeziona in questo arco di tempo)');
    return lines.join('\n');
  }

  lines.push('Data e ora locali | transitante | aspetto | punto natale | moto | finestra');
  for (const passage of passages) {
    const window = passage.window
      ? `${passage.window.start.slice(0, 10)} → ${passage.window.end.slice(0, 10)}`
      : 'oltre i tre anni';

    lines.push(
      `${passage.local.slice(0, 16).replace('T', ' ')} ` +
        `${nameOf(natal, passage.transiting).padEnd(11)} ${passage.aspect.padEnd(15)} ` +
        `${natalPointName(natal, passage.natal).padEnd(11)} ` +
        `${passage.retrograde ? 'R' : 'D'}  ${window}`,
    );
  }

  lines.push(...warningLines(warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il calendario elettivo.
 *
 * Le ore vanno raggruppate per giorno perché è così che si consultano, e la
 * durata va scritta accanto a ciascuna: sono ore che non durano un'ora, e
 * vederne una da settantotto minuti accanto a una da quarantadue dice della
 * stagione più di qualunque didascalia.
 *
 * I vuoti di corso stanno in coda e non dentro le righe: sono intervalli loro,
 * che tagliano le ore invece di allinearvisi.
 */
export function formatElectionCompact(election: ElectionResult): string {
  const { range, place, hours, voids } = election;
  const lines = [
    `ELEZIONE — dal ${range.from} al ${range.to} (${range.timezone})`,
    `Luogo: ${formatPlace(place)}`,
  ];

  if (hours.length === 0) {
    lines.push('', '(nessuna ora planetaria calcolabile in questo arco)');
    lines.push(...warningLines(election.warnings));
    return lines.join('\n');
  }

  lines.push('', 'ORE PLANETARIE');
  lines.push('Ora locale | reggitore | d/n | durata | Ascendente | Luna');

  let day = '';
  for (const hour of hours) {
    const current = hour.local.start.slice(0, 10);
    if (current !== day) {
      day = current;
      lines.push(`— ${day}`);
    }

    lines.push(
      `${hour.local.start.slice(11, 16)}-${hour.local.end.slice(11, 16)} ` +
        `${bodyName(hour.ruler).padEnd(10)} ` +
        `${hour.diurnal ? 'd' : 'n'}${String(hour.index).padStart(2)} ` +
        `${String(hour.minutes).padStart(3)}m ` +
        `${formatZodiacal(hour.ascendant.longitude).padEnd(11)} ` +
        `${hour.moonVoid ? 'vuota' : ''}`.trimEnd(),
    );
  }

  lines.push('', 'LUNA VUOTA DI CORSO');
  if (voids.length === 0) {
    lines.push('(nessun tratto in questo arco di tempo)');
  }
  for (const period of voids) {
    const last = period.lastAspect
      ? `dopo ${period.lastAspect.aspect} a ${bodyName(period.lastAspect.body)}`
      : 'dall\'ingresso, senza aspetti nel segno';
    lines.push(
      `${period.local.start.slice(0, 16).replace('T', ' ')} → ` +
        `${period.local.end.slice(0, 16).replace('T', ' ')} ` +
        `(${period.minutes} min) in ${period.sign}, ${last}, poi ${period.nextSign}`,
    );
  }

  lines.push(...warningLines(election.warnings));

  return lines.join('\n');
}

/** Una riga per corpo: nome, posizione zodiacale, moto, casa se c'è. */
function bodyLines(bodies: readonly CelestialBody[]): string[] {
  return bodies.map((body) => {
    const retro = body.retrograde ? ' R' : '  ';
    const house = body.house !== undefined ? ` casa ${String(body.house).padStart(2)}` : '';
    return `${body.name.padEnd(11)} ${formatZodiacal(body.longitude).padEnd(11)}${retro}${house}`;
  });
}

function angleLines(angles: Angles): string[] {
  return [
    `ASC ${formatZodiacal(angles.ascendant)}   MC  ${formatZodiacal(angles.midheaven)}`,
    `DSC ${formatZodiacal(angles.descendant)}   IC  ${formatZodiacal(angles.imumCoeli)}`,
  ];
}

/** Le dodici cuspidi, tre per riga: dodici righe da sole occuperebbero uno schermo. */
function cuspLines(houses: readonly House[]): string[] {
  const lines: string[] = [];
  for (let i = 0; i < houses.length; i += 3) {
    lines.push(
      houses
        .slice(i, i + 3)
        .map((h) => `${String(h.number).padStart(2)}. ${formatZodiacal(h.longitude).padEnd(11)}`)
        .join(' '),
    );
  }
  return lines;
}

function aspectLines(chart: { bodies: readonly CelestialBody[]; aspects: readonly Aspect[] }): string[] {
  if (chart.aspects.length === 0) return ['(nessuno entro le orbite previste)'];

  return chart.aspects.map((aspect) => {
    const direction = aspect.applying ? 'applicativo' : 'separativo';
    return (
      `${nameOf(chart, aspect.from).padEnd(11)} ${aspect.aspect.padEnd(15)} ` +
      `${nameOf(chart, aspect.to).padEnd(11)} ` +
      `${formatDegrees(aspect.orb).padStart(7)}  ${direction}`
    );
  });
}

function warningLines(warnings: readonly string[]): string[] {
  if (warnings.length === 0) return [];
  return ['', 'AVVERTENZE', ...warnings.map((warning) => `- ${warning}`)];
}

function nameOf(chart: { bodies: readonly CelestialBody[] }, id: string): string {
  return chart.bodies.find((body) => body.id === id)?.name ?? id;
}

/** Il nome di un corpo quando non c'è nessuna carta da cui ricavarlo. */
function bodyName(id: BodyId): string {
  return BODIES.find((body) => body.id === id)?.name ?? id;
}

/** Gli stessi nomi visti come mappa parziale su tutti i bersagli possibili. */
const POINT_NAMES: Readonly<Partial<Record<NatalPointId, string>>> = NATAL_POINT_NAMES;

/** Il nome di un bersaglio natale: un corpo del tema, oppure un asse. */
function natalPointName(chart: NatalChart, id: NatalPointId): string {
  return POINT_NAMES[id] ?? nameOf(chart, id);
}

function formatPlace(place: Place): string {
  return `${formatCoordinate(place.latitude, 'N', 'S')} ${formatCoordinate(place.longitude, 'E', 'O')}`;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}${hemisphere}`;
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = Math.round(absolute % 60);
  return `${sign}${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
