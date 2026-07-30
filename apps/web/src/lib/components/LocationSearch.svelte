<script lang="ts">
  import type { Location } from '@undicesimacasa/geo';

  interface Props {
    selected: Location | null;
    onselect: (location: Location | null) => void;
  }

  let { selected, onselect }: Props = $props();

  let query = $state('');
  let results = $state<Location[]>([]);
  let open = $state(false);
  let loading = $state(false);
  let activeIndex = $state(-1);
  let errorMessage = $state<string | null>(null);

  let timer: ReturnType<typeof setTimeout> | undefined;

  function describe(location: Location): string {
    return [location.name, location.region, location.country].filter(Boolean).join(', ');
  }

  async function search(text: string): Promise<void> {
    if (text.trim().length < 2) {
      results = [];
      open = false;
      return;
    }

    loading = true;
    errorMessage = null;
    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(text)}&limit=8`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        errorMessage = body.message ?? 'Ricerca non riuscita.';
        results = [];
        return;
      }
      const body = (await response.json()) as { results: Location[] };
      results = body.results;
      open = true;
      activeIndex = -1;
    } catch {
      errorMessage = 'Ricerca non riuscita: server non raggiungibile.';
      results = [];
    } finally {
      loading = false;
    }
  }

  function onInput(event: Event): void {
    query = (event.target as HTMLInputElement).value;
    // La selezione decade appena il testo cambia: evita che il tema venga
    // calcolato per un luogo diverso da quello che si legge nel campo.
    if (selected) onselect(null);

    clearTimeout(timer);
    timer = setTimeout(() => void search(query), 220);
  }

  function choose(location: Location): void {
    onselect(location);
    query = describe(location);
    open = false;
    activeIndex = -1;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!open || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % results.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]!);
    } else if (event.key === 'Escape') {
      open = false;
    }
  }
</script>

<div class="combo">
  <label for="luogo">Luogo di nascita</label>
  <input
    id="luogo"
    type="text"
    value={query}
    oninput={onInput}
    onkeydown={onKeydown}
    onblur={() => setTimeout(() => (open = false), 120)}
    onfocus={() => results.length > 0 && (open = true)}
    placeholder="Napoli, Zurigo, Monaco di Baviera…"
    autocomplete="off"
    role="combobox"
    aria-expanded={open}
    aria-controls="risultati-luogo"
    aria-autocomplete="list"
  />

  {#if loading}
    <span class="stato" aria-live="polite">cerco…</span>
  {:else if selected}
    <span class="stato scelto" aria-live="polite">
      {selected.timezone} · {selected.latitude.toFixed(2)}, {selected.longitude.toFixed(2)}
    </span>
  {/if}

  {#if open && results.length > 0}
    <ul id="risultati-luogo" class="risultati" role="listbox">
      {#each results as location, index (location.id)}
        <li role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            class:attivo={index === activeIndex}
            onmousedown={() => choose(location)}
          >
            <span class="nome">{describe(location)}</span>
            <span class="dettaglio">{location.timezone}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if errorMessage}
    <p class="errore">{errorMessage}</p>
  {:else if query.trim().length >= 2 && !loading && results.length === 0 && !selected}
    <p class="vuoto">
      Nessun risultato. Il dataset copre i centri con più di 500 abitanti: prova con il
      comune invece della frazione.
    </p>
  {/if}
</div>

<style>
  .combo {
    position: relative;
  }

  .stato {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.78rem;
    color: var(--testo-tenue);
  }

  .stato.scelto {
    color: var(--accento);
  }

  .risultati {
    position: absolute;
    z-index: 10;
    top: 100%;
    left: 0;
    right: 0;
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
    background: var(--superficie);
    border: 1px solid var(--linea-forte);
    border-radius: var(--raggio);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.09);
    max-height: 17rem;
    overflow-y: auto;
  }

  .risultati button {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    width: 100%;
    padding: 0.5rem 0.7rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
  }

  .risultati button:hover,
  .risultati button.attivo {
    background: var(--accento-tenue);
  }

  .nome {
    font-size: 0.92rem;
  }

  .dettaglio {
    font-size: 0.75rem;
    color: var(--testo-tenue);
    white-space: nowrap;
  }

  .errore,
  .vuoto {
    margin: 0.4rem 0 0;
    font-size: 0.8rem;
    color: var(--testo-tenue);
  }

  .errore {
    color: var(--accento);
  }
</style>
