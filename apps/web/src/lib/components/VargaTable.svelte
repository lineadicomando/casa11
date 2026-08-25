<script lang="ts">
  import type { VargaChart } from '@dodicisegni/core';
  import { BODY_GLYPH, SIGN_GLYPH, SIGN_LABEL, type StileQuadro } from '@dodicisegni/ruota';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import QuadroVedico from './QuadroVedico.svelte';

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

  /** Un `VargaChart` soddisfa `SquareChart` così com'è: nessuna conversione. */
  const chart = $derived(varga);


</script>

<section>
  <h3 class="titolo-sezione">{varga.name} ({varga.varga.toUpperCase()})</h3>
  <p class="regola">{varga.rule}</p>

  {#if stile}
    <div class="disegno">
      <QuadroVedico {chart} {stile} {evidenza} titolo={varga.name} />
    </div>
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
  .disegno {
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
