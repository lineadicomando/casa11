<script lang="ts">
  import type { ChartPoint, TransitingBody } from '@undicesimacasa/core';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import { formatDegrees } from '$lib/format';
  import {
    BODY_GLYPH,
    ELEMENT_COLOR,
    POINT_GLYPH,
    SIGN_ELEMENT,
    SIGN_GLYPH,
    SIGN_LABEL,
    SIGN_MODALITY,
  } from '$lib/glyphs';

  /**
   * Prende i corpi, non il tema.
   *
   * Un quadro di transiti ha due insiemi di posizioni da mostrare affiancate:
   * legare la tabella a `NatalChart` costringerebbe a riscriverla.
   */
  interface Props {
    /**
     * Un corpo può portare due case — quella natale e quella dell'istante —
     * e nel tema ne porta una sola: il campo in più è facoltativo, quindi le
     * posizioni di nascita si passano qui senza adattarle.
     */
    bodies: TransitingBody[];
    partOfFortune?: ChartPoint | undefined;
    /** Il corpo isolato, condiviso con la ruota e con gli aspetti. */
    evidenza: Evidenza;
    title?: string;
    /**
     * Intestazione della colonna delle case. Nei transiti la casa non è del
     * corpo che si sta guardando ma del tema su cui cade, e chiamarla
     * semplicemente «casa» lascerebbe credere a una domificazione dell'istante.
     */
    houseTitle?: string;
    /** Intestazione della seconda colonna, quando i dati la riempiono. */
    secondHouseTitle?: string;
  }

  let {
    bodies,
    partOfFortune = undefined,
    evidenza,
    title = 'Corpi',
    houseTitle = 'Casa',
    secondHouseTitle = "Casa dell'istante",
  }: Props = $props();

  /**
   * La colonna delle case c'è solo se qualcuno la occupa.
   *
   * Senza ora di nascita, o senza un luogo da cui guardare il cielo, le case
   * non esistono affatto: una colonna di trattini le farebbe sembrare un dato
   * mancante invece che una domanda mal posta.
   */
  const withHouses = $derived(
    bodies.some((body) => body.house !== undefined) || partOfFortune?.house !== undefined,
  );

  /** Vale lo stesso per la seconda: compare se e solo se i dati la portano. */
  const withSecondHouses = $derived(bodies.some((body) => body.transitHouse !== undefined));
</script>

<section>
  <h3 class="titolo-sezione">{title}</h3>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Corpo</th>
        <th>Posizione</th>
        {#if withHouses}<th class="numerico">{houseTitle}</th>{/if}
        {#if withSecondHouses}<th class="numerico">{secondHouseTitle}</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each bodies as body (body.id)}
        <tr
          onmouseenter={() => evidenza.sorvola(body.id)}
          onmouseleave={() => evidenza.sorvola(null)}
          class:evidenziato={evidenza.attivo === body.id}
        >
          <td class="glifo">{BODY_GLYPH[body.id]}</td>
          <!-- Il nome è un pulsante e non del testo: il passaggio del mouse
               isolava già gli aspetti di questo corpo, ma solo per chi un mouse
               ce l'ha. Qui lo stesso fa un tocco, o l'Invio dopo esserci
               arrivati con il tabulatore. -->
          <td>
            <button
              type="button"
              class="scelta"
              aria-pressed={evidenza.fissato === body.id}
              onclick={() => evidenza.commuta(body.id)}
            >
              {body.name}{body.retrograde ? ' ℞' : ''}
            </button>
          </td>
          <td>
            {formatDegrees(body.signDegree)}
            <!-- Il glifo del segno porta il colore del suo elemento, lo stesso
                 dei settori della ruota: lega le due viste senza aggiungere una
                 colonna. È un rinforzo, non l'unica strada — l'elemento si
                 ricava dal nome del segno, che è scritto qui accanto, e il
                 titolo lo dice per esteso a chi lo cerca. -->
            <span
              class="glifo-piccolo"
              style:color={ELEMENT_COLOR[SIGN_ELEMENT[body.sign]]}
              title="{SIGN_ELEMENT[body.sign]} · {SIGN_MODALITY[body.sign]}"
            >{SIGN_GLYPH[body.sign]}</span>
            <span class="tenue">{SIGN_LABEL[body.sign]}</span>
          </td>
          {#if withHouses}<td class="numerico">{body.house ?? '—'}</td>{/if}
          {#if withSecondHouses}<td class="numerico">{body.transitHouse ?? '—'}</td>{/if}
        </tr>
      {/each}
      {#if partOfFortune}
        <tr class="punto">
          <td class="glifo glifo-punto">{POINT_GLYPH.fortuna}</td>
          <td>Parte di Fortuna</td>
          <td>
            {formatDegrees(partOfFortune.signDegree)}
            <span
              class="glifo-piccolo"
              style:color={ELEMENT_COLOR[SIGN_ELEMENT[partOfFortune.sign]]}
              title="{SIGN_ELEMENT[partOfFortune.sign]} · {SIGN_MODALITY[partOfFortune.sign]}"
            >{SIGN_GLYPH[partOfFortune.sign]}</span>
            <span class="tenue">{SIGN_LABEL[partOfFortune.sign]}</span>
          </td>
          {#if withHouses}<td class="numerico">{partOfFortune.house ?? '—'}</td>{/if}
          <!-- La Parte di Fortuna sta nel tema, che di case ne ha una sola. -->
          {#if withSecondHouses}<td class="numerico">—</td>{/if}
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

  /* Un pulsante che si legge come la riga in cui sta: il gesto lo suggerisce il
     puntatore e la sottolineatura al passaggio, non un bordo attorno a ognuno
     dei quattordici nomi. */
  .scelta {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    text-decoration: underline transparent;
    text-underline-offset: 2px;
  }

  tr:hover .scelta,
  .scelta:focus-visible {
    text-decoration-color: var(--linea-forte);
  }

  .scelta[aria-pressed='true'] {
    color: var(--accento);
    font-weight: 600;
  }
</style>
