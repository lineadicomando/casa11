<script lang="ts">
  import type { AyanamsaId, HouseSystem, NatalChart, Zodiac } from '@undicesimacasa/core';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import {
    chartParameters,
    fetchChart,
    fetchChartCompact,
    fetchLocation,
    RequestError,
  } from '$lib/api';
  import { birthFromParameters, isComplete, missingBirthFields } from '$lib/birth';
  import { Evidenza } from '$lib/evidenza.svelte';
  import { houseSystemOrDefault } from '$lib/house-systems';
  import { ayanamsaOrDefault, zodiacOrDefault } from '$lib/zodiacs';
  import { birthStore } from '$lib/birth-store.svelte';
  import AngleTable from '$lib/components/AngleTable.svelte';
  import AspectTable from '$lib/components/AspectTable.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import CampiMancanti from '$lib/components/CampiMancanti.svelte';
  import DistributionTable from '$lib/components/DistributionTable.svelte';
  import LegendaElementi from '$lib/components/LegendaElementi.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import ModuloPieghevole from '$lib/components/ModuloPieghevole.svelte';
  import Risultato from '$lib/components/Risultato.svelte';
  import StrumentiLettura from '$lib/components/StrumentiLettura.svelte';
  import StrumentiDisegno from '$lib/components/StrumentiDisegno.svelte';

  // La nascita non è di questa pagina: chi la scrive qui la ritrova nei
  // transiti e nell'elezione, e viceversa.
  const birth = $derived(birthStore.value);
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);
  let zodiac = $state<Zodiac>('tropicale');
  let ayanamsa = $state<AyanamsaId>('lahiri');

  /**
   * Le condizioni con cui questa pagina chiede il tema.
   *
   * Servono in tre posti — il calcolo, il collegamento da copiare, il prompt
   * di lettura — e devono essere le stesse in tutti e tre: un indirizzo
   * condiviso che ricalcolasse un tema diverso da quello a schermo sarebbe il
   * peggiore dei difetti, perché non si vede.
   */
  const opzioniTema = $derived({ houseSystem, minorAspects, zodiac, ayanamsa });

  let chart = $state<NatalChart | null>(null);
  let placeLabel = $state<string | null>(null);
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

  const canSubmit = $derived(isComplete(birth));
  const mancanti = $derived(missingBirthFields(birth));

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
      const body = await fetchChart(chartParameters(birth, opzioniTema));
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

  /**
   * A quali condizioni è stato calcolato quello che si sta guardando.
   *
   * Sta qui e non nel markup perché è una riga sola composta di sette pezzi,
   * metà dei quali condizionati: nel template diventava un intreccio di
   * interpolazioni in cui non si vedeva più dove finiva un dato e cominciava
   * la punteggiatura.
   */
  function condizioni(carta: NatalChart): string {
    const ora = carta.time.timeKnown ? ` · ${carta.input.time}` : ' · ora ignota';
    const ut = carta.time.utc.replace('T', ' ').replace('Z', '');
    const settore = carta.sect ? ` · carta ${carta.sect}` : '';
    // Lo zodiaco solo quando non è quello atteso. Qui, a differenza della
    // tabella compatta, la riga sta sotto gli occhi di chi guarda i gradi e
    // non di chi la incolla altrove: scrivere «tropicale» su ogni tema
    // sarebbe una parola in più su nove temi su dieci.
    const zodiaco = carta.ayanamsa
      ? ` · siderale ${carta.ayanamsa.name}`
      : '';
    return (
      `${carta.input.date}${ora} · ${carta.input.timezone} · UT ${ut}` +
      ` · TSL ${carta.siderealTime.formatted}${settore}${zodiaco}` +
      ` · effemeridi ${carta.ephemerisMode}`
    );
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    // Premere «Calcola» vuol dire «ho finito di impostare»: il modulo si
    // ritira e lascia lo schermo al tema. Se il calcolo fallisce resta aperto,
    // perché la cosa da correggere sta dentro i dettagli.
    if (await calcola()) aperto = false;
  }

  /**
   * Questa pagina **legge** il proprio indirizzo ma non lo scrive mai.
   *
   * Dentro c'è una data di nascita, che finisce nella cronologia di chi apre il
   * collegamento e nei registri dei server che attraversa: è un dato che si
   * manda in giro solo di proposito, ed è per questo che l'indirizzo si compone
   * dal pulsante «copia link» e non a ogni calcolo. Chi quel collegamento lo
   * riceve, però, deve trovarci un tema — e per questo la lettura c'è.
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
      zodiac = zodiacOrDefault(parametri.get('zodiac'));
      ayanamsa = ayanamsaOrDefault(parametri.get('ayanamsa'));

      if (await calcola()) aperto = false;
    })();
  });
</script>

<Meta titolo="Tema natale" descrizione="Posizioni planetarie, case e aspetti di un tema di nascita, calcolati con le effemeridi Swiss Ephemeris." />

<!-- Il titolo lo dice già il menù, che segna la sezione in cui ci si trova.
     Resta però scritto: chi naviga per intestazioni deve poter partire da una. -->
<h1 class="nascosto">Tema natale</h1>

<!-- Che cosa questa sezione fa, per chi ci arriva senza saperlo — da una
     ricerca, da un collegamento condiviso. Due righe e non un paragrafo: sotto
     c'è il modulo, che è quello che la gente è venuta a compilare.

     Il collegamento al metodo non è di cortesia: è l'unica cosa in questa
     pagina che spieghi perché la stessa nascita dia carte diverse altrove, ed
     è la domanda che chi confronta due programmi si fa per prima. -->
<div class="cappello">
  <p>
    Il tema natale è la mappa del cielo di un istante e di un luogo precisi:
    dove stavano il Sole, la Luna e i pianeti al momento della nascita, in
    quali case cadono e che aspetti formano fra loro. Servono data, ora e
    luogo — e l'ora pesa più di quanto sembri, perché l'Ascendente si sposta
    di un grado ogni quattro minuti.
  </p>
  <p>
    Se l'ora di nascita non si sa, il calcolo si fa lo stesso: restano i segni
    e gli aspetti, cadono le case e gli assi. Il sistema con cui dividere le
    case si sceglie fra nove, e cambia la carta più di quanto ci si aspetti —
    <a href="/metodo#case">come si dividono le case</a>.
  </p>
</div>

<!-- Un tema di nascita non si sfoglia nel tempo: la data è quella, e la striscia
     non ha nessun istante da offrire. Ha però l'asse lungo cui questa pagina si
     rilegge davvero — la domificazione — e quello sì che si cambia guardando le
     cuspidi, non prima di averle viste. Aperto invece non serve a niente, ed è
     per questo che la striscia arriva al modulo solo quando è chiuso: le stesse
     opzioni stanno già fra i campi, e mostrarle due volte sarebbe chiedere due
     volte la stessa cosa. -->
{#snippet opzioni()}
  <ChartSettings
    id="case-striscia"
    bind:houseSystem
    bind:minorAspects
    bind:zodiac
    bind:ayanamsa
    housesDisabled={birth.timeUnknown}
    onchange={calcola}
    compact
  />
{/snippet}

<ModuloPieghevole
  bind:aperto
  etichetta="Nascita"
  chiudibile={chart !== null}
  onsubmit={submit}
  striscia={aperto ? undefined : opzioni}
>
  {#snippet dettagli()}
    <BirthForm bind:value={birthStore.value}>
      {#snippet options()}
        <ChartSettings
          bind:houseSystem
          bind:minorAspects
          bind:zodiac
          bind:ayanamsa
          housesDisabled={birth.timeUnknown}
        />
      {/snippet}
    </BirthForm>

    <button
      type="submit"
      class="invia"
      disabled={!canSubmit || loading}
      aria-describedby={mancanti.length > 0 ? 'mancanti-tema' : undefined}
    >
      {loading ? 'Calcolo…' : 'Calcola il tema'}
    </button>
    <CampiMancanti campi={mancanti} id="mancanti-tema" />
  {/snippet}
</ModuloPieghevole>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if chart}
  <Risultato
    titolo={placeLabel ?? 'Tema natale'}
    meta={condizioni(chart)}
    avvertenze={chart.warnings}
  >
    <div class="griglia">
      <div class="ruota">
        <ChartWheel {chart} {evidenza} bind:elemento={disegno} />
        <LegendaElementi />
        <StrumentiDisegno
          svg={disegno}
          {evidenza}
          nome={['tema', placeLabel, chart.input.date]}
          link={() => chartParameters(birth, opzioniTema)}
        />
        {#if chart.aspects.length > 0}
          <p class="suggerimento istruzione">
            Scegli un corpo — qui o nelle tabelle — per isolarne gli aspetti. Resta
            scelto finché non lo si sceglie di nuovo.
          </p>
        {/if}
      </div>

      <div class="tabelle">
        <!-- In cima alla colonna dei dati, non in fondo alla pagina: dopo gli
             aspetti lo troverebbe solo chi ha scorso tutto. Qui e non sotto la
             ruota perché quella è appesa, e un elemento appeso non viene spinto
             da ciò che lo segue — se lo porta sotto, sovrapponendocisi. -->
        <StrumentiLettura tavola={() => fetchChartCompact(chartParameters(birth, opzioniTema))} />

        <BodyTable bodies={chart.bodies} partOfFortune={chart.partOfFortune} {evidenza} />

        {#if chart.angles}
          <AngleTable angles={chart.angles} houses={chart.houses} />
        {/if}

        <!-- La guardia non è pedanteria: `/api/chart` si fa memorizzare per un
             giorno, e una risposta in cache può venire da una versione
             dell'applicazione precedente a questo campo. Senza, chi ha usato il
             sito ieri troverebbe oggi una pagina bianca invece di un tema — che
             è il contrario del fallimento parziale che il progetto si è dato. -->
        {#if chart.distribution}
          <DistributionTable distribution={chart.distribution} />
        {/if}

        <AspectTable aspects={chart.aspects} {evidenza} />
      </div>
    </div>
  </Risultato>
{/if}
