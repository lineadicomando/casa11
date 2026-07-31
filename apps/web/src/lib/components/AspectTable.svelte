<script lang="ts">
  import type { Aspect } from '@undicesimacasa/core';
  import { formatDegrees } from '$lib/format';
  import { ASPECT_GLYPH, ASPECT_MAJOR, BODY_GLYPH } from '$lib/glyphs';

  interface Props {
    aspects: Aspect[];
    /** Corpo sotto il puntatore, condiviso con la ruota e con la tabella dei corpi. */
    highlighted?: string | null;
    title?: string;
  }

  let { aspects, highlighted = $bindable(null), title = 'Aspetti' }: Props = $props();
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{aspects.length}</span></h3>
  {#if aspects.length === 0}
    <p class="tenue">Nessun aspetto entro le orbite previste.</p>
  {:else}
    <table>
      <tbody>
        {#each aspects as aspect, index (index)}
          <tr
            onmouseenter={() => (highlighted = aspect.from)}
            onmouseleave={() => (highlighted = null)}
            class:minore={!ASPECT_MAJOR[aspect.aspect]}
          >
            <td class="glifo-piccolo">{BODY_GLYPH[aspect.from]}</td>
            <td class="glifo-piccolo">{ASPECT_GLYPH[aspect.aspect]}</td>
            <td class="glifo-piccolo">{BODY_GLYPH[aspect.to]}</td>
            <td>{aspect.aspect}</td>
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
</style>
