/**
 * L'istante di cui si vuole il cielo, letto dai parametri.
 *
 * I formati sono controllati qui e non lasciati al motore perché una
 * richiesta di transiti porta **due** date: un messaggio che dicesse solo
 * «data non valida» lascerebbe a chi chiama il compito di indovinare quale
 * delle due correggere. Da qui i due nomi diversi per lo stesso istante.
 */

import type { LocalMoment } from '@dodicisegni/core';
import { error } from '@sveltejs/kit';
import { isKnownTimezone, wallClock } from '$lib/clock';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

export interface RequestedMoment {
  moment: LocalMoment;
  /**
   * `false` quando la richiesta non nomina un giorno: vale «adesso», e la
   * risposta scade da sé. Da qui dipende se sia lecito conservarla.
   */
  explicit: boolean;
}

/** Come si chiamano i parametri dell'istante, e con che codice si rifiutano. */
interface MomentFields {
  date: string;
  time: string;
  timezone: string;
  codes: { date: string; time: string; timezone: string };
}

/** Nei transiti il prefisso distingue l'istante dalla data di nascita. */
const TRANSITO: MomentFields = {
  date: 'transitDate',
  time: 'transitTime',
  timezone: 'transitTimezone',
  codes: {
    date: 'DATA_TRANSITO_NON_VALIDA',
    time: 'ORA_TRANSITO_NON_VALIDA',
    timezone: 'FUSO_TRANSITO_NON_VALIDO',
  },
};

/**
 * Nel cielo la data è una sola, quindi non ha bisogno di qualificarsi. I
 * codici sono gli stessi che userebbe il motore: chi chiama ramifica allo
 * stesso modo, senza sapere dove sia stata intercettata la richiesta.
 */
const CIELO: MomentFields = {
  date: 'date',
  time: 'time',
  timezone: 'timezone',
  codes: {
    date: 'DATA_NON_VALIDA',
    time: 'ORA_NON_VALIDA',
    timezone: 'FUSO_ORARIO_NON_VALIDO',
  },
};

/**
 * Compone l'istante del transito.
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
  return resolveMoment(parameters, TRANSITO, birthTimezone, now);
}

/**
 * Compone l'istante del cielo.
 *
 * Il fuso predefinito è quello della località, se ne è stata scelta una, e
 * altrimenti UTC: senza nascita e senza luogo non esiste un orologio più
 * legittimo di un altro, e quello del server sarebbe il meno prevedibile.
 */
export function resolveSkyMoment(
  parameters: URLSearchParams,
  fallbackTimezone = 'UTC',
  now: Date = new Date(),
): RequestedMoment {
  return resolveMoment(parameters, CIELO, fallbackTimezone, now);
}

/**
 * Senza data vale adesso, ora compresa: chi non indica un giorno vuole il
 * cielo di questo momento. Con un giorno ma senza ora decide il motore, che
 * ripiega su mezzogiorno e lo dichiara fra le avvertenze.
 */
function resolveMoment(
  parameters: URLSearchParams,
  fields: MomentFields,
  fallbackTimezone: string,
  now: Date,
): RequestedMoment {
  const timezone = readTimezone(parameters, fields) ?? fallbackTimezone;
  const date = read(parameters, fields.date, DATE_PATTERN, {
    code: fields.codes.date,
    expected: 'il formato YYYY-MM-DD',
  });
  const time = read(parameters, fields.time, TIME_PATTERN, {
    code: fields.codes.time,
    expected: 'il formato HH:mm oppure HH:mm:ss',
  });

  if (date) {
    const moment: LocalMoment = { date, timezone };
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
function readTimezone(parameters: URLSearchParams, fields: MomentFields): string | null {
  const timezone = parameters.get(fields.timezone);
  if (timezone === null || timezone === '') return null;

  if (!isKnownTimezone(timezone)) {
    throw error(400, {
      message: `Fuso orario "${timezone}" sconosciuto: atteso un identificatore IANA, es. Europe/Rome.`,
      code: fields.codes.timezone,
    });
  }
  return timezone;
}
