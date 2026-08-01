import {
  findElectionHours,
  MAX_ELECTION_DAYS,
  type BodyId,
  type ElectionOptions,
} from '@undicesimacasa/core';
import { error, json } from '@sveltejs/kit';
import { toHttpError } from '$lib/server/errors';
import { isHttpError, resolvePlace } from '$lib/server/place';
import { resolvePassageRange } from '$lib/server/range';
import type { RequestHandler } from './$types';

/**
 * `GET /api/election?locationId=2523920&from=2029-08-24&to=2029-08-26`
 *
 * Di che cosa è fatto il tempo in un luogo: le ore planetarie con il loro
 * reggitore, l'Ascendente che sorge all'inizio di ognuna, i tratti in cui la
 * Luna è vuota di corso.
 *
 * Nessuna nascita — è il cielo di un luogo, non di una persona — ma il luogo è
 * **obbligatorio**, ed è l'unico endpoint in cui lo sia senza alternative:
 * alba e tramonto vengono da lì, e senza di loro non ci sono ore planetarie.
 *
 * Non contiene raccomandazioni e non ne conterrà: dice quale pianeta regge
 * un'ora, non se quell'ora sia buona per qualcosa.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  try {
    const parameters = url.searchParams;
    const place = resolvePlace(parameters);
    const { range, explicit } = resolvePassageRange(
      parameters,
      place.timezone,
      new Date(),
      'DATA_NON_VALIDA',
      'giorno',
    );

    // Il tetto del motore è più stretto di quello dei passaggi: qui ogni
    // giorno porta ventiquattro righe, e il controllo va fatto prima di
    // chiamare, per rispondere 400 invece che 500.
    const giorni =
      (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000;
    if (giorni > MAX_ELECTION_DAYS) {
      throw error(400, {
        message:
          `Intervallo di ${Math.round(giorni)} giorni: l'elezione ne ammette al massimo ` +
          `${MAX_ELECTION_DAYS}, perché ogni giorno porta ventiquattro ore planetarie.`,
        code: 'INTERVALLO_TROPPO_LUNGO',
      });
    }

    const options: ElectionOptions = {};
    const bodies = readBodies(parameters);
    if (bodies) options.bodies = bodies;

    const election = findElectionHours(
      range,
      { latitude: place.latitude, longitude: place.longitude },
      options,
    );

    // Un arco esplicito è lo stesso per tutti e non cambia mai: le ore
    // planetarie del 24 agosto 2029 a Palermo sono un fatto. Se invece parte
    // da oggi, oggi scade.
    setHeaders({ 'cache-control': explicit ? 'public, max-age=86400' : 'no-store' });

    return json({
      range: election.range,
      place: { label: place.label, refined: place.refined ?? false },
      hours: election.hours,
      voids: election.voids,
      warnings: election.warnings,
    });
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    toHttpError(cause);
  }
};

/**
 * I corpi che tolgono la Luna dal vuoto di corso, separati da virgola.
 *
 * Senza il parametro valgono i sei classici, che è la regola nella forma in
 * cui è nata. Chi vuole contare anche Urano, Nettuno e Plutone lo chiede, e
 * sta chiedendo una dottrina diversa: non è un dettaglio di comodo.
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
      message:
        'Valore di "bodies" vuoto: elenca i corpi separati da virgola, es. "sole,venere,giove".',
      code: 'CORPO_SCONOSCIUTO',
    });
  }

  return bodies as BodyId[];
}
