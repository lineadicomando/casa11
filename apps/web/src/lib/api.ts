/**
 * Chiamate all'API dal browser.
 *
 * Sta in un modulo suo perché la gestione degli errori è la parte che si
 * ripete: ogni sezione deve distinguere un errore di dominio — che ha un
 * messaggio già scritto in italiano, prodotto da `ChartError` — da un guasto
 * di rete, e mostrarli in modo diverso.
 */

import type {
  HouseSystem,
  NatalChart,
  PassageRange,
  SkyChart,
  TransitChart,
  TransitPassage,
} from '@undicesimacasa/core';
import type { Location } from '@undicesimacasa/geo';
import type { BirthInput } from './birth';
import { refinedCoordinates } from './birth';
import type { MomentInput } from './moment';

/** Errore con un messaggio già presentabile a schermo. */
export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestError';
  }
}

export interface ChartResponse {
  chart: NatalChart;
  place?: { label: string; refined: boolean };
}

export interface ChartOptionsInput {
  houseSystem: HouseSystem;
  minorAspects: boolean;
}

/**
 * Compone i parametri di `/api/chart`.
 *
 * `locationId` viaggia sempre insieme alle coordinate corrette, quando ci
 * sono: la località resta la fonte del fuso orario e del nome, il punto lo dà
 * chi chiama. Vedi `resolvePlace` in `routes/api/chart/+server.ts`.
 */
export function chartParameters(
  birth: BirthInput,
  options: ChartOptionsInput,
): URLSearchParams {
  if (!birth.location) throw new RequestError('Luogo di nascita non scelto.');

  const parameters = new URLSearchParams({
    date: birth.date,
    locationId: String(birth.location.id),
    houseSystem: options.houseSystem,
    minorAspects: String(options.minorAspects),
  });

  if (!birth.timeUnknown && birth.time) parameters.set('time', birth.time);

  const refined = refinedCoordinates(birth);
  if (refined) {
    parameters.set('latitude', String(refined.latitude));
    parameters.set('longitude', String(refined.longitude));
  }

  return parameters;
}

export async function fetchChart(parameters: URLSearchParams): Promise<ChartResponse> {
  return request<ChartResponse>(`/api/chart?${parameters}`, 'Calcolo non riuscito');
}

export interface SkyResponse {
  sky: SkyChart;
  place?: { label: string; refined: boolean };
}

/**
 * Compone i parametri di `/api/sky`.
 *
 * Non riusa quelli del tema perché non c'è nessuna nascita: il luogo è
 * facoltativo e l'istante non è riferito a niente.
 *
 * Il fuso resta quello di chi guarda anche quando si sceglie un luogo
 * lontano: l'ora scritta nel modulo deve corrispondere all'orologio di chi la
 * scrive. Il luogo serve solo a orientare assi e case.
 */
export function skyParameters(
  moment: MomentInput,
  options: ChartOptionsInput,
  location: Location | null,
): URLSearchParams {
  const parameters = new URLSearchParams({
    date: moment.date,
    timezone: moment.timezone,
    houseSystem: options.houseSystem,
    minorAspects: String(options.minorAspects),
  });

  if (moment.time) parameters.set('time', moment.time);
  if (location) parameters.set('locationId', String(location.id));

  return parameters;
}

export async function fetchSky(parameters: URLSearchParams): Promise<SkyResponse> {
  return request<SkyResponse>(`/api/sky?${parameters}`, 'Calcolo del cielo non riuscito');
}

export interface TransitsResponse extends ChartResponse {
  transits: TransitChart;
}

/**
 * Compone i parametri di `/api/transits`.
 *
 * Sono quelli del tema più l'istante: i due endpoint condividono la parte
 * della nascita di proposito, e qui si vede perché — una funzione sola che
 * ne chiama un'altra, invece di due elenchi da tenere allineati.
 */
export function transitParameters(
  birth: BirthInput,
  options: ChartOptionsInput,
  transit: MomentInput,
): URLSearchParams {
  const parameters = chartParameters(birth, options);

  parameters.set('transitDate', transit.date);
  parameters.set('transitTimezone', transit.timezone);
  // Un'ora vuota non si manda: al suo posto il motore usa mezzogiorno e lo
  // dichiara fra le avvertenze, che è più onesto di un mezzogiorno implicito.
  if (transit.time) parameters.set('transitTime', transit.time);

  return parameters;
}

export async function fetchTransits(parameters: URLSearchParams): Promise<TransitsResponse> {
  return request<TransitsResponse>(`/api/transits?${parameters}`, 'Calcolo dei transiti non riuscito');
}

export interface PassagesResponse extends ChartResponse {
  range: PassageRange;
  passages: TransitPassage[];
  warnings: string[];
}

/**
 * Compone i parametri del calendario dei passaggi.
 *
 * L'arco parte dal giorno che si sta guardando: chi ha davanti il cielo di
 * una data vuole sapere che cosa si perfeziona a partire da lì, non da oggi.
 */
export function passageParameters(
  birth: BirthInput,
  options: ChartOptionsInput,
  transit: MomentInput,
  months: number,
): URLSearchParams {
  const parameters = chartParameters(birth, options);

  parameters.set('from', transit.date);
  parameters.set('to', addMonths(transit.date, months));
  parameters.set('transitTimezone', transit.timezone);

  return parameters;
}

export async function fetchPassages(parameters: URLSearchParams): Promise<PassagesResponse> {
  return request<PassagesResponse>(
    `/api/transits/passages?${parameters}`,
    'Ricerca dei passaggi non riuscita',
  );
}

/** Stessa data, `months` mesi dopo. Il 31 diventa il primo del mese seguente. */
function addMonths(date: string, months: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
}

async function request<T>(url: string, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new RequestError(`${fallback}: server non raggiungibile.`);
  }

  // Una risposta di errore può non essere JSON — un reverse proxy davanti
  // all'applicazione risponde in HTML. Un corpo illeggibile non deve
  // diventare "server non raggiungibile", che manderebbe a cercare il guasto
  // dalla parte sbagliata: il server ha risposto, ed è quello che conta.
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = messageOf(body);
    throw new RequestError(message ?? `${fallback} (errore ${response.status}).`);
  }

  if (body === null) throw new RequestError(`${fallback}: risposta non leggibile.`);
  return body as T;
}

function messageOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' && message !== '' ? message : null;
}
