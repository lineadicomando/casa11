<script lang="ts">
  import { nowMoment, shiftMoment, type MomentInput, type StepUnit } from '$lib/moment';

  interface Props {
    value: MomentInput;
    /**
     * Di che istante si tratta. Le due sezioni lo chiamano diversamente — il
     * giorno *del transito*, il giorno e basta — e il campo deve dirlo, non
     * lasciarlo dedurre dalla pagina in cui ci si trova.
     */
    what?: string;
    /** Prefisso degli identificatori: due moduli nella stessa pagina non collidono. */
    id?: string;
    /**
     * Che cosa fare quando l'istante si sposta da sé.
     *
     * Senza, le frecce non compaiono affatto: un passo che non ricalcola
     * niente cambierebbe solo un numero nel modulo, e tanto varrebbe scriverlo
     * a mano. Non è un `$effect` sull'istante di proposito — scatterebbe anche
     * mentre si digita nel campo della data, una richiesta per tasto.
     */
    onstep?: () => void;
    /**
     * La forma da striscia: tutto su una riga sola, senza etichette né note.
     *
     * La usa il modulo chiuso, che resta appeso in cima alla pagina mentre si
     * sfoglia il risultato. Là l'altezza è lo spazio che si sta togliendo a
     * quello che si vuole guardare, e le etichette le sostituisce il contesto:
     * l'istante è scritto per esteso nell'intestazione del risultato.
     */
    compact?: boolean;
  }

  let {
    value = $bindable(),
    what = '',
    id = 'momento',
    onstep,
    compact = false,
  }: Props = $props();

  const suffix = $derived(what ? ` ${what}` : '');

  /**
   * Il fuso in cui vanno letti i due campi.
   *
   * Va detto: è quello di chi guarda, e nei transiti non coincide con quello
   * di nascita. Senza scriverlo, «ore 9» sarebbe un'ora ambigua fra due
   * orologi.
   */
  const zona = $derived(value.timezone.replace('_', ' '));

  /** Le ampiezze del passo, dalla più fine: è anche l'ordine del menù. */
  const PASSI: { unit: StepUnit; label: string; uno: string }[] = [
    { unit: 'day', label: 'giorno', uno: 'Un giorno' },
    { unit: 'week', label: 'settimana', uno: 'Una settimana' },
    { unit: 'month', label: 'mese', uno: 'Un mese' },
    { unit: 'year', label: 'anno', uno: 'Un anno' },
  ];

  let unit = $state<StepUnit>('day');

  const passo = $derived(PASSI.find((candidato) => candidato.unit === unit) ?? PASSI[0]);

  function step(amount: number): void {
    value = shiftMoment(value, unit, amount);
    onstep?.();
  }

  function adesso(): void {
    value = nowMoment();
    // Anche questo è un salto a un altro istante: due controlli accanto di cui
    // uno ricalcola e l'altro no sarebbero due gesti diversi senza dirlo.
    onstep?.();
  }
</script>

