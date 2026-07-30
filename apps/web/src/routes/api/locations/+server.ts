import { searchLocations, type SearchOptions } from '@temanatale/geo';
import { json } from '@sveltejs/kit';
import { toHttpError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

/**
 * `GET /api/locations?q=roma&limit=10&country=IT`
 *
 * Restituisce i candidati senza sceglierne uno: la disambiguazione spetta
 * all'interfaccia, che la mostra alla persona.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return json({ results: [] });
  }

  try {
    const options: SearchOptions = {};

    const limit = Number(url.searchParams.get('limit'));
    if (Number.isInteger(limit) && limit > 0) options.limit = limit;

    const country = url.searchParams.get('country');
    if (country) options.countryCode = country;

    const results = searchLocations(query, options);

    // Il dataset cambia solo quando lo si reimporta: la cache è sicura.
    setHeaders({ 'cache-control': 'public, max-age=3600' });
    return json({ results });
  } catch (cause) {
    toHttpError(cause);
  }
};
