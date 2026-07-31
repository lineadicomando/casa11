/**
 * L'ora da parete di un istante, in un fuso qualsiasi.
 *
 * Serve da entrambe le parti: al server, per capire che giorno è «adesso»
 * quando la richiesta non lo dice, e al browser, per proporre nel modulo dei
 * transiti l'ora di chi guarda. Una funzione sola perché la risposta deve
 * essere la stessa: sono lo stesso istante letto sullo stesso orologio.
 *
 * Non usa Luxon di proposito: `Intl` basta e sta già nella piattaforma,
 * mentre Luxon è una dipendenza del motore di calcolo e non di questa
 * applicazione.
 */

export interface WallClock {
  /** Data locale, `YYYY-MM-DD`. */
  date: string;
  /** Ora locale, `HH:mm`. */
  time: string;
}

export function wallClock(instant: Date, timezone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // `hour12: false` produce «24» a mezzanotte in parte dei motori: h23 no.
    hourCycle: 'h23',
  }).formatToParts(instant);

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

/** `true` se il fuso è noto alla piattaforma. */
export function isKnownTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Il fuso di chi sta guardando.
 *
 * È quello in cui va letto «adesso» nel modulo dei transiti: chi chiede il
 * cielo di questo momento lo chiede dal posto in cui si trova.
 */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
