import { computeNatalChart } from '@undicesimacasa/core';
import { ruotaSvg } from '@undicesimacasa/ruota';
import { ruotaPng } from '@undicesimacasa/ruota/png';
import { readBirth, readChartOptions } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { isHttpError } from '$lib/server/place';
import { readWheelOptions } from '$lib/server/wheel';
import { disegnoResponse } from '$lib/server/wheel-response';
import type { RequestHandler } from './$types';

/**
 * `GET /api/chart/wheel?date=1968-03-12&time=14:30&locationId=3172394`
 *
 * La ruota, disegnata. È l'unico endpoint che non restituisca JSON, e serve a
 * chi il tema deve **mostrarlo**: l'interfaccia il disegno se lo fa da sé, ma
 * un agente no — e un modello non vede un SVG, lo legge come testo. È per
 * questo che `format=png` esiste e non è un vezzo.
 *
 * Non aggiunge niente al calcolo: gli stessi parametri di `/api/chart` danno
 * gli stessi dati, qui in forma di immagine invece che di numeri. Nessuna
 * avvertenza vi compare — un disegno non ha modo di dirle — quindi chi lo
 * mostra dovrebbe aver chiesto anche il tema.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const { birth } = readBirth(url.searchParams);
    const options = readChartOptions(url.searchParams);
    const chart = computeNatalChart(birth, options);
    const disegno = readWheelOptions(url.searchParams);

    // Come `/api/chart`: memorizzabile perché funzione pura dei suoi
    // parametri, ma solo dal browser di chi l'ha chiesta — nell'indirizzo c'è
    // una data di nascita.
    setHeaders({ 'cache-control': 'private, max-age=86400' });

    return disegnoResponse(chart, disegno, { aspettiMinori: options.minorAspects ?? false });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};
