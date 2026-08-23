<script lang="ts">
  let { children } = $props();
</script>

<div class="prosa">
  {@render children()}
</div>

<style>
  /* Colonna di lettura stretta.
     Gli strumenti stanno bene sui 72rem del guscio; un testo corrente no —
     oltre le settanta battute per riga l'occhio fatica a ritrovare il capo
     successivo. Le regole qui sotto sono `:global` perché il testo lo rende
     la pagina figlia, non questo componente. */
  .prosa {
    max-width: 42rem;
  }

  .prosa :global(h1) {
    font-family: var(--serif);
    font-size: clamp(1.75rem, 4vw, 2.25rem);
    font-weight: 400;
    letter-spacing: -0.01em;
    margin: 0 0 0.35rem;
  }

  .prosa :global(h2) {
    font-family: var(--serif);
    font-size: 1.2rem;
    font-weight: 400;
    margin: 2.25rem 0 0.5rem;
  }

  /* Il terzo livello, che serve dove un capitolo ha delle parti — l'astrologia
     indiana ne ha cinque. Nel serif come gli altri due, ma della misura del
     testo: a distinguerlo basta lo stacco sopra, che è la metà di quello di un
     `h2` perché una parte non apre un capitolo, lo divide. */
  .prosa :global(h3) {
    font-family: var(--serif);
    font-size: 1rem;
    font-weight: 400;
    margin: 1.5rem 0 0.4rem;
  }

  .prosa :global(p),
  .prosa :global(li) {
    margin: 0 0 0.8rem;
  }

  .prosa :global(ul) {
    padding-left: 1.2rem;
  }

  .prosa :global(li) {
    margin-bottom: 0.4rem;
  }

  .prosa :global(.aggiornamento) {
    color: var(--testo-tenue);
    font-size: 0.85rem;
    margin-bottom: 2rem;
  }

  /* Il riquadro d'apertura: chi arriva qui vuole sapere in dieci secondi se
     il sito lo sta osservando. Il riassunto va letto per primo, e il resto
     della pagina serve a dimostrarlo. */
  .prosa :global(.sintesi) {
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 1.1rem 1.3rem 0.6rem;
    margin-bottom: 1rem;
  }

  .prosa :global(.sintesi ul) {
    margin: 0;
  }
</style>
