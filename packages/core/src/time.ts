import { DateTime, IANAZone } from 'luxon';
import { ChartError } from './errors.js';
import type { BirthData, ResolvedTime } from './types.js';

export interface TimeResolution {
  time: ResolvedTime;
  warnings: string[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

/**
 * Converte data e ora **locali** in Tempo Universale, applicando le regole
 * storiche del fuso (ora legale di guerra, tempo medio locale pre-1893, ecc.).
 *
 * È il punto più delicato del calcolo: un errore di un'ora qui sposta
 * l'Ascendente di circa 15 gradi.
 */
export function resolveTime(birth: BirthData): TimeResolution {
  const warnings: string[] = [];

  if (!DATE_PATTERN.test(birth.date)) {
    throw new ChartError(
      'DATA_NON_VALIDA',
      `Data "${birth.date}" non valida: atteso il formato YYYY-MM-DD.`,
    );
  }
  if (birth.time !== undefined && !TIME_PATTERN.test(birth.time)) {
    throw new ChartError(
      'ORA_NON_VALIDA',
      `Ora "${birth.time}" non valida: atteso il formato HH:mm oppure HH:mm:ss.`,
    );
  }
  if (!IANAZone.isValidZone(birth.timezone)) {
    throw new ChartError(
      'FUSO_ORARIO_NON_VALIDO',
      `Fuso orario "${birth.timezone}" sconosciuto: atteso un identificatore IANA, es. Europe/Rome.`,
    );
  }

  const timeKnown = birth.time !== undefined;
  if (!timeKnown) {
    warnings.push(
      'Ora di nascita non fornita: la carta è calcolata a mezzogiorno locale. ' +
        'Case, assi e posizione della Luna sono indicativi.',
    );
  }

  const wallClock = `${birth.date}T${normalizeTime(birth.time ?? '12:00')}`;
  const local = DateTime.fromISO(wallClock, { zone: birth.timezone });

  if (!local.isValid) {
    throw new ChartError(
      'DATA_NON_VALIDA',
      `Impossibile interpretare "${wallClock}" nel fuso ${birth.timezone}: ${local.invalidReason ?? 'motivo sconosciuto'}.`,
    );
  }

  if (timeKnown) {
    const interpretations = countInterpretations(wallClock, birth.timezone);
    if (interpretations === 0) {
      warnings.push(
        `L'ora locale ${birth.time} del ${birth.date} non è mai esistita in ${birth.timezone} ` +
          "(passaggio all'ora legale). È stata usata l'ora immediatamente successiva.",
      );
    } else if (interpretations > 1) {
      warnings.push(
        `L'ora locale ${birth.time} del ${birth.date} è ambigua in ${birth.timezone} ` +
          "(ritorno all'ora solare): ricorre due volte. È stata usata la prima occorrenza, " +
          "cioè quella ancora in ora legale.",
      );
    }
  }

  const utc = local.toUTC();

  return {
    time: {
      julianDayUT: toJulianDay(
        utc.year,
        utc.month,
        utc.day,
        utc.hour + utc.minute / 60 + utc.second / 3600 + utc.millisecond / 3_600_000,
      ),
      utc: utc.toISO({ suppressMilliseconds: true }) ?? '',
      local: local.toISO({ suppressMilliseconds: true }) ?? '',
      offsetMinutes: local.offset,
      timeKnown,
    },
    warnings,
  };
}

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/**
 * Quante istanti UTC distinti corrispondono a un dato orario da parete.
 *
 * - `0`: l'orario non esiste (salto in avanti per l'ora legale)
 * - `1`: caso normale
 * - `2`: orario ambiguo (ritorno all'ora solare)
 *
 * Verifica ogni offset in vigore nell'intorno della data: per ciascuno
 * ricostruisce l'istante UTC e controlla se, riconvertito nel fuso, produce
 * di nuovo lo stesso orario da parete.
 */
function countInterpretations(wallClock: string, zone: string): number {
  const reference = DateTime.fromISO(wallClock, { zone: 'utc' });
  if (!reference.isValid) return 1;

  const base = DateTime.fromISO(wallClock, { zone });
  const candidateOffsets = new Set<number>([
    base.offset,
    base.minus({ days: 1 }).offset,
    base.plus({ days: 1 }).offset,
  ]);

  const target = reference.toFormat("yyyy-MM-dd'T'HH:mm:ss");
  let matches = 0;
  for (const offset of candidateOffsets) {
    const candidate = DateTime.fromMillis(reference.toMillis() - offset * 60_000, { zone });
    if (candidate.toFormat("yyyy-MM-dd'T'HH:mm:ss") === target) matches += 1;
  }
  return matches;
}

/**
 * Giorno giuliano dal calendario gregoriano (algoritmo di Meeus,
 * *Astronomical Algorithms*, cap. 7).
 *
 * Calcolato qui invece che via `sweph.julday` per tenere la conversione
 * temporale indipendente dal modulo nativo — è la parte che va testata di più.
 */
export function toJulianDay(year: number, month: number, day: number, hour: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const dayFraction = day + hour / 24;
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFraction + b - 1524.5
  );
}
