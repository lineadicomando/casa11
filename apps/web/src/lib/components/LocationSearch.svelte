<script lang="ts">
  import type { Location } from '@dodicisegni/geo';
  import { untrack } from 'svelte';

  interface Props {
    selected: Location | null;
    onselect: (location: Location | null) => void;
    /**
     * Che luogo si sta cercando. Nel cielo di un istante non è una nascita
     * ma il punto da cui si guarda, ed è per giunta facoltativo.
     */
    label?: string;
    /**
     * L'identificatore del campo.
     *
     * L'elezione mostra due ricerche nella stessa pagina — il luogo in cui si
     * comincia qualcosa e quello di nascita — e con un identificatore solo
     * entrambe le etichette nominerebbero il primo campo.
     */
    id?: string;
  }

  let { selected, onselect, label = 'Luogo di nascita', id = 'luogo' }: Props = $props();

  /**
   * Il campo parte da ciò che è già scelto, se qualcosa lo è.
   *
   * Il testo digitato appartiene a questo componente, la località a chi lo
   * contiene: cambiando sezione ne nasce uno nuovo, e senza questa riga la
   * nascita che viene dalle altre pagine si presenterebbe come un campo vuoto
   * accanto a delle coordinate — cioè come qualcosa da riscrivere.
   *
   * Solo il valore iniziale, e `untrack` lo dichiara: dopo comanda ciò che si
   * digita, e una località che ripiombasse nel campo cancellerebbe la ricerca
   * in corso a metà parola.
   */
  let query = $state(untrack(() => (selected ? describe(selected) : '')));

  /**
   * Se qualcuno abbia mai scritto in questo campo.
   *
   * Distingue il campo vuoto perché non è stato ancora usato da quello svuotato
   * apposta. Senza, cancellare il testo lo farebbe ricomparire: `onInput`
   * azzera la selezione, ma fra la riga che svuota il campo e quella che la
   * azzera l'effetto qui sotto vedrebbe un campo vuoto e una località ancora
   * scelta, e lo riempirebbe di nuovo.
   */
  let toccato = false;

  /**
   * Una località che arriva da fuori riempie il campo, se il campo è ancora
   * intonso.
   *
   * Il valore iniziale non basta più: le pagine che si rimettono in piedi dal
   * proprio indirizzo hanno solo un numero, e per trasformarlo in un nome
   * devono chiederlo al server — quando la risposta arriva, questo componente
   * è montato da un pezzo. Senza questa riga il cielo si calcolava per Napoli
   * mostrando un campo del luogo vuoto, cioè dicendo il contrario.
   */
  $effect(() => {
    const scelto = selected;
    if (scelto && !toccato && untrack(() => query) === '') query = describe(scelto);
  });
  let results = $state<Location[]>([]);
  let open = $state(false);
  let loading = $state(false);
  let activeIndex = $state(-1);
  let errorMessage = $state<string | null>(null);

  let timer: ReturnType<typeof setTimeout> | undefined;

  // Nelle città-stato regione e città coincidono ("Berlino, Berlino"): si omette.
  function describe(location: Location): string {
    const parts = [location.name];
    if (location.region && location.region !== location.name) parts.push(location.region);
    parts.push(location.country);
    return parts.join(', ');
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
    toccato = true;
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
  <label for={id}>{label}</label>
  <input
    {id}
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
    aria-controls="risultati-{id}"
    aria-autocomplete="list"
    aria-activedescendant={open && activeIndex >= 0 ? `${id}-opzione-${activeIndex}` : undefined}
  />

  {#if loading}
    <span class="stato" aria-live="polite">cerco…</span>
  {:else if selected}
    <span class="stato scelto" aria-live="polite">
      {selected.timezone} · {selected.latitude.toFixed(2)}, {selected.longitude.toFixed(2)}
    </span>
  {/if}

  {#if open && results.length > 0}
    <!-- Le voci sono `<li role="option">` e basta.

         Prima ognuna conteneva un `<button>`, e nell'albero di accessibilità
         quello vinceva: sotto il `listbox` comparivano dei pulsanti, non delle
         opzioni, e l'elenco smetteva di essere un elenco fra cui scegliere.

         Il fuoco resta sul campo — è il modello della combobox — e quale voce
         sia in evidenza lo dice `aria-activedescendant` lassù, che senza queste
         `id` non avrebbe niente da nominare: le frecce muovevano l'evidenza
         senza che nessuno lo annunciasse.

         `onmousedown` e non `onclick` perché il `blur` del campo chiude
         l'elenco, e il clic arriverebbe su una voce già sparita. -->
    <ul id="risultati-{id}" class="risultati" role="listbox">
      {#each results as location, index (location.id)}
        <li
          id="{id}-opzione-{index}"
          role="option"
          aria-selected={index === activeIndex}
          class:attivo={index === activeIndex}
          onmousedown={() => choose(location)}
        >
          <span class="nome">{describe(location)}</span>
          <span class="dettaglio">{location.timezone}</span>
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
    /* I nomi italiani sono più lunghi degli esonimi internazionali
       ("Monaco di Baviera" contro "Munich"): l'elenco può sporgere dal campo
       invece di mandare a capo ogni voce. */
    min-width: 100%;
    width: max-content;
    max-width: min(30rem, 88vw);
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

  .risultati li {
    padding: 0.45rem 0.7rem;
    cursor: pointer;
  }

  .risultati li:hover,
  .risultati li.attivo {
    background: var(--accento-tenue);
  }

  .nome {
    display: block;
    font-size: 0.92rem;
    line-height: 1.3;
  }

  /* Il fuso orario sotto il nome, non accanto: è il dato che disambigua
     due omonimi, deve restare leggibile senza competere per lo spazio. */
  .dettaglio {
    display: block;
    font-size: 0.72rem;
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
