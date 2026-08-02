<!--
  L'intestazione di ciò che è stato calcolato: che cosa si sta guardando, a
  quali condizioni, e che cosa il motore ha da ridire.

  Le cinque intestazioni delle quattro sezioni erano lo stesso markup e le
  stesse trenta righe di stile, ricopiate. Il titolo cambia, la riga sotto pure,
  ma la forma no: e la forma ricopiata è la forma che diverge.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Il luogo, di solito. È il solo dato che si legge da lontano. */
    titolo: string;
    /**
     * Quel che il motore non ha potuto fare per intero.
     *
     * Il fallimento qui è parziale per principio — un corpo non calcolabile
     * produce un avviso, non un errore — e questi avvisi vanno letti accanto al
     * risultato, non al posto suo.
     */
    avvertenze?: readonly string[];
    /**
     * Il nodo della sezione, per chi deve portarla in vista.
     *
     * Lo usa l'elezione: scegliere un'ora fa comparire un confronto più in
     * basso, e senza scendere non si vedrebbe che è successo qualcosa.
     */
    elemento?: HTMLElement | null;
    /**
     * La riga di condizioni sotto il titolo: data, fuso, effemeridi.
     *
     * Una stringa e non uno snippet, benché il markup sarebbe stato più comodo
     * da scrivere: uno snippet è una funzione, e dentro una funzione TypeScript
     * non sa più che il risultato esiste — l'`{#if}` che lo garantisce sta
     * fuori. Che poi qui sia sempre e solo testo lo conferma.
     */
    meta: string;
    children: Snippet;
  }

  let {
    titolo,
    avvertenze = [],
    elemento = $bindable(null),
    meta,
    children,
  }: Props = $props();
</script>

<section class="risultato" bind:this={elemento}>
  <div class="intestazione">
    <h2>{titolo}</h2>
    <!-- Un passo avanti o indietro cambia la pagina senza che nessuno l'abbia
         ricaricata: chi non la vede deve sentirsi dire almeno di che istante si
         tratta. Dove niente si muove da sé la regione non annuncia nulla,
         perché non cambia nulla. -->
    <p class="meta" aria-live="polite">{meta}</p>
  </div>

  {#if avvertenze.length > 0}
    <div class="avvertenze">
      <h3>Avvertenze</h3>
      <ul>
        {#each avvertenze as avvertenza (avvertenza)}
          <li>{avvertenza}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {@render children()}
</section>

<style>
  .risultato {
    margin-top: 2.5rem;
  }

  .intestazione h2 {
    font-family: var(--serif);
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
    font-family: var(--serif);
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .avvertenze ul {
    margin: 0;
    padding-left: 1.1rem;
  }
</style>
