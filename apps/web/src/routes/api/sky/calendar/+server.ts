import {
  findSignIngresses,
  findSkyPassages,
  findStations,
  type BodyId,
  type SkyEventOptions,
  type SkyPassageOptions,
} from '@dodicisegni/core';
import { error, json } from '@sveltejs/kit';
import { readZodiacOptions } from '$lib/server/birth';
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
 * ha un tetto di tre anni. Con `bodies` si sceglie chi seguire: senza, tutti
 * tranne la Luna.
 *
 * `zodiac=siderale` sposta i soli **ingressi**, che sono attraversamenti di un
 * confine. Gli incontri fra due corpi restano dove sono: sono differenze fra
 * longitudini dello stesso istante, e l'ayanamsa le sposta entrambe.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const timezone = parameters.get('timezone') || 'UTC';
    const { range, explicit } = resolvePassageRange(parameters, timezone, new Date(), 'DATA_NON_VALIDA');

    const minorAspects = parameters.get('minorAspects') === 'true';
    const passageOptions: SkyPassageOptions = { minorAspects };
    // Solo gli eventi prendono lo zodiaco: un incontro fra due corpi è una
    // differenza fra longitudini dello stesso istante, e l'ayanamsa le sposta
    // entrambe. Un ingresso invece è un confine, e i confini si spostano.
    const eventOptions: SkyEventOptions = { ...readZodiacOptions(parameters) };

    // Senza `bodies` la Luna resta fuori, perché in un anno riempirebbe
    // l'elenco da sola. Ma è anche l'unico modo di avere le lunazioni, e
    // negarlo qui renderebbe l'endpoint più povero della riga di comando.
    const bodies = readBodies(parameters);
    if (bodies) {
      passageOptions.bodies = bodies;
      eventOptions.bodies = bodies;
    }

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

/**
 * I corpi da seguire, separati da virgola.
 *
 * Un identificatore sconosciuto lo rifiuta il motore, con il suo codice: qui
 * si controlla solo che la lista non sia vuota, perché una lista vuota
 * scivolerebbe nei predefiniti invece di dire che non si è capito.
 */
function readBodies(parameters: URLSearchParams): BodyId[] | null {
  const raw = parameters.get('bodies');
  if (raw === null || raw === '') return null;

  const bodies = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '');

  if (bodies.length === 0) {
    throw error(400, {
      message: 'Valore di "bodies" vuoto: elenca i corpi separati da virgola, es. "sole,luna".',
      code: 'CORPO_SCONOSCIUTO',
    });
  }

  return bodies as BodyId[];
}
