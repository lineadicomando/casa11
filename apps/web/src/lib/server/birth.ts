/**
 * I dati di nascita e le opzioni del tema, letti dai parametri.
 *
 * Le sezioni che partono da una nascita accettano gli stessi parametri —
 * chi ha un indirizzo per il tema deve poterlo riusare per i transiti
 * cambiando solo l'endpoint — e quindi li leggono nello stesso posto.
 */

import type { BirthData, ChartOptions, HouseSystem } from '@undicesimacasa/core';
import { error } from '@sveltejs/kit';
import { resolvePlace, type ResolvedPlace } from './place';

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

/** La nascita e il luogo da cui viene, che serve anche a intestare la risposta. */
export interface RequestedBirth {
  birth: BirthData;
  place: ResolvedPlace;
}

export function readBirth(parameters: URLSearchParams): RequestedBirth {
  const date = parameters.get('date');
  if (!date) {
    throw error(400, { message: 'Parametro "date" mancante.', code: 'DATA_MANCANTE' });
  }

  const place = resolvePlace(parameters);

  const birth: BirthData = {
    date,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  };
  const time = parameters.get('time');
  if (time) birth.time = time;

  return { birth, place };
}

export function readChartOptions(parameters: URLSearchParams): ChartOptions {
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

  return options;
}

/** L'etichetta del luogo, come la riceve chi chiama. */
export function placeLabel(place: ResolvedPlace): { label: string; refined: boolean } | undefined {
  return place.label ? { label: place.label, refined: place.refined ?? false } : undefined;
}
