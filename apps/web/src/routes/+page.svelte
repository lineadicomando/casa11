<script lang="ts">
  import type { HouseSystem, NatalChart } from '@undicesimacasa/core';
  import { chartParameters, fetchChart, RequestError } from '$lib/api';
  import { isComplete } from '$lib/birth';
  import { birthStore } from '$lib/birth-store.svelte';
  import AngleTable from '$lib/components/AngleTable.svelte';
  import AspectTable from '$lib/components/AspectTable.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import ModuloPieghevole from '$lib/components/ModuloPieghevole.svelte';
  import Risultato from '$lib/components/Risultato.svelte';

  // La nascita non è di questa pagina: chi la scrive qui la ritrova nei
  // transiti e nell'elezione, e viceversa.
  const birth = $derived(birthStore.value);
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
    return (
      `${carta.input.date}${ora} · ${carta.input.timezone} · UT ${ut}` +
      ` · TSL ${carta.siderealTime.formatted}${settore} · effemeridi ${carta.ephemerisMode}`
    );
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
        <ChartSettings bind:houseSystem bind:minorAspects housesDisabled={birth.timeUnknown} />
      {/snippet}
    </BirthForm>

    <button type="submit" class="invia" disabled={!canSubmit || loading}>
      {loading ? 'Calcolo…' : 'Calcola il tema'}
    </button>
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
  </Risultato>
{/if}

<style>

  .sottotitolo {
    margin: 0 0 1.1rem;
    color: var(--testo-tenue);
    font-size: 0.9rem;
  }

  .invia {
    margin-top: 1.5rem;
    padding: 0.6rem 1.4rem;
    background: var(--accento);
    color: var(--su-accento);
    border: none;
    border-radius: var(--raggio);
    cursor: pointer;
    font-weight: 600;
  }

  /* Spento, non a metà di un caricamento: è quello che sembrava sbiadendo
     l'accento. Qui il pulsante perde il colore del comando e prende quello del
     testo tenue, come ogni altra cosa inattiva. */
  .invia:disabled {
    background: var(--linea);
    color: var(--testo-tenue);
    cursor: not-allowed;
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

  /* La colonna delle tabelle è alta il triplo del disegno: senza appendere la
     ruota, chi scende a leggere gli aspetti se l'è già lasciata alle spalle —
     e l'evidenziazione al passaggio del mouse illumina qualcosa che non è più
     sullo schermo. */
  .ruota {
    position: sticky;
    top: var(--striscia);
  }

  /* A una colonna la ruota sta già sopra le tabelle, e appesa si prenderebbe
     lo schermo per tutto lo scorrimento; su uno schermo basso non ci sta
     comunque, e appenderla ne taglierebbe il fondo. */
  @media (max-width: 60rem), (max-height: 44rem) {
    .ruota {
      position: static;
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
