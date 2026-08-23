<script lang="ts">
  import type { BodyId, DashaPeriod, VimshottariDasha } from '@undicesimacasa/core';
  import { BODY_GLYPH } from '@undicesimacasa/ruota';

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
  }

  let { dasha, adesso = new Date().toISOString() }: Props = $props();

  const inCorso = (period: DashaPeriod): boolean =>
    period.start <= adesso && adesso < period.end;

  /** Appiattisce l'albero conservando il livello, per una tabella sola. */
  function righe(periods: readonly DashaPeriod[]): DashaPeriod[] {
    return periods.flatMap((period) => [period, ...righe(period.periods ?? [])]);
  }

  const tutte = $derived(righe(dasha.periods));

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
        <tr class:evidenziato={inCorso(period)}>
          <td class="glifo">{period.level === 1 ? BODY_GLYPH[period.lord] : ''}</td>
          <td style:padding-left="{(period.level - 1) * 1.2}rem">
            {nome(period.lord)}
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
  .nota {
    margin: 0 0 0.75rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
  }
</style>
