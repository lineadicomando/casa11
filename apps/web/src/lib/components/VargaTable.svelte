<script lang="ts">
  import type { VargaChart } from '@undicesimacasa/core';
  import { BODY_GLYPH, SIGN_GLYPH, SIGN_LABEL } from '@undicesimacasa/ruota';

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
  }

  let { varga }: Props = $props();
</script>

<section>
  <h3 class="titolo-sezione">{varga.name} ({varga.varga.toUpperCase()})</h3>
  <p class="regola">{varga.rule}</p>

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
        <tr>
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
  .regola {
    margin: 0 0 0.75rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
    max-width: 46rem;
  }
</style>
