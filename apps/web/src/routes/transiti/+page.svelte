<script lang="ts">
  import type {
    HouseSystem,
    NatalChart,
    TransitChart,
    TransitPassage,
  } from '@undicesimacasa/core';
  import type { Location } from '@undicesimacasa/geo';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import {
    fetchLocation,
    fetchPassages,
    fetchTransits,
    passageParameters,
    RequestError,
    transitParameters,
  } from '$lib/api';
  import { birthFromParameters, isComplete, missingBirthFields } from '$lib/birth';
  import { houseSystemOrDefault } from '$lib/house-systems';
  import { Evidenza } from '$lib/evidenza.svelte';
  import { birthStore } from '$lib/birth-store.svelte';
  import AngleTable from '$lib/components/AngleTable.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import CampiMancanti from '$lib/components/CampiMancanti.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import DistributionTable from '$lib/components/DistributionTable.svelte';
  import LegendaElementi from '$lib/components/LegendaElementi.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import ModuloPieghevole from '$lib/components/ModuloPieghevole.svelte';
  import MomentFields from '$lib/components/MomentFields.svelte';
  import PassageTable from '$lib/components/PassageTable.svelte';
  import Risultato from '$lib/components/Risultato.svelte';
  import StrumentiRuota from '$lib/components/StrumentiRuota.svelte';
  import TransitAspectTable from '$lib/components/TransitAspectTable.svelte';
  import { isCompleteMoment, nowMoment } from '$lib/moment';

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
  const evidenza = new Evidenza();
  /** Il nodo della ruota, che gli strumenti devono avere in mano per salvarla. */
  let disegno = $state<SVGSVGElement | null>(null);

  /**
   * Se il modulo mostri anche il resto di sé.
   *
   * Aperto all'inizio: senza una nascita non c'è niente da calcolare, e la
   * nascita sta fra i dettagli.
   */
  let aperto = $state(true);

  /** Il calendario è una seconda richiesta: costa, e non tutti lo vogliono. */
  const MESI = 12;
  let passages = $state<TransitPassage[] | null>(null);
  let loadingPassages = $state(false);
  let passagesError = $state<string | null>(null);

  const canSubmit = $derived(isComplete(birth) && isCompleteMoment(transit));
  /* Due moduli in uno: la nascita e l'istante da confrontarle. */
  const mancanti = $derived([
    ...missingBirthFields(birth),
    ...(isCompleteMoment(transit) ? [] : ['il giorno del transito']),
  ]);

  /**
   * Il numero dell'ultima richiesta partita.
   *
   * Le frecce del passo si premono in fretta, e le risposte non tornano
   * nell'ordine in cui sono state chieste: senza confrontare il numero, quella
   * di un istante già superato arriverebbe dopo e si prenderebbe lo schermo.
   */
  let ultima = 0;

  /**
   * A quali condizioni è stato calcolato il quadro che si sta guardando.
   *
   * Sono due istanti e non uno — quello dei transiti e quello della nascita —
   * ed è la sola riga che li tenga insieme: chi sfoglia con le frecce vede
   * cambiare il primo e restare fermo il secondo.
   */
  function condizioni(natale: NatalChart, quadro: TransitChart): string {
    const ora = quadro.time.timeKnown ? ` alle ${quadro.input.time}` : ' (mezzogiorno)';
    const ut = quadro.time.utc.replace('T', ' ').replace('Z', '');
    const nascita = natale.time.timeKnown ? ` alle ${natale.input.time}` : ' (ora ignota)';
    const da = transitPlaceLabel ? ` · guardato da ${transitPlaceLabel}` : '';
    return (
      `Transiti del ${quadro.input.date}${ora} · ${quadro.input.timezone} · UT ${ut}` +
      ` · su nascita del ${natale.input.date}${nascita} · case ${natale.houseSystem}` +
      ` · effemeridi ${quadro.ephemerisMode}${da}`
    );
  }

  /**
   * Anche questa pagina **legge** il proprio indirizzo ma non lo scrive mai:
   * dentro c'è una data di nascita. Vale la stessa ragione del tema, e il
   * collegamento si compone dal pulsante «copia link».
   */
  onMount(() => {
    void (async () => {
      const parametri = page.url.searchParams;
      if (!parametri.get('date')) return;

      const id = Number(parametri.get('locationId'));
      const luogo = Number.isInteger(id) && id > 0 ? await fetchLocation(id) : null;
      if (!luogo) return;

      birthStore.value = birthFromParameters(parametri, luogo);
      houseSystem = houseSystemOrDefault(parametri.get('houseSystem'));
      minorAspects = parametri.get('minorAspects') === 'true';

      const transitDate = parametri.get('transitDate');
      if (transitDate) {
        transit = {
          date: transitDate,
          time: parametri.get('transitTime') ?? '',
          timezone: parametri.get('transitTimezone') || nowMoment().timezone,
        };
      }

      const luogoTransito = Number(parametri.get('transitLocationId'));
      if (Number.isInteger(luogoTransito) && luogoTransito > 0) {
        transitLocation = await fetchLocation(luogoTransito);
      }

      if (await calcola()) aperto = false;
    })();
  });

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

