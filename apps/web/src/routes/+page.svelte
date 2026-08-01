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
  import { tick } from 'svelte';

  let birth = $state(emptyBirthInput());
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  let chart = $state<NatalChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  let highlighted = $state<string | null>(null);

  /**
   * Se il modulo mostri anche il resto di sé.
   *
   * Aperto all'inizio: senza una nascita non c'è niente da calcolare, e la
   * nascita sta fra i dettagli.
   */
  let aperto = $state(true);
  let modulo = $state<HTMLFormElement | null>(null);

  async function commuta(): Promise<void> {
    aperto = !aperto;
    if (!aperto) return;

    // Aprendosi il modulo smette di stare appeso in cima e torna al suo posto
    // nella pagina: chi era sceso a leggere il tema se lo vedrebbe sparire
    // verso l'alto proprio mentre chiede di modificarlo. Va aspettato
    // l'aggiornamento, però: finché è ancora appeso, portarlo in vista è
    // un'operazione che non sposta niente.
    await tick();
    modulo?.scrollIntoView({ block: 'start' });
  }

  const canSubmit = $derived(isComplete(birth));

  /**
   * Il numero dell'ultima richiesta partita.
   *
   * Il sistema di case si cambia dalla striscia guardando il tema, e due
   * scelte ravvicinate non tornano nell'ordine in cui sono state chieste:
   * senza confrontare il numero, quella già superata arriverebbe dopo e si
   * prenderebbe lo schermo.
   */
  let ultima = 0;

  /** `true` se il tema a schermo è quello che questa chiamata ha chiesto. */
  async function calcola(): Promise<boolean> {
    if (!canSubmit) return false;

    const richiesta = ++ultima;
    loading = true;
    errorMessage = null;

    try {
      const body = await fetchChart(chartParameters(birth, { houseSystem, minorAspects }));
      if (richiesta !== ultima) return false;
      chart = body.chart;
      placeLabel = body.place?.label ?? null;
      return true;
    } catch (cause) {
      if (richiesta !== ultima) return false;
      errorMessage = cause instanceof RequestError ? cause.message : 'Calcolo non riuscito.';
      chart = null;
      return false;
    } finally {
      if (richiesta === ultima) loading = false;
    }
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    // Premere «Calcola» vuol dire «ho finito di impostare»: il modulo si
    // ritira e lascia lo schermo al tema. Se il calcolo fallisce resta aperto,
    // perché la cosa da correggere sta dentro i dettagli.
    if (await calcola()) aperto = false;
  }
</script>

<svelte:head>
  <title>Tema natale — undicesimacasa</title>
</svelte:head>

<!-- Il titolo lo dice già il menù, che segna la sezione in cui ci si trova.
     Resta però scritto: chi naviga per intestazioni deve poter partire da una. -->
<h1 class="nascosto">Tema natale</h1>

{#if aperto}
  <!-- Sparisce insieme ai dettagli del modulo. Dice quello che il titolo non
       dice già, e serve finché si sta impostando; chi ha chiuso il modulo per
       leggere il tema ha già dimostrato di sapere dove si trova. La
       provenienza delle effemeridi la dichiara il piè di pagina. -->
  <p class="sottotitolo">Posizioni planetarie, case e aspetti.</p>
{/if}

<!-- `novalidate` perché un modulo che si chiude porta con sé campi obbligatori
     che il browser non può né mostrare né mettere a fuoco: la completezza la
     sa già `canSubmit`, che tiene spento il pulsante. -->
<form onsubmit={submit} class="modulo" class:chiuso={!aperto} bind:this={modulo} novalidate>
  <div class="testa">
    <!-- Un tema di nascita non si sfoglia nel tempo: la data è quella, e la
         striscia non ha nessun istante da offrire. Ha però l'asse lungo cui
         questa pagina si rilegge davvero — la domificazione — e quello sì che
         si cambia guardando le cuspidi, non prima di averle viste. -->
    {#if !aperto}
      <ChartSettings
        id="case-striscia"
        bind:houseSystem
        bind:minorAspects
        housesDisabled={birth.timeUnknown}
        onchange={calcola}
        compact
      />
    {/if}

    <!-- La forma segue il mestiere. Aperto, il pulsante chiude, e una X lo dice
         da sé stando nell'angolo come in una finestra. Chiuso, il mestiere è
         l'opposto e nessun simbolo lo esprime: solo il testo dice che cosa c'è
         dietro. -->
    <button
      type="button"
      class="commuta"
      class:chiusura={aperto}
      aria-expanded={aperto}
      aria-label={aperto ? 'Chiudi i dettagli' : undefined}
      onclick={commuta}
    >
      {aperto ? '×' : 'Nascita'}
    </button>
  </div>

  <div class="dettagli" hidden={!aperto}>
    <BirthForm bind:value={birth}>
      {#snippet options()}
        <ChartSettings bind:houseSystem bind:minorAspects housesDisabled={birth.timeUnknown} />
      {/snippet}
    </BirthForm>

    <button type="submit" class="invia" disabled={!canSubmit || loading}>
      {loading ? 'Calcolo…' : 'Calcola il tema'}
    </button>
  </div>
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

  .sottotitolo {
    margin: 0 0 1.1rem;
    color: var(--testo-tenue);
    font-size: 0.9rem;
  }

  .modulo {
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 1.5rem;
  }

  /* Chiuso, il modulo resta appeso in cima alla pagina: il sistema di case si
     cambia mentre si guardano le cuspidi, che stanno sotto la piega.
     Chiuderlo e basta avvicinerebbe il tema senza togliere lo scorrimento. */
  .modulo.chiuso {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 0.7rem 1rem;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.09);
  }

  .testa {
    display: flex;
    gap: 1.25rem;
    align-items: center;
    /* Aperto, nella riga c'è solo la X: qui la manda nel suo angolo. */
    justify-content: flex-end;
  }

  .commuta {
    flex: none;
    padding: 0.35rem 0.8rem;
    background: none;
    color: var(--accento);
    border: 1px solid var(--linea-forte);
    border-radius: var(--raggio);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .commuta:hover {
    border-color: var(--accento);
  }

  /* A differenza delle altre sezioni la X non ha nessuna riga da sovrapporre —
     aperto, il modulo comincia direttamente dai campi della nascita. Sta nel
     flusso, quindi, e sono i margini negativi a portarla nell'angolo del
     riquadro invece che a un rigo di distanza. */
  .commuta.chiusura {
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    margin: -0.8rem -0.5rem 0 0;
    padding: 0;
    font-size: 1.2rem;
    line-height: 1;
    color: var(--testo-tenue);
    border-color: transparent;
  }

  .commuta.chiusura:hover {
    color: var(--accento);
    border-color: var(--linea-forte);
  }

  .dettagli {
    margin-top: 0.25rem;
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
