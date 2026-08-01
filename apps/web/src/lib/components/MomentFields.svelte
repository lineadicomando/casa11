<script lang="ts">
  import { nowMoment, type MomentInput } from '$lib/moment';

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
  }

  let { value = $bindable(), what = '', id = 'momento' }: Props = $props();

  const suffix = $derived(what ? ` ${what}` : '');

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
  }
</script>

<div>
  <label for="{id}-data">Giorno{suffix}</label>
  <input id="{id}-data" type="date" bind:value={value.date} required />
  <p class="fuso">
    Ora di {zona} ·
    <button type="button" class="adesso" onclick={adesso}>adesso</button>
  </p>
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
</style>