<div class="momento" class:compatto={compact}>
  <div class="campo">
    <!-- L'etichetta si nasconde alla vista, non alla lettura: togliendola,
         l'unica cosa che dice che cos'è questo campo sparirebbe anche per chi
         la pagina non la vede affatto. -->
    <label for="{id}-data" class:nascosto={compact}>Giorno{suffix}</label>
    <input id="{id}-data" type="date" bind:value={value.date} required />
    {#if !compact}
      <p class="fuso">
        Ora di {zona} ·
        <button type="button" class="adesso" onclick={adesso}>adesso</button>
      </p>
    {/if}
  </div>

  <div class="campo">
    <label for="{id}-ora" class:nascosto={compact}>Ora{suffix}</label>
    <input id="{id}-ora" type="time" bind:value={value.time} />
    {#if !compact && !value.time}
      <p class="fuso">Senza ora: mezzogiorno. Nella giornata si sposta solo la Luna.</p>
    {/if}
  </div>

  {#if onstep}
    <!-- I pulsanti sono `type="button"`: nei transiti il modulo è dentro un
         `<form>`, e senza dirlo un passo indietro manderebbe una richiesta. -->
    <div class="passo">
      <button
        type="button"
        class="freccia"
        aria-label="{passo.uno} indietro"
        onclick={() => step(-1)}>‹</button
      >

      <select bind:value={unit} aria-label="Ampiezza del passo">
        {#each PASSI as candidato (candidato.unit)}
          <option value={candidato.unit}>{candidato.label}</option>
        {/each}
      </select>

      <button
        type="button"
        class="freccia"
        aria-label="{passo.uno} avanti"
        onclick={() => step(1)}>›</button
      >
    </div>
  {/if}

  {#if compact}
    <button type="button" class="adesso" onclick={adesso}>adesso</button>
  {/if}
</div>

<style>
  .momento {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    /* Nella striscia divide la riga con il pulsante dei dettagli: senza
       reclamare lo spazio libero si stringerebbe fino a mandare a capo i due
       campi anche dove ci starebbero. */
    flex: 1 1 auto;
    min-width: 0;
  }

  .campo {
    flex: 1 1 12rem;
    min-width: 9rem;
  }

  .fuso {
    margin: 0.4rem 0 0;
    font-size: 0.78rem;
    color: var(--testo-tenue);
  }

  .adesso {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.78rem;
    color: var(--accento);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  /* A modulo aperto le frecce vanno a capo sotto i due campi: sulla riga
     starebbero strette fra la data e l'ora, e là sotto lo spazio c'è. */
  .passo {
    flex-basis: 100%;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  /* I campi del modulo occupano tutta la riga; qui invece i tre controlli
     stanno insieme, e il menù non deve spingere via le frecce. */
  .passo select {
    width: auto;
    padding: 0.2rem 0.4rem;
    font-size: 0.78rem;
    color: var(--testo-tenue);
  }

  .freccia {
    padding: 0.05rem 0.5rem;
    background: none;
    color: var(--accento);
    border: 1px solid var(--linea-forte);
    border-radius: var(--raggio);
    cursor: pointer;
    line-height: 1.3;
  }

  .freccia:hover {
    border-color: var(--accento);
  }

  .compatto {
    gap: 0.5rem;
    align-items: center;
  }

  .compatto .campo {
    flex: 0 0 auto;
    min-width: 0;
  }

  .compatto input {
    width: auto;
    padding: 0.3rem 0.5rem;
  }

  /* I tre controlli si allineano per stiramento e non per centro: il menù ha
     un'altezza propria che il solo incavo non pareggia, e in una riga di
     comandi tutti alti uguali sarebbe l'unico più basso. Così prende la misura
     delle frecce senza che nessuno debba scriverla in cifre. */
  .compatto .passo {
    flex-basis: auto;
    align-items: stretch;
  }

  /* Nella striscia i controlli del passo non stanno più sotto i campi ma in
     riga con loro e con il pulsante dei dettagli, e là un'altezza propria non
     si legge come una gerarchia: si legge come un dislivello. Prendono la
     misura del pulsante — stesso corpo, stesso incavo — e la riga torna una
     riga sola. La misura è quella di `.commuta` in `ModuloPieghevole`: se
     cambia là, cambia qui. */
  .compatto .passo select,
  .compatto .freccia,
  .compatto .adesso {
    padding: 0.35rem 0.8rem;
    font-size: 0.85rem;
    line-height: 1.55;
  }

  /* Le frecce sono i due controlli che si premono più spesso — sfogliare è il
     mestiere della striscia — e portano il segno più stretto di tutta la riga.
     La larghezza gliela dà un minimo e non l'incavo: il bersaglio deve essere
     più grande del glifo, e i due tasti larghi uguali fra loro anche se «‹» e
     «›» non misurano lo stesso. */
  .compatto .freccia {
    min-width: 2.5rem;
    padding-inline: 0.6rem;
  }

  /* Aperto, «adesso» è una parola in fondo alla nota del fuso, e il
     sottolineato la distingue dal testo intorno. Chiuso non ha più nessun
     testo intorno: è un comando in una riga di comandi, e lo dice stando come
     stanno gli altri. */
  .compatto .adesso {
    flex: none;
    border: 1px solid var(--linea-forte);
    border-radius: var(--raggio);
    text-decoration: none;
  }

  .compatto .adesso:hover {
    border-color: var(--accento);
  }
</style>
