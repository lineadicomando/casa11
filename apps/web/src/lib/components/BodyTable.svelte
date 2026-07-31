<script lang="ts">
  import type { CelestialBody, ChartPoint } from '@undicesimacasa/core';
  import { formatDegrees } from '$lib/format';
  import { BODY_GLYPH, POINT_GLYPH, SIGN_GLYPH, SIGN_LABEL } from '$lib/glyphs';

  /**
   * Prende i corpi, non il tema.
   *
   * Un quadro di transiti ha due insiemi di posizioni da mostrare affiancate:
   * legare la tabella a `NatalChart` costringerebbe a riscriverla.
   */
  interface Props {
    bodies: CelestialBody[];
    partOfFortune?: ChartPoint | undefined;
    /** Corpo sotto il puntatore, condiviso con la ruota e con gli aspetti. */
    highlighted?: string | null;
    title?: string;
  }

  let {
    bodies,
    partOfFortune = undefined,
    highlighted = $bindable(null),
    title = 'Corpi',
  }: Props = $props();
</script>

<section>
  <h3 class="titolo-sezione">{title}</h3>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Corpo</th>
        <th>Posizione</th>
        <th class="numerico">Casa</th>
      </tr>
    </thead>
    <tbody>
      {#each bodies as body (body.id)}
        <tr
          onmouseenter={() => (highlighted = body.id)}
          onmouseleave={() => (highlighted = null)}
          class:evidenziato={highlighted === body.id}
        >
          <td class="glifo">{BODY_GLYPH[body.id]}</td>
          <td>{body.name}{body.retrograde ? ' ℞' : ''}</td>
          <td>
            {formatDegrees(body.signDegree)}
            <span class="glifo-piccolo">{SIGN_GLYPH[body.sign]}</span>
            <span class="tenue">{SIGN_LABEL[body.sign]}</span>
          </td>
          <td class="numerico">{body.house ?? '—'}</td>
        </tr>
      {/each}
      {#if partOfFortune}
        <tr class="punto">
          <td class="glifo glifo-punto">{POINT_GLYPH.fortuna}</td>
          <td>Parte di Fortuna</td>
          <td>
            {formatDegrees(partOfFortune.signDegree)}
            <span class="glifo-piccolo">{SIGN_GLYPH[partOfFortune.sign]}</span>
            <span class="tenue">{SIGN_LABEL[partOfFortune.sign]}</span>
          </td>
          <td class="numerico">{partOfFortune.house ?? '—'}</td>
        </tr>
      {/if}
    </tbody>
  </table>
</section>

<style>
  /* La Parte di Fortuna non è un corpo celeste: la si distingue senza
     separarla dalla tabella, dove si legge insieme alle altre posizioni.
     Il corsivo sta sulla riga e non sulle celle perché così è ereditato, e la
     regola sui glifi in `app.css` basta ad annullarlo senza rincorrere la
     specificità di un selettore `tr.punto td`. */
  tr.punto {
    font-style: italic;
  }

  tr.punto td {
    border-top: 1px solid var(--linea-forte);
  }

  /* Vedi ChartWheel: ⊗ è un operatore matematico e nasce sovradimensionato. */
  .glifo-punto {
    font-size: 0.9rem;
  }
</style>
