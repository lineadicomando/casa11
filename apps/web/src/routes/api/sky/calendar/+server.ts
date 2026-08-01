import {
  findSignIngresses,
  findSkyPassages,
  findStations,
  type SkyEventOptions,
  type SkyPassageOptions,
} from '@undicesimacasa/core';
import { json } from '@sveltejs/kit';
import { toHttpError } from '$lib/server/errors';
import { isHttpError } from '$lib/server/place';
import { resolvePassageRange } from '$lib/server/range';
import type { RequestHandler } from './$types';

/**
 * `GET /api/sky/calendar?from=2026-01-01&to=2026-12-31&timezone=Europe/Rome`
 *
 * Che cosa succede in cielo in un arco di tempo: gli incontri fra due corpi,
 * gli ingressi nei segni, le stazioni. Nessuna nascita e **nessun luogo**: a
 * differenza del cielo di un istante, qui non c'è niente che dipenda da dove
 * si guarda, nemmeno le case.
 *
 * Senza `from` si parte da oggi, senza `to` si arriva a un anno dopo. L'arco
 * ha un tetto di tre anni.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const timezone = parameters.get('timezone') || 'UTC';
    const { range, explicit } = resolvePassageRange(parameters, timezone, new Date(), 'DATA_NON_VALIDA');

    const minorAspects = parameters.get('minorAspects') === 'true';
    const passageOptions: SkyPassageOptions = { minorAspects };
    const eventOptions: SkyEventOptions = {};

    const incontri = findSkyPassages(range, passageOptions);
    const ingressi = findSignIngresses(range, eventOptions);
    const stazioni = findStations(range, eventOptions);

    // Le tre ricerche attraversano gli stessi corpi: le avvertenze si
    // ripeterebbero identiche, e ripeterle non aggiunge niente.
    const warnings = [
      ...new Set([...incontri.warnings, ...ingressi.warnings, ...stazioni.warnings]),
    ];

    // Come per il cielo di un istante la cache è condivisibile: un calendario
    // del 2026 è lo stesso per tutti. Se l'arco parte da oggi invece scade.
    setHeaders({ 'cache-control': explicit ? 'public, max-age=86400' : 'no-store' });

    return json({
      range,
      passages: incontri.passages,
      ingresses: ingressi.ingresses,
      stations: stazioni.stations,
      warnings,
    });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};
