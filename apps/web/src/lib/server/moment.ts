/**
 * L'istante di cui si vogliono i transiti, letto dai parametri.
 *
 * I formati sono controllati qui e non lasciati al motore perché una
 * richiesta di transiti porta **due** date: un messaggio che dicesse solo
 * «data non valida» lascerebbe a chi chiama il compito di indovinare quale
 * delle due correggere.
 */

import type { TransitMoment } from '@undicesimacasa/core';
import { error } from '@sveltejs/kit';
import { isKnownTimezone, wallClock } from '$lib/clock';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

export interface RequestedMoment {
  moment: TransitMoment;
  /**
   * `false` quando la richiesta non nomina un giorno: vale «adesso», e la
   * risposta scade da sé. Da qui dipende se sia lecito conservarla.
   */
  explicit: boolean;
}

/**
 * Compone l'istante del transito.
 *
 * Senza `transitDate` vale adesso, ora compresa: chi non indica un giorno
 * vuole il cielo di questo momento. Con un giorno ma senza ora decide il
 * motore, che ripiega su mezzogiorno e lo dichiara fra le avvertenze.
 *
 * Il fuso predefinito è quello della nascita e non quello del server: i
 * transiti si leggono sull'ora della persona, e un server altrove sposterebbe
 * il giorno di chi guarda a cavallo della mezzanotte.
 */
export function resolveTransitMoment(
  parameters: URLSearchParams,
  birthTimezone: string,
  now: Date = new Date(),
): RequestedMoment {
  const timezone = readTimezone(parameters) ?? birthTimezone;
  const date = read(parameters, 'transitDate', DATE_PATTERN, {
    code: 'DATA_TRANSITO_NON_VALIDA',
    expected: 'il formato YYYY-MM-DD',
  });
  const time = read(parameters, 'transitTime', TIME_PATTERN, {
    code: 'ORA_TRANSITO_NON_VALIDA',
    expected: 'il formato HH:mm oppure HH:mm:ss',
  });

  if (date) {
    const moment: TransitMoment = { date, timezone };
    if (time) moment.time = time;
    return { moment, explicit: true };
  }

  const adesso = wallClock(now, timezone);
  return {
    moment: { date: adesso.date, time: time ?? adesso.time, timezone },
    explicit: false,
  };
}

function read(
  parameters: URLSearchParams,
  name: string,
  pattern: RegExp,
  { code, expected }: { code: string; expected: string },
): string | null {
  const value = parameters.get(name);
  if (value === null || value === '') return null;

  if (!pattern.test(value)) {
    throw error(400, { message: `Valore di "${name}" non valido: atteso ${expected}.`, code });
  }
  return value;
}

/**
 * Il fuso del transito, verificato subito.
 *
 * Un identificatore ignoto farebbe fallire la conversione dell'ora corrente
 * con un errore di piattaforma, che diventerebbe un 500: è invece una
 * richiesta da correggere.
 */
function readTimezone(parameters: URLSearchParams): string | null {
  const timezone = parameters.get('transitTimezone');
  if (timezone === null || timezone === '') return null;

  if (!isKnownTimezone(timezone)) {
    throw error(400, {
      message: `Fuso orario "${timezone}" sconosciuto: atteso un identificatore IANA, es. Europe/Rome.`,
      code: 'FUSO_TRANSITO_NON_VALIDO',
    });
  }
  return timezone;
}
