<script lang="ts">
  import type { HouseSystem, NatalChart } from '@undicesimacasa/core';
  import { chartParameters, fetchChart, RequestError } from '$lib/api';
  import { emptyBirthInput, isComplete } from '$lib/birth';
  import AngleTable from '$lib/components/AngleTable.svelte';
  import AspectTable from '$lib/components/AspectTable.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';

  let birth = $state(emptyBirthInput());
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  let chart = $state<NatalChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  let highlighted = $state<string | null>(null);

  const canSubmit = $derived(isComplete(birth));

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;

    loading = true;
    errorMessage = null;

    try {
      const body = await fetchChart(chartParameters(birth, { houseSystem, minorAspects }));
      chart = body.chart;
      placeLabel = body.place?.label ?? null;
    } catch (cause) {
      errorMessage = cause instanceof RequestError ? cause.message : 'Calcolo non riuscito.';
      chart = null;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Tema natale — undicesimacasa</title>
</svelte:head>

<h1>Tema natale</h1>
<p class="sottotitolo">
  Posizioni planetarie, case e aspetti. Calcolo con Swiss Ephemeris, fusi orari storici.
</p>

<form onsubmit={submit} class="modulo">
  <BirthForm bind:value={birth}>
    {#snippet options()}
      <ChartSettings bind:houseSystem bind:minorAspects housesDisabled={birth.timeUnknown} />
    {/snippet}
  </BirthForm>

  <button type="submit" class="invia" disabled={!canSubmit || loading}>
    {loading ? 'Calcolo…' : 'Calcola il tema'}
  </button>
</form>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if chart}
  <section class="risultato">
    <div class="intestazione">
      <h2>{placeLabel ?? 'Tema natale'}</h2>
      <p class="meta">
        {chart.input.date}{chart.time.timeKnown ? ` · ${chart.input.time}` : ' · ora ignota'} ·
        {chart.input.timezone} · UT {chart.time.utc.replace('T', ' ').replace('Z', '')} ·
        TSL {chart.siderealTime.formatted}{chart.sect ? ` · carta ${chart.sect}` : ''} ·
        effemeridi {chart.ephemerisMode}
      </p>
    </div>

    {#if chart.warnings.length > 0}
      <div class="avvertenze">
        <h3>Avvertenze</h3>
        <ul>
          {#each chart.warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="griglia">
      <div class="ruota">
        <ChartWheel {chart} {highlighted} />
        {#if chart.aspects.length > 0}
          <p class="suggerimento">
            Passa sopra un corpo nella tabella per isolarne gli aspetti nella ruota.
          </p>
        {/if}
      </div>

      <div class="tabelle">
        <BodyTable bodies={chart.bodies} partOfFortune={chart.partOfFortune} bind:highlighted />

        {#if chart.angles}
          <AngleTable angles={chart.angles} houses={chart.houses} />
        {/if}

        <AspectTable aspects={chart.aspects} bind:highlighted />
      </div>
    </div>
  </section>
{/if}

<style>
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 5vw, 2.75rem);
    font-weight: 400;
    letter-spacing: -0.01em;
    margin: 0 0 0.35rem;
  }

  .sottotitolo {
    margin: 0 0 2rem;
    color: var(--testo-tenue);
    font-size: 0.95rem;
  }

  .modulo {
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 1.5rem;
  }

  .invia {
    margin-top: 1.5rem;
    padding: 0.6rem 1.4rem;
    background: var(--accento);
    color: #fff;
    border: none;
    border-radius: var(--raggio);
    cursor: pointer;
    font-weight: 600;
  }

  .invia:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .risultato {
    margin-top: 2.5rem;
  }

  .intestazione h2 {
    font-family: Georgia, serif;
    font-weight: 400;
    font-size: 1.5rem;
    margin: 0 0 0.2rem;
  }

  .meta {
    margin: 0;
    font-size: 0.82rem;
    color: var(--testo-tenue);
  }

  .avvertenze {
    margin-top: 1.25rem;
    padding: 0.9rem 1.1rem;
    background: var(--accento-tenue);
    border-radius: var(--raggio);
    font-size: 0.85rem;
  }

  .avvertenze h3 {
    margin: 0 0 0.4rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .avvertenze ul {
    margin: 0;
    padding-left: 1.1rem;
  }

  .griglia {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 2.5rem;
    margin-top: 1.75rem;
    align-items: start;
  }

  @media (max-width: 60rem) {
    .griglia {
      grid-template-columns: 1fr;
    }
  }

  .suggerimento {
    font-size: 0.78rem;
    color: var(--testo-tenue);
    margin-top: 0.5rem;
  }

  /* Le tabelle sono componenti a sé: la spaziatura fra loro sta qui, con una
     colonna flex, perché uno `section + section` scritto in questa pagina non
     raggiungerebbe elementi resi da un altro componente. */
  .tabelle {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
</style>
