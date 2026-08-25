/// <reference types="@sveltejs/kit" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Il guscio dell'applicazione, conservato sul dispositivo.
 *
 * Fa **una cosa sola**: la cache. Niente notifiche, niente `push`, niente
 * sincronizzazione in background — non c'è nessun `addEventListener` oltre ai
 * tre qui sotto, e nessun permesso viene mai chiesto.
 *
 * Quello che se ne ottiene ha un limite netto, ed è meglio dirlo che scoprirlo:
 * **senza rete non si calcola niente.** Il motore è Swiss Ephemeris, un modulo
 * nativo che gira sul server e che il vincolo sul client tiene fuori dal
 * bundle; le cinque sezioni non fanno altro che comporre parametri e chiamare
 * `/api`. Offline si apre l'interfaccia, si naviga fra le sezioni e si compila
 * il modulo; premendo «Calcola» arriva il «server non raggiungibile» che
 * `lib/api.ts` già scrive. Il guadagno è che l'applicazione si apre invece di
 * mostrare la pagina d'errore del browser.
 *
 * Le due regole su che cosa entra in cache e sotto quale nome stanno in
 * `lib/cache-policy.ts`, che è la parte che si può provare: là c'è anche il
 * perché, e ha a che vedere con i dati di nascita più che con la cache.
 *
 * Chi lo registra — e chi non lo registra — è `routes/+layout.svelte`.
 */

import { build, files, prerendered, version } from '$service-worker';
import { cacheKey, isApiRequest, isCrawlerAsset } from '$lib/cache-policy';
import { SITE_NAME } from '$lib/project';

const sw = self as unknown as ServiceWorkerGlobalScope;

/**
 * Una cache per versione. `version` cambia a ogni build, quindi l'attivazione
 * di una versione nuova trova solo cache di altri nomi e le butta: non esiste
 * il caso di un file vecchio che sopravvive dentro il guscio nuovo.
 */
const CACHE = `${SITE_NAME}-${version}`;

/**
 * Tutto ciò che la build produce e che ha un indirizzo stabile: i chunk con
 * l'impronta nel nome (`build`), i file di `static/` — favicon e icone —
 * (`files`), e le rotte prerenderizzate, cioè il manifesto (`prerendered`).
 *
 * Meno l'anteprima dei collegamenti condivisi, che sta in `static/` ma non è
 * roba da browser: il perché è in `lib/cache-policy.ts`, insieme alle altre
 * due regole.
 */
const PRECARICATI = [...build, ...files.filter((file) => !isCrawlerAsset(file)), ...prerendered];

/** Per sapere in fretta se una richiesta è di quelle precaricate. */
const NELLA_SCORTA = new Set(PRECARICATI);

/**
 * La pagina di quando non c'è né rete né una copia.
 *
 * Non si serve il guscio di `/` al posto di una sezione mai visitata: SvelteKit
 * si idraterebbe sulla pagina sbagliata, e chi ha chiesto i transiti si
 * troverebbe davanti il tema natale senza che nulla glielo dica.
 *
 * I due colori sono gli stessi di `app.html` e per la stessa ragione: qui il
 * foglio di stile dell'applicazione non c'è: è un file con l'impronta nel nome,
 * e questa stringa non può sapere quale.
 */
const CORTESIA = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Senza rete — ${SITE_NAME}</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100dvh;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.6rem;
        padding: 2rem;
        text-align: center;
        font-family: Georgia, 'Times New Roman', serif;
        background: light-dark(#faf8f4, #1a1917);
        color: light-dark(#1a1917, #faf8f4);
      }
      p { margin: 0; max-width: 26rem; opacity: 0.75; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <h1>Questa pagina non è stata ancora aperta</h1>
    <p>
      Il dispositivo è senza rete, e di questa sezione non c'è una copia sul
      posto. Le sezioni già visitate si aprono lo stesso; il calcolo, quello,
      vuole il collegamento.
    </p>
  </body>
</html>`;

function paginaDiCortesia(): Response {
  return new Response(CORTESIA, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECARICATI)),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) {
        if (nome !== CACHE) await caches.delete(nome);
      }
      // Nessuno `skipWaiting` sopra: la versione nuova aspetta il caricamento
      // successivo invece di servire chunk nuovi a una pagina già aperta, che
      // i suoi li ha chiesti con altri nomi. `claim` qui vale per la prima
      // installazione, dove non c'è nessuna pagina vecchia da rovinare.
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;

  // Tutto ciò che non si conserva passa senza che il worker lo tocchi: non
  // `respondWith` affatto, così la richiesta la fa il browser come se il worker
  // non ci fosse. `isApiRequest` è la riga che tiene i dati di nascita fuori
  // dal disco — vedi `lib/cache-policy.ts`.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isApiRequest(url)) return;

  // I file con l'impronta nel nome non cambiano mai contenuto: chiederne
  // conferma alla rete sarebbe un viaggio per sentirsi dire di sì.
  if (NELLA_SCORTA.has(url.pathname)) {
    event.respondWith(
      caches.match(request).then((copia) => copia ?? fetch(request)),
    );
    return;
  }

  if (request.mode !== 'navigate') return;

  // Prima la rete, perché una pagina servita dal server è quella giusta per
  // definizione; la copia serve a quando la rete non c'è. La chiave butta la
  // query: è la seconda riga che tiene i dati di nascita fuori dal disco.
  event.respondWith(
    (async () => {
      const chiave = cacheKey(url);

      try {
        const risposta = await fetch(request);
        if (risposta.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(chiave, risposta.clone());
        }
        return risposta;
      } catch {
        const copia = await caches.match(chiave);
        return copia ?? paginaDiCortesia();
      }
    })(),
  );
});
