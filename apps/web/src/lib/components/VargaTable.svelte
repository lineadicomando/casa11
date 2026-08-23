<script lang="ts">
  import type { VargaChart } from '@undicesimacasa/core';
  import { BODY_GLYPH, quadroSvg, SIGN_GLYPH, SIGN_LABEL, type StileQuadro } from '@undicesimacasa/ruota';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import { PALETTE_PAGINA } from '$lib/palette-pagina';

  /**
   * Una carta divisionale.
   *
   * **La regola sta sotto il titolo e non in un tooltip.** Fra le sedici
   * divisioni le scuole divergono su più d'una, e un segno consegnato senza la
   * regola che l'ha prodotto non si può ricontrollare: chi ne segue un'altra
   * deve vederlo mentre guarda i segni, non dopo averli confrontati con un
   * altro programma.
   */
  interface Props {
    varga: VargaChart;
    /**
     * Lo stile del quadro. Omesso, la carta resta la sola tabella.
     *
     * Il disegno sta qui e non nella pagina perché è una carta divisionale
     * vista in due modi, non due cose accostate: chi la guarda deve trovare
     * il quadro sotto la regola che l'ha prodotto.
     */
    stile?: StileQuadro | undefined;
    /** Il graha isolato, condiviso con le altre tabelle e col quadro. */
    evidenza: Evidenza;
  }

  let { varga, stile = undefined, evidenza }: Props = $props();

  /** Il nodo in cui l'SVG viene inserito, per illuminarne una sigla. */
  let contenitore = $state<HTMLDivElement | null>(null);

  /**
   * Accende la sigla del graha scelto dentro il quadro.
   *
   * Si tocca il DOM invece di rigenerare l'SVG, ed è voluto: il disegno è una
   * stringa, e rifarla a ogni passaggio del puntatore sostituirebbe una
   * sessantina di nodi per volta. Gli appigli sono i `data-graha` che
   * `quadroSvg` scrive apposta, e qui basta accendere e spegnere una classe.
   */
  $effect(() => {
    const scelto = evidenza.attivo;
    for (const nodo of contenitore?.querySelectorAll('[data-graha]') ?? []) {
      nodo.classList.toggle('acceso', nodo.getAttribute('data-graha') === scelto);
    }
  });

  /**
   * Lo stesso disegno che si scarica, inserito nella pagina.
   *
   * `{@html}` e non un componente interattivo: il quadro non ha niente da
   * illuminare — le drishti si contano a segni interi, non sono linee — e
   * così il file e lo schermo sono lo stesso oggetto per costruzione.
   */
  const disegno = $derived.by(() => {
    if (!stile) return null;
    // Lo stile del nord ha le case fisse: senza lagna la geometria si rifiuta,
    // e qui non si deve arrivare — la pagina non lo offre nemmeno.
    if (stile === 'nord' && !varga.ascendant) return null;

    return quadroSvg(varga, {
      stile,
      palette: PALETTE_PAGINA,
      label: `${varga.name} in quadro ${stile === 'nord' ? 'nord' : 'sud'}-indiano`,
    });
  });
</script>

<section>
  <h3 class="titolo-sezione">{varga.name} ({varga.varga.toUpperCase()})</h3>
  <p class="regola">{varga.rule}</p>

  {#if disegno}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- è il nostro SVG, non input -->
    <div class="quadro" bind:this={contenitore}>{@html disegno}</div>
  {/if}

  <table>
    <thead>
      <tr>
        <th></th>
        <th>Graha</th>
        <th>Segno</th>
      </tr>
    </thead>
    <tbody>
      {#if varga.ascendant}
        <tr>
          <td class="glifo">↑</td>
          <td>Lagna</td>
          <td>
            <span class="glifo-piccolo" title={SIGN_LABEL[varga.ascendant]}>
              {SIGN_GLYPH[varga.ascendant]}
            </span>
            {SIGN_LABEL[varga.ascendant]}
          </td>
        </tr>
      {/if}
      {#each varga.positions as position (position.id)}
        <tr
          onmouseenter={() => evidenza.sorvola(position.id)}
          onmouseleave={() => evidenza.sorvola(null)}
          class:evidenziato={evidenza.attivo === position.id}
        >
          <td class="glifo">{BODY_GLYPH[position.id]}</td>
          <td>{position.name}</td>
          <td>
            <span class="glifo-piccolo" title={SIGN_LABEL[position.sign]}>
              {SIGN_GLYPH[position.sign]}
            </span>
            {SIGN_LABEL[position.sign]}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  /* Il viewBox scala da sé: qui si toglie solo la larghezza fissa che l'SVG
     porta addosso, perché nasce anche come file a misura piena. */
  /* La sigla scelta prende l'accento e il peso: dentro una cella non c'è
     spazio per un contorno, e il colore da solo si perde fra quelli degli
     elementi. */
  .quadro :global([data-graha].acceso) {
    fill: var(--accento);
    font-weight: 700;
  }

  .quadro :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 30rem;
    margin: 0 0 1rem;
  }

  .regola {
    margin: 0 0 0.75rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
    max-width: 46rem;
  }
</style>
