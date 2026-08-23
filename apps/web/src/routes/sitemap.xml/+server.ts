import { sitemapXml } from '$lib/seo';
import type { RequestHandler } from './$types';

/**
 * `GET /sitemap.xml` — l'elenco delle pagine, per chi indicizza.
 *
 * Dinamica e **non** prerenderizzata, al contrario del manifesto: una rotta
 * prerenderizzata finisce fra i `prerendered` che il service worker precarica,
 * e questo è un file che nessun browser aprirà mai. Precaricarlo vorrebbe dire
 * far scaricare a ogni visitatore un documento scritto per i crawler. In più
 * la sitemap vuole indirizzi assoluti, e l'origine si sa a richiesta fatta,
 * non a build finita.
 *
 * Che cosa ci finisce dentro — e che cosa no — sta in `lib/seo.ts`.
 */
export const GET: RequestHandler = ({ url, setHeaders }) => {
  // Un giorno di cache: l'elenco cambia quando cambia una sezione, cioè quasi
  // mai. `public` perché non c'è niente di personale in sei percorsi fissi.
  setHeaders({ 'cache-control': 'public, max-age=86400' });

  return new Response(sitemapXml(url.origin), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
