import {
  computeNatalChart,
  DEFAULT_PASSAGE_BODIES,
  findTransitPassages,
  type PassageOptions,
} from '@dodicisegni/core';
import { json } from '@sveltejs/kit';
import { placeLabel, readBirth, readChartOptions } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { isHttpError } from '$lib/server/place';
import { resolvePassageRange } from '$lib/server/range';
import type { RequestHandler } from './$types';

/**
 * `GET /api/transits/passages?date=1968-03-12&…&from=2026-01-01&to=2026-12-31`
 *
 * Gli istanti in cui i transiti si perfezionano, invece del quadro di un
 * momento solo: è la risposta a *quando*, e a *quante volte* — un pianeta
 * lento che retrograda passa tre volte sullo stesso punto natale.
 *
 * I parametri della nascita sono quelli di `/api/chart`. Senza `from` si parte
 * da oggi, senza `to` si arriva a un anno dopo. La Luna è esclusa: da sola
 * perfeziona qualche migliaio di aspetti all'anno, e si chiede con `moon=true`.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const { birth, place } = readBirth(parameters);
    const options = readChartOptions(parameters);
    const chart = computeNatalChart(birth, options);

    const { range, explicit } = resolvePassageRange(
      parameters,
      parameters.get('transitTimezone') || birth.timezone,
    );

    const passageOptions: PassageOptions = { minorAspects: options.minorAspects ?? false };
    if (parameters.get('moon') === 'true') {
      passageOptions.bodies = [...DEFAULT_PASSAGE_BODIES, 'luna'];
    }

    const { passages, warnings } = findTransitPassages(chart, range, passageOptions);

    // Stessa regola dei transiti: un arco indicato è una funzione pura dei
    // parametri, un arco che comincia «oggi» scade a mezzanotte.
    setHeaders({ 'cache-control': explicit ? 'private, max-age=86400' : 'no-store' });
    return json({ chart, range, passages, warnings, place: placeLabel(place) });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};
