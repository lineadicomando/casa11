<!--
  Il quadro vedico dentro la pagina.

  Lo stesso disegno che si scarica, inserito così com'è: `{@html}` e non un
  componente che ridisegni la geometria a mano. La ruota ha il suo gemello
  interattivo perché ci si sceglie un corpo e si isolano gli aspetti — linee da
  spegnere e riaccendere; qui l'unica interazione è accendere una sigla, e per
  quella bastano i `data-graha` che `quadroSvg` scrive apposta.

  Ne segue che il file e lo schermo sono lo stesso oggetto per costruzione, e
  che a divergere non possono essere le posizioni.
-->
<script lang="ts">
  import { quadroSvg, type SquareChart, type StileQuadro } from '@undicesimacasa/ruota';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import { PALETTE_PAGINA } from '$lib/palette-pagina';

  interface Props {
    chart: SquareChart;
    stile: StileQuadro;
    /** Di che carta è il quadro: finisce nella descrizione per chi non lo vede. */
    titolo: string;
    /** Il graha isolato, condiviso con le tabelle. */
    evidenza: Evidenza;
    /**
     * Il nodo SVG, per chi deve portarlo via.
     *
     * Serve a `StrumentiDisegno`, che da lì ricava un file coi colori risolti.
     * Chi il disegno lo guarda soltanto non lo lega.
     */
    elemento?: SVGSVGElement | null;
  }

  let { chart, stile, titolo, evidenza, elemento = $bindable(null) }: Props = $props();

  let contenitore = $state<HTMLDivElement | null>(null);

  /**
   * Il disegno, rifatto solo quando cambia ciò che disegna.
   *
   * L'evidenza **non** entra qui: rifare la stringa a ogni passaggio del
   * puntatore sostituirebbe una sessantina di nodi per volta.
   */
  const svg = $derived.by(() => {
    // Lo stile del nord ha le case fisse: senza lagna la geometria si rifiuta,
    // e qui non si deve arrivare — la pagina non lo offre nemmeno.
    if (stile === 'nord' && !chart.ascendant) return null;

    return quadroSvg(chart, {
      stile,
      palette: PALETTE_PAGINA,
      label: `${titolo} in quadro ${stile === 'nord' ? 'nord' : 'sud'}-indiano`,
    });
  });

  // Il nodo cambia a ogni ridisegno: si rilega dopo che l'HTML è entrato.
  $effect(() => {
    void svg;
    elemento = contenitore?.querySelector('svg') ?? null;
  });

  /** Accende la sigla del graha scelto, toccando il DOM invece di rifare l'SVG. */
  $effect(() => {
    const scelto = evidenza.attivo;
    for (const nodo of contenitore?.querySelectorAll('[data-graha]') ?? []) {
      nodo.classList.toggle('acceso', nodo.getAttribute('data-graha') === scelto);
    }
  });
</script>

{#if svg}
  <div class="quadro" bind:this={contenitore}>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- è il nostro SVG, non input -->
    {@html svg}
  </div>
{/if}

<style>
  /* Il viewBox scala da sé: qui si toglie solo la larghezza fissa che l'SVG
     porta addosso, perché nasce anche come file a misura piena. */
  .quadro :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  /* La sigla scelta prende l'accento e il peso: dentro una cella non c'è spazio
     per un contorno, e il colore da solo si perde fra quelli degli elementi. */
  .quadro :global([data-graha].acceso) {
    fill: var(--accento);
    font-weight: 700;
  }
</style>
