import {
  computeNatalChart,
  type BirthData,
  type ChartOptions,
  type HouseSystem,
} from '@temanatale/core';
import { getLocation } from '@temanatale/geo';
import { error, json } from '@sveltejs/kit';
import { toHttpError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

const HOUSE_SYSTEMS = new Set<string>([
  'placidus',
  'koch',
  'segni-interi',
  'equale',
  'regiomontano',
  'campano',
  'porfirio',
  'topocentrico',
  'alcabizio',
]);

/**
 * `GET /api/chart?date=1968-03-12&time=14:30&locationId=3172394`
 *
 * Su GET e non POST di proposito: un tema natale è una funzione pura dei suoi
 * parametri, quindi l'URL è condivisibile e la risposta memorizzabile.
 *
 * In alternativa a `locationId` si possono passare `latitude`, `longitude` e
 * `timezone`; la terna dev'essere completa, perché senza fuso orario non è
 * possibile convertire l'ora locale in Tempo Universale.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  const parameters = url.searchParams;

  const date = parameters.get('date');
  if (!date) {
    throw error(400, { message: 'Parametro "date" mancante.', code: 'DATA_MANCANTE' });
  }

  try {
    const place = resolvePlace(parameters);

    const birth: BirthData = {
      date,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    };
    const time = parameters.get('time');
    if (time) birth.time = time;

    const options: ChartOptions = {
      minorAspects: parameters.get('minorAspects') === 'true',
    };

    const houseSystem = parameters.get('houseSystem');
    if (houseSystem) {
      if (!HOUSE_SYSTEMS.has(houseSystem)) {
        throw error(400, {
          message: `Sistema di case "${houseSystem}" non riconosciuto.`,
          code: 'SISTEMA_CASE_NON_VALIDO',
        });
      }
      options.houseSystem = houseSystem as HouseSystem;
    }

    const chart = computeNatalChart(birth, options);

    setHeaders({ 'cache-control': 'public, max-age=86400' });
    return json({ chart, place: place.label ? { label: place.label } : undefined });
  } catch (cause) {
    // Gli errori già formati da `error()` hanno la propria risposta: si rilanciano.
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};

interface ResolvedPlace {
  latitude: number;
  longitude: number;
  timezone: string;
  label?: string;
}

function resolvePlace(parameters: URLSearchParams): ResolvedPlace {
  const locationId = Number(parameters.get('locationId'));

  if (Number.isInteger(locationId) && locationId > 0) {
    const location = getLocation(locationId);
    if (!location) {
      throw error(404, {
        message: `Nessuna località con identificatore ${locationId}.`,
        code: 'LOCALITA_SCONOSCIUTA',
      });
    }
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      label: [location.name, location.region, location.country].filter(Boolean).join(', '),
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

function isHttpError(cause: unknown): cause is { status: number; body: unknown } {
  return typeof cause === 'object' && cause !== null && 'status' in cause && 'body' in cause;
}
