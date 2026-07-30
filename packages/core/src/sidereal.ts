import sweph from 'sweph';
import type { SiderealTime } from './types.js';

/**
 * Tempo siderale locale, cioè quanto del cielo è già passato sul meridiano
 * del luogo.
 *
 * È la grandezza da cui discendono Ascendente e cuspidi: se la conversione da
 * ora locale a Tempo Universale è sbagliata, il tempo siderale lo mostra
 * subito, mentre le posizioni planetarie — che si spostano di poco in un'ora —
 * possono sembrare plausibili. Per questo vale la pena esporlo.
 *
 * Si usa il tempo siderale *apparente* di Swiss Ephemeris, che include la
 * nutazione: è il valore riportato dalle effemeridi stampate e dai programmi
 * astrologici.
 */
export function localSiderealTime(julianDayUT: number, longitude: number): SiderealTime {
  const greenwich = sweph.sidtime(julianDayUT);
  // Ogni grado di longitudine geografica vale quattro minuti di tempo.
  const hours = normalizeHours(greenwich + longitude / 15);

  return { hours, formatted: formatHours(hours) };
}

function normalizeHours(value: number): number {
  const hours = value % 24;
  return hours < 0 ? hours + 24 : hours;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const minutesFloat = (hours - h) * 60;
  const m = Math.floor(minutesFloat);
  const s = Math.round((minutesFloat - m) * 60);

  // L'arrotondamento dei secondi può produrre 60: si riporta sui minuti.
  if (s === 60) return formatHours(normalizeHours(h + (m + 1) / 60));

  return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':');
}
