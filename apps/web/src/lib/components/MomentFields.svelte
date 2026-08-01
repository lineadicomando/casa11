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
  }

  let { value = $bindable(), what = '', id = 'momento', onstep }: Props = $props();

  const suffix = $derived(what ? ` ${what}` : '');

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

  /**
   * Il fuso in cui vanno letti i due campi.
   *
   * Va detto: è quello di chi guarda, e nei transiti non coincide con quello
   * di nascita. Senza scriverlo, «ore 9» sarebbe un'ora ambigua fra due
   * orologi.
   */
  const zona = $derived(value.timezone.replace('_', ' '));

  function adesso(): void {
    value = nowMoment();
    // Anche questo è un salto a un altro istante: due controlli accanto di cui
    // uno ricalcola e l'altro no sarebbero due gesti diversi senza dirlo.
    onstep?.();
  }
</script>

<div>
  <label for="{id}-data">Giorno{suffix}</label>
  <input id="{id}-data" type="date" bind:value={value.date} required />
  <p class="fuso">
    Ora di {zona} ·
    <button type="button" class="adesso" onclick={adesso}>adesso</button>
  </p>

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
</div>

<div>
  <label for="{id}-ora">Ora{suffix}</label>
  <input id="{id}-ora" type="time" bind:value={value.time} />
  {#if !value.time}
    <p class="fuso">Senza ora: mezzogiorno. Nella giornata si sposta solo la Luna.</p>
  {/if}
</div>

<style>
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

  .passo {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.5rem;
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
</style>
