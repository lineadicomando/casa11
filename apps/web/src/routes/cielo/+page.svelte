<script lang="ts">
  import type { HouseSystem, SkyChart } from '@undicesimacasa/core';
  import type { Location } from '@undicesimacasa/geo';
  import { onMount, tick } from 'svelte';
  import {
    fetchSky,
    fetchSkyCalendar,
    RequestError,
    skyCalendarParameters,
    skyParameters,
    type SkyCalendarResponse,
  } from '$lib/api';
  import AngleTable from '$lib/components/AngleTable.svelte';
  import AspectTable from '$lib/components/AspectTable.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import MomentFields from '$lib/components/MomentFields.svelte';
  import SkyMotionTable from '$lib/components/SkyMotionTable.svelte';
  import SkyPassageTable from '$lib/components/SkyPassageTable.svelte';
  import { isCompleteMoment, nowMoment } from '$lib/moment';

  let moment = $state(nowMoment());
  let location = $state<Location | null>(null);
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  let sky = $state<SkyChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  let highlighted = $state<string | null>(null);

  /**
   * Se il modulo mostri anche il resto di sé.
   *
   * Aperto all'inizio, e non chiuso: qui il cielo si calcola da solo, e un
   * modulo già chiuso nasconderebbe il campo del luogo proprio a chi arriva la
   * prima volta — che è l'unica cosa da cui dipendono Ascendente e case.
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
  let calendar = $state<SkyCalendarResponse | null>(null);
  let loadingCalendar = $state(false);
  let calendarError = $state<string | null>(null);

  const canSubmit = $derived(isCompleteMoment(moment));

  /** Senza luogo non ci sono case da domificare, e senza ora nemmeno. */
  const housesDisabled = $derived(location === null || moment.time === '');

  // Il cielo di adesso non ha bisogno di essere chiesto: è la risposta che la
  // pagina può dare prima ancora della domanda, ed è il senso della sezione.
  onMount(() => {
    void load();
  });

  /**
   * Il numero dell'ultima richiesta partita.
   *
   * Le frecce del passo si premono in fretta, e le risposte non tornano
   * nell'ordine in cui sono state chieste: senza confrontare il numero, quella
   * di un giorno già superato arriverebbe dopo e si prenderebbe lo schermo.
   */
  let ultima = 0;

  async function load(): Promise<void> {
    if (!canSubmit) return;

    const richiesta = ++ultima;
    loading = true;
    errorMessage = null;

    try {
      const body = await fetchSky(skyParameters(moment, { houseSystem, minorAspects }, location));
      if (richiesta !== ultima) return;
      sky = body.sky;
      placeLabel = body.place?.label ?? null;
      // Il calendario partiva dal giorno precedente: si ricomincia da capo.
      calendar = null;
      calendarError = null;
    } catch (cause) {
      if (richiesta !== ultima) return;
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo del cielo non riuscito.';
      sky = null;
    } finally {
      if (richiesta === ultima) loading = false;
    }
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    void load();
  }

  async function loadCalendar(): Promise<void> {
    loadingCalendar = true;
    calendarError = null;

    try {
      calendar = await fetchSkyCalendar(skyCalendarParameters(moment, MESI));
    } catch (cause) {
      calendarError =
        cause instanceof RequestError ? cause.message : 'Ricerca del calendario non riuscita.';
    } finally {
      loadingCalendar = false;
    }
  }

  function selectLocation(chosen: Location | null): void {
    location = chosen;
  }
</script>

<svelte:head>
  <title>Cielo — undicesimacasa</title>
</svelte:head>

<!-- Il titolo lo dice già il menù, che segna la sezione in cui ci si trova.
     Resta però scritto: chi naviga per intestazioni deve poter partire da una. -->
<h1 class="nascosto">Cielo</h1>