<Meta
  titolo="Transiti"
  descrizione="Dove sono i pianeti in un dato momento e che aspetti formano con un tema di nascita."
/>

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

<ModuloPieghevole
  bind:aperto
  etichetta="Nascita e opzioni"
  chiudibile={chart !== null && transits !== null}
  onsubmit={submit}
>
  {#snippet striscia()}
    <MomentFields
      bind:value={transit}
      what="del transito"
      id="transito"
      onstep={calcola}
      compact={!aperto}
    />
  {/snippet}

  {#snippet dettagli()}
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

    <button
      type="submit"
      class="invia"
      disabled={!canSubmit || loading}
      aria-describedby={mancanti.length > 0 ? 'mancanti-transiti' : undefined}
    >
      {loading ? 'Calcolo…' : 'Calcola i transiti'}
    </button>
    <CampiMancanti campi={mancanti} id="mancanti-transiti" />
  {/snippet}
</ModuloPieghevole>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if chart && transits}
  <Risultato
    titolo={placeLabel ?? 'Transiti'}
    meta={condizioni(chart, transits)}
    avvertenze={transits.warnings}
  >
    <div class="griglia">
      <div class="ruota">
        <ChartWheel {chart} {transits} {evidenza} bind:elemento={disegno} />
        <LegendaElementi />
        <StrumentiRuota
          svg={disegno}
          {evidenza}
          nome={['transiti', placeLabel, transits.input.date]}
          link={() =>
            transitParameters(birth, { houseSystem, minorAspects }, transit, transitLocation)}
        />
      </div>

      <div class="tabelle">
        <TransitAspectTable aspects={transits.aspects} {evidenza} />

        <BodyTable
          bodies={transits.transiting}
          title="In transito"
          houseTitle="Casa natale"
          {evidenza}
        />

        {#if transits.angles}
          <AngleTable
            angles={transits.angles}
            houses={transits.houses}
            title="Assi e cuspidi dell'istante"
          />
        {/if}

        <BodyTable
          bodies={chart.bodies}
          partOfFortune={chart.partOfFortune}
          title="Tema di nascita"
          {evidenza}
        />

        <!-- Del tema e non dei transitanti: la distribuzione di un istante è
             la stessa per chiunque lo guardi, e in una pagina che confronta un
             cielo con una nascita quella che dice qualcosa è la seconda. Chi
             vuole l'altra la trova sotto Cielo. -->
        <!-- La guardia non è pedanteria: `/api/chart` si fa memorizzare per un
             giorno, e una risposta in cache può venire da una versione
             dell'applicazione precedente a questo campo. Senza, chi ha usato il
             sito ieri troverebbe oggi una pagina bianca invece di un tema — che
             è il contrario del fallimento parziale che il progetto si è dato. -->
        {#if chart.distribution}
          <DistributionTable distribution={chart.distribution} title="Distribuzione della nascita" />
        {/if}
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
  </Risultato>
{/if}

<style>
  /* Il luogo del transito non appartiene alla nascita: una riga lo separa dal
     modulo che sta sopra, perché scritti di seguito sembrerebbero lo stesso posto. */
  .luogo-transito {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--linea);
  }

  .passaggi {
    display: block;
    margin-top: 2.5rem;
    padding-top: 1.75rem;
    border-top: 1px solid var(--linea);
  }
</style>
