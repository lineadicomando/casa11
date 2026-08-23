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

/**
 * L'ora siderale come `hh:mm:ss`.
 *
 * **Si arrotonda una volta sola, ai secondi interi, e da lì si conta con
 * numeri interi.** Il riporto dei sessanta secondi diventa così una divisione,
 * e non un secondo giro in virgola mobile: riportare il conto su
 * `h + (m + 1) / 60` e riformattarlo non termina, perché per ventiquattro dei
 * sessanta minuti possibili quella frazione moltiplicata per sessanta non
 * torna intera — `41 / 60 * 60` fa `40,99999999999999` — i secondi
 * riarrotondano di nuovo a sessanta e si riparte dallo stesso valore.
 */
export function formatHours(hours: number): string {
  // Il modulo chiude il caso in cui l'arrotondamento porti a ventiquattro ore
  // esatte: là il tempo siderale ricomincia da zero.
  const secondi = Math.round(hours * 3600) % 86_400;
  const parti = [Math.floor(secondi / 3600), Math.floor(secondi / 60) % 60, secondi % 60];

  return parti.map((parte) => String(parte).padStart(2, '0')).join(':');
}
