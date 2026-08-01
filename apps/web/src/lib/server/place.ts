/**
 * Il luogo di nascita, ricavato dai parametri della richiesta.
 *
 * Sta in un modulo suo perché lo usano tutte le sezioni che partono da una
 * nascita — il tema, i transiti — e due copie di questa logica divergerebbero
 * proprio sul punto in cui non devono: quale fra coordinate e località
 * fornisce il fuso orario.
 */

import { getLocation, type Location } from '@undicesimacasa/geo';
import { error } from '@sveltejs/kit';

export interface ResolvedPlace {
  latitude: number;
  longitude: number;
  timezone: string;
  label?: string;
  /** `true` se le coordinate sono state fornite da chi chiama, non dal dataset. */
  refined?: boolean;
}

/**
 * Ricava il luogo dai parametri.
 *
 * `locationId` e le coordinate esplicite non sono alternative rigide: si
 * possono combinare, e allora la località fornisce **fuso orario e nome**
 * mentre le coordinate vengono da chi chiama. È il caso di chi conosce il
 * punto esatto di nascita — un ospedale in periferia, una frazione fuori
 * dataset — o di chi vuole riprodurre il risultato di un altro programma:
 * le case dipendono dalle coordinate, e due centroidi diversi della stessa
 * città danno cuspidi diverse.
 *
 * Il fuso orario resta legato alla località di proposito. È il dato in cui
 * sbagliare costa di più — un'ora sposta l'Ascendente di quindici gradi — e
 * un valore errato ma valido (`Europe/London` per `Europe/Rome`) non è
 * intercettabile da nessun controllo.
 */
export function resolvePlace(parameters: URLSearchParams): ResolvedPlace {
  const rawLocationId = parameters.get('locationId');

  if (rawLocationId) {
    const locationId = Number(rawLocationId);
    // Un identificatore malformato è un errore suo, non un motivo per
    // ripiegare sulle coordinate e rispondere che "manca il luogo".
    if (!Number.isInteger(locationId) || locationId <= 0) {
      throw error(400, {
        message: `Valore di "locationId" non valido: atteso un identificatore GeoNames intero positivo.`,
        code: 'LOCALITA_NON_VALIDA',
      });
    }

    const location = getLocation(locationId);
    if (!location) {
      throw error(404, {
        message: `Nessuna località con identificatore ${locationId}.`,
        code: 'LOCALITA_SCONOSCIUTA',
      });
    }

    const overrides = readCoordinateOverrides(parameters);

    return {
      latitude: overrides.latitude ?? location.latitude,
      longitude: overrides.longitude ?? location.longitude,
      timezone: location.timezone,
      label: describeLocation(location),
      refined: overrides.latitude !== undefined || overrides.longitude !== undefined,
    };
  }

  const latitude = Number(parameters.get('latitude'));
  const longitude = Number(parameters.get('longitude'));
  const timezone = parameters.get('timezone');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !timezone) {
    throw error(400, {
      message:
        'Luogo di nascita non specificato: indica "locationId" oppure ' +
        'tutti e tre "latitude", "longitude" e "timezone".',
      code: 'LUOGO_MANCANTE',
    });
  }

  return { latitude, longitude, timezone };
}

/**
 * Un luogo che può non esserci.
 *
 * Il fuso è facoltativo perché senza località non c'è niente che lo fornisca:
 * due coordinate non dicono che ore siano. Nel cielo di un istante è un dato
 * a parte — l'orologio di chi guarda — e non una proprietà del posto.
 */
export interface OptionalPlace {
  latitude: number;
  longitude: number;
  timezone?: string;
  label?: string;
  refined?: boolean;
}

/**
 * Il luogo, quando indicarlo è una scelta e non un obbligo.
 *
 * È il caso del cielo: le posizioni valgono ovunque, il luogo serve solo a
 * orientare assi e case. Assente, non è un errore — mezzo assente sì, perché
 * una coordinata sola metterebbe l'osservatore su un meridiano arbitrario.
 */
export function resolveOptionalPlace(parameters: URLSearchParams): OptionalPlace | null {
  if (parameters.get('locationId')) return resolvePlace(parameters);

  const { latitude, longitude } = readCoordinateOverrides(parameters);
  if (latitude === undefined && longitude === undefined) return null;

  if (latitude === undefined || longitude === undefined) {
    throw error(400, {
      message: 'Luogo incompleto: "latitude" e "longitude" vanno indicate insieme.',
      code: 'LUOGO_INCOMPLETO',
    });
  }

  return { latitude, longitude };
}

/**
 * Legge le coordinate esplicite, se presenti.
 *
 * Un valore malformato è un errore, non un motivo per ripiegare in silenzio
 * sul centroide: chi le passa lo fa proprio perché il centroide non gli basta.
 */
function readCoordinateOverrides(parameters: URLSearchParams): {
  latitude?: number;
  longitude?: number;
} {
  const overrides: { latitude?: number; longitude?: number } = {};

  for (const [nome, limite] of [
    ['latitude', 90],
    ['longitude', 180],
  ] as const) {
    const grezzo = parameters.get(nome);
    if (grezzo === null) continue;

    const valore = Number(grezzo);
    if (!Number.isFinite(valore) || Math.abs(valore) > limite) {
      throw error(400, {
        message: `Valore di "${nome}" non valido: atteso un numero fra -${limite} e ${limite}.`,
        code: 'COORDINATE_NON_VALIDE',
      });
    }
    overrides[nome] = valore;
  }

  return overrides;
}

/**
 * Compone l'etichetta di una località.
 *
 * Nelle città-stato regione e città coincidono ("Berlino, Berlino, Germania"):
 * la ripetizione non aggiunge nulla e si omette.
 */
function describeLocation(location: Location): string {
  const parts = [location.name];
  if (location.region && location.region !== location.name) parts.push(location.region);
  parts.push(location.country);
  return parts.join(', ');
}

/** Un errore già formato da `error()`: ha la propria risposta, si rilancia. */
export function isHttpError(cause: unknown): cause is { status: number; body: unknown } {
  return typeof cause === 'object' && cause !== null && 'status' in cause && 'body' in cause;
}
