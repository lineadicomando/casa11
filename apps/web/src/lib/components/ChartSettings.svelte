<script lang="ts">
  import type { AyanamsaId, HouseSystem, Zodiac } from '@undicesimacasa/core';
  import { HOUSE_SYSTEMS } from '$lib/house-systems';
  import { AYANAMSAS, ZODIACS } from '$lib/zodiacs';

  interface Props {
    houseSystem: HouseSystem;
    minorAspects: boolean;
    /**
     * Lo zodiaco, se in questa pagina c'è da sceglierlo.
     *
     * Facoltativo, e l'assenza è la scelta: l'elezione resta tropicale — le
     * ore planetarie non hanno zodiaco, e il vuoto di corso siderale non è una
     * tecnica di nessuno — quindi lì il menù non compare invece di comparire
     * spento.
     */
    zodiac?: Zodiac;
    /** Mostrato solo accanto allo zodiaco siderale. */
    ayanamsa?: AyanamsaId;
    /** Senza ora di nascita non ci sono case: il sistema non ha nulla da scegliere. */
    housesDisabled?: boolean;
    /**
     * L'identificatore del menù.
     *
     * La stessa pagina può mostrare queste opzioni due volte — dentro il
     * modulo e nella striscia che resta quando si chiude — e i dettagli
     * nascosti restano nel documento: due `id` uguali scollegherebbero
     * l'etichetta dal campo che nomina.
     */
    id?: string;
    /**
     * Che cosa fare quando un'opzione cambia.
     *
     * Senza, cambiarla aggiorna solo il modulo, e il risultato arriva quando
     * si preme «Calcola»: è il comportamento di chi sta ancora impostando.
     * Con, il cambiamento è la domanda stessa — è così che la striscia lascia
     * confrontare Placidus e Koch sullo stesso tema senza risalire la pagina.
     */
    onchange?: () => void;
    /**
     * La forma da striscia: i due controlli in riga, senza l'etichetta del menù.
     *
     * Le voci si nominano da sé, e nella striscia l'altezza è spazio tolto al
     * risultato che si sta guardando.
     */
    compact?: boolean;
  }

  let {
    houseSystem = $bindable(),
    minorAspects = $bindable(),
    zodiac = $bindable(),
    ayanamsa = $bindable(),
    housesDisabled = false,
    id = 'case',
    onchange,
    compact = false,
  }: Props = $props();
</script>

<div class:compatto={compact}>
  <!-- L'etichetta si nasconde alla vista, non alla lettura: senza, l'unica
       cosa che dice che cos'è questo menù sparirebbe anche per chi la pagina
       non la vede affatto. -->
  <label for={id} class:nascosto={compact}>Sistema di case</label>
  <select {id} bind:value={houseSystem} disabled={housesDisabled} onchange={() => onchange?.()}>
    {#each HOUSE_SYSTEMS as system (system.value)}
      <option value={system.value}>{system.label}</option>
    {/each}
  </select>
  {#if zodiac !== undefined}
    <label for="{id}-zodiaco" class:nascosto={compact}>Zodiaco</label>
    <select id="{id}-zodiaco" bind:value={zodiac} onchange={() => onchange?.()}>
      {#each ZODIACS as voce (voce.value)}
        <option value={voce.value}>{voce.label}</option>
      {/each}
    </select>
  {/if}

  <!-- L'ayanamsa compare solo dove serve. Nel tropicale non ce n'è uno, e un
       menù disattivato accanto a uno attivo si legge come una cosa che manca
       invece che come una che non esiste. -->
  {#if zodiac === 'siderale'}
    <label for="{id}-ayanamsa" class:nascosto={compact}>Ayanamsa</label>
    <select id="{id}-ayanamsa" bind:value={ayanamsa} onchange={() => onchange?.()}>
      {#each AYANAMSAS as voce (voce.value)}
        <option value={voce.value}>{voce.label}</option>
      {/each}
    </select>
  {/if}

  <label class="interruttore">
    <input type="checkbox" bind:checked={minorAspects} onchange={() => onchange?.()} />
    <span>Aspetti minori</span>
  </label>
</div>

<style>
  /* Nella striscia i due controlli dividono una riga con il pulsante dei
     dettagli: senza reclamare lo spazio libero si stringerebbero fino a
     mandare a capo il menù anche dove ci starebbe. */
  .compatto {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  /* I campi del modulo occupano tutta la riga; qui il menù prende la larghezza
     del nome più lungo e lascia il resto alla casella. */
  .compatto select {
    width: auto;
    padding: 0.3rem 0.5rem;
  }

  .compatto .interruttore {
    margin-top: 0;
  }
</style>
