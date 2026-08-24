<!--
  Che cosa il sito dice di sé a chi non lo sta guardando.

  Un collegamento condiviso in una chat, un risultato di ricerca, un lettore di
  feed: tutti chiedono la stessa cosa — titolo, una riga di descrizione, un
  indirizzo canonico — e finora trovavano una descrizione sola per tutte e
  quattro le sezioni, che è quanto dire nessuna.

  L'anteprima è un PNG e non l'SVG della favicon, che la maggior parte delle
  piattaforme non sa disegnare: la rasterizza `scripts/build-icons.mjs` dal
  favicon prima di ogni build, come le icone. È una sola per tutto il sito —
  il sigillo, senza scritte — e la sezione la dice `og:title`, che nelle
  anteprime sta scritto accanto all'immagine.
-->
<script lang="ts">
  import { page } from '$app/state';
  import {
    LICENSE_URL,
    REPOSITORY_URL,
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_SHORT_NAME,
  } from '$lib/project';

  interface Props {
    /** Il titolo della sezione, senza il nome del sito: lo aggiunge qui. */
    titolo: string;
    /** Una riga sola, la stessa che sta sotto il titolo nella pagina. */
    descrizione: string;
  }

  let { titolo, descrizione }: Props = $props();

  const completo = $derived(`${titolo} — ${SITE_NAME}`);

  /**
   * L'indirizzo senza i parametri.
   *
   * Il canonico è la sezione, non il singolo calcolo: due temi diversi non sono
   * due pagine diverse. E dei parametri, sulle sezioni che ne portano, farebbe
   * finire una data di nascita dentro un `og:url` che i social conservano.
   */
  const indirizzo = $derived(`${page.url.origin}${page.url.pathname}`);

  /**
   * L'anteprima, in indirizzo assoluto: un `/og.png` qui non lo risolve
   * nessuno, perché chi legge questi tag non è il browser che ha caricato la
   * pagina ma un server che ne ha ricevuto solo l'HTML. È la ragione per cui
   * `ORIGIN` va dichiarato in produzione — vedi il README.
   */
  const anteprima = $derived(`${page.url.origin}/og.png`);

  /**
   * Il sito detto in una forma che una macchina legge: nome, indirizzo, lingua
   * e licenza.
   *
   * **Un `WebSite` e nient'altro.** Quello che si potrebbe aggiungere qui è
   * quasi tutto roba che il vincolo del motore non lascia dire: un
   * `potentialAction` di ricerca descriverebbe una ricerca che non c'è, e le
   * marcature che promettono un risultato ricco — le domande frequenti in
   * testa — vanno riempite di affermazioni, che è esattamente la merce che
   * questo progetto non produce. Qui dentro non c'è nessun dato astrologico:
   * sono i connotati del sito, non del cielo.
   *
   * Va su tutte le pagine e non solo sulla prima: è lo stesso nodo, con lo
   * stesso `url`, e chi lo legge lo riconosce come tale. Costa duecento byte e
   * risparmia una regola in più su chi debba renderlo.
   */
  const strutturati = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: SITE_SHORT_NAME,
      url: `${page.url.origin}/`,
      description: SITE_DESCRIPTION,
      inLanguage: 'it-IT',
      license: LICENSE_URL,
      // Finché `REPOSITORY_URL` è vuoto la voce non c'è: `sameAs: ['']` non
      // dichiara nessun altrove, dichiara un indirizzo rotto.
      ...(REPOSITORY_URL ? { sameAs: [REPOSITORY_URL] } : {}),
    })
      // Un `<` dentro il JSON chiuderebbe il tag che lo contiene, e quello che
      // segue lo leggerebbe il browser come marcatura. Nessuno di questi campi
      // ne porta uno oggi; la difesa non costa niente e vale anche domani.
      .replaceAll('<', '\\u003c'),
  );
</script>

<svelte:head>
  <title>{completo}</title>
  <meta name="description" content={descrizione} />
  <link rel="canonical" href={indirizzo} />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:locale" content="it_IT" />
  <meta property="og:title" content={completo} />
  <meta property="og:description" content={descrizione} />
  <meta property="og:url" content={indirizzo} />
  <meta property="og:image" content={anteprima} />
  <!-- Le misure dichiarate risparmiano a chi compone l'anteprima di scaricare
       l'immagine per sapere quanto è grande: senza, alcune piattaforme la
       trattano come piccola e ripiegano sul riquadro stretto. -->
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta
    property="og:image:alt"
    content="Il sigillo di {SITE_NAME}: una stella a dodici punte dentro due cerchi"
  />

  <!-- Il riquadro grande, adesso che c'è un'immagine da metterci: con
       `summary` la stessa immagine finirebbe in un quadratino di lato fisso,
       ritagliata al centro. L'immagine Twitter non si dichiara — in mancanza
       di `twitter:image` vale `og:image`, ed è la stessa. -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={completo} />
  <meta name="twitter:description" content={descrizione} />

  <!-- `{@html}` e non un `<script>` scritto qui: dentro un componente Svelte
       un tag `script` nel corpo è il blocco del componente, non un elemento da
       rendere. -->
  {@html '<script type="application/ld+json">' + strutturati + '</script>'}
</svelte:head>
