import { SIGN_ABBR, ZODIAC_SIGNS } from './constants.js';
import type { ZodiacSign } from './types.js';

/** Riporta un angolo qualsiasi nell'intervallo [0, 360). */
export function normalize360(degrees: number): number {
  const value = degrees % 360;
  return value < 0 ? value + 360 : value;
}

/**
 * Separazione angolare più breve fra due longitudini, in [0, 180].
 * È la misura usata per riconoscere gli aspetti.
 */
export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalize360(a) - normalize360(b));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Differenza fra due longitudini, **con il segno**, in (-180, 180].
 *
 * Non è `angularSeparation`: quella ripiega il risultato in [0, 180] e nei due
 * punti di ripiegamento non è derivabile, il che la rende inservibile a chi
 * cerca l'istante in cui un aspetto si perfeziona — proprio lì cadono
 * congiunzione e opposizione.
 */
export function signedDifference(a: number, b: number): number {
  const difference = normalize360(a - b);
  return difference > 180 ? difference - 360 : difference;
}

/**
 * Arco percorso in senso zodiacale (antiorario) da `from` a `to`, in [0, 360).
 * Serve per stabilire in quale casa cade un pianeta.
 */
export function arcForward(from: number, to: number): number {
  return normalize360(to - from);
}

export function signOf(longitude: number): ZodiacSign {
  const index = Math.floor(normalize360(longitude) / 30);
  // `index` è garantito in [0, 11] da normalize360, ma TypeScript non lo sa.
  return ZODIAC_SIGNS[index] ?? 'ariete';
}

/** Posizione all'interno del segno, in [0, 30). */
export function degreeInSign(longitude: number): number {
  return normalize360(longitude) % 30;
}

/** Formatta gradi decimali come `12°34'` (o `12°34'56"` con `withSeconds`). */
export function formatDegrees(degrees: number, withSeconds = false): string {
  const total = Math.abs(degrees);
  const deg = Math.floor(total);
  const minutesFloat = (total - deg) * 60;
  const min = withSeconds ? Math.floor(minutesFloat) : Math.round(minutesFloat);
  if (!withSeconds) {
    // L'arrotondamento dei minuti può produrre 60': normalizza.
    return min === 60 ? `${deg + 1}°00'` : `${deg}°${String(min).padStart(2, '0')}'`;
  }
  // L'arrotondamento dei secondi può produrre 60": si riporta sui minuti,
  // e da lì eventualmente sui gradi.
  const sec = Math.round((minutesFloat - min) * 60);
  const carriedMin = sec === 60 ? min + 1 : min;
  const finalDeg = carriedMin === 60 ? deg + 1 : deg;
  const finalMin = carriedMin === 60 ? 0 : carriedMin;
  const finalSec = sec === 60 ? 0 : sec;
  return `${finalDeg}°${String(finalMin).padStart(2, '0')}'${String(finalSec).padStart(2, '0')}"`;
}

/**
 * Formatta una longitudine eclittica come `12°34' Ari`.
 *
 * Il grado si arrotonda come dappertutto, **ma non oltre l'ultimo primo del
 * segno**. `formatDegrees` da sola, su un corpo a 29°59'40", scriverebbe
 * `30°00'`: dentro un segno non esiste, perché i trenta gradi finiscono a
 * 29°59'59". Non è un caso di scuola — il Sole del 19 febbraio 1980 ci sta
 * dentro, e la finestra è di mezzo primo per ogni corpo.
 *
 * Chiudere il riporto passando al segno successivo sarebbe peggio del rimedio:
 * cambierebbe il segno, che è il dato di un tema che pesa di più, per mezzo
 * secondo d'arco. Il segno resta quello in cui il corpo si trova davvero, e a
 * cedere è il primo.
 *
 * Il limite vale alla risoluzione con cui si stampa: sono i primi ad
 * arrotondare a sessanta, e con `withSeconds` i secondi.
 */
export function formatZodiacal(longitude: number, withSeconds = false): string {
  const risoluzione = withSeconds ? 3600 : 60;
  const ultimo = 30 * risoluzione - 1;
  const passi = Math.min(Math.round(degreeInSign(longitude) * risoluzione), ultimo);
  return `${formatDegrees(passi / risoluzione, withSeconds)} ${SIGN_ABBR[signOf(longitude)]}`;
}
