<script lang="ts">
  import type { TransitAspect } from '@undicesimacasa/core';
  import { formatDegrees } from '$lib/format';
  import {
    ASPECT_GLYPH,
    ASPECT_MAJOR,
    BODY_GLYPH,
    BODY_LABEL,
    isNatalPointSigla,
    natalPointGlyph,
    natalPointLabel,
  } from '$lib/glyphs';

  /**
   * I due lati non sono intercambiabili: uno si muove e l'altro è fermo per
   * sempre. Le colonne lo dicono in intestazione, perché a colpo d'occhio i
   * glifi sono gli stessi e scambiarli capovolge la lettura.
   */
  interface Props {
    aspects: TransitAspect[];
    /** Corpo sotto il puntatore, condiviso con la ruota e con le altre tabelle. */
    highlighted?: string | null;
    title?: string;
  }

  let { aspects, highlighted = $bindable(null), title = 'Aspetti al tema' }: Props = $props();
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{aspects.length}</span></h3>
  {#if aspects.length === 0}
    <p class="tenue">Nessun aspetto entro le orbite dei transiti, che sono strette di proposito.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th colspan="2">In transito</th>
          <th colspan="2">Al punto natale</th>
          <th class="numerico">Orbita</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each aspects as aspect, index (index)}
          <tr
            onmouseenter={() => (highlighted = aspect.transiting)}
            onmouseleave={() => (highlighted = null)}
            class:evidenziato={highlighted === aspect.transiting}
            class:minore={!ASPECT_MAJOR[aspect.aspect]}
          >
            <td class="glifo-piccolo" title={BODY_LABEL[aspect.transiting]}>
              {BODY_GLYPH[aspect.transiting]}{aspect.retrograde ? ' ℞' : ''}
            </td>
            <td>{aspect.aspect}</td>
            <td
              class="glifo-piccolo"
              class:sigla={isNatalPointSigla(aspect.natal)}
              title={natalPointLabel(aspect.natal)}
            >
              {natalPointGlyph(aspect.natal)}
            </td>
            <td class="tenue">{natalPointLabel(aspect.natal)}</td>
            <td class="numerico">{formatDegrees(aspect.orb)}</td>
            <td class="tenue">{aspect.applying ? 'appl.' : 'sep.'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .conteggio {
    color: var(--linea-forte);
  }

  tr.minore td {
    color: var(--testo-tenue);
  }

  /* Le sigle degli assi stanno nella colonna dei glifi ma sono testo: alla
     dimensione dei simboli astrologici sarebbero fuori scala. */
  .sigla {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
  }
</style>
