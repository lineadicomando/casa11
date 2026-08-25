<script lang="ts">
  import type { TransitPassage } from '@dodicisegni/core';
  import {
    ASPECT_MAJOR,
    BODY_GLYPH,
    BODY_LABEL,
    isNatalPointSigla,
    natalPointGlyph,
    natalPointLabel,
  } from '@dodicisegni/ruota';
  import { byInstant, collapseNodalAxis } from '$lib/nodal-axis';

  /**
   * Gli istanti in cui i transiti si perfezionano.
   *
   * La colonna del moto è quella che dà senso all'elenco: tre righe uguali a
   * mesi di distanza, con una in moto retrogrado nel mezzo, sono un pianeta
   * lento che passa e ripassa — un periodo unico, non tre fatti separati.
   */
  interface Props {
    passages: TransitPassage[];
    title?: string;
  }

  let { passages, title = 'Passaggi esatti' }: Props = $props();

  const righe = $derived(collapseNodalAxis(passages, byInstant));

  /** `2026-06-03T09:19+02:00` → `3 giu 2026, 09:19`. */
  function quando(local: string): string {
    return new Date(local).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function finestra(passage: TransitPassage): string {
    if (!passage.window) return 'oltre i tre anni';
    const giorno = (iso: string): string =>
      new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    return `${giorno(passage.window.start)} – ${giorno(passage.window.end)}`;
  }
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{righe.length}</span></h3>
  {#if righe.length === 0}
    <p class="tenue">Nessun aspetto si perfeziona in questo arco di tempo.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Quando</th>
          <th colspan="2">In transito</th>
          <th colspan="2">Al punto natale</th>
          <th>In orbita</th>
        </tr>
      </thead>
      <tbody>
        {#each righe as passage, index (index)}
          <tr class:minore={!ASPECT_MAJOR[passage.aspect]}>
            <td class="quando">{quando(passage.local)}</td>
            <td class="glifo-piccolo" title={BODY_LABEL[passage.transiting]}>
              {BODY_GLYPH[passage.transiting]}{passage.retrograde ? ' ℞' : ''}
            </td>
            <td>{passage.aspect}</td>
            <td
              class="glifo-piccolo"
              class:sigla={isNatalPointSigla(passage.natal)}
              title={natalPointLabel(passage.natal)}
            >
              {natalPointGlyph(passage.natal)}
            </td>
            <td class="tenue">{natalPointLabel(passage.natal)}</td>
            <td class="tenue finestra">{finestra(passage)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  /* Il numero accanto al nome della sezione. Prendeva `--linea-forte`, che è
     il colore di un bordo: 1,89:1 sulla superficie chiara, illeggibile. Sta già
     dentro un titolo tenue, quindi non c'è un colore più debole da dargli — la
     subordinazione la fa il peso, che il titolo ha a 600 e lui no. */
  .conteggio {
    color: var(--testo-tenue);
    font-weight: 400;
  }

  tr.minore td {
    color: var(--testo-tenue);
  }

  .quando {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .finestra {
    white-space: nowrap;
    font-size: 0.8rem;
  }

  .sigla {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
  }
</style>
