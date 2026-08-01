<script lang="ts">
  import type { BodyId, PlanetaryHour, VoidOfCourse } from '@undicesimacasa/core';
  import { formatDegrees } from '$lib/format';
  import { BODY_GLYPH, BODY_LABEL, SIGN_GLYPH, SIGN_LABEL } from '$lib/glyphs';

  /**
   * Le ore planetarie di un luogo, raggruppate per giorno.
   *
   * Prende le ore e i vuoti, non il risultato dell'elezione: la stessa tabella
   * deve poter mostrare le ore di un giorno solo, o quelle filtrate, senza
   * che il tipo di ritorno di un endpoint le venga dietro.
   *
   * La colonna della durata non è un vezzo: sono le ore diseguali della
   * tradizione, e vederne una da settantotto minuti accanto a una da
   * quarantadue è ciò che spiega perché non si chiamino ore e basta.
   */
  interface Props {
    hours: PlanetaryHour[];
    voids: VoidOfCourse[];
    /** I filtri applicati, se ce n'erano: un elenco ridotto deve dirlo. */
    filters?: { rulers?: BodyId[]; skipMoonVoid?: boolean } | undefined;
  }

  let { hours, voids, filters = undefined }: Props = $props();

  /** «solo le ore di Giove, senza quelle con la Luna vuota». */
  const criterio = $derived.by(() => {
    if (!filters) return null;
    const parti: string[] = [];
    if (filters.rulers) parti.push(`solo le ore di ${filters.rulers.map((id) => BODY_LABEL[id]).join(', ')}`);
    if (filters.skipMoonVoid) parti.push('senza quelle con la Luna vuota di corso');
    return parti.length > 0 ? parti.join(', ') : null;
  });

  /** Le ore spezzate per giornata locale, nell'ordine in cui arrivano. */
  const giorni = $derived.by(() => {
    const gruppi: { data: string; ore: PlanetaryHour[] }[] = [];
    for (const ora of hours) {
      const data = ora.local.start.slice(0, 10);
      const ultimo = gruppi[gruppi.length - 1];
      if (ultimo?.data === data) ultimo.ore.push(ora);
      else gruppi.push({ data, ore: [ora] });
    }
    return gruppi;
  });

  /** `2029-08-24` → `venerdì 24 agosto 2029`: il giorno della settimana regge le ore. */
  function intestazione(data: string): string {
    return new Date(`${data}T12:00:00Z`).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function orario(local: string): string {
    return local.slice(11, 16);
  }

  function quando(local: string): string {
    return new Date(local).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** `587` → `9 h 47 min`: i vuoti durano da minuti a un giorno e mezzo. */
  function durata(minuti: number): string {
    if (minuti < 60) return `${minuti} min`;
    const ore = Math.floor(minuti / 60);
    const resto = minuti % 60;
    return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
  }
</script>

<section>
  <h3 class="titolo-sezione">
    Ore planetarie <span class="conteggio">{hours.length}</span>
  </h3>
  {#if criterio}
    <!-- Il conteggio sopra è di un elenco ridotto: senza questa riga si
         leggerebbe come il numero delle ore esistenti. -->
    <p class="tenue">Elenco filtrato: {criterio}.</p>
  {/if}

  {#if hours.length === 0}
    <p class="tenue">
      Nessuna ora planetaria in questo arco: alle latitudini polari il Sole può non
      sorgere né tramontare, e senza alba non c'è niente da dividere in dodici.
    </p>
  {:else}
    {#each giorni as giorno (giorno.data)}
      <h4 class="giorno">{intestazione(giorno.data)}</h4>
      <table>
        <thead>
          <tr>
            <th>Ora</th>
            <th>Reggitore</th>
            <th>Parte</th>
            <th>Durata</th>
            <th>Ascendente</th>
            <th>Luna</th>
          </tr>
        </thead>
        <tbody>
          {#each giorno.ore as ora (ora.start)}
            <tr class:vuota={ora.moonVoid}>
              <td class="quando">{orario(ora.local.start)}–{orario(ora.local.end)}</td>
              <td>
                <span class="glifo-piccolo">{BODY_GLYPH[ora.ruler]}</span>
                {BODY_LABEL[ora.ruler]}
              </td>
              <td class="tenue">{ora.diurnal ? 'diurna' : 'notturna'} {ora.index}</td>
              <td class="numero">{ora.minutes} min</td>
              <td class="numero">
                {formatDegrees(ora.ascendant.signDegree)}
                <span class="glifo-piccolo">{SIGN_GLYPH[ora.ascendant.sign]}</span>
              </td>
              <!-- Il vuoto di corso è un fatto, non un divieto: la casella dice
                   che la Luna non conclude più nulla in quel segno, e che cosa
                   farne lo decide chi legge. -->
              <td class="tenue">{ora.moonVoid ? 'vuota di corso' : ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  {/if}
</section>

<section>
  <h3 class="titolo-sezione">
    Luna vuota di corso <span class="conteggio">{voids.length}</span>
  </h3>
  {#if voids.length === 0}
    <p class="tenue">Nessun tratto in questo arco di tempo.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Da</th>
          <th>A</th>
          <th>Durata</th>
          <th>Nel segno</th>
          <th>Ultimo aspetto</th>
        </tr>
      </thead>
      <tbody>
        {#each voids as periodo (periodo.start)}
          <tr>
            <td class="quando">{quando(periodo.local.start)}</td>
            <td class="quando">{quando(periodo.local.end)}</td>
            <td class="numero">{durata(periodo.minutes)}</td>
            <td>
              <span class="glifo-piccolo">{SIGN_GLYPH[periodo.sign]}</span>
              {SIGN_LABEL[periodo.sign]} → {SIGN_LABEL[periodo.nextSign]}
            </td>
            <td class="tenue">
              {#if periodo.lastAspect}
                {periodo.lastAspect.aspect}
                <span class="glifo-piccolo">{BODY_GLYPH[periodo.lastAspect.body]}</span>
                {BODY_LABEL[periodo.lastAspect.body]}
              {:else}
                nessuno nel segno
              {/if}
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

  .giorno {
    margin: 1.5rem 0 0.5rem;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .quando {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .numero {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  tr.vuota td {
    color: var(--testo-tenue);
  }
</style>
