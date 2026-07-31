/**
 * Chiamate all'API dal browser.
 *
 * Sta in un modulo suo perché la gestione degli errori è la parte che si
 * ripete: ogni sezione deve distinguere un errore di dominio — che ha un
 * messaggio già scritto in italiano, prodotto da `ChartError` — da un guasto
 * di rete, e mostrarli in modo diverso.
 */

import type { HouseSystem, NatalChart } from '@undicesimacasa/core';
import type { BirthInput } from './birth';
import { refinedCoordinates } from './birth';

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
