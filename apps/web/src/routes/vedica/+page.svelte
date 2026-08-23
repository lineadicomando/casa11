<script lang="ts">
  import type { AyanamsaId, DashaYear, JyotishaChart, NodeDrishti, VargaId } from '@undicesimacasa/core';
  import type { StileQuadro } from '@undicesimacasa/ruota';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import {
    fetchJyotisha,
    fetchJyotishaCompact,
    fetchLocation,
    jyotishaParameters,
    RequestError,
  } from '$lib/api';
  import { birthFromParameters, isComplete, missingBirthFields } from '$lib/birth';
  import { birthStore } from '$lib/birth-store.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import JyotishaSettings from '$lib/components/JyotishaSettings.svelte';
  import QuadroVedico from '$lib/components/QuadroVedico.svelte';
  import StrumentiDisegno from '$lib/components/StrumentiDisegno.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import CampiMancanti from '$lib/components/CampiMancanti.svelte';
  import DashaTable from '$lib/components/DashaTable.svelte';
  import DrishtiTable from '$lib/components/DrishtiTable.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import ModuloPieghevole from '$lib/components/ModuloPieghevole.svelte';
  import NakshatraTable from '$lib/components/NakshatraTable.svelte';
  import Risultato from '$lib/components/Risultato.svelte';
  import StrumentiLettura from '$lib/components/StrumentiLettura.svelte';
  import VargaTable from '$lib/components/VargaTable.svelte';
  import { Evidenza } from '$lib/evidenza.svelte';
  import { ayanamsaOrDefault } from '$lib/zodiacs';

  // La nascita è la stessa delle altre sezioni: chi l'ha scritta nel tema la
  // ritrova qui, e viceversa.
  const birth = $derived(birthStore.value);

  let ayanamsa = $state<AyanamsaId>('lahiri');
  let dashaLevels = $state<1 | 2 | 3>(2);
  let dashaYear = $state<DashaYear>('solare');
  /**
   * Le divisionali da mostrare, oltre alla rashi.
   *
   * La D-1 non è fra queste: è il tema, e sta nella colonna del disegno. Al
   * server si chiede sempre, perché è da lì che quel quadro si disegna.
   */
  let vargas = $state<VargaId[]>(['d9']);
  let stile = $state<StileQuadro>('sud');
  let drishtiNodes = $state<NodeDrishti>('nessuna');

  /**
   * Le condizioni con cui si chiede il tema, in un posto solo.
   *
   * Servono al calcolo e al prompt di lettura, e devono essere le stesse: un
   * prompt che descrivesse un tema diverso da quello a schermo sarebbe il
   * peggiore dei difetti, perché non si vede.
   */
  const opzioniVediche = $derived({
    ayanamsa,
    dashaLevels,
    dashaYear,
    vargas: ['d1' as VargaId, ...vargas],
    drishtiNodes,
  });

  let jyotisha = $state<JyotishaChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  const evidenza = new Evidenza();
  /** Il quadro principale, che gli strumenti devono avere in mano per salvarlo. */
  let disegno = $state<SVGSVGElement | null>(null);

  /** La carta rashi: il tema, che regge la colonna del disegno. */
  const rashi = $derived(jyotisha?.vargas.find((varga) => varga.varga === 'd1') ?? null);
  /** Le divisionali chieste, che sono le altre. */
  const divisionali = $derived(jyotisha?.vargas.filter((varga) => varga.varga !== 'd1') ?? []);

  /**
   * I graha coi nomi che il Jyotisha dà loro.
   *
   * I due nodi qui si chiamano Rahu e Ketu: non sono punti calcolati ma graha
   * con un nome, e «Nodo Nord» in una tabella vedica è una cosa che nessuno
   * dice. I nomi arrivano da `nakshatras`, che li porta già: il client non può
   * importare valori dal motore — trascinerebbe le effemeridi nel bundle — e
   * riscriverli qui vorrebbe dire tenere allineate due tabelle.
   */
  const graha = $derived.by(() => {
    const vedico = jyotisha;
    if (!vedico) return [];
    return vedico.chart.bodies.map((body) => ({
      ...body,
      name: vedico.nakshatras.find((voce) => voce.id === body.id)?.name ?? body.name,
    }));
  });

  let aperto = $state(true);

  const canSubmit = $derived(isComplete(birth));
  const mancanti = $derived(missingBirthFields(birth));

  /** Come nel tema: due scelte ravvicinate non tornano nell'ordine in cui sono state chieste. */
  let ultima = 0;

  async function calcola(): Promise<boolean> {
    if (!canSubmit) return false;

    const richiesta = ++ultima;
    loading = true;
    errorMessage = null;

    try {
      const body = await fetchJyotisha(jyotishaParameters(birth, opzioniVediche));
      if (richiesta !== ultima) return false;
      jyotisha = body.jyotisha;
      placeLabel = body.place?.label ?? null;
      return true;
    } catch (cause) {
      if (richiesta !== ultima) return false;
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo del tema vedico non riuscito.';
      jyotisha = null;
      return false;
    } finally {
      if (richiesta === ultima) loading = false;
    }
  }

  /** A quali condizioni è stato calcolato quello che si sta guardando. */
  function condizioni(vedico: JyotishaChart): string {
    const carta = vedico.chart;
    const ora = carta.time.timeKnown ? ` · ${carta.input.time}` : ' · ora ignota';
    const ayanamsaDetto = carta.ayanamsa ? ` · ayanamsa ${carta.ayanamsa.name}` : '';
    return (
      `${carta.input.date}${ora} · ${carta.input.timezone}` +
      `${ayanamsaDetto} · case a segni interi · effemeridi ${carta.ephemerisMode}`
    );
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (await calcola()) aperto = false;
  }

  /**
   * Se il tema abbia un lagna, cioè se lo stile del nord sia disegnabile.
   *
   * Le sue caselle sono case: senza ora di nascita non c'è una prima casa da
   * mettere in alto. La pagina **non lo offre** invece di offrirlo e poi
   * negarlo — un menù che rifiuta una voce che mostra è un menù che ha
   * chiesto una cosa che non poteva dare.
   */
  const conLagna = $derived(jyotisha?.chart.angles !== undefined);

  $effect(() => {
    if (!conLagna && stile === 'nord') stile = 'sud';
  });

  /** Questa pagina legge il proprio indirizzo ma non lo scrive mai: c'è dentro una nascita. */
  onMount(() => {
    void (async () => {
      const parametri = page.url.searchParams;
      if (!parametri.get('date')) return;

      const id = Number(parametri.get('locationId'));
      const luogo = Number.isInteger(id) && id > 0 ? await fetchLocation(id) : null;
      if (!luogo) return;

      birthStore.value = birthFromParameters(parametri, luogo);
      ayanamsa = ayanamsaOrDefault(parametri.get('ayanamsa'));

      if (await calcola()) aperto = false;
    })();
  });
