<script lang="ts">
  import type { BodyId, DashaPeriod, VimshottariDasha } from '@undicesimacasa/core';
  import { BODY_GLYPH } from '@undicesimacasa/ruota';
  import type { Evidenza } from '$lib/evidenza.svelte';

  /**
   * La catena delle dasha, coi sotto-periodi rientrati.
   *
   * Il periodo in corso è evidenziato, ed è la sola cosa che questa tabella
   * aggiunge ai dati: dice **dove si è**, che è la domanda per cui si guarda
   * una catena di centoventi anni. Non dice che cosa comporti — quello è di
   * chi legge.
   */
  interface Props {
    dasha: VimshottariDasha;
    /** L'istante rispetto a cui evidenziare, in UTC. Default: adesso. */
    adesso?: string;
    /** Il graha isolato, condiviso con le altre tabelle e col quadro. */
    evidenza: Evidenza;
  }

  let { dasha, adesso = new Date().toISOString(), evidenza }: Props = $props();

  const inCorso = (period: DashaPeriod): boolean =>
    period.start <= adesso && adesso < period.end;

  /**
   * I periodi aperti, per l'istante in cui cominciano.
   *
   * Aperti si nasce solo lungo la catena di adesso: due ordini sono
   * ottantuno righe e tre sono settecentoventinove, che non sono un elenco ma
   * un muro. Quello che si vuole sapere aprendo questa tabella è dove si è, e
   * il resto si chiede.
   */
  let aperti = $state(new Set<string>());

  // La catena del presente si apre da sé, e si riapre se cambia il tema.
  $effect(() => {
    aperti = new Set(catenaCorrente(dasha.periods).map((period) => period.start));
  });

  /** I periodi in corso a `adesso`, dal più ampio al più stretto. */
  function catenaCorrente(periods: readonly DashaPeriod[]): DashaPeriod[] {
    const dentro = periods.find(inCorso);
    if (!dentro) return [];
    return [dentro, ...catenaCorrente(dentro.periods ?? [])];
  }

  /** Appiattisce l'albero, scendendo solo dentro i periodi aperti. */
  function righe(periods: readonly DashaPeriod[]): DashaPeriod[] {
    return periods.flatMap((period) =>
      aperti.has(period.start) ? [period, ...righe(period.periods ?? [])] : [period],
    );
  }

  const tutte = $derived(righe(dasha.periods));

  function commuta(period: DashaPeriod): void {
    const dopo = new Set(aperti);
    if (dopo.has(period.start)) dopo.delete(period.start);
    else dopo.add(period.start);
    aperti = dopo;
  }

  const durata = (period: DashaPeriod): string => {
    const tondo = Math.round(period.years);
    if (Math.abs(period.years - tondo) < 0.05) return `${tondo} ${tondo === 1 ? 'anno' : 'anni'}`;
    if (period.years < 0.95) return `${Math.round(period.years * 12)} mesi`;
    return `${period.years.toFixed(1)} anni`;
  };

  const giorno = (iso: string): string => iso.slice(0, 10);

  /**
   * Il nome di un graha come lo scrive il Jyotisha.
   *
   * I due nodi hanno un nome loro — Rahu e Ketu — e gli altri sette prendono
   * l'iniziale maiuscola: gli identificatori del motore sono minuscoli, e
   * «periodo di saturno» in una tabella si legge come un refuso.
   */
  const nome = (id: BodyId): string => {
    if (id === 'nodo-nord') return 'Rahu';
    if (id === 'nodo-sud') return 'Ketu';
    return id.charAt(0).toUpperCase() + id.slice(1);
  };
</script>

<section>
  <h3 class="titolo-sezione">Dasha vimshottari</h3>
  <p class="nota">
    La Luna è nata in {dasha.nakshatra.name}, retto da {nome(dasha.nakshatra.lord)}: la catena
    comincia da lì, e alla nascita ne restavano {dasha.balance.toFixed(2)} anni. Anno
    {dasha.yearLength}, di {dasha.daysPerYear} giorni.
  </p>

  {#if dasha.levels > 1}
    <p class="nota">
      I sotto-periodi sono aperti su quello in corso. Gli altri si aprono col
      triangolino: tutti insieme sarebbero {dasha.levels === 2 ? 'ottantuno' : 'settecentoventinove'}
      righe.
    </p>
  {/if}

  <table>
    <thead>
      <tr>
        <th></th>
        <th>Periodo</th>
        <th>Da</th>
        <th>A</th>
        <th class="numerico">Durata</th>
      </tr>
    </thead>
    <tbody>
      {#each tutte as period (period.start + period.lord + period.level)}
        <!-- Due cose da distinguere: il periodo in corso, che è un fatto, e il
             graha scelto, che è una domanda di chi guarda. La prima resta
             marcata, la seconda si accende sopra. -->
        <tr
          onmouseenter={() => evidenza.sorvola(period.lord)}
          onmouseleave={() => evidenza.sorvola(null)}
          class:corrente={inCorso(period)}
          class:evidenziato={evidenza.attivo === period.lord}
        >
          <td class="glifo">{period.level === 1 ? BODY_GLYPH[period.lord] : ''}</td>
          <td style:padding-left="{(period.level - 1) * 1.2}rem">
            {#if period.periods}
              <!-- Il triangolino e non la riga intera: la riga la si sorvola
                   per illuminare il graha altrove, e i due gesti si
                   pesterebbero i piedi. -->
              <button
                type="button"
                class="apri"
                aria-expanded={aperti.has(period.start)}
                onclick={() => commuta(period)}
              >
                <span aria-hidden="true">{aperti.has(period.start) ? '▾' : '▸'}</span>
                {nome(period.lord)}
              </button>
            {:else}
              {nome(period.lord)}
            {/if}
          </td>
          <td>{giorno(period.local.start)}</td>
          <td>{giorno(period.local.end)}</td>
          <td class="numerico">{durata(period)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  /* Il periodo in corso: un segno che resta, più tenue dell'evidenza, perché
     non risponde a una domanda ma dice dove si è. */
  tbody tr.corrente td {
    background: var(--accento-tenue);
  }

  /* Un pulsante che non sembra un pulsante: la riga è già densa, e un bordo in
     più la spezzerebbe. Il triangolino dice che si apre, e il focus lo dice a
     chi arriva col tabulatore. */
  .apri {
    padding: 0;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-align: left;
  }

  .apri span {
    display: inline-block;
    width: 0.9em;
    color: var(--testo-tenue);
  }

  .apri:hover {
    color: var(--accento);
  }

  .nota {
    margin: 0 0 0.75rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
  }
</style>
