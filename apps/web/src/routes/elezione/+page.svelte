<script lang="ts">
  import type {
    BodyId,
    HouseSystem,
    NatalChart,
    PlanetaryHour,
    TransitChart,
  } from '@undicesimacasa/core';
  import type { Location } from '@undicesimacasa/geo';
  import { onMount, tick } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import {
    electionParameters,
    fetchElection,
    fetchLocation,
    fetchTransits,
    RequestError,
    transitParameters,
    type ElectionResponse,
  } from '$lib/api';
  import { isComplete } from '$lib/birth';
  import { Evidenza } from '$lib/evidenza.svelte';
  import { birthStore } from '$lib/birth-store.svelte';
  import BirthForm from '$lib/components/BirthForm.svelte';
  import BodyTable from '$lib/components/BodyTable.svelte';
  import ChartSettings from '$lib/components/ChartSettings.svelte';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import CampiMancanti from '$lib/components/CampiMancanti.svelte';
  import ElectionTable from '$lib/components/ElectionTable.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import DistributionTable from '$lib/components/DistributionTable.svelte';
  import LegendaElementi from '$lib/components/LegendaElementi.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import ModuloPieghevole from '$lib/components/ModuloPieghevole.svelte';
  import Risultato from '$lib/components/Risultato.svelte';
  import StrumentiRuota from '$lib/components/StrumentiRuota.svelte';
  import TransitAspectTable from '$lib/components/TransitAspectTable.svelte';
  import { formatDegrees } from '$lib/format';
  import { BODY_LABEL, SIGN_LABEL } from '@undicesimacasa/ruota';
  import { nowMoment, shiftDate, type MomentInput } from '$lib/moment';

  /** I sette dell'ordine caldeo: sono gli unici che reggano un'ora. */
  const REGGITORI: readonly BodyId[] = [
    'saturno',
    'giove',
    'marte',
    'sole',
    'venere',
    'mercurio',
    'luna',
  ];

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
  let ruler = $state<BodyId | ''>('');
  let skipMoonVoid = $state(false);

  let election = $state<ElectionResponse | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);

  /**
   * La nascita, se c'è: qui è **facoltativa**, e non lo è per modo di dire.
   *
   * Le ore planetarie sono del luogo e non della persona — l'elenco si calcola
   * e si legge senza che nessuno dica di essere nato da qualche parte. Con una
   * nascita, però, ogni ora diventa un istante confrontabile con il tema, ed è
   * il confronto che l'astrologo farebbe comunque aprendo due schede.
   *
   * Il tema resta un dato accanto a un altro dato: nessuna ora viene
   * consigliata, ordinata o segnalata. Il contesto per giudicare sta nella
   * conversazione con chi chiede, non in questa pagina.
   */
  const birth = $derived(birthStore.value);
  const conNascita = $derived(isComplete(birth));
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  /** L'ora scelta per il confronto, e il suo esito. */
  let scelta = $state<PlanetaryHour | null>(null);
  let chart = $state<NatalChart | null>(null);
  let transits = $state<TransitChart | null>(null);
  let loadingConfronto = $state(false);
  let confrontoError = $state<string | null>(null);
  const evidenza = new Evidenza();
  /** Il nodo della ruota, che gli strumenti devono avere in mano per salvarla. */
  let disegno = $state<SVGSVGElement | null>(null);
  let confronto = $state<HTMLElement | null>(null);

  /**
   * Il numero dell'ultima richiesta di confronto partita.
   *
   * Le righe sono settantadue e si scorrono col dito: due scelte ravvicinate
   * non tornano nell'ordine in cui sono state chieste, e senza confrontare il
   * numero la ruota a schermo finirebbe per essere di un'altra ora.
   */
  let ultima = 0;

  /**
   * Il modulo resta aperto finché non c'è un risultato.
   *
   * A differenza del cielo, qui non si può calcolare niente prima che qualcuno
   * dica dove: alba e tramonto non hanno un valore predefinito sensato, e un
   * luogo scelto da noi sarebbe un'ora planetaria sbagliata di venti minuti.
   */
  let aperto = $state(true);

  const canSubmit = $derived(location !== null && from !== '');
  /* La nascita è facoltativa e non entra nell'elenco: qui l'unica cosa
     che manchi davvero è il luogo, da cui vengono alba e tramonto. */
  const mancanti = $derived([
    ...(from === '' ? ['il giorno da cui partire'] : []),
    ...(location === null ? ['il luogo'] : []),
  ]);

  /**
   * Il luogo e i filtri possono arrivare già scritti nell'indirizzo.
   *
   * Le ore planetarie sono del luogo e non di una persona: un giorno, una città
   * e un reggitore non dicono niente di chi guarda, e possono quindi stare in
   * una query string. **La nascita no**, e infatti non ci finisce: qui è
   * facoltativa, e chi la scrive lo fa per confrontarla con un'ora, non per
   * mandarla in giro.
   */
  async function dallIndirizzo(parametri: URLSearchParams): Promise<void> {
    const id = Number(parametri.get('locationId'));
    if (!Number.isInteger(id) || id <= 0) return;

    location = await fetchLocation(id);
    if (!location) return;

    from = parametri.get('from') ?? from;
    const reggitore = parametri.get('rulers');
    if (reggitore && REGGITORI.includes(reggitore as BodyId)) ruler = reggitore as BodyId;
    skipMoonVoid = parametri.get('skipMoonVoid') === 'true';
  }

  /**
   * Rimette nell'indirizzo quello che si sta guardando.
   *
   * Senza `to`, che è `from` più i giorni della finestra: un valore che si
   * ricava non va scritto due volte, o prima o poi i due si contraddicono.
   * `replaceState` e non `pushState`, perché le frecce dei giorni riempirebbero
   * la cronologia di voci da risalire una a una.
   */
  function nellIndirizzo(): void {
    if (!location) return;
    const parametri = new URLSearchParams({ locationId: String(location.id), from });
    if (ruler) parametri.set('rulers', ruler);
    if (skipMoonVoid) parametri.set('skipMoonVoid', 'true');
    replaceState(`?${parametri}`, {});
  }

  onMount(() => {
    void (async () => {
      await dallIndirizzo(page.url.searchParams);
      if (location) await load();
    })();
  });

  async function load(): Promise<boolean> {
    if (!location) return false;

    loading = true;
    errorMessage = null;

    try {
      election = await fetchElection(
        electionParameters(location, from, GIORNI - 1, {
          ruler: ruler === '' ? null : ruler,
          skipMoonVoid,
        }),
      );
      nellIndirizzo();
      // L'ora scelta apparteneva all'elenco precedente: un giorno diverso, o
      // un filtro diverso, non la contiene più. Tenerne a schermo la ruota
      // significherebbe mostrare un confronto che nessuna riga rivendica.
      dimentica();
      return true;
    } catch (cause) {
      errorMessage =
        cause instanceof RequestError ? cause.message : 'Calcolo dell\'elezione non riuscito.';
      election = null;
      dimentica();
      return false;
    } finally {
      loading = false;
    }
  }

  function dimentica(): void {
    ultima += 1;
    scelta = null;
    chart = null;
    transits = null;
    confrontoError = null;
    loadingConfronto = false;
  }

  /**
   * Il tema di nascita e il cielo dell'ora scelta, uno sull'altro.
   *
   * Non serve nessun calcolo nuovo: un'ora planetaria è un istante, e i
   * transiti sono già il confronto fra una nascita e un istante qualsiasi.
   */
  async function scegli(ora: PlanetaryHour): Promise<void> {
    if (!election || !conNascita) return;

    scelta = ora;
    const richiesta = ++ultima;
    loadingConfronto = true;
    confrontoError = null;

    try {
      const body = await fetchTransits(
        transitParameters(
          birth,
          { houseSystem, minorAspects },
          istante(ora, election.range.timezone),
        ),
      );
      if (richiesta !== ultima) return;
      chart = body.chart;
      transits = body.transits;
      await tick();
      confronto?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } catch (cause) {
      if (richiesta !== ultima) return;
      confrontoError =
        cause instanceof RequestError ? cause.message : 'Confronto con il tema non riuscito.';
      chart = null;
      transits = null;
    } finally {
      if (richiesta === ultima) loadingConfronto = false;
    }
  }

  /**
   * L'istante in cui l'ora comincia, nella forma che vuole il modulo.
   *
   * Il fuso è quello del luogo eletto e non quello di nascita: `local` è già
   * scritto lì dentro, e leggerlo altrove sposterebbe l'ora di partenza.
   * L'inizio è quello pubblicato dal motore, arrotondato al minuto come ogni
   * altro istante che esca di lì.
   */
  function istante(ora: PlanetaryHour, timezone: string): MomentInput {
    return {
      date: ora.local.start.slice(0, 10),
      time: ora.local.start.slice(11, 16),
      timezone,
    };
  }

  /**
   * Che ora si sta guardando, e su quale nascita.
   *
   * L'ora planetaria è un intervallo e non un istante: si scrivono i due capi,
   * perché è la durata a dire di che ora si tratta — sessanta minuti li fa
   * soltanto agli equinozi.
   */
  function condizioni(ora: PlanetaryHour, natale: NatalChart): string {
    const inizio = ora.local.start.slice(11, 16);
    const fine = ora.local.end.slice(11, 16);
    const nascita = natale.time.timeKnown ? ` alle ${natale.input.time}` : ' (ora ignota)';
    const vuota = ora.moonVoid ? ' · Luna vuota di corso' : '';
    return (
      `${ora.local.start.slice(0, 10)} · ${inizio}–${fine} · ${election?.range.timezone}` +
      ` · ${ora.minutes} min · Ascendente ${formatDegrees(ora.ascendant.signDegree)}` +
      ` ${SIGN_LABEL[ora.ascendant.sign]} · sulla nascita del ${natale.input.date}${nascita}` +
      ` · case ${natale.houseSystem}${vuota}`
    );
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

<Meta
  titolo="Elezione"
  descrizione="Le ore planetarie di un luogo, l'Ascendente che sorge, i tratti in cui la Luna è vuota di corso."
/>

<h1 class="nascosto">Elezione</h1>

{#if aperto}
  <p class="sottotitolo">
    Di che cosa è fatto il tempo in un luogo: le ore planetarie, l'Ascendente che
    sorge, i tratti in cui la Luna è vuota di corso.
  </p>
{/if}

<ModuloPieghevole
  bind:aperto
  etichetta="Luogo"
  chiudibile={election !== null}
  onsubmit={submit}
>
  {#snippet striscia()}
    <div class="giorno">
      <!-- L'etichetta si nasconde alla vista, non alla lettura: nella striscia
           l'altezza è spazio tolto alle ore che si stanno guardando, e il
           giorno è comunque scritto per esteso nell'intestazione del risultato.
           È la stessa scelta che fanno i campi dell'istante altrove. -->
      <label for="elezione-da" class:nascosto={!aperto}>Dal giorno</label>
      <div class="riga">
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
    </div>
  {/snippet}

  {#snippet dettagli()}
    <div class="campi">
      <!-- Due ricerche di località convivono in questa pagina, e questa non è
           una nascita: il luogo in cui si comincia qualcosa. -->
      <LocationSearch
        id="luogo-elezione"
        selected={location}
        onselect={selectLocation}
        label="Luogo"
      />

      <div class="filtri">
        <label for="elezione-reggitore">Reggitore</label>
        <select id="elezione-reggitore" bind:value={ruler}>
          <option value="">tutte le ore</option>
          {#each REGGITORI as pianeta (pianeta)}
            <option value={pianeta}>solo le ore di {BODY_LABEL[pianeta]}</option>
          {/each}
        </select>

        <!-- `interruttore` e non una classe di questa pagina: il testo è
             l'opzione stessa, e senza quella regola prende il trattamento da
             intestazione di campo — maiuscolo, grassetto, su due righe. -->
        <label class="interruttore">
          <input type="checkbox" bind:checked={skipMoonVoid} />
          Nascondi le ore con la Luna vuota di corso
        </label>
      </div>
    </div>

    <p class="nota">
      Il luogo qui è obbligatorio, e non ha alternative: le ore planetarie nascono da
      alba e tramonto, che cambiano con la latitudine e con il giorno dell'anno.
      Si vedono {GIORNI} giorni per volta.
    </p>

    <!-- Sotto una riga di separazione perché è un secondo argomento, non altri
         campi dello stesso: sopra si dice dove e quando, qui per chi. -->
    <section class="nascita">
      <h2>Tema di nascita <span class="facoltativo">facoltativo</span></h2>


      <BirthForm bind:value={birthStore.value}>
        {#snippet options()}
          <ChartSettings
            id="case-elezione"
            bind:houseSystem
            bind:minorAspects
            housesDisabled={birth.timeUnknown}
            onchange={() => {
              if (scelta) void scegli(scelta);
            }}
          />
        {/snippet}
      </BirthForm>
    </section>

    <button
      type="submit"
      class="invia"
      disabled={!canSubmit || loading}
      aria-describedby={mancanti.length > 0 ? 'mancanti-elezione' : undefined}
    >
      {loading ? 'Calcolo…' : 'Calcola le ore'}
    </button>
    <CampiMancanti campi={mancanti} id="mancanti-elezione" />
  {/snippet}
</ModuloPieghevole>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if election}
  <Risultato
    titolo={election.place.label ?? 'Ore planetarie'}
    meta="dal {election.range.from} al {election.range.to} · {election.range.timezone}"
    avvertenze={election.warnings}
  >
    <ElectionTable
      hours={election.hours}
      voids={election.voids}
      filters={election.filters}
      onselect={conNascita ? scegli : undefined}
      selected={scelta?.start ?? null}
    />

    <p class="suggerimento istruzione">
      {#if conNascita}
        Da «confronta» l'ora si apre come istante sul tema di nascita.
      {:else}
        Con una nascita nel modulo, ogni ora si può aprire sul tema di nascita.
      {/if}
    </p>
  </Risultato>
{/if}

{#if confrontoError}
  <p class="errore" role="alert">{confrontoError}</p>
{/if}

{#if loadingConfronto && !chart}
  <p class="attesa" aria-live="polite">Calcolo del confronto…</p>
{/if}

{#if scelta && chart && transits}
  <Risultato
    titolo="Ora di {BODY_LABEL[scelta.ruler]}, {scelta.diurnal
      ? 'diurna'
      : 'notturna'} {scelta.index}"
    avvertenze={transits.warnings}
    meta={condizioni(scelta, chart)}
    bind:elemento={confronto}
  >
    <div class="griglia">
      <div class="ruota">
        <ChartWheel {chart} {transits} {evidenza} bind:elemento={disegno} />
        <LegendaElementi />
        <StrumentiRuota svg={disegno} {evidenza}
          nome={['ora', BODY_LABEL[scelta.ruler], scelta.local.start.slice(0, 10)]}
        />
      </div>

      <div class="tabelle">
        <TransitAspectTable aspects={transits.aspects} {evidenza} />

        <BodyTable
          bodies={transits.transiting}
          title="Nell'ora scelta"
          houseTitle="Casa natale"
          {evidenza}
        />

        <BodyTable
          bodies={chart.bodies}
          partOfFortune={chart.partOfFortune}
          title="Tema di nascita"
          {evidenza}
        />

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
  </Risultato>
{/if}

<style>
  /* La nascita è un secondo argomento dentro lo stesso modulo, non altri campi
     del primo: la riga la separa da dove e quando, che stanno sopra. */
  .nascita {
    margin-top: 1.75rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--linea);
  }

  .nascita h2 {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin: 0 0 0.2rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: 1.1rem;
  }

  /* Scritto accanto al titolo e non solo nella nota: chi salta le note deve
     poter capire in un'occhiata che questo blocco si può lasciare vuoto. */
  .facoltativo {
    font-family: inherit;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--testo-tenue);
  }

  .nascita .nota {
    margin-bottom: 1.25rem;
  }

  .attesa {
    margin-top: 1.5rem;
    font-size: 0.85rem;
    color: var(--testo-tenue);
  }

  /* L'etichetta sta sopra il campo, come in ogni altro modulo del sito: a
     fianco andava a capo su due righe, ed era l'unica sezione a metterla lì.
     Le frecce restano invece accanto alla data, che è ciò che spostano. */
  .giorno .riga {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

  .filtri {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
</style>
