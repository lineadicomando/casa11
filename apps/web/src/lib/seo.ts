/**
 * Che cosa il sito dichiara a chi lo indicizza: l'elenco delle pagine.
 *
 * Sta qui e non dentro le rotte per la stessa ragione di `cache-policy.ts`:
 * è la parte che si può provare. Una sitemap si controlla leggendola, e
 * leggendola non ci si accorge mai della sezione che manca — di quella se ne
 * accorge un test che confronta l'elenco con `lib/navigation.ts`.
 */

import { SECTIONS } from '$lib/navigation';

/**
 * Le pagine che ha senso indicizzare, in ordine.
 *
 * Le cinque sezioni vengono da `SECTIONS`, che è già dichiarato «un elenco
 * solo»: una sezione nuova entra nella sitemap senza che nessuno se ne ricordi.
 * L'informativa non è una sezione — non sta nel menù e non sta nel manifesto —
 * ma è una pagina pubblica con del testo dentro, ed è l'unica del sito che si
 * possa cercare per quello che dice.
 *
 * Non c'è nient'altro da elencare, e in particolare non ci sono i temi: un
 * tema non è una pagina, è una query su una pagina che c'è già. Elencarne
 * anche uno solo vorrebbe dire mettere una data di nascita in un file fatto
 * apposta perché i motori di ricerca lo leggano.
 */
export const PAGINE_PUBBLICHE: readonly string[] = [
  ...SECTIONS.map((section) => section.href),
  '/privacy',
];

/** I cinque caratteri che in XML non si possono scrivere così come sono. */
function xml(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * La sitemap: sei indirizzi assoluti e nient'altro.
 *
 * **Niente `lastmod`.** L'unica data che il programma potrebbe metterci è
 * quella della compilazione, e cambierebbe a ogni ricostruzione anche quando
 * il testo della pagina è identico a prima: una data di modifica che non
 * corrisponde a nessuna modifica. È la stessa bugia che `AGGIORNAMENTO`
 * nell'informativa si rifiuta di dire ricavandosi da sé, e un motore che se ne
 * accorge smette di credere al campo su tutto il sito. Meglio non dichiararlo.
 *
 * Niente `changefreq` e niente `priority` per una ragione più semplice: Google
 * ha dichiarato di ignorarli, e gli altri li trattano al più come un
 * suggerimento. Sono due campi che si compilano per abitudine.
 *
 * L'origine arriva dalla richiesta e non da una costante: la stessa build gira
 * su localhost, dentro Electron e sul dominio pubblico, e la sitemap vuole
 * indirizzi assoluti. Chi pubblica dichiara `ORIGIN` — vedi il README.
 */
export function sitemapXml(origin: string): string {
  const righe = PAGINE_PUBBLICHE.map(
    (percorso) => `  <url><loc>${xml(new URL(percorso, origin).href)}</loc></url>`,
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...righe,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * `robots.txt`: una sola porta chiusa, e l'indirizzo della sitemap.
 *
 * **`/api` fuori.** Sono undici endpoint che rispondono JSON: non hanno niente
 * da fare in un indice, e un crawler che li segue spende su di essi i passaggi
 * che avrebbe dato alle pagine. Non è una misura di riservatezza — quelle
 * chiamate portano data, ora e luogo di nascita, ma `robots.txt` è un file
 * pubblico e non nasconde niente a nessuno: chi rispetta questo file non
 * indovina gli indirizzi, e chi non lo rispetta non è tenuto fuori da una
 * riga di testo. Quello che tiene i dati di nascita fuori dall'indice è il
 * canonico senza parametri in `components/Meta.svelte`, e fuori dal disco è
 * `cache-policy.ts`.
 *
 * Tutto il resto passa, e non serve dirlo: l'assenza di una regola è già un
 * permesso, e un `Allow: /` scritto sotto un `Disallow` più stretto è il modo
 * classico di bloccarsi il sito per sbaglio.
 */
export function robotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', origin).href}`,
    '',
  ].join('\n');
}
