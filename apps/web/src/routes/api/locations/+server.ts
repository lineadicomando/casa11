import { getLocation, searchLocations, type SearchOptions } from '@dodicisegni/geo';
import { json } from '@sveltejs/kit';
import { toHttpError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

/**
 * `GET /api/locations?q=roma&limit=10&country=IT`
 * `GET /api/locations?id=3169070`
 *
 * Cercando per nome restituisce i candidati senza sceglierne uno: la
 * disambiguazione spetta all'interfaccia, che la mostra alla persona.
 *
 * Cercando per identificativo ne restituisce uno solo, o nessuno. Serve a
 * rimettere in piedi una pagina che arriva già scritta nel suo indirizzo: là il
 * luogo è un numero, e per riempire il campo ci vuole il nome — che è lo stesso
 * motivo per cui la risposta ha la forma di sempre invece di una sua.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  const identificativo = Number(url.searchParams.get('id'));
  if (Number.isInteger(identificativo) && identificativo > 0) {
    try {
      const location = getLocation(identificativo);
      setHeaders({ 'cache-control': 'public, max-age=3600' });
      return json({ results: location ? [location] : [] });
    } catch (cause) {
      toHttpError(cause);
    }
  }

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