</script>

<Meta
  titolo="Vedica"
  descrizione="Tema secondo il Jyotisha: zodiaco siderale, nakshatra, dasha vimshottari, carte divisionali e drishti, calcolati con le effemeridi Swiss Ephemeris."
/>

<h1 class="nascosto">Vedica</h1>

<div class="cappello">
  <p>
    La stessa nascita letta secondo il Jyotisha, l'astrologia indiana: il
    quadro delle dodici case, il nakshatra in cui cade la Luna, le carte
    divisionali, le drishti e le dasha vimshottari, che dividono la vita in
    periodi retti da un graha a partire dal nakshatra di nascita.
  </p>
  <p>
    Le posizioni non coincidono con quelle del tema occidentale, e non è un
    errore di nessuno dei due: si contano da un'origine diversa, e oggi fra i
    due zodiaci corrono poco più di ventiquattro gradi — quasi un segno
    intero. <a href="/metodo#zodiaco">Da dove viene la differenza</a>, e
    perché l'ayanamsa si sceglie.
  </p>
</div>

<!-- Le stesse opzioni due volte no: nella striscia stanno quelle che si
     cambiano guardando il risultato — un altro ayanamsa, un ordine di dasha in
     meno — e nel modulo ci sono anche le caselle delle divisionali, che si
     decidono prima. -->
{#snippet opzioni()}
  <JyotishaSettings
    bind:ayanamsa
    bind:dashaLevels
    bind:dashaYear
    bind:drishtiNodes
    bind:vargas
    onchange={calcola}
    compact
  />
{/snippet}

<ModuloPieghevole
  bind:aperto
  etichetta="Nascita"
  chiudibile={jyotisha !== null}
  onsubmit={submit}
  striscia={aperto ? undefined : opzioni}
>
  {#snippet dettagli()}
    <BirthForm bind:value={birthStore.value}>
      {#snippet options()}
        <JyotishaSettings
          bind:ayanamsa
          bind:dashaLevels
          bind:dashaYear
          bind:drishtiNodes
          bind:vargas
        />
      {/snippet}
    </BirthForm>

    <button
      type="submit"
      class="invia"
      disabled={!canSubmit || loading}
      aria-describedby={mancanti.length > 0 ? 'mancanti-vedico' : undefined}
    >
      {loading ? 'Calcolo…' : 'Calcola il tema vedico'}
    </button>
    <CampiMancanti campi={mancanti} id="mancanti-vedico" />
  {/snippet}
</ModuloPieghevole>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if jyotisha}
  <Risultato
    titolo={placeLabel ?? 'Tema vedico'}
    meta={condizioni(jyotisha)}
    avvertenze={[...jyotisha.chart.warnings, ...jyotisha.warnings]}
  >
    <div class="griglia">
      <div class="ruota">
        {#if rashi}
          <QuadroVedico
            chart={rashi}
            {stile}
            {evidenza}
            titolo="Carta rashi"
            bind:elemento={disegno}
          />
        {/if}

        <!-- Lo stile sta sotto il disegno e non fra le opzioni: non ricalcola
             niente, e riguarda quel disegno lì. I due quadri dicono la stessa
             cosa in due disposizioni. -->
        <div class="stile">
          <span id="stile-quadro">Quadro</span>
          <div role="radiogroup" aria-labelledby="stile-quadro" class="scelte">
            <label class="interruttore">
              <input type="radio" bind:group={stile} value="sud" />
              <span>Sud — segni fissi</span>
            </label>
            {#if conLagna}
              <label class="interruttore">
                <input type="radio" bind:group={stile} value="nord" />
                <span>Nord — case fisse</span>
              </label>
            {/if}
          </div>
          {#if !conLagna}
            <p class="nota">
              Senza ora di nascita non c'è un lagna, e lo stile del nord ha le case
              fisse: resta quello del sud, dove a essere fissi sono i segni.
            </p>
          {/if}
        </div>

        <StrumentiDisegno
          svg={disegno}
          {evidenza}
          nome={['vedico', placeLabel, jyotisha.chart.input.date]}
          link={() => jyotishaParameters(birth, opzioniVediche)}
        />
      </div>

      <div class="tabelle">
        <StrumentiLettura
          sistema="jyotisha"
          tavola={() => fetchJyotishaCompact(jyotishaParameters(birth, opzioniVediche))}
        />

        <BodyTable bodies={graha} {evidenza} title="Graha" houseTitle="Bhava" />

        <NakshatraTable nakshatras={jyotisha.nakshatras} bodies={jyotisha.chart.bodies} {evidenza} />

        <DashaTable dasha={jyotisha.dasha} {evidenza} />

        {#each divisionali as varga (varga.varga)}
          <VargaTable {varga} {stile} {evidenza} />
        {/each}

        <DrishtiTable drishti={jyotisha.drishti} {evidenza} />
      </div>
    </div>
  </Risultato>
{/if}

<style>
  .stile {
    margin-top: 1rem;
  }

  .stile > span {
    display: block;
    margin-bottom: 0.35rem;
    color: var(--testo-tenue);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .scelte {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
  }

  .nota {
    margin: 0.5rem 0 0;
    max-width: 46rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
  }
</style>
