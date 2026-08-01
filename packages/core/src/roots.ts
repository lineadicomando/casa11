/**
 * Il mestiere comune ai due calendari: trovare l'istante in cui un angolo si
 * chiude.
 *
 * Il metodo è quello classico per le radici di una funzione continua del
 * tempo: si campiona lo scarto dall'angolo esatto a passo commisurato alla
 * velocità in gioco, si cerca dove cambia segno, e lì si dimezza l'intervallo
 * fino al minuto. Un aspetto sfiorato e non raggiunto — il corpo inverte il
 * moto appena prima — non produce cambi di segno e non viene elencato, che è
 * il risultato corretto.
 *
 * Che a muoversi sia un corpo solo, contro una posizione di nascita ferma per
 * sempre, oppure due corpi l'uno rispetto all'altro, cambia solo la funzione:
 * qui si lavora sul tempo, non sulle longitudini.
 */

import { DateTime } from 'luxon';
import { ChartError } from './errors.js';
import { resolveTime } from './time.js';
import type { PassageRange } from './types.js';

/** Gradi di moto per passo di campionamento: più fitto di così è sprecato. */
export const STEP_DEGREES = 2;
/** Estremi del passo, in giorni: sotto non serve, sopra si rischia di saltare. */
export const MIN_STEP_DAYS = 0.2;
export const MAX_STEP_DAYS = 10;
/** Un minuto: sotto questa soglia l'istante esatto non si affina oltre. */
export const PRECISION_DAYS = 1 / 1440;
/** Oltre questo arco la finestra non è più una finestra. */
export const MAX_WINDOW_DAYS = 1095;
/** L'orbita più larga concessa a un aspetto: congiunzione più i due luminari. */
export const WIDEST_ORB = 4;

/** Il passo di campionamento per una velocità in gradi al giorno. */
export function stepFor(degreesPerDay: number): number {
  return Math.min(MAX_STEP_DAYS, Math.max(MIN_STEP_DAYS, STEP_DEGREES / degreesPerDay));
}

/**
 * Gli angoli firmati di un aspetto.
 *
 * Un trigono si perfeziona due volte per giro: quando un corpo è 120° avanti
 * all'altro e quando gli è 120° indietro. Trattarli come due bersagli distinti
 * evita di ragionare su una separazione ripiegata in [0, 180].
 */
export function signedAngles(angle: number): number[] {
  return angle === 0 || angle === 180 ? [angle] : [angle, -angle];
}

/** Gli estremi dell'arco richiesto, in giorni giuliani. */
export function resolveRange(range: PassageRange): { start: number; end: number } {
  const start = resolveTime({ date: range.from, time: '00:00', timezone: range.timezone });
  const end = resolveTime({ date: range.to, time: '23:59', timezone: range.timezone });

  if (end.time.julianDayUT <= start.time.julianDayUT) {
    throw new ChartError(
      'INTERVALLO_NON_VALIDO',
      `Intervallo vuoto: "${range.to}" non è successivo a "${range.from}".`,
    );
  }

  return { start: start.time.julianDayUT, end: end.time.julianDayUT };
}

/**
 * Dimezza l'intervallo finché l'istante non è determinato al minuto.
 *
 * Più in là non ha senso spingersi: le effemeridi sono esatte al secondo
 * d'arco, ma un aspetto «esatto» al secondo di tempo è una precisione che
 * nessuna lettura astrologica usa.
 *
 * `f` restituisce `null` quando la posizione non è calcolabile: la ricerca si
 * interrompe invece di dimezzare su un valore inventato.
 */
export function bisect(
  from: number,
  to: number,
  f: (julianDay: number) => number | null,
): number | null {
  let lo = from;
  let hi = to;

  const fLo = f(lo);
  if (fLo === null) return null;

  while (hi - lo > PRECISION_DAYS) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (fMid === null) return null;
    if (fMid === 0) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

/** Da giorno giuliano a ISO 8601, in UTC o nel fuso richiesto. */
export function julianDayToISO(julianDay: number, timezone = 'utc'): string {
  const millis = (julianDay - 2440587.5) * 86_400_000;
  return (
    DateTime.fromMillis(Math.round(millis / 60_000) * 60_000, { zone: timezone }).toISO({
      suppressMilliseconds: true,
      suppressSeconds: true,
    }) ?? ''
  );
}
