<script lang="ts">
  import type { SkyPassage } from '@dodicisegni/core';
  import { ASPECT_MAJOR, BODY_GLYPH, BODY_LABEL } from '@dodicisegni/ruota';

  /**
   * Gli istanti in cui due corpi in cielo formano un aspetto esatto.
   *
   * Il moto è di **entrambi** i lati, e sono due colonne perché è la
   * differenza fra i due a spiegare l'elenco: quando è il più veloce a
   * retrogradare, lo stesso incontro compare tre volte in due mesi.
   */
  interface Props {
    passages: SkyPassage[];
    title?: string;
  }

  let { passages, title = 'Incontri' }: Props = $props();

  /** `2026-02-20T17:54+01:00` → `20 feb 2026, 17:54`. */
  function quando(local: string): string {
    return new Date(local).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function finestra(passage: SkyPassage): string {
    if (!passage.window) return 'oltre i tre anni';
    const giorno = (iso: string): string =>
      new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    return `${giorno(passage.window.start)} – ${giorno(passage.window.end)}`;
  }
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{passages.length}</span></h3>
  {#if passages.length === 0}
    <p class="tenue">Nessun aspetto si perfeziona in questo arco di tempo.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Quando</th>
          <th>Il più veloce</th>
          <th>Aspetto</th>
          <th>Il più lento</th>
          <th>In orbita</th>
        </tr>
      </thead>
      <tbody>
        {#each passages as passage, index (index)}
          <tr class:minore={!ASPECT_MAJOR[passage.aspect]}>
            <td class="quando">{quando(passage.local)}</td>
            <!-- I due lati portano entrambi il nome: nominarne uno solo
                 lascerebbe credere che l'altro conti meno. -->
            <td>
              <span class="glifo-piccolo">{BODY_GLYPH[passage.faster]}</span>
              {BODY_LABEL[passage.faster]}{passage.retrograde.faster ? ' ℞' : ''}
            </td>
            <td>{passage.aspect}</td>
            <td>
              <span class="glifo-piccolo">{BODY_GLYPH[passage.slower]}</span>
              {BODY_LABEL[passage.slower]}{passage.retrograde.slower ? ' ℞' : ''}
            </td>
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
</style>
