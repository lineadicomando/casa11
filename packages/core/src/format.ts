import { NATAL_POINT_NAMES } from './constants.js';
import { formatDegrees, formatZodiacal } from './math.js';
import type {
  BirthData,
  NatalChart,
  NatalPointId,
  PassageRange,
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

  lines.push('', 'CORPI');
  for (const body of chart.bodies) {
    const retro = body.retrograde ? ' R' : '  ';
    const house = body.house !== undefined ? ` casa ${String(body.house).padStart(2)}` : '';
    lines.push(`${body.name.padEnd(11)} ${formatZodiacal(body.longitude).padEnd(11)}${retro}${house}`);
  }

  if (chart.partOfFortune) {
    const house =
      chart.partOfFortune.house !== undefined ? ` casa ${chart.partOfFortune.house}` : '';
    lines.push(
      `${'Fortuna'.padEnd(11)} ${formatZodiacal(chart.partOfFortune.longitude).padEnd(11)}  ${house}`,
    );
  }

  if (chart.angles) {
    lines.push('', 'ASSI');
    lines.push(`ASC ${formatZodiacal(chart.angles.ascendant)}   MC  ${formatZodiacal(chart.angles.midheaven)}`);
    lines.push(`DSC ${formatZodiacal(chart.angles.descendant)}   IC  ${formatZodiacal(chart.angles.imumCoeli)}`);
  }

  if (chart.houses.length > 0) {
    lines.push('', 'CUSPIDI');
    for (let i = 0; i < chart.houses.length; i += 3) {
      lines.push(
        chart.houses
          .slice(i, i + 3)
          .map((h) => `${String(h.number).padStart(2)}. ${formatZodiacal(h.longitude).padEnd(11)}`)
          .join(' '),
      );
    }
  }

  lines.push('', 'ASPETTI');
  if (chart.aspects.length === 0) {
    lines.push('(nessuno entro le orbite previste)');
  }
  for (const aspect of chart.aspects) {
    const from = nameOf(chart, aspect.from);
    const to = nameOf(chart, aspect.to);
    const direction = aspect.applying ? 'applicativo' : 'separativo';
    lines.push(
      `${from.padEnd(11)} ${aspect.aspect.padEnd(15)} ${to.padEnd(11)} ` +
        `${formatDegrees(aspect.orb).padStart(7)}  ${direction}`,
    );
  }

  if (chart.warnings.length > 0) {
    lines.push('', 'AVVERTENZE');
    for (const warning of chart.warnings) lines.push(`- ${warning}`);
  }

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

  lines.push('', 'IN TRANSITO');
  for (const body of transits.transiting) {
    const retro = body.retrograde ? ' R' : '  ';
    // La casa è quella natale in cui il transito cade: è il senso della colonna.
    const house = body.house !== undefined ? ` casa ${String(body.house).padStart(2)}` : '';
    lines.push(
      `${body.name.padEnd(11)} ${formatZodiacal(body.longitude).padEnd(11)}${retro}${house}`,
    );
  }

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

  if (transits.warnings.length > 0) {
    lines.push('', 'AVVERTENZE');
    for (const warning of transits.warnings) lines.push(`- ${warning}`);
  }

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

  if (warnings.length > 0) {
    lines.push('', 'AVVERTENZE');
    for (const warning of warnings) lines.push(`- ${warning}`);
  }

  return lines.join('\n');
}

function nameOf(chart: NatalChart, id: string): string {
  return chart.bodies.find((body) => body.id === id)?.name ?? id;
}

/** Gli stessi nomi visti come mappa parziale su tutti i bersagli possibili. */
const POINT_NAMES: Readonly<Partial<Record<NatalPointId, string>>> = NATAL_POINT_NAMES;

/** Il nome di un bersaglio natale: un corpo del tema, oppure un asse. */
function natalPointName(chart: NatalChart, id: NatalPointId): string {
  return POINT_NAMES[id] ?? nameOf(chart, id);
}

function formatPlace(birth: BirthData): string {
  return `${formatCoordinate(birth.latitude, 'N', 'S')} ${formatCoordinate(birth.longitude, 'E', 'O')}`;
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
