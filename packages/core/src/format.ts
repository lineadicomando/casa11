import { formatDegrees, formatZodiacal } from './math.js';
import type { NatalChart } from './types.js';

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

  const place = `${formatCoordinate(input.latitude, 'N', 'S')} ${formatCoordinate(input.longitude, 'E', 'O')}`;
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

function nameOf(chart: NatalChart, id: string): string {
  return chart.bodies.find((body) => body.id === id)?.name ?? id;
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
