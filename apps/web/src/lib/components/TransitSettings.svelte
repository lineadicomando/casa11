<script lang="ts">
  import { nowTransitInput, type TransitInput } from '$lib/transit';

  interface Props {
    value: TransitInput;
  }

  let { value = $bindable() }: Props = $props();

  /**
   * Il fuso in cui vanno letti i due campi.
   *
   * Va detto: è quello di chi guarda, non quello di nascita, e non coincidono
   * per chi è nato altrove. Senza scriverlo, «ore 9» sarebbe un'ora e mezza
   * ambigua fra due orologi.
   */
  const zona = $derived(value.timezone.replace('_', ' '));

  function adesso(): void {
    value = nowTransitInput();
  }
</script>

<div>
  <label for="transito-data">Giorno del transito</label>
  <input id="transito-data" type="date" bind:value={value.date} required />
  <p class="fuso">
    Ora di {zona} ·
    <button type="button" class="adesso" onclick={adesso}>adesso</button>
  </p>
</div>

<div>
  <label for="transito-ora">Ora del transito</label>
  <input id="transito-ora" type="time" bind:value={value.time} />
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
</style>
