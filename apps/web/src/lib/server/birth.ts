/**
 * I dati di nascita e le opzioni del tema, letti dai parametri.
 *
 * Le sezioni che partono da una nascita accettano gli stessi parametri —
 * chi ha un indirizzo per il tema deve poterlo riusare per i transiti
 * cambiando solo l'endpoint — e quindi li leggono nello stesso posto.
 */

import type {
  AyanamsaId,
  BirthData,
  ChartOptions,
  HouseSystem,
  ZodiacOptions,
} from '@undicesimacasa/core';
import { error } from '@sveltejs/kit';
import { resolvePlace, type ResolvedPlace } from './place';

/**
 * Gli ayanamsa ammessi.
 *
 * Un elenco scritto qui e non importato da `core`: il client compone gli
 * stessi indirizzi, e un import di valore dal motore gli trascinerebbe le
 * effemeridi nel bundle. È la stessa ragione per cui `HOUSE_SYSTEMS` è una
 * costante locale invece di `Object.keys(HOUSE_SYSTEM_CODES)`.
 */
const AYANAMSAS = new Set<string>([
  'lahiri',
  'true-chitra',
  'krishnamurti',
  'raman',
  'yukteshwar',
  'fagan-bradley',
]);

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

/**
 * Lo zodiaco richiesto, letto a parte perché non riguarda solo i temi.
 *
 * Il calendario del cielo non ha né nascita né opzioni di carta, ma i suoi
 * ingressi nei segni dipendono da dove comincia l'Ariete come tutto il resto.
 */
export function readZodiacOptions(parameters: URLSearchParams): ZodiacOptions {
  const options: ZodiacOptions = {};

  const zodiac = parameters.get('zodiac');
  if (zodiac) {
    if (zodiac !== 'tropicale' && zodiac !== 'siderale') {
      throw error(400, {
        message: `Zodiaco "${zodiac}" non riconosciuto: atteso "tropicale" oppure "siderale".`,
        code: 'ZODIACO_NON_VALIDO',
      });
    }
    options.zodiac = zodiac;
  }

  const ayanamsa = parameters.get('ayanamsa');
  if (ayanamsa) {
    if (!AYANAMSAS.has(ayanamsa)) {
      throw error(400, {
        message:
          `Ayanamsa "${ayanamsa}" non riconosciuto. Ammessi: ${[...AYANAMSAS].join(', ')}.`,
        code: 'AYANAMSA_NON_VALIDO',
      });
    }
    if (options.zodiac !== 'siderale') {
      // Accettarlo sullo zodiaco tropicale vuol dire restituire un tema in cui
      // l'ayanamsa chiesto non compare da nessuna parte, e nessuno se ne
      // accorge finché non confronta i gradi con un altro programma.
      throw error(400, {
        message: 'Il parametro "ayanamsa" richiede "zodiac=siderale".',
        code: 'AYANAMSA_SENZA_ZODIACO',
      });
    }
    options.ayanamsa = ayanamsa as AyanamsaId;
  }

  return options;
}

export function readChartOptions(parameters: URLSearchParams): ChartOptions {
  const options: ChartOptions = {
    minorAspects: parameters.get('minorAspects') === 'true',
    ...readZodiacOptions(parameters),
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

/**
 * L'etichetta del luogo, come la riceve chi chiama.
 *
 * Accetta anche un luogo assente: nel cielo di un istante indicarlo è
 * facoltativo, e la risposta si limita a non intestarsi a nessun posto.
 */
export function placeLabel(
  place: { label?: string; refined?: boolean } | null,
): { label: string; refined: boolean } | undefined {
  return place?.label ? { label: place.label, refined: place.refined ?? false } : undefined;
}
