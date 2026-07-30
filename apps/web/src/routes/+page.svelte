<script lang="ts">
  import type { HouseSystem, NatalChart } from '@undicesimacasa/core';
  import type { Location } from '@undicesimacasa/geo';
  import ChartWheel from '$lib/components/ChartWheel.svelte';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import {
    distanceKm,
    formatCoordinate,
    formatCoordinateDMS,
    parseCoordinate,
  } from '$lib/coordinates';
  import {
    ASPECT_GLYPH,
    ASPECT_MAJOR,
    BODY_GLYPH,
    POINT_GLYPH,
    SIGN_GLYPH,
    SIGN_LABEL,
    signOfLongitude,
  } from '$lib/glyphs';

  const HOUSE_SYSTEMS: { value: HouseSystem; label: string }[] = [
    { value: 'placidus', label: 'Placidus' },
    { value: 'koch', label: 'Koch' },
    { value: 'segni-interi', label: 'Segni interi' },
    { value: 'equale', label: 'Equale' },
    { value: 'regiomontano', label: 'Regiomontano' },
    { value: 'campano', label: 'Campano' },
    { value: 'porfirio', label: 'Porfirio' },
    { value: 'topocentrico', label: 'Topocentrico' },
    { value: 'alcabizio', label: 'Alcabizio' },
  ];

  let date = $state('');
  let time = $state('');
  let timeUnknown = $state(false);
  let location = $state<Location | null>(null);
  let houseSystem = $state<HouseSystem>('placidus');
  let minorAspects = $state(false);

  // Coordinate modificabili: la località resta la fonte del fuso orario, le
  // coordinate diventano correggibili. Chi conosce il punto esatto di nascita,
  // o vuole riprodurre il risultato di un altro programma, ne ha bisogno —
  // il centroide di una città può distare chilometri, e le case dipendono
  // dalle coordinate.
  let refineCoordinates = $state(false);
  let latitudeInput = $state('');
  let longitudeInput = $state('');

  const parsedLatitude = $derived(parseCoordinate(latitudeInput, 'latitudine'));
  const parsedLongitude = $derived(parseCoordinate(longitudeInput, 'longitudine'));
  const coordinatesValid = $derived(parsedLatitude !== null && parsedLongitude !== null);

  const displacementKm = $derived(
    location && coordinatesValid
      ? distanceKm(location.latitude, location.longitude, parsedLatitude!, parsedLongitude!)
      : 0,
  );

  function selectLocation(value: Location | null): void {
    location = value;
    // Le coordinate ripartono sempre da quelle della località scelta: lasciare
    // in campo quelle precedenti produrrebbe un tema con il fuso di una città
    // e le coordinate di un'altra.
    latitudeInput = value ? formatCoordinate(value.latitude) : '';
    longitudeInput = value ? formatCoordinate(value.longitude) : '';
  }

  function resetCoordinates(): void {
    if (!location) return;
    latitudeInput = formatCoordinate(location.latitude);
    longitudeInput = formatCoordinate(location.longitude);
  }

  let chart = $state<NatalChart | null>(null);
  let placeLabel = $state<string | null>(null);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  let highlighted = $state<string | null>(null);

  const canSubmit = $derived(
    date !== '' &&
      location !== null &&
      (timeUnknown || time !== '') &&
      (!refineCoordinates || coordinatesValid),
  );

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canSubmit || !location) return;

    loading = true;
    errorMessage = null;

    const parameters = new URLSearchParams({
      date,
      locationId: String(location.id),
      houseSystem,
      minorAspects: String(minorAspects),
    });
    if (!timeUnknown && time) parameters.set('time', time);
    if (refineCoordinates && coordinatesValid) {
      parameters.set('latitude', String(parsedLatitude));
      parameters.set('longitude', String(parsedLongitude));
    }

    try {
      const response = await fetch(`/api/chart?${parameters}`);
      const body = await response.json();

      if (!response.ok) {
        errorMessage = body.message ?? 'Calcolo non riuscito.';
        chart = null;
        return;
      }

      chart = body.chart as NatalChart;
      placeLabel = body.place?.label ?? null;
    } catch {
      errorMessage = 'Calcolo non riuscito: server non raggiungibile.';
      chart = null;
    } finally {
      loading = false;
    }
  }

  function formatDegrees(value: number): string {
    const degrees = Math.floor(value);
    const minutes = Math.round((value - degrees) * 60);
    return minutes === 60
      ? `${degrees + 1}°00'`
      : `${degrees}°${String(minutes).padStart(2, '0')}'`;
  }
</script>

<svelte:head>
  <title>Tema natale</title>
</svelte:head>

