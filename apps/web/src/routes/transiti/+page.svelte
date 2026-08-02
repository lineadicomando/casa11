<script lang="ts">
  import type {
    HouseSystem,
    NatalChart,
    TransitChart,
    TransitPassage,
  } from '@undicesimacasa/core';
  import type { Location } from '@undicesimacasa/geo';
  import {
    fetchPassages,
    fetchTransits,
    passageParameters,
    RequestError,
    transitParameters,
  } from '$lib/api';
  import { isComplete } from '$lib/birth';
  import { birthStore } from '$lib/birth-store.svelte';
  import AngleTable from '$lib/components/AngleTable.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import MomentFields from '$lib/components/MomentFields.svelte';
  import PassageTable from '$lib/components/PassageTable.svelte';
  import TransitAspectTable from '$lib/components/TransitAspectTable.svelte';
  import { isCompleteMoment, nowMoment } from '$lib/moment';
  import { tick } from 'svelte';

  // La stessa nascita del tema e dell'elezione: si scrive una volta sola.
  const birth = $derived(birthStore.value);
  let transit = $state(nowMoment());
  /**
   * Il luogo da cui si guarda il transito, che può non esserci.
   *
   * Non è quello di nascita e non lo eredita: chi guarda i propri transiti da
   * dove vive adesso troverebbe compilata una città in cui non è, e il campo
   * vuoto è l'unico modo di non decidere al posto suo.
   */
  let transitLocation = $state<Location | null>(null);
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  let chart = $state<NatalChart | null>(null);
  let transits = $state<TransitChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let transitPlaceLabel = $state<string | null>(null);
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

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    // Premere «Calcola» vuol dire «ho finito di impostare»: il modulo si
    // ritira e lascia lo schermo al risultato. Se il calcolo fallisce resta
    // aperto, perché la cosa da correggere sta dentro i dettagli.
    if (await calcola()) aperto = false;
  }

  /**
   * Il passo ricalcola con quello che c'è nel modulo in quel momento, nascita
   * compresa: una freccia è un invio come un altro, e non congela il modulo.
   *
   * Restituisce `true` se il quadro a schermo è quello che questa chiamata ha
   * chiesto — e non quello di una richiesta più recente che l'ha scavalcata.
   */
  async function calcola(): Promise<boolean> {
    if (!canSubmit) return false;

    const richiesta = ++ultima;
    loading = true;
    errorMessage = null;

    try {
      const body = await fetchTransits(
        transitParameters(birth, { houseSystem, minorAspects }, transit, transitLocation),
      );
      if (richiesta !== ultima) return false;
      chart = body.chart;
      transits = body.transits;
      placeLabel = body.place?.label ?? null;
      transitPlaceLabel = body.transitPlace?.label ?? null;
      // Il calendario riguardava l'istante precedente: si ricomincia da capo.
      passages = null;
      passagesError = null;
      return true;
    } catch (cause) {
      if (richiesta !== ultima) return false;
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo dei transiti non riuscito.';
      chart = null;
      transits = null;
      return false;
    } finally {
      if (richiesta === ultima) loading = false;
    }
  }

  /**
   * Scegliere un luogo per il transito sposta anche l'orologio.
   *
   * «Le nove» in un campo accanto al nome di una città sono le nove di lì: se
   * il fuso restasse quello di chi guarda, l'istante calcolato sarebbe un
   * altro, e la differenza — fino a mezzo giro di Ascendente — non si vedrebbe
   * da nessuna parte. Il fuso resta scritto sotto i campi dell'istante, che
   * così lo mostra cambiare.
   */
  function selectTransitLocation(location: Location | null): void {
    transitLocation = location;
    // Tolto il luogo si torna all'orologio di chi guarda, che è il fuso da cui
    // la pagina era partita. Data e ora restano quelle impostate.
    transit = { ...transit, timezone: location?.timezone ?? nowMoment().timezone };
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

    <!-- La forma segue il mestiere. Aperto, il pulsante chiude, e una X lo dice
         da sé stando nell'angolo come in una finestra. Chiuso, il mestiere è
         l'opposto e nessun simbolo lo esprime: solo il testo dice che cosa c'è
         dietro. L'angolo però è lo stesso, perché la striscia è alta una riga.

         Aperto senza un quadro calcolato non c'è però niente da chiudere: la X
         lascerebbe una striscia appesa sopra una pagina vuota, con le frecce
         del passo pronte a sfogliare il nulla. Chiuso il pulsante c'è sempre,
         perché è la via per tornare ai campi. -->
    {#if !aperto || (chart && transits)}
      <button
        type="button"
        class="commuta"
        class:chiusura={aperto}
        aria-expanded={aperto}
        aria-label={aperto ? 'Chiudi i dettagli' : undefined}
        onclick={commuta}
      >
        {aperto ? '×' : 'Nascita e opzioni'}
      </button>
    {/if}
  </div>

  <div class="dettagli" hidden={!aperto}>
    <BirthForm bind:value={birthStore.value}>
      {#snippet options()}
        <ChartSettings bind:houseSystem bind:minorAspects housesDisabled={birth.timeUnknown} />
      {/snippet}
    </BirthForm>

    <div class="luogo-transito">
      <LocationSearch
        selected={transitLocation}
        onselect={selectTransitLocation}
        label="Luogo del transito (facoltativo)"
        id="luogo-transito"
      />

      <p class="nota">
        {#if transitLocation === null}
          I pianeti sono allo stesso grado dello zodiaco ovunque, e le case in cui i
          transiti cadono restano quelle di nascita. Un luogo aggiunge il cielo come
          si vede da lì in quel momento: Ascendente, Medio Cielo e case dell'istante.
        {:else}
          L'ora del transito si legge ora sull'orologio di {transitLocation.name}.
          Le case natali non cambiano: quelle dell'istante si affiancano.
        {/if}
      </p>
    </div>

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
        case {chart.houseSystem} · effemeridi {transits.ephemerisMode}{transitPlaceLabel
          ? ` · guardato da ${transitPlaceLabel}`
          : ''}
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

        {#if transits.angles}
          <AngleTable
            angles={transits.angles}
            houses={transits.houses}
            title="Assi e cuspidi dell'istante"
          />
          <p class="suggerimento">
            Il cielo come si vede da {transitPlaceLabel ?? 'quel luogo'} in quel momento.
            Non sostituisce le case di nascita, in cui i transiti continuano a cadere:
            dice dove i corpi stanno rispetto all'orizzonte di lì, e gli aspetti che
            partono da questi due assi durano minuti, non giorni.
          </p>
        {/if}

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
    /* Riferimento per la X, che sta nell'angolo del riquadro e non nella riga. */
    position: relative;
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

  /* Fuori dal flusso: è arredo del riquadro, non una terza colonna nella riga
     dei campi, che è il modo in cui si faceva notare prima. */
  .commuta.chiusura {
    position: absolute;
    top: 0.7rem;
    /* Lo stesso scostamento del padding della striscia: così il pulsante non
       si sposta di lato passando da una forma all'altra. */
    right: 1rem;
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
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

  /* Aperto, la X occupa l'angolo senza stare nella riga: i campi devono
     lasciarle il posto, o il campo dell'ora le finirebbe sotto. Solo quando
     c'è, però: prima del primo calcolo la X non viene disegnata affatto, e
     l'angolo tenuto libero per lei sarebbe spazio tolto ai campi. */
  .modulo:not(.chiuso) .testa:has(.chiusura) {
    padding-right: 2.5rem;
  }

  .dettagli {
    margin-top: 1.5rem;
  }

  /* Il luogo del transito non appartiene alla nascita: una riga lo separa dal
     modulo che sta sopra, perché scritti di seguito sembrerebbero lo stesso posto. */
  .luogo-transito {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--linea);
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
