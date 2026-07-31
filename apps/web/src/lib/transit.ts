/**
 * Lo stato del modulo dei transiti: quando.
 *
 * Sta accanto a `birth.ts` e per la stessa ragione: la pagina deve sapere se
 * è completo prima di abilitare il calcolo, e comporne i parametri.
 *
 * Il fuso è quello di **chi guarda**, non quello di nascita. I transiti si
 * chiedono al presente — «cosa passa adesso» — e adesso lo si legge
 * sull'orologio che si ha davanti; la posizione dei pianeti non cambia, ma
 * l'ora scritta nel modulo deve voler dire quello che sembra. Il motore fa
 * poi la conversione, come per la nascita.
 */

import { browserTimezone, wallClock } from './clock';

export interface TransitInput {
  /** Data del transito, `YYYY-MM-DD`. */
  date: string;
  /** Ora del transito, `HH:mm`. Vuota: mezzogiorno, deciso dal motore. */
  time: string;
  /** Identificatore IANA in cui vanno letti i due campi qui sopra. */
  timezone: string;
}

/** L'istante presente, che è la proposta giusta all'apertura della pagina. */
export function nowTransitInput(instant: Date = new Date(), timezone?: string): TransitInput {
  const zone = timezone ?? browserTimezone();
  const { date, time } = wallClock(instant, zone);
  return { date, time, timezone: zone };
}

/**
 * `true` quando il modulo basta a calcolare.
 *
 * L'ora può mancare — il motore ripiega su mezzogiorno e lo dichiara — ma il
 * giorno no: senza, non ci sarebbe nessun istante da confrontare col tema.
 */
export function isCompleteTransit(input: TransitInput): boolean {
  return input.date !== '';
}
