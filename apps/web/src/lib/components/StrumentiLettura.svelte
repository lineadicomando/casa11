<!--
  Il tema, portato dove qualcuno lo interpreta.

  dodicisegni calcola e non interpreta — è il vincolo su cui il progetto è
  costruito, non una funzione mancante. Questo pulsante non lo aggira: copia i
  dati appena calcolati insieme alle istruzioni per leggerli, e chi li incolla
  sceglie il programma che glieli legge. Il sito non parla con nessun modello,
  non manda niente a nessuno e non ha una chiave da spendere.

  È anche la ragione per cui non c'è una chat qui dentro: una casella di testo
  su questa pagina significherebbe mandare data, ora e luogo di nascita a un
  fornitore terzo, e l'informativa dice che il browser di chi apre il sito non
  contatta nessun altro server.
-->
<script lang="ts">
  import { letturaDaIncollare, type Sistema } from '@dodicisegni/lettura';
  import { RequestError } from '$lib/api';
  import { REPOSITORY_URL } from '$lib/project';

  interface Props {
    /**
     * Come rileggere questo stesso tema in forma compatta.
     *
     * Una funzione che restituisce il testo, e non i parametri con cui
     * chiederlo: da quale rotta arrivi la tabella non è affare di questo
     * pulsante, che sa solo metterle davanti le istruzioni giuste.
     */
    tavola: () => Promise<string>;
    /**
     * Quale documento di istruzioni.
     *
     * Va insieme alla tavola e non si sceglie a parte: le istruzioni tropicali
     * su un tema vedico non danno un errore, danno un ibrido plausibile.
     */
    sistema?: Sistema;
  }

  let { tavola, sistema = 'tropicale' }: Props = $props();

  /** Quanto resta scritto «copiato», prima che il pulsante torni a offrirsi. */
  const CONFERMA = 2500;

  let copiato = $state(false);
  let inCorso = $state(false);
  let errore = $state<string | null>(null);
  /**
   * Il testo mostrato quando gli appunti si negano.
   *
   * Non è un ripiego teorico: `navigator.clipboard` non esiste fuori da un
   * contesto sicuro, e questa applicazione si installa anche su reti locali in
   * chiaro. Tremila caratteri non stanno in un messaggio d'errore, quindi
   * compaiono in un riquadro da selezionare a mano.
   */
  let ripiego = $state<string | null>(null);
  let orologio: ReturnType<typeof setTimeout> | undefined;

  async function copia(): Promise<void> {
    if (inCorso) return;
    inCorso = true;
    errore = null;
    ripiego = null;

    try {
      // L'indirizzo va passato: il pacchetto non ha modo di sapere da dove sia
      // servita la copia che sta girando, ed è quella che l'AGPL obbliga a
      // offrire.
      const testo = letturaDaIncollare(await tavola(), {
        sistema,
        repository: REPOSITORY_URL,
      });

      try {
        await navigator.clipboard.writeText(testo);
        copiato = true;
        clearTimeout(orologio);
        orologio = setTimeout(() => (copiato = false), CONFERMA);
      } catch {
        ripiego = testo;
      }
    } catch (cause) {
      errore = cause instanceof RequestError ? cause.message : 'Tema non riletto.';
    } finally {
      inCorso = false;
    }
  }
</script>

<section class="lettura">
  <h3>Prompt per un'AI</h3>

  <p>
    Copia un <strong>prompt già pronto</strong> (questo tema più le istruzioni
    per interpretarlo) da incollare in ChatGPT, Claude o un altro assistente:
    la lettura la scrive lui, sulle posizioni calcolate qui. Questa pagina non
    parla con nessuna AI: il prompt finisce negli appunti, e dove vada poi lo
    decidi tu.
  </p>

  <div class="strumenti">
    <button type="button" class="strumento" onclick={copia} disabled={inCorso} aria-live="polite">
      {#if inCorso}Preparo…{:else if copiato}Copiato{:else}Copia il prompt{/if}
    </button>
  </div>

  {#if errore}
    <p class="errore" role="alert">{errore}</p>
  {/if}

  {#if ripiego}
    <p class="suggerimento">
      Gli appunti non si sono lasciati scrivere: succede fuori da una connessione
      cifrata. Il testo è qui: selezionalo e copialo a mano.
    </p>
    <textarea readonly rows="8" aria-label="Il tema e le istruzioni, da copiare">{ripiego}</textarea>
  {/if}
</section>

<style>
  /* Apre la colonna dei dati, e per questo si tiene bassa di voce: è
     un'offerta, non il motivo per cui si è arrivati qui, e sotto ha le tabelle
     che sono la sostanza. La riga sotto la stacca dalla prima di loro — a
     distanziarle basterebbe lo spazio della colonna, ma senza un segno il
     blocco si legge come l'intestazione dei corpi. */
  .lettura {
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--linea);
  }

  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.95rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    max-width: 62ch;
    color: var(--testo-tenue);
    font-size: 0.85rem;
    line-height: 1.55;
  }

  p + p {
    margin-top: 0.6rem;
  }

  .strumenti {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  /* Lo stesso peso dei comandi della ruota: si fanno trovare, non notare. */
  .strumento {
    padding: 0.3rem 0.7rem;
    background: none;
    color: var(--testo-tenue);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    cursor: pointer;
    font-size: 0.78rem;
  }

  .strumento:hover:not(:disabled) {
    color: var(--accento);
    border-color: var(--linea-forte);
  }

  .strumento:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  textarea {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--sfondo);
    color: var(--testo);
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
  }

  /* Come per gli strumenti della ruota: la regola sta qui e non nel foglio di
     stampa globale, perché lo stile ristretto al componente è più specifico. */
  @media print {
    .lettura {
      display: none;
    }
  }
</style>
