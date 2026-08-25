<script lang="ts">
  import type { Angles, House } from '@dodicisegni/core';
  import { formatDegrees } from '$lib/format';
  import { SIGN_GLYPH, SIGN_LABEL, signOfLongitude } from '@dodicisegni/ruota';

  interface Props {
    angles: Angles;
    houses: House[];
    /**
     * Nei transiti sono gli assi **dell'istante**, non quelli del tema: senza
     * dirlo la tabella sembrerebbe la domificazione di nascita.
     */
    title?: string;
  }

  let { angles, houses, title = 'Assi e cuspidi' }: Props = $props();

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
  <h3 class="titolo-sezione">{title}</h3>
  <div class="assi">
    {#each AXES as [label, longitude] (label)}
      <div>
        <span class="etichetta">{label}</span>
        <span>{formatDegrees(longitude % 30)} {SIGN_GLYPH[signOfLongitude(longitude)]}</span>
      </div>
    {/each}
  </div>
  <table class="cuspidi">
    <!-- La colonna dei numeri, da sola, si lascia leggere come una posizione
         in classifica: dice il numero della casa, e va detto. -->
    <thead>
      <tr>
        <th class="numerico">Casa</th>
        <th>Cuspide</th>
      </tr>
    </thead>
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

  /* L'intestazione condivide la colonna con i numeri, e «Casa» è più larga di
     una cifra: la misura vale per entrambe, o la riga di sopra allargherebbe
     quella di sotto senza allinearcisi. */
  .cuspidi :is(td, th):first-child {
    width: 2.6rem;
    color: var(--testo-tenue);
  }
</style>
