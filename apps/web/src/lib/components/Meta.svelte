<!--
  Che cosa il sito dice di sé a chi non lo sta guardando.

  Un collegamento condiviso in una chat, un risultato di ricerca, un lettore di
  feed: tutti chiedono la stessa cosa — titolo, una riga di descrizione, un
  indirizzo canonico — e finora trovavano una descrizione sola per tutte e
  quattro le sezioni, che è quanto dire nessuna.

  Non c'è `og:image`: un'anteprima vuole un PNG e questo sito non ne ha uno da
  offrire. Meglio non dichiararlo che dichiararne uno rotto, che è ciò che
  succede indicando l'SVG della favicon — la maggior parte delle piattaforme
  non lo sa disegnare.
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

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={completo} />
  <meta name="twitter:description" content={descrizione} />
</svelte:head>
