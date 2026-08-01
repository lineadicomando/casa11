/**
 * L'istante scelto nell'interfaccia: quando.
 *
 * Sta accanto a `birth.ts` e per la stessa ragione: la pagina deve sapere se
 * è completo prima di abilitare il calcolo, e comporne i parametri. Lo usano
 * i transiti e il cielo, che chiedono la stessa cosa — un giorno, un'ora, il
 * fuso in cui vanno letti — a proposito di due domande diverse.
 *
 * Il fuso è quello di **chi guarda**, non quello di nascita. L'istante lo si
 * legge sull'orologio che si ha davanti; la posizione dei pianeti non cambia,
 * ma l'ora scritta nel modulo deve voler dire quello che sembra. Il motore fa
 * poi la conversione, come per la nascita.
 */

import { browserTimezone, wallClock } from './clock';

export interface MomentInput {
  /** Data, `YYYY-MM-DD`. */
  date: string;
  /** Ora, `HH:mm`. Vuota: mezzogiorno, deciso dal motore. */
  time: string;
  /** Identificatore IANA in cui vanno letti i due campi qui sopra. */
  timezone: string;
}

/** L'istante presente, che è la proposta giusta all'apertura della pagina. */
export function nowMoment(instant: Date = new Date(), timezone?: string): MomentInput {
  const zone = timezone ?? browserTimezone();
  const { date, time } = wallClock(instant, zone);
  return { date, time, timezone: zone };
}

/**
 * `true` quando il modulo basta a calcolare.
 *
 * L'ora può mancare — il motore ripiega su mezzogiorno e lo dichiara — ma il
 * giorno no: senza, non ci sarebbe nessun istante da guardare.
 */
export function isCompleteMoment(input: MomentInput): boolean {
  return input.date !== '';
}

/** L'ampiezza di un passo. Il menù del modulo li propone in quest'ordine. */
export type StepUnit = 'day' | 'week' | 'month' | 'year';

/**
 * L'istante spostato di `amount` passi, avanti o indietro.
 *
 * **Si muove solo il giorno.** L'ora e il fuso restano quelli scritti nel
 * modulo, perché è così che li legge chi guarda: «domani alle nove» è ancora
 * alle nove anche se nel frattempo è cambiata l'ora legale. Sommare un giorno
 * di millisecondi a un istante farebbe invece il contrario — terrebbe fermo il
 * punto sulla linea del tempo e sposterebbe l'orologio.
 */
export function shiftMoment(input: MomentInput, unit: StepUnit, amount: number): MomentInput {
  // Un modulo senza giorno non ha niente da spostare: il passo non lo inventa.
  if (input.date === '') return input;
  return { ...input, date: shiftDate(input.date, unit, amount) };
}

/**
 * La stessa data, `amount` unità più avanti — indietro, se `amount` è negativo.
 *
 * Mesi e anni si **agganciano a fine mese**: il 31 gennaio più un mese è il 28
 * febbraio, non il 3 marzo che verrebbe lasciando traboccare i giorni. Un mese
 * dopo gennaio è febbraio, e un passo che scavalca il mese di arrivo non è un
 * passo di un mese.
 *
 * L'aggancio non si ricorda del giorno da cui è partito: dal 31 agosto si va
 * al 30 settembre e tornando indietro si arriva al 30 agosto. Perché fosse
 * reversibile servirebbe conservare un giorno d'ancoraggio da qualche parte, e
 * quello stato dovrebbe poi sapere quando l'utente scrive una data a mano.
 * Fanno così tutti i calendari, ed è il compromesso che costa meno.
 */
export function shiftDate(date: string, unit: StepUnit, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);

  if (unit === 'day' || unit === 'week') {
    return iso(utc(year, month - 1, day + amount * (unit === 'week' ? 7 : 1)));
  }

  const arrivo = utc(year, month - 1 + amount * (unit === 'year' ? 12 : 1), 1);
  // Il giorno zero del mese seguente è l'ultimo di questo, qualunque sia.
  const ultimo = utc(arrivo.getUTCFullYear(), arrivo.getUTCMonth() + 1, 0).getUTCDate();

  return iso(utc(arrivo.getUTCFullYear(), arrivo.getUTCMonth(), Math.min(day, ultimo)));
}

function utc(year: number, month: number, day: number): Date {
  const value = new Date(Date.UTC(year, month, day));
  // `Date.UTC` legge gli anni da 0 a 99 come abbreviazioni del Novecento.
  if (year >= 0 && year <= 99) value.setUTCFullYear(year);
  return value;
}

function iso(value: Date): string {
  return value.toISOString().slice(0, 10);
}
