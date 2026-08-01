import { computeSky, type SkyOptions } from '@undicesimacasa/core';
import { json } from '@sveltejs/kit';
import { placeLabel, readChartOptions } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { resolveSkyMoment } from '$lib/server/moment';
import { isHttpError, resolveOptionalPlace } from '$lib/server/place';
import type { RequestHandler } from './$types';

/**
 * `GET /api/sky?date=2026-08-01&time=18:30&timezone=Europe/Rome`
 *
 * Il cielo di un istante, senza nessuna nascita. Nessun parametro è
 * obbligatorio: senza `date` vale adesso, senza `timezone` vale UTC, e il
 * luogo — `locationId` oppure `latitude` e `longitude` — può mancare del
 * tutto. Senza luogo la risposta non ha assi né case, che è la differenza
 * fra un'effemeride e una carta.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const place = resolveOptionalPlace(parameters);
    const { moment, explicit } = resolveSkyMoment(parameters, place?.timezone);

    const { houseSystem, minorAspects } = readChartOptions(parameters);
    const options: SkyOptions = { minorAspects: minorAspects ?? false };
    if (houseSystem) options.houseSystem = houseSystem;
    if (place) options.place = { latitude: place.latitude, longitude: place.longitude };

    const sky = computeSky(moment, options);

    // Qui la cache può essere condivisa, a differenza di quella di un tema:
    // il cielo di un istante è lo stesso per tutti, e non è di nessuno.
    // «Adesso» invece invecchia mentre lo si legge.
    setHeaders({ 'cache-control': explicit ? 'public, max-age=86400' : 'no-store' });
    return json({ sky, place: placeLabel(place) });
  } catch (cause) {
    // Gli errori già formati da `error()` hanno la propria risposta: si rilanciano.
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};
