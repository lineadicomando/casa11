/**
 * Lo stato del modulo dei dati di nascita.
 *
 * Vive fuori dal componente perché non è solo suo: la pagina che lo contiene
 * deve sapere se è completo prima di abilitare il calcolo, e deve ricavarne le
 * coordinate effettive per comporre la richiesta. Ogni sezione che parte da
 * una nascita — il tema, i transiti — riusa questo tipo e queste due funzioni.
 *
 * Latitudine e longitudine restano **testo grezzo**: sono correggibili a mano
 * e accettano più formati, quindi l'unica forma sempre valida è quella che si
 * legge nel campo. L'interpretazione sta in `coordinates.ts`.
 */

import type { Location } from '@undicesimacasa/geo';
import { formatCoordinate, parseCoordinate } from './coordinates';

export interface BirthInput {
  /** Data locale, `YYYY-MM-DD`. */
  date: string;
  /** Ora locale, `HH:mm`. Ignorata se `timeUnknown`. */
  time: string;
  timeUnknown: boolean;
  location: Location | null;
  /** Se falso valgono le coordinate della località, non quelle nei campi. */
  refineCoordinates: boolean;
  latitude: string;
  longitude: string;
}

export function emptyBirthInput(): BirthInput {
  return {
    date: '',
    time: '',
    timeUnknown: false,
    location: null,
    refineCoordinates: false,
    latitude: '',
    longitude: '',
  };
}

/**
 * Riporta i campi delle coordinate a quelle della località.
 *
 * Va chiamata a ogni cambio di località: lasciare in campo le precedenti
 * produrrebbe un tema con il fuso di una città e le coordinate di un'altra.
 */
export function resetCoordinates(input: BirthInput): void {
  input.latitude = input.location ? formatCoordinate(input.location.latitude) : '';
  input.longitude = input.location ? formatCoordinate(input.location.longitude) : '';
}

/** Le coordinate corrette a mano, se sono attive e interpretabili. */
export function refinedCoordinates(
  input: BirthInput,
): { latitude: number; longitude: number } | null {
  if (!input.refineCoordinates) return null;

  const latitude = parseCoordinate(input.latitude, 'latitudine');
  const longitude = parseCoordinate(input.longitude, 'longitudine');
  if (latitude === null || longitude === null) return null;

  return { latitude, longitude };
}

/**
 * `true` quando il modulo basta a calcolare.
 *
 * Le coordinate corrette a mano devono essere interpretabili **o** disattivate:
 * un campo lasciato a metà non deve produrre una richiesta che ripiega in
 * silenzio sul centroide, perché chi le corregge lo fa proprio per non usarlo.
 */
export function isComplete(input: BirthInput): boolean {
  if (input.date === '' || input.location === null) return false;
  if (!input.timeUnknown && input.time === '') return false;
  if (input.refineCoordinates && refinedCoordinates(input) === null) return false;
  return true;
}
