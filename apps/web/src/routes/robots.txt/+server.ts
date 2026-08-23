import { robotsTxt } from '$lib/seo';
import type { RequestHandler } from './$types';

/**
 * `GET /robots.txt` — che cosa i crawler non devono chiedere.
 *
 * Dinamica per la stessa ragione della sitemap, che sta nella rotta accanto:
 * fuori dal precarico del service worker, e la direttiva `Sitemap:` vuole un
 * indirizzo assoluto che solo la richiesta conosce.
 *
 * Il contenuto e il perché stanno in `lib/seo.ts`.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  setHeaders({ 'cache-control': 'public, max-age=86400' });

  return new Response(robotsTxt(url.origin), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
