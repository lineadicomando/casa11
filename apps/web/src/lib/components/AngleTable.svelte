<script lang="ts">
  import type { Angles, House } from '@undicesimacasa/core';
  import { formatDegrees } from '$lib/format';
  import { SIGN_GLYPH, SIGN_LABEL, signOfLongitude } from '$lib/glyphs';

  interface Props {
    angles: Angles;
    houses: House[];
  }

  let { angles, houses }: Props = $props();

  const AXES = $derived(
    [
      ['ASC', angles.ascendant],
      ['MC', angles.midheaven],
      ['DSC', angles.descendant],
      ['IC', angles.imumCoeli],
    ] as const,
  );
</script>

<section>
  <h3 class="titolo-sezione">Assi e cuspidi</h3>
  <div class="assi">
    {#each AXES as [label, longitude] (label)}
      <div>
        <span class="etichetta">{label}</span>
        <span>{formatDegrees(longitude % 30)} {SIGN_GLYPH[signOfLongitude(longitude)]}</span>
      </div>
    {/each}
  </div>
  <table class="cuspidi">
    <tbody>
      {#each houses as house (house.number)}
        <tr>
          <td class="numerico">{house.number}</td>
          <td>
            {formatDegrees(house.signDegree)}
            <span class="glifo-piccolo">{SIGN_GLYPH[house.sign]}</span>
            <span class="tenue">{SIGN_LABEL[house.sign]}</span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .assi {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.87rem;
  }

  .assi .etichetta {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accento);
    letter-spacing: 0.04em;
  }

  .cuspidi td:first-child {
    width: 2rem;
    color: var(--testo-tenue);
  }
</style>
