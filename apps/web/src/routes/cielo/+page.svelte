<script lang="ts">
  import type { HouseSystem, SkyChart } from '@undicesimacasa/core';
  import type { Location } from '@undicesimacasa/geo';
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import {
    fetchLocation,
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
  import CampiMancanti from '$lib/components/CampiMancanti.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import ModuloPieghevole from '$lib/components/ModuloPieghevole.svelte';
  import MomentFields from '$lib/components/MomentFields.svelte';
  import Risultato from '$lib/components/Risultato.svelte';
  import StrumentiRuota from '$lib/components/StrumentiRuota.svelte';
  import SkyMotionTable from '$lib/components/SkyMotionTable.svelte';
  import SkyPassageTable from '$lib/components/SkyPassageTable.svelte';
  import { houseSystemOrDefault } from '$lib/house-systems';
  import { isCompleteMoment, nowMoment } from '$lib/moment';
  import { Evidenza } from '$lib/evidenza.svelte';

  let moment = $state(nowMoment());
  let location = $state<Location | null>(null);
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  let sky = $state<SkyChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  const evidenza = new Evidenza();
  /** Il nodo della ruota, che gli strumenti devono avere in mano per salvarla. */
  let disegno = $state<SVGSVGElement | null>(null);

  /**
   * Se il modulo mostri anche il resto di sé.
   *
   * Aperto all'inizio, e non chiuso: qui il cielo si calcola da solo, e un
   * modulo già chiuso nasconderebbe il campo del luogo proprio a chi arriva la
   * prima volta — che è l'unica cosa da cui dipendono Ascendente e case.
   */
  let aperto = $state(true);

  /** Il calendario è una seconda richiesta: costa, e non tutti lo vogliono. */
  const MESI = 12;
  let calendar = $state<SkyCalendarResponse | null>(null);
  let loadingCalendar = $state(false);
  let calendarError = $state<string | null>(null);

  const canSubmit = $derived(isCompleteMoment(moment));
  /* Qui obbligatorio è il solo giorno: il luogo è facoltativo per
     costruzione, e senza ora vale mezzogiorno. */
  const mancanti = $derived(canSubmit ? [] : ['il giorno']);

  /** Senza luogo non ci sono case da domificare, e senza ora nemmeno. */
  const housesDisabled = $derived(location === null || moment.time === '');

  /**
   * L'istante e il luogo possono arrivare già scritti nell'indirizzo.
   *
   * Qui non c'è nessuna nascita: un giorno, un'ora e un luogo da cui guardare
   * il cielo non dicono niente di chi guarda, e quindi possono stare in una
   * query string — che finisce nella cronologia, nei registri del server e nel
   * referer. È la ragione per cui il tema e i transiti non lo fanno.
   *
   * Senza `date` nell'indirizzo non si tocca niente: vale «adesso», che è il
   * valore da cui la pagina è già partita.
   */
  async function dallIndirizzo(parametri: URLSearchParams): Promise<void> {
    const date = parametri.get('date');
    if (!date) return;

    moment = {
      date,
      time: parametri.get('time') ?? '',
      timezone: parametri.get('timezone') || nowMoment().timezone,
    };
    houseSystem = houseSystemOrDefault(parametri.get('houseSystem'));
    minorAspects = parametri.get('minorAspects') === 'true';

    const id = Number(parametri.get('locationId'));
    if (Number.isInteger(id) && id > 0) location = await fetchLocation(id);
  }

  /**
   * Rimette nell'indirizzo quello che si sta guardando.
   *
   * `replaceState` e non `pushState`: le frecce del passo si premono in fretta,
   * e un giorno per volta riempirebbero la cronologia di decine di voci da
   * risalire una a una. Quello che si guadagna è la ricarica, il segnalibro e
   * il link da mandare a qualcuno — non il tasto Indietro.
   */
  function nellIndirizzo(): void {
    const parametri = skyParameters(moment, { houseSystem, minorAspects }, location);
    replaceState(`?${parametri}`, {});
  }

  // Il cielo di adesso non ha bisogno di essere chiesto: è la risposta che la
  // pagina può dare prima ancora della domanda, ed è il senso della sezione.
  onMount(() => {
    void (async () => {
      await dallIndirizzo(page.url.searchParams);
      await load();
    })();
  });

  /**
   * Il numero dell'ultima richiesta partita.
   *
   * Le frecce del passo si premono in fretta, e le risposte non tornano
   * nell'ordine in cui sono state chieste: senza confrontare il numero, quella
   * di un giorno già superato arriverebbe dopo e si prenderebbe lo schermo.
   */
  let ultima = 0;

  /** `true` se il cielo a schermo è quello che questa chiamata ha chiesto. */
  async function load(): Promise<boolean> {
    if (!canSubmit) return false;

    const richiesta = ++ultima;
    loading = true;
    errorMessage = null;

    try {
      const body = await fetchSky(skyParameters(moment, { houseSystem, minorAspects }, location));
      if (richiesta !== ultima) return false;
      sky = body.sky;
      placeLabel = body.place?.label ?? null;
      // Il calendario partiva dal giorno precedente: si ricomincia da capo.
      calendar = null;
      calendarError = null;
      nellIndirizzo();
      return true;
    } catch (cause) {
      if (richiesta !== ultima) return false;
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo del cielo non riuscito.';
      sky = null;
      return false;
    } finally {
      if (richiesta === ultima) loading = false;
    }
  }

  /**
   * A quali condizioni è stato calcolato il cielo che si sta guardando.
   *
   * Tempo siderale e settore ci sono solo con un luogo: senza orizzonte non
   * esiste un «sopra» in cui mettere il Sole, e non si scrivono affatto invece
   * di scriversi vuoti.
   */
  function condizioni(cielo: SkyChart): string {
    const ora = cielo.time.timeKnown ? ` · ${cielo.input.time}` : ' · ora non indicata';
    const ut = cielo.time.utc.replace('T', ' ').replace('Z', '');
    const tsl = cielo.siderealTime ? ` · TSL ${cielo.siderealTime.formatted}` : '';
    const orizzonte = cielo.sect
      ? ` · Sole ${cielo.sect === 'diurna' ? 'sopra' : 'sotto'} l'orizzonte`
      : '';
    return (
      `${cielo.input.date}${ora} · ${cielo.input.timezone} · UT ${ut}` +
      `${tsl}${orizzonte} · effemeridi ${cielo.ephemerisMode}`
    );
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    // Premere «Calcola» vuol dire «ho finito di impostare»: il modulo si
    // ritira e lascia lo schermo al risultato. Se il calcolo fallisce resta
    // aperto, perché la cosa da correggere sta dentro i dettagli.
    if (await load()) aperto = false;
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

<Meta
  titolo="Cielo"
  descrizione="Dove sono i pianeti in un dato momento e che aspetti formano fra loro."
/>

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

<ModuloPieghevole
  bind:aperto
  etichetta="Luogo e opzioni"
  chiudibile={sky !== null}
  onsubmit={submit}
>
  {#snippet striscia()}
    <MomentFields bind:value={moment} id="cielo" onstep={load} compact={!aperto} />
  {/snippet}

  {#snippet dettagli()}
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

    <button
      type="submit"
      class="invia"
      disabled={!canSubmit || loading}
      aria-describedby={mancanti.length > 0 ? 'mancanti-cielo' : undefined}
    >
      {loading ? 'Calcolo…' : 'Calcola il cielo'}
    </button>
    <CampiMancanti campi={mancanti} id="mancanti-cielo" />
  {/snippet}
</ModuloPieghevole>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if sky}
  <Risultato
    titolo={placeLabel ?? 'Cielo del momento'}
    meta={condizioni(sky)}
    avvertenze={sky.warnings}
  >
    <div class="griglia">
      <div class="ruota">
        <ChartWheel
          chart={sky}
          {evidenza}
          label="Ruota del cielo con le posizioni planetarie e i loro aspetti"
          bind:elemento={disegno}
        />
        <StrumentiRuota svg={disegno} {evidenza} nome={['cielo', placeLabel, sky.input.date]} />
        <!-- Due frasi e non una: la prima spiega da che parte è girata la ruota
             e vale anche su carta, la seconda è un gesto che su un foglio non
             si può fare. -->
        <p class="suggerimento">
          {#if sky.angles}
            L'Ascendente è a sinistra, come in un tema.
          {:else}
            Senza luogo la ruota comincia da 0° dell'Ariete: non c'è nessun Ascendente
            da mettere a sinistra.
          {/if}
        </p>
        <p class="suggerimento istruzione">
          Scegli un corpo — qui o nelle tabelle — per isolarne gli aspetti.
        </p>
      </div>

      <div class="tabelle">
        <BodyTable bodies={sky.bodies} {evidenza} />

        {#if sky.angles}
          <AngleTable angles={sky.angles} houses={sky.houses} />
        {/if}

        <AspectTable aspects={sky.aspects} {evidenza} />
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
  </Risultato>
{/if}

<style>
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
</style>
