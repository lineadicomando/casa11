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
   * Una parola invece di un sole e una luna: qui il Sole e la Luna sono due
   * pianeti con un glifo loro, e riusarli per l'aspetto della pagina
   * significherebbe scrivere ☉ accanto a una ruota dove ☉ vuol dire altro.
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

<button
  type="button"
  class="aspetto"
  onclick={cambia}
  aria-label="Aspetto: {NOMI[scheme]}. Passa a {NOMI[nextColorScheme(scheme)]}."
>
  Aspetto: {NOMI[scheme]}
</button>

<style>
  .aspetto {
    background: none;
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 0.2rem 0.55rem;
    font-size: 0.8rem;
    color: var(--testo-tenue);
    cursor: pointer;
    /* Le tre parole hanno lunghezze diverse: senza una larghezza minima il
       bordo si restringe a ogni scatto e la testata sobbalza. */
    min-width: 9.5rem;
    text-align: center;
    white-space: nowrap;
  }

  .aspetto:hover {
    color: var(--testo);
    border-color: var(--linea-forte);
  }
</style>