<form onsubmit={submit} class="modulo">
  <div class="campi">
    <div>
      <label for="data">Data di nascita</label>
      <input id="data" type="date" bind:value={date} required />
    </div>

    <div>
      <label for="ora">Ora di nascita</label>
      <input id="ora" type="time" bind:value={time} disabled={timeUnknown} required={!timeUnknown} />
      <label class="interruttore">
        <input type="checkbox" bind:checked={timeUnknown} />
        <span>Ora sconosciuta</span>
      </label>
    </div>

    <LocationSearch selected={location} onselect={selectLocation} />

    <div>
      <label for="case">Sistema di case</label>
      <select id="case" bind:value={houseSystem} disabled={timeUnknown}>
        {#each HOUSE_SYSTEMS as system (system.value)}
          <option value={system.value}>{system.label}</option>
        {/each}
      </select>
      <label class="interruttore">
        <input type="checkbox" bind:checked={minorAspects} />
        <span>Aspetti minori</span>
      </label>
    </div>
  </div>

  {#if location}
    <label class="interruttore coordinate-toggle">
      <input type="checkbox" bind:checked={refineCoordinates} />
      <span>Correggi le coordinate</span>
    </label>
  {/if}

  {#if location && refineCoordinates}
    <div class="coordinate">
      <div>
        <label for="lat">Latitudine</label>
        <input
          id="lat"
          type="text"
          bind:value={latitudeInput}
          class:non-valido={latitudeInput !== '' && parsedLatitude === null}
          placeholder="38.1333 oppure 38°08'N"
          inputmode="text"
          autocomplete="off"
        />
      </div>
      <div>
        <label for="lon">Longitudine</label>
        <input
          id="lon"
          type="text"
          bind:value={longitudeInput}
          class:non-valido={longitudeInput !== '' && parsedLongitude === null}
          placeholder="13.3333 oppure 13°20'E"
          inputmode="text"
          autocomplete="off"
        />
      </div>
      <div class="coordinate-stato">
        {#if !coordinatesValid}
          <p class="errore">
            Coordinate non interpretabili. Sono ammessi il formato decimale
            (38.1333, con punto o virgola) e quello sessagesimale (38°08'N).
            Longitudine positiva a Est.
          </p>
        {:else}
          <p>
            {formatCoordinateDMS(parsedLatitude!, 'latitudine')}
            {formatCoordinateDMS(parsedLongitude!, 'longitudine')}
            {#if displacementKm >= 0.05}
              · <strong class:lontano={displacementKm > 100}
                >{displacementKm < 10
                  ? displacementKm.toFixed(1)
                  : Math.round(displacementKm)} km</strong
              >
              da {location.name}
            {/if}
          </p>
          {#if displacementKm > 100}
            <p class="errore">
              Distanza molto elevata dalla località scelta: controlla il segno
              della longitudine (positiva a Est) e il fuso orario, che resta
              quello di {location.name}.
            </p>
          {/if}
          <button type="button" class="ripristina" onclick={resetCoordinates}>
            Ripristina quelle di {location.name}
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <button type="submit" class="invia" disabled={!canSubmit || loading}>
    {loading ? 'Calcolo…' : 'Calcola il tema'}
  </button>

  {#if timeUnknown}
    <p class="nota">
      Senza ora di nascita non è possibile determinare Ascendente e case: il tema conterrà
      solo le posizioni planetarie, calcolate a mezzogiorno locale. La Luna può spostarsi
      fino a 13 gradi nell'arco della giornata.
    </p>
  {/if}
</form>

{#if errorMessage}
  <p class="errore" role="alert">{errorMessage}</p>
{/if}

{#if chart}
  <section class="risultato">
    <div class="intestazione">
      <h2>{placeLabel ?? 'Tema natale'}</h2>
      <p class="meta">
        {chart.input.date}{chart.time.timeKnown ? ` · ${chart.input.time}` : ' · ora ignota'} ·
        {chart.input.timezone} · UT {chart.time.utc.replace('T', ' ').replace('Z', '')} ·
        TSL {chart.siderealTime.formatted}{chart.sect ? ` · carta ${chart.sect}` : ''} ·
        effemeridi {chart.ephemerisMode}
      </p>
    </div>

    {#if chart.warnings.length > 0}
      <div class="avvertenze">
        <h3>Avvertenze</h3>
        <ul>
          {#each chart.warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

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
        <section>
          <h3>Corpi</h3>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Corpo</th>
                <th>Posizione</th>
                <th class="numerico">Casa</th>
              </tr>
            </thead>
            <tbody>
              {#each chart.bodies as body (body.id)}
                <tr
                  onmouseenter={() => (highlighted = body.id)}
                  onmouseleave={() => (highlighted = null)}
                  class:evidenziato={highlighted === body.id}
                >
                  <td class="glifo">{BODY_GLYPH[body.id]}</td>
                  <td>{body.name}{body.retrograde ? ' ℞' : ''}</td>
                  <td>
                    {formatDegrees(body.signDegree)}
                    <span class="glifo-piccolo">{SIGN_GLYPH[body.sign]}</span>
                    <span class="tenue">{SIGN_LABEL[body.sign]}</span>
                  </td>
                  <td class="numerico">{body.house ?? '—'}</td>
                </tr>
              {/each}
              {#if chart.partOfFortune}
                <tr class="punto">
                  <td class="glifo">{POINT_GLYPH.fortuna}</td>
                  <td>Parte di Fortuna</td>
                  <td>
                    {formatDegrees(chart.partOfFortune.signDegree)}
                    <span class="glifo-piccolo">{SIGN_GLYPH[chart.partOfFortune.sign]}</span>
                    <span class="tenue">{SIGN_LABEL[chart.partOfFortune.sign]}</span>
                  </td>
                  <td class="numerico">{chart.partOfFortune.house ?? '—'}</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </section>

        {#if chart.angles}
          <section>
            <h3>Assi e cuspidi</h3>
            <div class="assi">
              {#each [['ASC', chart.angles.ascendant], ['MC', chart.angles.midheaven], ['DSC', chart.angles.descendant], ['IC', chart.angles.imumCoeli]] as const as [label, longitude] (label)}
                <div>
                  <span class="etichetta">{label}</span>
                  <span>{formatDegrees(longitude % 30)} {SIGN_GLYPH[signOfLongitude(longitude)]}</span>
                </div>
              {/each}
            </div>
            <table class="cuspidi">
              <tbody>
                {#each chart.houses as house (house.number)}
                  <tr>
                    <td class="numerico">{house.number}</td>
                    <td>
                      {formatDegrees(house.signDegree)}
                      <span class="glifo-piccolo">{SIGN_GLYPH[house.sign]}</span>
                      <span class="tenue">{SIGN_LABEL[house.sign]}</span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
        {/if}

        <section>
          <h3>Aspetti <span class="conteggio">{chart.aspects.length}</span></h3>
          {#if chart.aspects.length === 0}
            <p class="tenue">Nessun aspetto entro le orbite previste.</p>
          {:else}
            <table>
              <tbody>
                {#each chart.aspects as aspect, index (index)}
                  <tr
                    onmouseenter={() => (highlighted = aspect.from)}
                    onmouseleave={() => (highlighted = null)}
                    class:minore={!ASPECT_MAJOR[aspect.aspect]}
                  >
                    <td class="glifo-piccolo">{BODY_GLYPH[aspect.from]}</td>
                    <td class="glifo-piccolo">{ASPECT_GLYPH[aspect.aspect]}</td>
                    <td class="glifo-piccolo">{BODY_GLYPH[aspect.to]}</td>
                    <td>{aspect.aspect}</td>
                    <td class="numerico">{formatDegrees(aspect.orb)}</td>
                    <td class="tenue">{aspect.applying ? 'appl.' : 'sep.'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </section>
      </div>
    </div>
  </section>
{/if}


<style>
  .modulo {
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 1.5rem;
  }

  .campi {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 1.25rem;
    align-items: start;
  }

  .interruttore {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
    margin-bottom: 0;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
    font-size: 0.82rem;
  }

  .interruttore input {
    width: auto;
    margin: 0;
  }

  .coordinate-toggle {
    margin-top: 1.25rem;
  }

  .coordinate {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1rem;
    align-items: start;
    margin-top: 0.75rem;
    padding: 1rem;
    background: var(--sfondo);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
  }

  .coordinate-stato {
    font-size: 0.82rem;
    color: var(--testo-tenue);
    align-self: end;
  }

  .coordinate-stato p {
    margin: 0 0 0.35rem;
  }

  .coordinate-stato .lontano {
    color: var(--accento);
  }

  input.non-valido {
    border-color: var(--accento);
  }

  .ripristina {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.8rem;
    color: var(--accento);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
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

  .nota,
  .errore {
    margin: 1rem 0 0;
    font-size: 0.85rem;
    color: var(--testo-tenue);
  }

  .errore {
    color: var(--accento);
    font-weight: 500;
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

  .tabelle section + section {
    margin-top: 2rem;
  }

  .tabelle h3 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--testo-tenue);
    margin: 0 0 0.6rem;
  }

  .conteggio {
    color: var(--linea-forte);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.87rem;
  }

  th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--testo-tenue);
    font-weight: 600;
    padding-bottom: 0.3rem;
  }

  td {
    padding: 0.25rem 0.4rem 0.25rem 0;
    border-bottom: 1px solid var(--linea);
  }

  tbody tr {
    transition: background 0.12s ease;
  }

  tbody tr:hover,
  tbody tr.evidenziato {
    background: var(--accento-tenue);
  }

  tr.minore td {
    color: var(--testo-tenue);
  }

  /* La Parte di Fortuna non è un corpo celeste: la si distingue senza
     separarla dalla tabella, dove si legge insieme alle altre posizioni. */
  tr.punto td {
    border-top: 1px solid var(--linea-forte);
    font-style: italic;
  }

  .glifo {
    font-size: 1.15rem;
    width: 1.6rem;
  }

  .glifo-piccolo {
    font-size: 1rem;
  }

  .numerico {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .tenue {
    color: var(--testo-tenue);
  }

  .assi {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.87rem;
  }

  .assi .etichetta {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accento);
    letter-spacing: 0.04em;
  }

  .cuspidi td:first-child {
    width: 2rem;
    color: var(--testo-tenue);
  }
</style>