{#if aperto}
  <!-- Sparisce insieme ai dettagli del modulo. È la sola riga che distingue
       questa sezione dai transiti — «fra loro», non «con un tema di nascita» —
       e serve finché si sta impostando; chi ha chiuso il modulo per sfogliare
       ha già dimostrato di sapere dove si trova. -->
  <p class="sottotitolo">
    Dove sono i pianeti in un dato momento e che aspetti formano fra loro.
  </p>
{/if}

<!-- `novalidate` perché un modulo che si chiude porta con sé campi obbligatori
     che il browser non può né mostrare né mettere a fuoco: la completezza la
     sa già `canSubmit`, che tiene spento il pulsante. -->
<form onsubmit={submit} class="modulo" class:chiuso={!aperto} bind:this={modulo} novalidate>
  <div class="testa">
    <MomentFields bind:value={moment} id="cielo" onstep={load} compact={!aperto} />

    <button type="button" class="commuta" aria-expanded={aperto} onclick={commuta}>
      {aperto ? 'Chiudi' : 'Luogo e opzioni'}
    </button>
  </div>

  <div class="dettagli" hidden={!aperto}>
    <div class="campi">
      <LocationSearch selected={location} onselect={selectLocation} label="Luogo (facoltativo)" />

      <ChartSettings bind:houseSystem bind:minorAspects {housesDisabled} />
    </div>

    {#if location === null}
      <p class="nota">
        Le posizioni nello zodiaco sono le stesse ovunque sulla Terra. Il luogo serve solo
        a orientare il cielo rispetto all'orizzonte: senza, niente Ascendente e niente case.
      </p>
    {/if}

    <button type="submit" class="invia" disabled={!canSubmit || loading}>
      {loading ? 'Calcolo…' : 'Calcola il cielo'}
    </button>
  </div>
</form>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if sky}
  <section class="risultato">
    <div class="intestazione">
      <h2>{placeLabel ?? 'Cielo del momento'}</h2>
      <!-- Un passo cambia la pagina senza che nessuno l'abbia ricaricata: chi
           non la vede deve sentirsi dire almeno di che istante si tratta. -->
      <p class="meta" aria-live="polite">
        {sky.input.date}{sky.time.timeKnown ? ` · ${sky.input.time}` : ' · ora non indicata'} ·
        {sky.input.timezone} · UT {sky.time.utc.replace('T', ' ').replace('Z', '')}{sky.siderealTime
          ? ` · TSL ${sky.siderealTime.formatted}`
          : ''}{sky.sect
          ? ` · Sole ${sky.sect === 'diurna' ? 'sopra' : 'sotto'} l'orizzonte`
          : ''} · effemeridi {sky.ephemerisMode}
      </p>
    </div>

    {#if sky.warnings.length > 0}
      <div class="avvertenze">
        <h3>Avvertenze</h3>
        <ul>
          {#each sky.warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="griglia">
      <div class="ruota">
        <ChartWheel
          chart={sky}
          {highlighted}
          label="Ruota del cielo con le posizioni planetarie e i loro aspetti"
        />
        <p class="suggerimento">
          {#if sky.angles}
            L'Ascendente è a sinistra, come in un tema.
          {:else}
            Senza luogo la ruota comincia da 0° dell'Ariete: non c'è nessun Ascendente
            da mettere a sinistra.
          {/if}
          Passa sopra un corpo nella tabella per isolarne gli aspetti.
        </p>
      </div>

      <div class="tabelle">
        <BodyTable bodies={sky.bodies} bind:highlighted />

        {#if sky.angles}
          <AngleTable angles={sky.angles} houses={sky.houses} />
        {/if}

        <AspectTable aspects={sky.aspects} bind:highlighted />
      </div>
    </div>

    <section class="calendario">
      {#if calendar}
        <div class="due">
          <SkyPassageTable
            passages={calendar.passages}
            title="Incontri nei prossimi {MESI} mesi"
          />
          <SkyMotionTable ingresses={calendar.ingresses} stations={calendar.stations} />
        </div>
        <p class="suggerimento">
          Il momento in cui due corpi formano un aspetto esatto, e quello in cui un corpo
          cambia segno o inverte il moto. Qui il luogo non conta: un incontro fra due
          pianeti avviene alla stessa ora ovunque lo si guardi. La Luna è esclusa — da
          sola cambierebbe segno ogni due giorni e mezzo.
        </p>
      {:else}
        <button
          type="button"
          class="secondario"
          onclick={loadCalendar}
          disabled={loadingCalendar}
        >
          {loadingCalendar ? 'Cerco…' : `Che cosa succede nei prossimi ${MESI} mesi?`}
        </button>
      {/if}

      {#if calendarError}
        <p class="errore" role="alert">{calendarError}</p>
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

  .campi {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 1.25rem;
    align-items: start;
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

  .calendario {
    display: block;
    margin-top: 2.5rem;
    padding-top: 1.75rem;
    border-top: 1px solid var(--linea);
  }

  /* Incontri e movimenti sono due elenchi indipendenti, non due colonne dello
     stesso: affiancarli evita di dover scorrere l'uno per arrivare all'altro. */
  .due {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 2.5rem;
    align-items: start;
  }

  @media (max-width: 60rem) {
    .due {
      grid-template-columns: 1fr;
    }
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
