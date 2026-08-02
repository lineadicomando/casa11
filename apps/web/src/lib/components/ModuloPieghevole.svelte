<!--
  Il riquadro dei campi, che si ritira quando ha finito il suo mestiere.

  Le quattro sezioni facevano tutte la stessa cosa e la scrivevano quattro
  volte: lo stato `aperto`, il ritorno in vista del modulo che si riapre, la
  striscia appesa in cima, il pulsante che cambia forma. Sessanta righe di CSS
  e quindici di codice per pagina, con le differenze che nascevano da sé —
  perché non c'era nessun posto in cui correggerle tutte insieme.
-->
<script lang="ts">
  import { tick, type Snippet } from 'svelte';

  interface Props {
    /** Se il modulo mostri anche il resto di sé, o solo la striscia. */
    aperto: boolean;
    /**
     * Il testo del pulsante quando il modulo è chiuso.
     *
     * Aperto il pulsante chiude, e una X lo dice da sé stando nell'angolo come
     * in una finestra; chiuso il mestiere è l'opposto e nessun simbolo lo
     * esprime, quindi solo il testo dice che cosa c'è dietro.
     */
    etichetta: string;
    /**
     * Se ci sia, sotto, qualcosa che il modulo chiuso lascerebbe vedere.
     *
     * Falso prima del primo calcolo: chiudersi lascerebbe una striscia appesa
     * sopra una pagina vuota, con dei controlli pronti a sfogliare il nulla.
     * Chiuso il pulsante c'è comunque, perché è la via per tornare ai campi.
     */
    chiudibile?: boolean;
    onsubmit: (event: SubmitEvent) => void;
    /**
     * La riga che resta visibile anche a modulo chiuso: l'istante da sfogliare,
     * le opzioni lungo cui il risultato si rilegge.
     *
     * Facoltativa. Il tema natale non ha nessun istante da offrire e aperto
     * comincia direttamente dai campi della nascita: là la striscia esiste solo
     * nella forma chiusa, e la pagina la passa soltanto allora.
     */
    striscia?: Snippet;
    /** Tutto il resto, che si ritira quando il modulo si chiude. */
    dettagli: Snippet;
  }

  let {
    aperto = $bindable(),
    etichetta,
    chiudibile = false,
    onsubmit,
    striscia,
    dettagli,
  }: Props = $props();

  let modulo = $state<HTMLFormElement | null>(null);

  async function commuta(): Promise<void> {
    aperto = !aperto;
    if (!aperto) return;

    // Aprendosi il modulo smette di stare appeso in cima e torna al suo posto
    // nella pagina: chi era sceso a leggere il risultato se lo vedrebbe sparire
    // verso l'alto proprio mentre chiede di modificarlo. Va aspettato
    // l'aggiornamento, però: finché è ancora appeso, portarlo in vista è
    // un'operazione che non sposta niente.
    await tick();
    modulo?.scrollIntoView({ block: 'start' });
  }
</script>

<!-- `novalidate` perché un modulo che si chiude porta con sé campi obbligatori
     che il browser non può né mostrare né mettere a fuoco: la completezza la sa
     già la pagina, che tiene spento il pulsante di invio. -->
<form {onsubmit} class="modulo" class:chiuso={!aperto} bind:this={modulo} novalidate>
  <!-- Due pulsanti e non uno che cambia: hanno due mestieri, e quindi due
       posti. La X è arredo del riquadro e sta fuori dal flusso; il testo è una
       voce della striscia e sta nella riga, in fondo. -->
  {#if aperto && chiudibile}
    <button
      type="button"
      class="commuta chiusura"
      aria-expanded="true"
      aria-label="Chiudi i dettagli"
      onclick={commuta}
    >
      ×
    </button>
  {/if}

  {#if striscia || !aperto}
    <div class="testa">
      {@render striscia?.()}

      {#if !aperto}
        <button type="button" class="commuta" aria-expanded="false" onclick={commuta}>
          {etichetta}
        </button>
      {/if}
    </div>
  {/if}

  <div class="dettagli" class:angolo={!striscia} hidden={!aperto}>
    {@render dettagli()}
  </div>
</form>

<style>
  .modulo {
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 1.5rem;
    /* Riferimento per la X, che sta nell'angolo del riquadro e non nella riga. */
    position: relative;
  }

  /* Chiuso, il modulo resta appeso in cima alla pagina: le frecce dell'istante
     e le opzioni del calcolo servono mentre si guarda il risultato, che
     comincia sotto la piega. Chiuderlo e basta avvicinerebbe il risultato senza
     togliere lo scorrimento. */
  .modulo.chiuso {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 0.7rem 1rem;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.09);
  }

  .testa {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
  }

  .modulo.chiuso .testa {
    align-items: center;
  }

  .testa + .dettagli {
    margin-top: 1.5rem;
  }

  .commuta {
    flex: none;
    padding: 0.35rem 0.8rem;
    background: none;
    color: var(--accento);
    border: 1px solid var(--linea-forte);
    border-radius: var(--raggio);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .commuta:hover {
    border-color: var(--accento);
  }

  .commuta.chiusura {
    position: absolute;
    top: 0.7rem;
    /* Lo stesso scostamento del padding della striscia: così il pulsante non si
       sposta di lato passando da una forma all'altra. */
    right: 1rem;
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    padding: 0;
    font-size: 1.2rem;
    line-height: 1;
    color: var(--testo-tenue);
    border-color: transparent;
  }

  .commuta.chiusura:hover {
    color: var(--accento);
    border-color: var(--linea-forte);
  }

  /* Aperto, la X occupa l'angolo senza stare in nessuna riga: quello che le
     passa sotto deve lasciarle il posto, o il primo campo le finirebbe
     dentro. È la striscia dove c'è, e i dettagli dove la striscia non c'è
     affatto — nel tema natale, che aperto comincia dai campi della nascita. */
  .modulo:not(.chiuso):has(.chiusura) :is(.testa, .dettagli.angolo) {
    padding-right: 2.5rem;
  }
</style>
