import {
  computeJyotisha,
  computeNatalChart,
  formatJyotishaCompact,
  type ChartOptions,
  type JyotishaOptions,
  type VargaId,
  type VimshottariOptions,
} from '@undicesimacasa/core';
import { error, json } from '@sveltejs/kit';
import { placeLabel, readAyanamsa, readBirth } from '$lib/server/birth';
import { toHttpError } from '$lib/server/errors';
import { isHttpError } from '$lib/server/place';
import type { RequestHandler } from './$types';

/** I varga che il motore calcola. Gli altri stanno in `ROADMAP.md`. */
const VARGAS = new Set<string>(['d1', 'd3', 'd9', 'd10', 'd12', 'd30']);

/**
 * `GET /api/jyotish?date=1968-03-12&time=14:30&locationId=3172394`
 *
 * Il tema secondo l'astrologia indiana: zodiaco siderale, case a segni interi
 * dal lagna, e in più i nakshatra dei graha, la catena delle dasha
 * vimshottari, le carte divisionali e le drishti.
 *
 * **Non è `/api/chart` con un parametro.** I gradi si contano dalle stelle
 * fisse invece che dal punto vernale, e fra i due zodiaci corrono oltre
 * ventiquattro gradi: chi qui ha il Sole in Acquario su `/api/chart` ce l'ha
 * in Pesci. Per il tema occidentale — anche siderale, che lì è un'opzione —
 * c'è quella rotta.
 *
 * I parametri della nascita sono gli stessi di `/api/chart`: `date`, `time`,
 * e il luogo con `locationId` oppure con la terna `latitude` + `longitude` +
 * `timezone`.
 *
 * Quel che si sceglie qui, e i valori ammessi:
 *
 * - `ayanamsa` — `lahiri` (default), `true-chitra`, `krishnamurti`, `raman`,
 *   `yukteshwar`, `fagan-bradley`. Decide dove comincia l'Ariete: fra Lahiri e
 *   Raman corre più di un grado e mezzo, che basta a spostare il nakshatra
 *   della Luna e con esso tutta la catena delle dasha.
 * - `dashaLevels` — 1, 2 (default) o 3. Nove periodi, ottantuno o
 *   settecentoventinove.
 * - `dashaYear` — `solare` (default, 365,25 giorni) o `savana` (360).
 * - `vargas` — elenco separato da virgola fra `d1,d3,d9,d10,d12,d30`.
 *   Default: `d9`.
 * - `drishtiNodes` — `nessuna` (default, forma classica) o `gioviana`.
 * - `format` — `json` (default) o `compact`.
 *
 * Lo zodiaco **non** si sceglie: il Jyotisha è siderale per definizione, e
 * `zodiac=tropicale` viene rifiutato invece che ignorato. Nemmeno le case: si
 * contano a segni interi, ed è ciò che rende vedico questo tema.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const { birth, place } = readBirth(parameters);

    // Lo zodiaco qui non si legge con `readZodiacOptions`: quella pretende
    // `zodiac=siderale` accanto all'ayanamsa, ed è giusto dove lo zodiaco è
    // una scelta. Qui non lo è, e farlo scrivere a ogni richiesta vorrebbe
    // dire chiedere un parametro che non può avere un altro valore.
    const zodiac = parameters.get('zodiac');
    if (zodiac && zodiac !== 'siderale') {
      throw error(400, {
        message:
          `Il Jyotisha è siderale per definizione: "zodiac=${zodiac}" non si applica. ` +
          'Per un tema tropicale usa /api/chart.',
        code: 'ZODIACO_NON_SIDERALE',
      });
    }

    // Siderale e a segni interi non sono predefiniti sostituibili: sono ciò
    // che rende vedico questo tema. Chi vuole altro ha /api/chart.
    const chartOptions: ChartOptions = { zodiac: 'siderale', houseSystem: 'segni-interi' };
    const ayanamsa = readAyanamsa(parameters);
    if (ayanamsa) chartOptions.ayanamsa = ayanamsa;

    const jyotisha = computeJyotisha(
      computeNatalChart(birth, chartOptions),
      readJyotishaOptions(parameters),
    );

    // Come per il tema: memorizzabile, ma solo dal browser di chi l'ha
    // chiesta. La chiave di una cache condivisa conterrebbe data, ora e luogo
    // di nascita.
    setHeaders({ 'cache-control': 'private, max-age=86400' });

    if (readFormat(parameters) === 'compact') {
      const intestazione = place.label ? `Luogo di nascita: ${place.label}\n` : '';
      return new Response(intestazione + formatJyotishaCompact(jyotisha), {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    return json({ jyotisha, place: placeLabel(place) });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};

function readJyotishaOptions(parameters: URLSearchParams): JyotishaOptions {
  const options: JyotishaOptions = {};
  const dasha: VimshottariOptions = {};

  const levels = parameters.get('dashaLevels');
  if (levels) {
    if (levels !== '1' && levels !== '2' && levels !== '3') {
      throw error(400, {
        message: 'Il parametro "dashaLevels" vuole 1, 2 oppure 3.',
        code: 'LIVELLI_DASHA_NON_VALIDI',
      });
    }
    dasha.levels = Number(levels) as 1 | 2 | 3;
  }

  const year = parameters.get('dashaYear');
  if (year) {
    if (year !== 'solare' && year !== 'savana') {
      throw error(400, {
        message: `Anno di dasha "${year}" non riconosciuto: atteso "solare" oppure "savana".`,
        code: 'ANNO_DASHA_NON_VALIDO',
      });
    }
    dasha.yearLength = year;
  }

  if (Object.keys(dasha).length > 0) options.dasha = dasha;

  const vargas = parameters.get('vargas');
  if (vargas) {
    const chiesti = vargas
      .split(',')
      .map((voce) => voce.trim().toLowerCase())
      .filter((voce) => voce.length > 0);

    for (const id of chiesti) {
      if (!VARGAS.has(id)) {
        throw error(400, {
          message: `Varga "${id}" non disponibile. Calcolati: ${[...VARGAS].join(', ')}.`,
          code: 'VARGA_NON_VALIDO',
        });
      }
    }
    options.vargas = chiesti as VargaId[];
  }

  const nodes = parameters.get('drishtiNodes');
  if (nodes) {
    if (nodes !== 'nessuna' && nodes !== 'gioviana') {
      throw error(400, {
        message: `Drishti dei nodi "${nodes}" non riconosciute: atteso "nessuna" oppure "gioviana".`,
        code: 'DRISHTI_NODI_NON_VALIDE',
      });
    }
    options.drishti = { nodes };
  }

  return options;
}

/**
 * In che forma va restituito il tema.
 *
 * Un valore non riconosciuto viene rifiutato invece che ricondotto al
 * predefinito, come sulle altre rotte.
 */
function readFormat(parameters: URLSearchParams): 'json' | 'compact' {
  const formato = parameters.get('format') ?? 'json';
  if (formato !== 'json' && formato !== 'compact') {
    throw error(400, {
      message: `Formato "${formato}" non riconosciuto: atteso "json" oppure "compact".`,
      code: 'FORMATO_NON_VALIDO',
    });
  }
  return formato;
}
