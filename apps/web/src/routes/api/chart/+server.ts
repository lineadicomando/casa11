import {
  computeNatalChart,
  type BirthData,
  type ChartOptions,
  type HouseSystem,
} from '@undicesimacasa/core';
import { getLocation, type Location } from '@undicesimacasa/geo';
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

    const fortuneFormula = parameters.get('partOfFortuneFormula');
    if (fortuneFormula) {
      if (fortuneFormula !== 'settore' && fortuneFormula !== 'diurna') {
        throw error(400, {
          message:
            `Formula "${fortuneFormula}" non riconosciuta per la Parte di Fortuna: ` +
            'attesa "settore" oppure "diurna".',
          code: 'FORMULA_FORTUNA_NON_VALIDA',
        });
      }
      options.partOfFortuneFormula = fortuneFormula;
    }

    const chart = computeNatalChart(birth, options);

    setHeaders({ 'cache-control': 'public, max-age=86400' });
    return json({
      chart,
      place: place.label ? { label: place.label, refined: place.refined ?? false } : undefined,
    });
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
  /** `true` se le coordinate sono state fornite da chi chiama, non dal dataset. */
  refined?: boolean;
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
function resolvePlace(parameters: URLSearchParams): ResolvedPlace {
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

function isHttpError(cause: unknown): cause is { status: number; body: unknown } {
  return typeof cause === 'object' && cause !== null && 'status' in cause && 'body' in cause;
}
