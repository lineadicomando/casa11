import { computeNatalChart } from '@undicesimacasa/core';
import { json } from '@sveltejs/kit';
import { placeLabel, readBirth, readChartOptions } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { isHttpError } from '$lib/server/place';
import type { RequestHandler } from './$types';

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
  try {
    const { birth, place } = readBirth(url.searchParams);
    const chart = computeNatalChart(birth, readChartOptions(url.searchParams));

    // `private` e non `public`: la risposta è memorizzabile — un tema è una
    // funzione pura dei suoi parametri — ma solo dal browser di chi l'ha
    // chiesta. `public` autorizzerebbe le cache condivise (CDN, proxy
    // aziendali) a conservarla, e la chiave di quella cache è un indirizzo
    // che contiene data, ora e luogo di nascita.
    setHeaders({ 'cache-control': 'private, max-age=86400' });
    return json({ chart, place: placeLabel(place) });
  } catch (cause) {
    // Gli errori già formati da `error()` hanno la propria risposta: si rilanciano.
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};
