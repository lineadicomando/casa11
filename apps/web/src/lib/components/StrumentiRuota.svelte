<!--
  Che cosa fare della ruota oltre che guardarla.

  Un tema natale non finisce nella scheda in cui è stato calcolato: si stampa,
  si allega, si tiene. Il disegno è già un SVG e la pagina è già impaginabile —
  quello che mancava era il modo di chiederlo.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { comePng, nomeFile, scarica, serializza } from '$lib/esporta';
  import type { Evidenza } from '$lib/evidenza.svelte';

  interface Props {
    /** Il disegno da portare via. Manca finché il componente non è montato. */
    svg: SVGSVGElement | null;
    /**
     * Di che cosa è la ruota, per il nome del file: «tema», il luogo, la data.
     * `nomeFile` le ripulisce e le unisce.
     */
    nome: readonly (string | null | undefined)[];
    /** La selezione in corso, che va tolta prima di portare via il disegno. */
    evidenza: Evidenza;
    /**
     * I parametri con cui rifare questo calcolo, per chi vuole il collegamento.
     *
     * Solo dove c'è: il cielo e l'elezione tengono già l'indirizzo aggiornato
     * da sé, e là il collegamento è quello nella barra del browser. Qui invece
     * l'indirizzo resta pulito — dentro c'è una data di nascita, e va scritta
     * solo se qualcuno lo chiede.
     */
    link?: () => URLSearchParams;
  }

  let { svg, nome, evidenza, link }: Props = $props();

  /** Quanto resta scritto «copiato», prima di tornare a offrirsi. */
  const CONFERMA = 2500;
  let copiato = $state(false);
  let orologio: ReturnType<typeof setTimeout> | undefined;

  async function copiaLink(): Promise<void> {
    if (!link) return;
    errore = null;
    const indirizzo = `${window.location.origin}${window.location.pathname}?${link()}`;

    try {
      await navigator.clipboard.writeText(indirizzo);
      copiato = true;
      clearTimeout(orologio);
      orologio = setTimeout(() => (copiato = false), CONFERMA);
    } catch {
      // Gli appunti si negano da soli su una connessione non cifrata, e negarsi
      // in silenzio lascerebbe credere che il collegamento sia stato copiato.
      errore = "Gli appunti non si sono lasciati scrivere: l'indirizzo è " + indirizzo;
    }
  }

  /**
   * La carta intera, non quella che si sta esaminando.
   *
   * Con un corpo scelto la ruota mostra i soli aspetti che lo toccano e attenua
   * tutti gli altri glifi: è quello che serve mentre si guarda, e non è quello
   * che serve in un file. Peggio — le linee escluse non sono attenuate, non
   * sono disegnate affatto, e nel disegno salvato mancherebbero senza che nulla
   * lo dica. Un documento non è la fotografia di come lo si stava leggendo.
   *
   * La selezione si vede sparire, ed è giusto così: dice che cosa è stato
   * salvato.
   */
  async function conCartaIntera<T>(azione: () => T | Promise<T>): Promise<T> {
    evidenza.libera();
    await tick();
    return await azione();
  }

  // Vale anche per chi stampa con la scorciatoia, senza passare da qui.
  $effect(() => {
    const libera = () => evidenza.libera();
    window.addEventListener('beforeprint', libera);
    return () => window.removeEventListener('beforeprint', libera);
  });

  let errore = $state<string | null>(null);
  /** Il PNG passa da un caricamento e da una tela: non è istantaneo. */
  let inCorso = $state(false);

  const base = $derived(nomeFile(nome));

  async function salvaSvg(): Promise<void> {
    if (!svg) return;
    errore = null;
    try {
      await conCartaIntera(() =>
        scarica(new Blob([serializza(svg!)], { type: 'image/svg+xml' }), `${base}.svg`),
      );
    } catch {
      errore = 'Il disegno non si è lasciato salvare.';
    }
  }

  async function salvaPng(): Promise<void> {
    if (!svg || inCorso) return;
    errore = null;
    inCorso = true;
    try {
      scarica(await conCartaIntera(() => comePng(svg!)), `${base}.png`);
    } catch {
      errore = 'Il disegno non si è lasciato convertire in immagine.';
    } finally {
      inCorso = false;
    }
  }
</script>

<!-- `strumenti` è anche la classe che il foglio di stampa nasconde: su carta
     non c'è niente da premere. -->
<div class="strumenti">
  <button type="button" class="strumento" onclick={salvaSvg} disabled={!svg}>
    Scarica SVG
  </button>
  <button type="button" class="strumento" onclick={salvaPng} disabled={!svg || inCorso}>
    {inCorso ? 'Converto…' : 'Scarica PNG'}
  </button>
  <!-- La stampa il browser la sa già fare, e chi la conosce usa la scorciatoia:
       questo pulsante è per chi non sa che questa pagina è fatta per finirci. -->
  <button type="button" class="strumento" onclick={() => window.print()}>Stampa</button>

  {#if link}
    <!-- `aria-live` sul pulsante stesso: la conferma è il pulsante che cambia
         parola, e chi non la vede deve sentirsi dire che è successo qualcosa. -->
    <button type="button" class="strumento" onclick={copiaLink} aria-live="polite">
      {copiato ? 'Copiato' : 'Copia link'}
    </button>
  {/if}
</div>

{#if link}
  <p class="suggerimento istruzione">
    Il collegamento porta con sé la data e il luogo di nascita: finiscono nella
    cronologia di chi lo apre e nei registri dei server che attraversa. È per questo
    che l'indirizzo di questa pagina resta pulito finché non lo si chiede.
  </p>
{/if}

{#if errore}
  <p class="errore" role="alert">{errore}</p>
{/if}

<style>
  .strumenti {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  /* Più leggeri del comando secondario: non chiedono nessun calcolo e non sono
     il motivo per cui si è arrivati qui — si fanno trovare, non notare. */
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

  /* La regola sta qui e non nel foglio di stampa in `app.css` perché lo stile
     con cui Svelte restringe un componente al suo markup è più specifico di un
     selettore globale: da fuori, `display: none` perdeva contro il `flex` qui
     sopra e la barra finiva stampata. */
  @media print {
    .strumenti {
      display: none;
    }
  }
</style>
