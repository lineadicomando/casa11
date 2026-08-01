<script lang="ts">
  import type { Location } from '@undicesimacasa/geo';
  import { tick } from 'svelte';
  import {
    electionParameters,
    fetchElection,
    RequestError,
    type ElectionResponse,
  } from '$lib/api';
  import ElectionTable from '$lib/components/ElectionTable.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import { nowMoment, shiftDate } from '$lib/moment';

  /**
   * Quanti giorni chiedere in una volta.
   *
   * Tre: sono già settantadue righe, e l'elezione si consulta per decidere
   * qualcosa nei prossimi giorni, non per sfogliare un mese. Il motore ne
   * ammette trentuno, e chi li vuole passa dall'API.
   */
  const GIORNI = 3;

  let location = $state<Location | null>(null);
  let from = $state(nowMoment().date);

  let election = $state<ElectionResponse | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);

  /**
   * Il modulo resta aperto finché non c'è un risultato.
   *
   * A differenza del cielo, qui non si può calcolare niente prima che qualcuno
   * dica dove: alba e tramonto non hanno un valore predefinito sensato, e un
   * luogo scelto da noi sarebbe un'ora planetaria sbagliata di venti minuti.
   */
  let aperto = $state(true);
  let modulo = $state<HTMLFormElement | null>(null);

  const canSubmit = $derived(location !== null && from !== '');

  async function commuta(): Promise<void> {
    aperto = !aperto;
    if (!aperto) return;
    await tick();
    modulo?.scrollIntoView({ block: 'start' });
  }

  async function load(): Promise<boolean> {
    if (!location) return false;

    loading = true;
    errorMessage = null;

    try {
      election = await fetchElection(electionParameters(location, from, GIORNI - 1));
      return true;
    } catch (cause) {
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo dell\'elezione non riuscito.';
      election = null;
      return false;
    } finally {
      loading = false;
    }
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (await load()) aperto = false;
  }

  /** Un passo avanti o indietro di tutta la finestra mostrata. */
  async function passo(giorni: number): Promise<void> {
    from = shiftDate(from, 'day', giorni);
    await load();
  }

  function selectLocation(chosen: Location | null): void {
    location = chosen;
  }
</script>

<svelte:head>
  <title>Elezione — undicesimacasa</title>
</svelte:head>

<h1 class="nascosto">Elezione</h1>

{#if aperto}
  <p class="sottotitolo">
    Di che cosa è fatto il tempo in un luogo: le ore planetarie, l'Ascendente che
    sorge, i tratti in cui la Luna è vuota di corso.
  </p>
{/if}

<form onsubmit={submit} class="modulo" class:chiuso={!aperto} bind:this={modulo} novalidate>
  <div class="testa">
    <div class="giorno">
      <label for="elezione-da">Dal giorno</label>
      <input id="elezione-da" type="date" bind:value={from} required />
      {#if !aperto && election}
        <span class="passi">
          <button type="button" onclick={() => passo(-GIORNI)} aria-label="Giorni precedenti">
            ‹
          </button>
          <button type="button" onclick={() => passo(GIORNI)} aria-label="Giorni successivi">
            ›
          </button>
        </span>
      {/if}
    </div>

    <button
      type="button"
      class="commuta"
      class:chiusura={aperto}
      aria-expanded={aperto}
      aria-label={aperto ? 'Chiudi i dettagli' : undefined}
      onclick={commuta}
    >
      {aperto ? '×' : 'Luogo'}
    </button>
  </div>

  <div class="dettagli" hidden={!aperto}>
    <div class="campi">
      <LocationSearch selected={location} onselect={selectLocation} label="Luogo" />
    </div>

    <p class="nota">
      Il luogo qui è obbligatorio, e non ha alternative: le ore planetarie nascono da
      alba e tramonto, che cambiano con la latitudine e con il giorno dell'anno.
      Si vedono {GIORNI} giorni per volta.
    </p>

    <button type="submit" class="invia" disabled={!canSubmit || loading}>
      {loading ? 'Calcolo…' : 'Calcola le ore'}
    </button>
  </div>
</form>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if election}
  <section class="risultato">
    <div class="intestazione">
      <h2>{election.place.label ?? 'Ore planetarie'}</h2>
      <p class="meta" aria-live="polite">
        dal {election.range.from} al {election.range.to} · {election.range.timezone}
      </p>
    </div>

    {#if election.warnings.length > 0}
      <div class="avvertenze">
        <h3>Avvertenze</h3>
        <ul>
          {#each election.warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <ElectionTable hours={election.hours} voids={election.voids} />

    <!-- La pagina calcola e non consiglia, ed è la stessa linea che tiene il
         motore: dire quale ora convenga sarebbe interpretazione, e non è di
         chi fa i conti. -->
    <p class="suggerimento">
      Un'ora planetaria è una delle dodici parti in cui si divide l'arco del giorno, o
      quello della notte: dura sessanta minuti soltanto agli equinozi. Il giorno comincia
      all'alba, non a mezzanotte. Che cosa farne di queste ore — se sceglierne una per
      cominciare qualcosa, e quale — non lo dice il calcolo.
    </p>
  </section>
{/if}

<style>
  .giorno {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .giorno label {
    font-size: 0.85rem;
    color: var(--testo-tenue);
  }

  .passi {
    display: inline-flex;
    gap: 0.25rem;
  }

  .passi button {
    padding: 0.1rem 0.5rem;
    font-size: 1rem;
    line-height: 1.2;
  }
</style>
