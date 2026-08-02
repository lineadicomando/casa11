<script lang="ts">
  import type { Location } from '@undicesimacasa/geo';
  import type { Snippet } from 'svelte';
  import { resetCoordinates, type BirthInput } from '$lib/birth';
  import LocationSearch from '$lib/components/LocationSearch.svelte';
  import { distanceKm, formatCoordinateDMS, parseCoordinate } from '$lib/coordinates';

  interface Props {
    value: BirthInput;
    /**
     * Celle aggiuntive nella griglia dei campi.
     *
     * Ogni sezione ha opzioni proprie — il sistema di case per il tema, la
     * data per i transiti — ma tutte partono dalla stessa nascita. Uno
     * snippet le lascia entrare nella griglia senza che questo componente
     * debba conoscerle.
     */
    options?: Snippet;
  }

  let { value = $bindable(), options }: Props = $props();

  const parsedLatitude = $derived(parseCoordinate(value.latitude, 'latitudine'));
  const parsedLongitude = $derived(parseCoordinate(value.longitude, 'longitudine'));
  const coordinatesValid = $derived(parsedLatitude !== null && parsedLongitude !== null);

  const displacementKm = $derived(
    value.location && coordinatesValid
      ? distanceKm(
          value.location.latitude,
          value.location.longitude,
          parsedLatitude!,
          parsedLongitude!,
        )
      : 0,
  );

  function selectLocation(location: Location | null): void {
    value.location = location;
    // Le coordinate ripartono sempre da quelle della località scelta: lasciare
    // in campo quelle precedenti produrrebbe un tema con il fuso di una città
    // e le coordinate di un'altra.
    resetCoordinates(value);
  }
</script>

<div class="campi">
  <div>
    <label for="data">Data di nascita</label>
    <input id="data" type="date" bind:value={value.date} required />
  </div>

  <div>
    <label for="ora">Ora di nascita</label>
    <input
      id="ora"
      type="time"
      bind:value={value.time}
      disabled={value.timeUnknown}
      required={!value.timeUnknown}
    />
    <label class="interruttore">
      <input type="checkbox" bind:checked={value.timeUnknown} />
      <span>Ora sconosciuta</span>
    </label>
  </div>

  <LocationSearch selected={value.location} onselect={selectLocation} />

  {@render options?.()}
</div>

{#if value.location}
  <label class="interruttore coordinate-toggle">
    <input type="checkbox" bind:checked={value.refineCoordinates} />
    <span>Correggi le coordinate</span>
  </label>
{/if}

{#if value.location && value.refineCoordinates}
  <div class="coordinate">
    <div>
      <label for="lat">Latitudine</label>
      <input
        id="lat"
        type="text"
        bind:value={value.latitude}
        class:non-valido={value.latitude !== '' && parsedLatitude === null}
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
        bind:value={value.longitude}
        class:non-valido={value.longitude !== '' && parsedLongitude === null}
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
            da {value.location.name}
          {/if}
        </p>
        {#if displacementKm > 100}
          <p class="errore">
            Distanza molto elevata dalla località scelta: controlla il segno
            della longitudine (positiva a Est) e il fuso orario, che resta
            quello di {value.location.name}.
          </p>
        {/if}
        <button type="button" class="ripristina" onclick={() => resetCoordinates(value)}>
          Ripristina quelle di {value.location.name}
        </button>
      {/if}
    </div>
  </div>
{/if}

{#if value.timeUnknown}
  <p class="nota">
    Senza ora di nascita non è possibile determinare Ascendente e case: il tema conterrà
    solo le posizioni planetarie, calcolate a mezzogiorno locale. La Luna può spostarsi
    fino a 13 gradi nell'arco della giornata.
  </p>
{/if}

<style>
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
</style>
