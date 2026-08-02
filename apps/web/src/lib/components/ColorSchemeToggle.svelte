<script lang="ts">
  import { onMount } from 'svelte';
  import {
    applyColorScheme,
    nextColorScheme,
    readColorScheme,
    type ColorScheme,
  } from '$lib/color-scheme';

  const NOMI: Record<ColorScheme, string> = {
    auto: 'automatico',
    light: 'chiaro',
    dark: 'scuro',
  };

  /**
   * Un cerchio che si riempie invece di un sole e una luna: qui il Sole e la
   * Luna sono due pianeti con un glifo loro, e disegnarli nella testata
   * vorrebbe dire mostrare ☉ sopra una ruota dove ☉ vuol dire altro. Il
   * cerchio dice la stessa cosa — quanta luce ha la pagina — senza prendere in
   * prestito niente.
   */
  let scheme = $state<ColorScheme>('auto');

  // Il server non sa che aspetto abbia scelto chi arriva, quindi il markup
  // parte da `automatico`; l'attributo su `<html>` lo ha già messo lo script
  // in `app.html`, e qui si legge quello appena la pagina prende vita.
  onMount(() => {
    scheme = readColorScheme();
  });

  function cambia() {
    scheme = nextColorScheme(scheme);
    applyColorScheme(scheme);
  }
</script>

<!-- Senza testo visibile il nome del pulsante lo dà `aria-label`, e `title` lo
     ripete per chi ci passa sopra il mouse: un cerchio da solo dice che c'è
     una scelta, non quale sia. -->
<button
  type="button"
  class="aspetto"
  onclick={cambia}
  aria-label="Aspetto: {NOMI[scheme]}. Passa a {NOMI[nextColorScheme(scheme)]}."
  title="Aspetto: {NOMI[scheme]}"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {#if scheme === 'dark'}
      <circle cx="12" cy="12" r="9" fill="currentColor" />
    {:else if scheme === 'auto'}
      <!-- Mezzo cerchio: metà della luce del sistema, qualunque essa sia. -->
      <path d="M12 3 a9 9 0 0 1 0 18 z" fill="currentColor" />
    {/if}
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.75" />
  </svg>
</button>

<style>
  .aspetto {
    display: flex;
    align-items: center;
    background: none;
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 0.3rem;
    color: var(--testo-tenue);
    cursor: pointer;
  }

  .aspetto svg {
    display: block;
    width: 1.1rem;
    height: 1.1rem;
  }

  .aspetto:hover {
    color: var(--testo);
    border-color: var(--linea-forte);
  }
</style>
