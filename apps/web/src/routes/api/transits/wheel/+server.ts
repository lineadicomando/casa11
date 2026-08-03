import { computeNatalChart, computeTransits, type TransitOptions } from '@undicesimacasa/core';
import { readBirth, readChartOptions } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { resolveTransitMoment } from '$lib/server/moment';
import { isHttpError, LUOGO_TRANSITO, resolveOptionalPlace } from '$lib/server/place';
import { readWheelOptions } from '$lib/server/wheel';
import { disegnoResponse } from '$lib/server/wheel-response';
import type { RequestHandler } from './$types';

/**
 * `GET /api/transits/wheel?date=1968-03-12&time=14:30&locationId=3172394`
 *
 * La **bi-ruota**: il tema al centro, i corpi in transito in un anello esterno
 * e, fra i due, le linee dei loro aspetti al tema — non quelle degli aspetti
 * interni al tema, che sovrapposte renderebbero illeggibili entrambe le trame.
 *
 * Accetta gli stessi parametri di `/api/transits` per il calcolo e quelli di
 * `/api/chart/wheel` per il disegno.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const { birth } = readBirth(parameters);
    const options = readChartOptions(parameters);
    const chart = computeNatalChart(birth, options);

    const transitPlace = resolveOptionalPlace(parameters, LUOGO_TRANSITO);
    const { moment, explicit } = resolveTransitMoment(
      parameters,
      transitPlace?.timezone ?? birth.timezone,
    );

    const transitOptions: TransitOptions = { minorAspects: options.minorAspects ?? false };
    if (options.houseSystem) transitOptions.houseSystem = options.houseSystem;
    if (transitPlace) {
      transitOptions.place = {
        latitude: transitPlace.latitude,
        longitude: transitPlace.longitude,
      };
    }

    const transits = computeTransits(chart, moment, transitOptions);
    const disegno = readWheelOptions(parameters);

    // Come in `/api/transits`: «adesso» invecchia mentre lo si guarda, e un
    // disegno conservato mostrerebbe domani il cielo di oggi.
    setHeaders({ 'cache-control': explicit ? 'private, max-age=86400' : 'no-store' });

    return disegnoResponse(chart, disegno, {
      transits,
      aspettiMinori: options.minorAspects ?? false,
      label: 'Ruota con il tema natale, i corpi in transito e i loro aspetti',
    });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};
