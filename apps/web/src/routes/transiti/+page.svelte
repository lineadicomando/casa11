<script lang="ts">
  import type {
    HouseSystem,
    NatalChart,
    TransitChart,
    TransitPassage,
  } from '@undicesimacasa/core';
  import {
    fetchPassages,
    fetchTransits,
    passageParameters,
    RequestError,
    transitParameters,
  } from '$lib/api';
  import { emptyBirthInput, isComplete } from '$lib/birth';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import MomentFields from '$lib/components/MomentFields.svelte';
  import PassageTable from '$lib/components/PassageTable.svelte';
  import TransitAspectTable from '$lib/components/TransitAspectTable.svelte';
  import { isCompleteMoment, nowMoment } from '$lib/moment';

  let birth = $state(emptyBirthInput());
  let transit = $state(nowMoment());
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  let chart = $state<NatalChart | null>(null);
  let transits = $state<TransitChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  let highlighted = $state<string | null>(null);

  /** Il calendario è una seconda richiesta: costa, e non tutti lo vogliono. */
  const MESI = 12;
  let passages = $state<TransitPassage[] | null>(null);
  let loadingPassages = $state(false);
  let passagesError = $state<string | null>(null);

  const canSubmit = $derived(isComplete(birth) && isCompleteMoment(transit));

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;

    loading = true;
    errorMessage = null;

    try {
      const body = await fetchTransits(
        transitParameters(birth, { houseSystem, minorAspects }, transit),
      );
      chart = body.chart;
      transits = body.transits;
      placeLabel = body.place?.label ?? null;
      // Il calendario riguardava l'istante precedente: si ricomincia da capo.
      passages = null;
      passagesError = null;
    } catch (cause) {
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo dei transiti non riuscito.';
      chart = null;
      transits = null;
    } finally {
      loading = false;
    }
  }

  async function loadPassages(): Promise<void> {
    loadingPassages = true;
    passagesError = null;

    try {
      const body = await fetchPassages(
        passageParameters(birth, { houseSystem, minorAspects }, transit, MESI),
      );
      passages = body.passages;
    } catch (cause) {
      passagesError =
        cause instanceof RequestError ? cause.message : 'Ricerca dei passaggi non riuscita.';
    } finally {
      loadingPassages = false;
    }
  }
</script>

<svelte:head>
  <title>Transiti — undicesimacasa</title>
</svelte:head>

<h1>Transiti</h1>
<p class="sottotitolo">
  Dove sono i pianeti in un dato momento e che aspetti formano con un tema di nascita.
</p>

<form onsubmit={submit} class="modulo">
  <BirthForm bind:value={birth}>
    {#snippet options()}
      <MomentFields bind:value={transit} what="del transito" id="transito" />
      <ChartSettings bind:houseSystem bind:minorAspects housesDisabled={birth.timeUnknown} />
    {/snippet}
  </BirthForm>

  <button type="submit" class="invia" disabled={!canSubmit || loading}>
    {loading ? 'Calcolo…' : 'Calcola i transiti'}
  </button>
</form>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if chart && transits}
  <section class="risultato">
    <div class="intestazione">
      <h2>{placeLabel ?? 'Transiti'}</h2>
      <p class="meta">
        Transiti del {transits.input.date}{transits.time.timeKnown
          ? ` alle ${transits.input.time}`
          : ' (mezzogiorno)'} · {transits.input.timezone} · UT
        {transits.time.utc.replace('T', ' ').replace('Z', '')} · su nascita del
        {chart.input.date}{chart.time.timeKnown ? ` alle ${chart.input.time}` : ' (ora ignota)'} ·
        case {chart.houseSystem} · effemeridi {transits.ephemerisMode}
      </p>
    </div>

    {#if transits.warnings.length > 0}
      <div class="avvertenze">
        <h3>Avvertenze</h3>
        <ul>
          {#each transits.warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="griglia">
      <div class="ruota">
        <ChartWheel {chart} {transits} {highlighted} />
        <p class="suggerimento">
          Anello esterno: i corpi in transito. Anello interno: il tema di nascita.
          Le linee al centro sono gli aspetti fra i due.
        </p>
      </div>

      <div class="tabelle">
        <TransitAspectTable aspects={transits.aspects} bind:highlighted />

        <BodyTable
          bodies={transits.transiting}
          title="In transito"
          houseTitle="Casa natale"
          bind:highlighted
        />

        <BodyTable
          bodies={chart.bodies}
          partOfFortune={chart.partOfFortune}
          title="Tema di nascita"
          bind:highlighted
        />
      </div>
    </div>

    <section class="passaggi">
      {#if passages}
        <PassageTable {passages} title="Passaggi esatti nei dodici mesi" />
        <p class="suggerimento">
          Il momento in cui ogni aspetto diventa esatto, e la finestra in cui resta
          entro l'orbita. Un pianeta lento che retrograda torna sullo stesso punto
          due o tre volte: sono lo stesso periodo, non fatti distinti. La Luna è
          esclusa — da sola perfezionerebbe qualche migliaio di aspetti all'anno.
        </p>
      {:else}
        <button type="button" class="secondario" onclick={loadPassages} disabled={loadingPassages}>
          {loadingPassages ? 'Cerco…' : `Quando diventano esatti? Cerca i prossimi ${MESI} mesi`}
        </button>
      {/if}

      {#if passagesError}
        <p class="errore" role="alert">{passagesError}</p>
      {/if}
    </section>
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

  .tabelle {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .passaggi {
    display: block;
    margin-top: 2.5rem;
    padding-top: 1.75rem;
    border-top: 1px solid var(--linea);
  }

  .secondario {
    padding: 0.5rem 1.1rem;
    background: none;
    color: var(--accento);
    border: 1px solid var(--linea-forte);
    border-radius: var(--raggio);
    cursor: pointer;
    font-size: 0.9rem;
  }

  .secondario:hover {
    border-color: var(--accento);
  }

  .secondario:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
