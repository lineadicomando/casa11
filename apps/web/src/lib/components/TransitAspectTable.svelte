<script lang="ts">
  import type { TransitAspect } from '@undicesimacasa/core';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import { formatDegrees } from '$lib/format';
  import {
    ASPECT_GLYPH,
    ASPECT_MAJOR,
    isNatalPointSigla,
    natalPointGlyph,
    natalPointLabel,
  } from '$lib/glyphs';
  import { byOrb, collapseNodalAxis } from '$lib/nodal-axis';

  /**
   * I due lati non sono intercambiabili: uno si muove e l'altro è fermo per
   * sempre. Le colonne lo dicono in intestazione, perché a colpo d'occhio i
   * glifi sono gli stessi e scambiarli capovolge la lettura.
   */
  interface Props {
    aspects: TransitAspect[];
    /** Il corpo isolato, condiviso con la ruota e con le altre tabelle. */
    evidenza: Evidenza;
    title?: string;
  }

  let { aspects, evidenza, title = 'Aspetti al tema' }: Props = $props();

  // I due nodi sono opposti per definizione: ogni loro contatto arriva in
  // coppia e descrive un fatto solo. Vedi `lib/nodal-axis.ts`.
  const righe = $derived(collapseNodalAxis(aspects, byOrb));
  const accorpato = $derived(righe.length < aspects.length);
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{righe.length}</span></h3>
  {#if righe.length === 0}
    <p class="tenue">Nessun aspetto entro le orbite dei transiti, che sono strette di proposito.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th colspan="2">In transito</th>
          <th colspan="2">Al punto natale</th>
          <th class="numerico">Orbita</th>
          <th>Direzione</th>
        </tr>
      </thead>
      <tbody>
        {#each righe as aspect, index (index)}
          <tr
            onmouseenter={() => evidenza.sorvola(aspect.transiting)}
            onmouseleave={() => evidenza.sorvola(null)}
            class:evidenziato={evidenza.attivo === aspect.transiting}
            class:minore={!ASPECT_MAJOR[aspect.aspect]}
          >
            <!-- Gli stessi glifi dell'altro lato: con un luogo del transito
                 anche qui può comparire un asse, e i corpi li rendono uguale.

                 Il transitante è un pulsante, il punto natale no: nella ruota
                 si isolano i corpi dell'anello esterno, e un aspetto attenuato
                 lo è già rispetto a quelli.

                 Fuori dal giro del tabulatore: la ruota e la tabella dei corpi
                 in transito lo attraversano già, e qui le righe sono troppe
                 perché la tastiera possa scavalcarle. -->
            <td class="glifo-piccolo" class:sigla={isNatalPointSigla(aspect.transiting)}>
              <button
                type="button"
                class="scelta"
                tabindex="-1"
                aria-label="{natalPointLabel(aspect.transiting)} in transito. Isola i suoi aspetti."
                aria-pressed={evidenza.fissato === aspect.transiting}
                onclick={() => evidenza.commuta(aspect.transiting)}
              >
                {natalPointGlyph(aspect.transiting)}{aspect.retrograde ? ' ℞' : ''}
              </button>
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
            <!-- L'abbreviazione sta in colonna, la parola intera nel titolo:
                 per esteso allargherebbe la tabella di quanto occupa
                 «applicativo», che è la colonna più stretta che ci sia. -->
            <td class="tenue" title={aspect.applying ? 'applicativo' : 'separativo'}>
              {aspect.applying ? 'appl.' : 'sep.'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if accorpato}
      <p class="nota-asse">
        L'asse dei Nodi compare una volta sola: un aspetto a un nodo è per
        definizione un aspetto all'altro.
      </p>
    {/if}
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

  .nota-asse {
    margin: 0.5rem 0 0;
    font-size: 0.78rem;
    color: var(--testo-tenue);
  }

  /* Le sigle degli assi stanno nella colonna dei glifi ma sono testo: alla
     dimensione dei simboli astrologici sarebbero fuori scala. */
  .sigla {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
  }

  /* Il glifo è già il disegno: il pulsante non ne aggiunge nessuno, e si fa
     riconoscere dal puntatore e dal colore quando è scelto. */
  .scelta {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  .scelta[aria-pressed='true'] {
    color: var(--accento);
  }
</style>
