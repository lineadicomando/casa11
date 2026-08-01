/**
 * L'arco di tempo del calendario dei passaggi.
 *
 * Ha un tetto, che il motore non ha: cercare i passaggi costa proporzionalmente
 * alla durata, e un intervallo di secoli chiesto per errore — o per prova —
 * terrebbe occupato il server per il gusto di restituire diecimila righe che
 * nessuno leggerà.
 */

import type { PassageRange } from '@undicesimacasa/core';
import { error } from '@sveltejs/kit';
import { wallClock } from '$lib/clock';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GIORNO = 86_400_000;

/** Tre anni: il tempo in cui anche i pianeti più lenti chiudono un passaggio. */
export const MAX_RANGE_DAYS = 1096;

export interface RequestedRange {
  range: PassageRange;
  /** `false` quando l'inizio non era nella richiesta: vale oggi, e oggi cambia. */
  explicit: boolean;
}

/**
 * Compone l'arco dai parametri.
 *
 * Senza `from` si parte da oggi — è la domanda che si fa quasi sempre — e
 * senza `to` si arriva a un anno dopo, che è la durata entro cui un pianeta
 * lento completa l'andirivieni su uno stesso punto.
 */
export function resolvePassageRange(
  parameters: URLSearchParams,
  timezone: string,
  now: Date = new Date(),
  /**
   * Codice con cui rifiutare una data malformata. Nei passaggi natali le date
   * in gioco sono due — la nascita e l'arco — e il codice deve dire quale;
   * nel cielo ce n'è una sola, e vale quello del motore.
   */
  dateCode = 'DATA_TRANSITO_NON_VALIDA',
): RequestedRange {
  const from = read(parameters, 'from', dateCode);
  const to = read(parameters, 'to', dateCode);

  const start = from ?? wallClock(now, timezone).date;
  const end = to ?? addYear(start);

  const durata = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / GIORNO;
  if (!Number.isFinite(durata) || durata <= 0) {
    throw error(400, {
      message: `Intervallo vuoto: "${end}" non è successivo a "${start}".`,
      code: 'INTERVALLO_NON_VALIDO',
    });
  }
  if (durata > MAX_RANGE_DAYS) {
    throw error(400, {
      message:
        `Intervallo di ${Math.round(durata)} giorni: il massimo è ${MAX_RANGE_DAYS}, ` +
        'cioè tre anni. Chiedi archi più brevi, uno dopo l\'altro.',
      code: 'INTERVALLO_TROPPO_LUNGO',
    });
  }

  return { range: { from: start, to: end, timezone }, explicit: from !== null };
}

function read(parameters: URLSearchParams, name: string, code: string): string | null {
  const value = parameters.get(name);
  if (value === null || value === '') return null;

  if (!DATE_PATTERN.test(value)) {
    throw error(400, {
      message: `Valore di "${name}" non valido: atteso il formato YYYY-MM-DD.`,
      code,
    });
  }
  return value;
}

/** Un anno dopo, alla stessa data: il 29 febbraio diventa il 1° marzo. */
function addYear(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}
