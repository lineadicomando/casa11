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
  import { tick } from 'svelte';

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
    // nella pagina: chi era sceso a leggere il risultato se lo vedrebbe
    // sparire verso l'alto proprio mentre chiede di modificarlo. Va aspettato
    // l'aggiornamento, però: finché è ancora appeso, portarlo in vista è
    // un'operazione che non sposta niente.
    await tick();
    modulo?.scrollIntoView({ block: 'start' });
  }

  /** Il calendario è una seconda richiesta: costa, e non tutti lo vogliono. */
  const MESI = 12;
  let passages = $state<TransitPassage[] | null>(null);
  let loadingPassages = $state(false);
  let passagesError = $state<string | null>(null);

  const canSubmit = $derived(isComplete(birth) && isCompleteMoment(transit));

  /**
   * Il numero dell'ultima richiesta partita.
   *
   * Le frecce del passo si premono in fretta, e le risposte non tornano
   * nell'ordine in cui sono state chieste: senza confrontare il numero, quella
   * di un istante già superato arriverebbe dopo e si prenderebbe lo schermo.
   */
  let ultima = 0;

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    void calcola();
  }

  /**
   * Il passo ricalcola con quello che c'è nel modulo in quel momento, nascita
   * compresa: una freccia è un invio come un altro, e non congela il modulo.
   */
  async function calcola(): Promise<void> {
    if (!canSubmit) return;

    const richiesta = ++ultima;
    loading = true;
    errorMessage = null;

    try {
      const body = await fetchTransits(
        transitParameters(birth, { houseSystem, minorAspects }, transit),
      );
      if (richiesta !== ultima) return;
      chart = body.chart;
      transits = body.transits;
      placeLabel = body.place?.label ?? null;
      // Il calendario riguardava l'istante precedente: si ricomincia da capo.
      passages = null;
      passagesError = null;
    } catch (cause) {
      if (richiesta !== ultima) return;
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo dei transiti non riuscito.';
      chart = null;
      transits = null;
    } finally {
      if (richiesta === ultima) loading = false;
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

<!-- Il titolo lo dice già il menù, che segna la sezione in cui ci si trova.
     Resta però scritto: chi naviga per intestazioni deve poter partire da una. -->
<h1 class="nascosto">Transiti</h1>

{#if aperto}
  <!-- Sparisce insieme ai dettagli del modulo. È la sola riga che distingue
       questa sezione dal cielo — «con un tema di nascita», non «fra loro» — e
       serve finché si sta impostando; chi ha chiuso il modulo per sfogliare ha
       già dimostrato di sapere dove si trova. -->
  <p class="sottotitolo">
    Dove sono i pianeti in un dato momento e che aspetti formano con un tema di nascita.
  </p>
{/if}

<!-- `novalidate` perché un modulo che si chiude porta con sé campi obbligatori
     che il browser non può né mostrare né mettere a fuoco: la completezza la
     sa già `canSubmit`, che tiene spento il pulsante. -->
<form onsubmit={submit} class="modulo" class:chiuso={!aperto} bind:this={modulo} novalidate>
  <div class="testa">
    <MomentFields
      bind:value={transit}
      what="del transito"
      id="transito"
      onstep={calcola}
      compact={!aperto}
    />

    <button type="button" class="commuta" aria-expanded={aperto} onclick={commuta}>
      {aperto ? 'Chiudi' : 'Nascita e opzioni'}
    </button>
  </div>

  <div class="dettagli" hidden={!aperto}>
    <BirthForm bind:value={birth}>
      {#snippet options()}
        <ChartSettings bind:houseSystem bind:minorAspects housesDisabled={birth.timeUnknown} />
      {/snippet}
    </BirthForm>

    <button type="submit" class="invia" disabled={!canSubmit || loading}>
      {loading ? 'Calcolo…' : 'Calcola i transiti'}
    </button>
  </div>
</form>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if chart && transits}
  <section class="risultato">
    <div class="intestazione">
      <h2>{placeLabel ?? 'Transiti'}</h2>
      <!-- Un passo cambia la pagina senza che nessuno l'abbia ricaricata: chi
           non la vede deve sentirsi dire almeno di che istante si tratta. -->
      <p class="meta" aria-live="polite">
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

  /* Chiuso, il modulo resta appeso in cima alla pagina: le frecce servono
     mentre si guarda il risultato, che comincia sotto la piega. Chiuderlo e
     basta avvicinerebbe il risultato senza togliere lo scorrimento. */
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
    align-items: flex-start;
    justify-content: space-between;
  }

  .modulo.chiuso .testa {
    align-items: center;
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

  .dettagli {
    margin-top: 1.5rem;
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
