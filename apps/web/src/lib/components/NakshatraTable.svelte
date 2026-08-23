<script lang="ts">
  import type { JyotishaChart } from '@undicesimacasa/core';
  import { BODY_GLYPH, SIGN_GLYPH, SIGN_LABEL } from '@undicesimacasa/ruota';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import { formatDegrees } from '$lib/format';

  /**
   * I nakshatra dei graha: la ventisettesima parte di cielo in cui ciascuno
   * cade, con il suo quarto e il suo signore.
   *
   * Prende l'elenco e non il tema vedico, come le altre tabelle prendono i
   * corpi e non la carta.
   */
  interface Props {
    nakshatras: JyotishaChart['nakshatras'];
    /** I corpi, per la posizione in gradi accanto al nakshatra. */
    bodies: { id: string; longitude: number; sign: string; signDegree: number }[];
    /** Il graha isolato, condiviso con le altre tabelle e col quadro. */
    evidenza: Evidenza;
  }

  let { nakshatras, bodies, evidenza }: Props = $props();

  const posizione = (id: string) => bodies.find((body) => body.id === id);
</script>

<section>
  <h3 class="titolo-sezione">Nakshatra</h3>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Graha</th>
        <th>Posizione</th>
        <th>Nakshatra</th>
        <th class="numerico">Pada</th>
        <th>Signore</th>
      </tr>
    </thead>
    <tbody>
      {#each nakshatras as voce (voce.id)}
        {@const corpo = posizione(voce.id)}
        <tr
          onmouseenter={() => evidenza.sorvola(voce.id)}
          onmouseleave={() => evidenza.sorvola(null)}
          class:evidenziato={evidenza.attivo === voce.id}
        >
          <td class="glifo">{BODY_GLYPH[voce.id as keyof typeof BODY_GLYPH]}</td>
          <td>{voce.name}</td>
          <td>
            {#if corpo}
              {formatDegrees(corpo.signDegree)}
              <span class="glifo-piccolo" title={SIGN_LABEL[corpo.sign as keyof typeof SIGN_LABEL]}>
                {SIGN_GLYPH[corpo.sign as keyof typeof SIGN_GLYPH]}
              </span>
            {/if}
          </td>
          <td>{voce.nakshatra.name}</td>
          <td class="numerico">{voce.nakshatra.pada}</td>
          <td>{nakshatras.find((n) => n.id === voce.nakshatra.lord)?.name ?? voce.nakshatra.lord}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>
