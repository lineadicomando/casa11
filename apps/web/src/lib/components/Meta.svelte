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

  interface Props {
    /** Il titolo della sezione, senza il nome del sito: lo aggiunge qui. */
    titolo: string;
    /** Una riga sola, la stessa che sta sotto il titolo nella pagina. */
    descrizione: string;
  }

  let { titolo, descrizione }: Props = $props();

  const completo = $derived(`${titolo} — undicesimacasa`);

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
</script>

<svelte:head>
  <title>{completo}</title>
  <meta name="description" content={descrizione} />
  <link rel="canonical" href={indirizzo} />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="undicesimacasa" />
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
  <meta property="og:image:alt" content="Il sigillo di undicesimacasa: una stella a dodici punte dentro due cerchi" />

  <!-- Il riquadro grande, adesso che c'è un'immagine da metterci: con
       `summary` la stessa immagine finirebbe in un quadratino di lato fisso,
       ritagliata al centro. L'immagine Twitter non si dichiara — in mancanza
       di `twitter:image` vale `og:image`, ed è la stessa. -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={completo} />
  <meta name="twitter:description" content={descrizione} />
</svelte:head>
