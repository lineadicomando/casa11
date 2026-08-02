<script lang="ts">
  import type { Aspect } from '@undicesimacasa/core';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import { formatDegrees } from '$lib/format';
  import { ASPECT_GLYPH, ASPECT_MAJOR, BODY_GLYPH, BODY_LABEL } from '$lib/glyphs';

  interface Props {
    aspects: Aspect[];
    /** Il corpo isolato, condiviso con la ruota e con la tabella dei corpi. */
    evidenza: Evidenza;
    title?: string;
  }

  let { aspects, evidenza, title = 'Aspetti' }: Props = $props();
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{aspects.length}</span></h3>
  {#if aspects.length === 0}
    <p class="tenue">Nessun aspetto entro le orbite previste.</p>
  {:else}
    <table>
      <!-- Senza, le ultime due colonne sono un numero e un'abbreviazione che
           nulla nella pagina nomina: chi non sa già che cosa sia un'orbita non
           ha da dove scoprirlo. Le tre dei glifi ne condividono una sola,
           perché insieme dicono una cosa sola. -->
      <thead>
        <tr>
          <th colspan="3">Fra</th>
          <th>Aspetto</th>
          <th class="numerico">Orbita</th>
          <th>Direzione</th>
        </tr>
      </thead>
      <tbody>
        {#each aspects as aspect, index (index)}
          <tr
            onmouseenter={() => evidenza.sorvola(aspect.from)}
            onmouseleave={() => evidenza.sorvola(null)}
            class:evidenziato={evidenza.attivo === aspect.from}
            class:minore={!ASPECT_MAJOR[aspect.aspect]}
          >
            <!-- I due capi sono pulsanti: da qui si isola l'uno o l'altro senza
                 risalire alla tabella dei corpi. Il glifo da solo non direbbe a
                 nessuno che cosa si sta premendo.

                 Fuori dal giro del tabulatore, però: con gli aspetti minori le
                 righe arrivano a sessanta, e centoventi tappe per arrivare in
                 fondo alla pagina renderebbero la tastiera inservibile. Nulla
                 va perduto — ogni corpo si sceglie dalla ruota e dalla tabella
                 dei corpi, che il tabulatore attraversa entrambe. -->
            <td class="glifo-piccolo">
              <button
                type="button"
                class="scelta"
                tabindex="-1"
                aria-label="{BODY_LABEL[aspect.from]}. Isola i suoi aspetti."
                aria-pressed={evidenza.fissato === aspect.from}
                onclick={() => evidenza.commuta(aspect.from)}
              >
                {BODY_GLYPH[aspect.from]}
              </button>
            </td>
            <td class="glifo-piccolo">{ASPECT_GLYPH[aspect.aspect]}</td>
            <td class="glifo-piccolo">
              <button
                type="button"
                class="scelta"
                tabindex="-1"
                aria-label="{BODY_LABEL[aspect.to]}. Isola i suoi aspetti."
                aria-pressed={evidenza.fissato === aspect.to}
                onclick={() => evidenza.commuta(aspect.to)}
              >
                {BODY_GLYPH[aspect.to]}
              </button>
            </td>
            <td>{aspect.aspect}</td>
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
  {/if}
</section>

<style>
  .conteggio {
    color: var(--linea-forte);
  }

  tr.minore td {
    color: var(--testo-tenue);
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
