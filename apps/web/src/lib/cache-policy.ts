/**
 * Che cosa il service worker può conservare, e sotto quale nome.
 *
 * Due regole sole, tenute qui invece che dentro `service-worker.ts` perché sono
 * l'unica parte di quel file che si possa provare: un worker si prova aprendo
 * un browser, queste due funzioni no. Sono anche le due su cui non si può
 * sbagliare — vedi sotto.
 */

/**
 * Le chiamate al motore, che nella cache del worker non entrano **mai**.
 *
 * Non è una scelta di freschezza del dato — un tema è una funzione pura dei
 * suoi parametri, e infatti le rotte dichiarano `private, max-age=86400` e
 * lasciano che il browser se le tenga per un giorno nella propria cache HTTP.
 * È che quelle query portano data, ora e luogo di nascita, e le due cache non
 * fanno la stessa promessa: quella del browser scade da sé ed è ordinaria
 * amministrazione, questa la governa l'applicazione, ha un nome suo, non scade
 * e si rilegge senza rete. Un archivio di date di nascita sul dispositivo,
 * insomma, è una cosa che questo programma può non costruire — e allora non la
 * costruisce.
 *
 * Fuori cache queste richieste non perdono niente: senza rete non c'è calcolo
 * comunque, e `lib/api.ts` ha già il messaggio da mostrare.
 */
export function isApiRequest(url: URL): boolean {
  return url.pathname === '/api' || url.pathname.startsWith('/api/');
}

/**
 * Il nome sotto cui una pagina si conserva: origine e percorso, nient'altro.
 *
 * Le sezioni si rimettono in piedi dal proprio indirizzo, e quell'indirizzo
 * porta i dati di nascita — `/?date=1980-05-03&time=14:30&locationId=3169070`
 * è una URL vera, che si condivide e che si aggiunge ai preferiti. Indicizzare
 * la cache per URL intera lascerebbe una riga per ogni tema guardato, che è
 * l'archivio che la regola qui sopra si rifiuta di costruire — rientrato dalla
 * finestra, e per giunta senza che serva a niente.
 *
 * Buttare la query non perde nulla, perché non c'è nulla da perdere: nessuna
 * di queste pagine ha un `load`, quindi il server rende lo stesso HTML per
 * `/transiti` e per `/transiti?date=…` — i parametri li legge il browser, dopo.
 * È la stessa ragione per cui `Meta.svelte` toglie i parametri dal canonico.
 */
export function cacheKey(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

/**
 * I file che esistono solo per chi non è un browser, e che nel precarico del
 * service worker non entrano.
 *
 * L'anteprima dei collegamenti condivisi è trenta chilobyte che nessuno che
 * apra il sito guarderà mai: la chiedono i server delle piattaforme quando
 * qualcuno incolla un indirizzo, e la chiedono da casa loro. Sta in `static/`
 * perché è un file fermo con un indirizzo fermo, e da lì `$service-worker` la
 * metterebbe fra i `files` da scaricare all'installazione — cioè addosso a
 * ogni dispositivo, per un'immagine che su quel dispositivo non comparirà.
 *
 * Restarne fuori non le toglie niente: chi la chiede non esegue service
 * worker, e un browser che ci capitasse la prenderebbe dalla rete come
 * qualunque altra cosa non conservata.
 */
export function isCrawlerAsset(path: string): boolean {
  return path === '/og.png';
}
