<script lang="ts">
  import type { DrishtiChart } from '@undicesimacasa/core';
  import { BODY_GLYPH, SIGN_GLYPH, SIGN_LABEL } from '@undicesimacasa/ruota';

  /**
   * Gli sguardi fra i graha.
   *
   * Due tabelle e non una: la prima dice chi guarda chi, la seconda dove lo
   * sguardo arriva **anche senza trovare nessuno**, che in questo sistema è un
   * dato e non un'assenza.
   *
   * La freccia non si scambia. Le case si contano in avanti, quindi che uno
   * guardi l'altro non implica il contrario, ed è la differenza principale da
   * un aspetto occidentale: la riga va letta in un verso solo.
   */
  interface Props {
    drishti: DrishtiChart;
  }

  let { drishti }: Props = $props();
</script>

<section>
  <h3 class="titolo-sezione">Drishti</h3>
  <p class="nota">
    Gli sguardi si contano a segni interi e hanno un verso: che un graha ne guardi
    un altro non vuol dire che sia ricambiato. Tutti guardano il settimo da sé;
    Marte anche il quarto e l'ottavo, Giove il quinto e il nono, Saturno il terzo
    e il decimo.
    {#if drishti.nodes === 'gioviana'}
      Rahu e Ketu guardano il quinto, il settimo e il nono, come Giove.
    {:else}
      Rahu e Ketu non guardano niente: è la forma classica.
    {/if}
  </p>

  {#if drishti.aspects.length > 0}
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Guarda</th>
          <th></th>
          <th>Guardato</th>
          <th class="numerico">Casa</th>
        </tr>
      </thead>
      <tbody>
        {#each drishti.aspects as aspect, i (`${aspect.from}-${aspect.to}-${aspect.house}-${i}`)}
          <tr>
            <td class="glifo">{BODY_GLYPH[aspect.from]}</td>
            <td>{aspect.fromName}</td>
            <td class="freccia" aria-hidden="true">→</td>
            <td>{aspect.toName}</td>
            <td class="numerico">{aspect.house}ª</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="nota">Nessuno sguardo trova un graha o il lagna.</p>
  {/if}

  <h3 class="titolo-sezione">Segni guardati</h3>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Graha</th>
        <th class="numerico">Casa</th>
        <th>Segno</th>
      </tr>
    </thead>
    <tbody>
      {#each drishti.signs as cast, i (`${cast.from}-${cast.house}-${i}`)}
        <tr>
          <td class="glifo">{BODY_GLYPH[cast.from]}</td>
          <td>{cast.fromName}</td>
          <td class="numerico">{cast.house}ª</td>
          <td>
            <span class="glifo-piccolo" title={SIGN_LABEL[cast.sign]}>{SIGN_GLYPH[cast.sign]}</span>
            {SIGN_LABEL[cast.sign]}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .nota {
    margin: 0 0 0.75rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
    max-width: 46rem;
  }

  .freccia {
    color: var(--testo-tenue);
  }
</style>
