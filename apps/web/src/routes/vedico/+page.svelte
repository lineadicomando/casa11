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
  import { ayanamsaOrDefault, AYANAMSAS } from '$lib/zodiacs';

  /**
   * I varga che il motore calcola, con il nome da mostrare.
   *
   * Scelti per uso e non per completezza: gli altri dieci stanno in
   * `ROADMAP.md`, divisi in lotti.
   */
  const VARGHE: readonly { value: VargaId; label: string }[] = [
    { value: 'd1', label: 'D1 Rashi' },
    { value: 'd3', label: 'D3 Drekkana' },
    { value: 'd9', label: 'D9 Navamsa' },
    { value: 'd10', label: 'D10 Dasamsa' },
    { value: 'd12', label: 'D12 Dwadasamsa' },
    { value: 'd30', label: 'D30 Trimsamsa' },
  ];

  // La nascita è la stessa delle altre sezioni: chi l'ha scritta nel tema la
  // ritrova qui, e viceversa.
  const birth = $derived(birthStore.value);

  let ayanamsa = $state<AyanamsaId>('lahiri');
  let dashaLevels = $state<1 | 2 | 3>(2);
  let dashaYear = $state<DashaYear>('solare');
  // D-1 e D-9 accese: la carta rashi e il navamsa si leggono sempre insieme,
  // ed è la ragione per cui la seconda esiste.
  let vargas = $state<VargaId[]>(['d1', 'd9']);
  let stile = $state<StileQuadro>('sud');
  let drishtiNodes = $state<NodeDrishti>('nessuna');

  /**
   * Le condizioni con cui si chiede il tema, in un posto solo.
   *
   * Servono al calcolo e al prompt di lettura, e devono essere le stesse: un
   * prompt che descrivesse un tema diverso da quello a schermo sarebbe il
   * peggiore dei difetti, perché non si vede.
   */
  const opzioni = $derived({ ayanamsa, dashaLevels, dashaYear, vargas, drishtiNodes });

  let jyotisha = $state<JyotishaChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  const evidenza = new Evidenza();

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
      const body = await fetchJyotisha(jyotishaParameters(birth, opzioni));
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

  function commutaVarga(id: VargaId): void {
    // Almeno uno resta: una pagina senza nessuna carta divisionale non è più
    // pulita, è solo priva della cosa che si legge accanto al tema.
    const dopo = vargas.includes(id) ? vargas.filter((v) => v !== id) : [...vargas, id];
    if (dopo.length === 0) return;
    vargas = VARGHE.filter((v) => dopo.includes(v.value)).map((v) => v.value);
    void calcola();
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
  titolo="Astrologia vedica"
  descrizione="Tema secondo il Jyotisha: zodiaco siderale, nakshatra, dasha vimshottari, carte divisionali e drishti, calcolati con le effemeridi Swiss Ephemeris."
/>

<h1 class="nascosto">Astrologia vedica</h1>

<ModuloPieghevole
  bind:aperto
  etichetta="Nascita e opzioni"
  chiudibile={jyotisha !== null}
  onsubmit={submit}
>
  {#snippet dettagli()}
    <BirthForm bind:value={birthStore.value}>
      {#snippet options()}
        <div class="opzioni">
          <label for="ayanamsa">Ayanamsa</label>
          <select id="ayanamsa" bind:value={ayanamsa}>
            {#each AYANAMSAS as voce (voce.value)}
              <option value={voce.value}>{voce.label}</option>
            {/each}
          </select>

          <label for="livelli">Ordini di dasha</label>
          <select id="livelli" bind:value={dashaLevels}>
            <option value={1}>1 — nove periodi</option>
            <option value={2}>2 — ottantuno</option>
            <option value={3}>3 — settecentoventinove</option>
          </select>

          <label for="anno">Anno di dasha</label>
          <select id="anno" bind:value={dashaYear}>
            <option value="solare">Solare — 365,25 giorni</option>
            <option value="savana">Savana — 360 giorni</option>
          </select>

          <label for="nodi">Drishti di Rahu e Ketu</label>
          <select id="nodi" bind:value={drishtiNodes}>
            <option value="nessuna">Nessuna — forma classica</option>
            <option value="gioviana">Quinta, settima e nona — come Giove</option>
          </select>
        </div>
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
    <!-- Nessuna ruota: il Jyotisha si disegna quadrato, nord-indiano o
         sud-indiano, e la ruota di `packages/ruota` non è quel disegno. Meglio
         nessun disegno che uno sbagliato — sta in ROADMAP.md. -->
    <div class="colonne">
      <div class="tabelle">
        <StrumentiLettura
          sistema="jyotisha"
          tavola={() => fetchJyotishaCompact(jyotishaParameters(birth, opzioni))}
        />

        <BodyTable bodies={graha} {evidenza} title="Graha" houseTitle="Bhava" />

        <NakshatraTable nakshatras={jyotisha.nakshatras} bodies={jyotisha.chart.bodies} {evidenza} />

        <DashaTable dasha={jyotisha.dasha} {evidenza} />

        <section>
          <h3 class="titolo-sezione">Carte divisionali</h3>
          <div class="scelte">
            {#each VARGHE as varga (varga.value)}
              <label class="interruttore">
                <input
                  type="checkbox"
                  checked={vargas.includes(varga.value)}
                  onchange={() => commutaVarga(varga.value)}
                />
                <span>{varga.label}</span>
              </label>
            {/each}
          </div>

          <!-- Lo stile non si manda al server: è una scelta di sola resa, e
               cambiarla non ricalcola niente. I due quadri dicono la stessa
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
        </section>

        {#each jyotisha.vargas as varga (varga.varga)}
          <VargaTable {varga} {stile} {evidenza} />
        {/each}

        <DrishtiTable drishti={jyotisha.drishti} {evidenza} />
      </div>
    </div>
  </Risultato>
{/if}

<style>
  .opzioni {
    display: grid;
    gap: 0.35rem;
  }

  /* Una colonna sola, e con un tetto. Le altre sezioni hanno il disegno a
     sinistra a reggere la larghezza; qui non c'è, e una tabella di tre colonne
     stirata su millecento punti mette il numero della bhava a un palmo dal nome
     del graha. */
  .colonne {
    display: grid;
    gap: 1.5rem;
    max-width: 54rem;
  }

  .tabelle {
    display: grid;
    gap: 1.75rem;
    min-width: 0;
  }

  .scelte {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
  }

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

  .nota {
    margin: 0.5rem 0 0;
    max-width: 46rem;
    color: var(--testo-tenue);
    font-size: 0.85rem;
  }
</style>
