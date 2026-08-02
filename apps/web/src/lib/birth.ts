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
 * La nascita scritta in un indirizzo, rimessa nella forma del modulo.
 *
 * Sono gli stessi nomi che l'API già usa — `date`, `time`, `locationId`,
 * `latitude`, `longitude` — perché il collegamento che si copia dal tema è
 * fatto con quei parametri: un elenco solo, invece di due da tenere allineati.
 *
 * La località non si risolve qui: è una domanda al server, e questa funzione
 * non ne fa. Chi chiama la passa già risolta, o `null`.
 *
 * L'assenza di `time` vale come ora ignota, che è il modo in cui l'API stessa
 * la esprime: un tema senza ora è una carta senza case, non un tema a
 * mezzanotte.
 */
export function birthFromParameters(
  parametri: URLSearchParams,
  location: Location | null,
): BirthInput {
  const input = emptyBirthInput();
  input.date = parametri.get('date') ?? '';
  input.time = parametri.get('time') ?? '';
  input.timeUnknown = input.time === '';
  input.location = location;
  resetCoordinates(input);

  // Le coordinate corrette si riconoscono dall'essere scritte: l'API le manda
  // solo quando qualcuno le ha davvero cambiate.
  const latitude = parametri.get('latitude');
  const longitude = parametri.get('longitude');
  if (latitude !== null && longitude !== null) {
    input.refineCoordinates = true;
    input.latitude = latitude;
    input.longitude = longitude;
  }

  return input;
}

/**
 * Che cosa manca perché il modulo basti a calcolare, nominato per esteso.
 *
 * Il pulsante di invio si spegneva senza dire perché, e con il modulo chiuso i
 * campi vuoti non erano nemmeno in vista: restava un pulsante grigio e nessuna
 * strada per capire quale delle tre cose mancasse.
 *
 * Le coordinate corrette a mano devono essere interpretabili **o** disattivate:
 * un campo lasciato a metà non deve produrre una richiesta che ripiega in
 * silenzio sul centroide, perché chi le corregge lo fa proprio per non usarlo.
 */
export function missingBirthFields(input: BirthInput): string[] {
  const mancano: string[] = [];

  if (input.date === '') mancano.push('la data di nascita');
  if (!input.timeUnknown && input.time === '') mancano.push("l'ora di nascita");
  if (input.location === null) mancano.push('il luogo di nascita');
  if (input.refineCoordinates && refinedCoordinates(input) === null) {
    mancano.push('delle coordinate interpretabili');
  }

  return mancano;
}

/**
 * `true` quando il modulo basta a calcolare.
 *
 * Definita sull'elenco di ciò che manca invece di ripeterne le condizioni: due
 * risposte alla stessa domanda finiscono per non essere più la stessa, e
 * sarebbe il pulsante acceso sopra la riga che dice che manca qualcosa.
 */
export function isComplete(input: BirthInput): boolean {
  return missingBirthFields(input).length === 0;
}
