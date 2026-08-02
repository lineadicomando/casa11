/**
 * Chiamate all'API dal browser.
 *
 * Sta in un modulo suo perché la gestione degli errori è la parte che si
 * ripete: ogni sezione deve distinguere un errore di dominio — che ha un
 * messaggio già scritto in italiano, prodotto da `ChartError` — da un guasto
 * di rete, e mostrarli in modo diverso.
 */

import type {
  BodyId,
  HouseSystem,
  NatalChart,
  PassageRange,
  PlanetaryHour,
  SignIngress,
  SkyChart,
  SkyPassage,
  Station,
  TransitChart,
  TransitPassage,
  VoidOfCourse,
} from '@undicesimacasa/core';
import type { Location } from '@undicesimacasa/geo';
import type { BirthInput } from './birth';
import { refinedCoordinates } from './birth';
import type { MomentInput } from './moment';
import { shiftDate } from './moment';

/** Errore con un messaggio già presentabile a schermo. */
export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestError';
  }
}

/**
 * La località dietro un identificativo.
 *
 * Serve alle pagine che si rimettono in piedi da un indirizzo: là il luogo è un
 * numero, e per riempire il campo di ricerca ci vogliono il nome e il fuso.
 * `null` quando quel numero non è di nessuno — un indirizzo scritto a mano, o
 * un dataset reimportato — e la pagina prosegue senza luogo invece di fermarsi.
 */
export async function fetchLocation(id: number): Promise<Location | null> {
  try {
    const body = await request<{ results: Location[] }>(
      `/api/locations?id=${id}`,
      'Località non trovata',
    );
    return body.results[0] ?? null;
  } catch {
    return null;
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

export interface SkyCalendarResponse {
  range: PassageRange;
  passages: SkyPassage[];
  ingresses: SignIngress[];
  stations: Station[];
  warnings: string[];
}

/**
 * Compone i parametri del calendario del cielo.
 *
 * Non porta il luogo, che qui non serve a niente: un incontro fra due pianeti
 * avviene alla stessa ora ovunque lo si guardi. Resta il fuso, perché è in
 * quello che le date vanno lette.
 */
export function skyCalendarParameters(moment: MomentInput, months: number): URLSearchParams {
  return new URLSearchParams({
    from: moment.date,
    to: shiftDate(moment.date, 'month', months),
    timezone: moment.timezone,
  });
}

export async function fetchSkyCalendar(
  parameters: URLSearchParams,
): Promise<SkyCalendarResponse> {
  return request<SkyCalendarResponse>(
    `/api/sky/calendar?${parameters}`,
    'Ricerca del calendario non riuscita',
  );
}

export interface ElectionResponse {
  range: PassageRange;
  place: { label?: string; refined: boolean };
  hours: PlanetaryHour[];
  voids: VoidOfCourse[];
  filters?: { rulers?: BodyId[]; skipMoonVoid?: boolean };
  warnings: string[];
}

export interface ElectionFilters {
  /** `null` per tutte le ore: è il caso normale su archi brevi. */
  ruler: BodyId | null;
  skipMoonVoid: boolean;
}

/**
 * Compone i parametri dell'elezione.
 *
 * Il luogo è obbligatorio e non ha alternative: alba e tramonto vengono da lì.
 * L'arco è corto per costruzione — ventiquattro ore planetarie al giorno
 * riempiono in fretta uno schermo — e il fuso lo dà la località.
 */
export function electionParameters(
  location: Location,
  from: string,
  days: number,
  filters: ElectionFilters,
): URLSearchParams {
  const parameters = new URLSearchParams({
    locationId: String(location.id),
    from,
    to: shiftDate(from, 'day', days),
  });

  if (filters.ruler) parameters.set('rulers', filters.ruler);
  if (filters.skipMoonVoid) parameters.set('skipMoonVoid', 'true');

  return parameters;
}

export async function fetchElection(parameters: URLSearchParams): Promise<ElectionResponse> {
  return request<ElectionResponse>(
    `/api/election?${parameters}`,
    'Calcolo dell\'elezione non riuscito',
  );
}

export interface TransitsResponse extends ChartResponse {
  transits: TransitChart;
  /** Il luogo da cui il transito è guardato, se ne è stato scelto uno. */
  transitPlace?: { label: string; refined: boolean };
}

/**
 * Compone i parametri di `/api/transits`.
 *
 * Sono quelli del tema più l'istante: i due endpoint condividono la parte
 * della nascita di proposito, e qui si vede perché — una funzione sola che
 * ne chiama un'altra, invece di due elenchi da tenere allineati.
 *
 * Il luogo del transito è facoltativo e viaggia con i nomi prefissati: senza
 * di essi sovrascriverebbe quello di nascita, che sta negli stessi parametri.
 */
export function transitParameters(
  birth: BirthInput,
  options: ChartOptionsInput,
  transit: MomentInput,
  location?: Location | null,
): URLSearchParams {
  const parameters = chartParameters(birth, options);

  parameters.set('transitDate', transit.date);
  parameters.set('transitTimezone', transit.timezone);
  // Un'ora vuota non si manda: al suo posto il motore usa mezzogiorno e lo
  // dichiara fra le avvertenze, che è più onesto di un mezzogiorno implicito.
  if (transit.time) parameters.set('transitTime', transit.time);
  if (location) parameters.set('transitLocationId', String(location.id));

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
  parameters.set('to', shiftDate(transit.date, 'month', months));
  parameters.set('transitTimezone', transit.timezone);

  return parameters;
}

export async function fetchPassages(parameters: URLSearchParams): Promise<PassagesResponse> {
  return request<PassagesResponse>(
    `/api/transits/passages?${parameters}`,
    'Ricerca dei passaggi non riuscita',
  );
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
