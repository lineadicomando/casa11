import { computeNatalChart, computeVarga, type ChartOptions, type VargaId } from '@undicesimacasa/core';
import type { StileQuadro } from '@undicesimacasa/ruota';
import { error } from '@sveltejs/kit';
import { readAyanamsa, readBirth } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { isHttpError } from '$lib/server/place';
import { readWheelOptions } from '$lib/server/wheel';
import { quadroResponse } from '$lib/server/wheel-response';
import type { RequestHandler } from './$types';

/** I varga che il motore calcola. Gli altri stanno in `ROADMAP.md`. */
const VARGAS = new Set<string>(['d1', 'd3', 'd9', 'd10', 'd12', 'd30']);

/**
 * `GET /api/jyotish/quadro?date=1968-03-12&time=14:30&locationId=3172394`
 *
 * Il quadro vedico, disegnato. Sta a `/api/jyotish` come `/api/chart/wheel` sta
 * a `/api/chart`: gli stessi dati in forma di immagine, per chi il tema deve
 * **mostrarlo** — e un modello non vede un SVG, lo legge come testo, che è la
 * ragione per cui `format=png` esiste.
 *
 * Un disegno non porta le avvertenze del calcolo, e questo nemmeno: chi lo
 * mostra dovrebbe aver chiesto anche `/api/jyotish`.
 *
 * Oltre ai parametri della nascita e a quelli del disegno — `format`, `theme`,
 * `width`, gli stessi della ruota:
 *
 * - `stile` — `sud` (default) o `nord`. Non è una preferenza grafica soltanto:
 *   nel sud i segni stanno fermi e le case si spostano, nel nord il contrario.
 *   Dicono la stessa cosa in due disposizioni diverse.
 * - `varga` — uno fra `d1` (default), `d3`, `d9`, `d10`, `d12`, `d30`. **Uno
 *   solo**: un'immagine è un quadro solo.
 * - `ayanamsa` — come su `/api/jyotish`.
 *
 * Lo zodiaco non si sceglie, ed è siderale. Lo `stile` del nord **richiede
 * l'ora di nascita**: le sue caselle sono case, e senza lagna non c'è una
 * prima casa da mettere in alto.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const { birth } = readBirth(parameters);

    const chartOptions: ChartOptions = { zodiac: 'siderale', houseSystem: 'segni-interi' };
    const ayanamsa = readAyanamsa(parameters);
    if (ayanamsa) chartOptions.ayanamsa = ayanamsa;

    const varga = computeVarga(computeNatalChart(birth, chartOptions), readVarga(parameters));
    const stile = readStile(parameters);

    // Il rifiuto arriva prima del disegno, e dice che cosa fare: la geometria
    // solleverebbe lo stesso, ma con un messaggio che parla di poligoni.
    if (stile === 'nord' && !varga.ascendant) {
      throw error(400, {
        message:
          "Lo stile del nord ha le case fisse, e senza ora di nascita non c'è un lagna da " +
          'mettere in prima casa. Usa "stile=sud", dove a essere fissi sono i segni.',
        code: 'QUADRO_NORD_SENZA_LAGNA',
      });
    }

    setHeaders({ 'cache-control': 'private, max-age=86400' });

    return quadroResponse(varga, readWheelOptions(parameters), { stile });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};

function readStile(parameters: URLSearchParams): StileQuadro {
  const stile = parameters.get('stile') ?? 'sud';
  if (stile !== 'nord' && stile !== 'sud') {
    throw error(400, {
      message: `Stile "${stile}" non riconosciuto: attesi "nord" oppure "sud".`,
      code: 'STILE_QUADRO_NON_VALIDO',
    });
  }
  return stile;
}

function readVarga(parameters: URLSearchParams): VargaId {
  const varga = parameters.get('varga') ?? 'd1';
  if (!VARGAS.has(varga)) {
    throw error(400, {
      message: `Varga "${varga}" non disponibile. Calcolati: ${[...VARGAS].join(', ')}.`,
      code: 'VARGA_NON_VALIDO',
    });
  }
  return varga as VargaId;
}
