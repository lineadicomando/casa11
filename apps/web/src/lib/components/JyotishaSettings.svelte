<script lang="ts">
  import type { AyanamsaId, DashaYear, NodeDrishti, VargaId } from '@undicesimacasa/core';
  import { AYANAMSAS } from '$lib/zodiacs';

  /**
   * Le opzioni della sezione vedica, con la stessa forma di `ChartSettings`.
   *
   * Un componente e non un blocco dentro la pagina, per la stessa ragione di
   * quello: le stesse opzioni compaiono **due volte** — fra i campi del modulo
   * e nella striscia che resta quando lo si chiude — e due copie divergono.
   *
   * Zodiaco e case non ci sono, e non è una dimenticanza: siderale e segni
   * interi sono ciò che rende vedico un tema, non un predefinito da cambiare.
   * Restano le divergenze vere, quelle su cui le scuole non concordano.
   */
  interface Props {
    ayanamsa: AyanamsaId;
    dashaLevels: 1 | 2 | 3;
    dashaYear: DashaYear;
    drishtiNodes: NodeDrishti;
    /** Le carte divisionali da mostrare, oltre alla rashi che c'è sempre. */
    vargas: VargaId[];
    /**
     * Che cosa fare quando un'opzione cambia.
     *
     * Come in `ChartSettings`: senza, il cambiamento aspetta «Calcola»; con, è
     * la domanda stessa, ed è così che la striscia lascia confrontare due
     * ayanamsa sullo stesso tema senza risalire la pagina.
     */
    onchange?: () => void;
    /**
     * La forma da striscia: i menù in riga, senza le caselle dei varga.
     *
     * Cinque caselle in una riga che divide lo spazio col pulsante dei
     * dettagli manderebbero tutto a capo. Là si cambia una convenzione
     * guardando il risultato; quali carte mostrare si decide prima.
     */
    compact?: boolean;
  }

  let {
    ayanamsa = $bindable(),
    dashaLevels = $bindable(),
    dashaYear = $bindable(),
    drishtiNodes = $bindable(),
    vargas = $bindable(),
    onchange,
    compact = false,
  }: Props = $props();

  /**
   * Le divisionali che si possono chiedere, senza la D-1.
   *
   * La carta rashi non è un'opzione: è il tema, e sta nella colonna del
   * disegno. Offrirla anche qui ne farebbe comparire due uguali.
   */
  const VARGHE: readonly { value: VargaId; label: string }[] = [
    { value: 'd3', label: 'D3 Drekkana' },
    { value: 'd9', label: 'D9 Navamsa' },
    { value: 'd10', label: 'D10 Dasamsa' },
    { value: 'd12', label: 'D12 Dwadasamsa' },
    { value: 'd30', label: 'D30 Trimsamsa' },
  ];

  function commuta(id: VargaId): void {
    vargas = VARGHE.filter((varga) =>
      vargas.includes(varga.value) ? varga.value !== id : varga.value === id,
    ).map((varga) => varga.value);
    onchange?.();
  }
</script>

<div class:compatto={compact}>
  <label for="ayanamsa" class:nascosto={compact}>Ayanamsa</label>
  <select id="ayanamsa" bind:value={ayanamsa} onchange={() => onchange?.()}>
    {#each AYANAMSAS as voce (voce.value)}
      <option value={voce.value}>{voce.label}</option>
    {/each}
  </select>

  <label for="livelli" class:nascosto={compact}>Ordini di dasha</label>
  <select id="livelli" bind:value={dashaLevels} onchange={() => onchange?.()}>
    <option value={1}>Solo mahadasha</option>
    <option value={2}>Con antardasha</option>
    <option value={3}>Con pratyantardasha</option>
  </select>

  <label for="anno" class:nascosto={compact}>Anno di dasha</label>
  <select id="anno" bind:value={dashaYear} onchange={() => onchange?.()}>
    <option value="solare">Anno solare — 365,25 giorni</option>
    <option value="savana">Anno savana — 360 giorni</option>
  </select>

  <label for="nodi" class:nascosto={compact}>Drishti di Rahu e Ketu</label>
  <select id="nodi" bind:value={drishtiNodes} onchange={() => onchange?.()}>
    <option value="nessuna">Nodi senza sguardi</option>
    <option value="gioviana">Nodi come Giove</option>
  </select>

  {#if !compact}
    <fieldset>
      <legend>Carte divisionali</legend>
      <div class="scelte">
        {#each VARGHE as varga (varga.value)}
          <label class="interruttore">
            <input
              type="checkbox"
              checked={vargas.includes(varga.value)}
              onchange={() => commuta(varga.value)}
            />
            <span>{varga.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>
  {/if}
</div>

<style>
  /* Come nella striscia della ruota: i menù dividono una riga con il pulsante
     dei dettagli, e senza reclamare lo spazio libero si stringerebbero fino a
     mandare a capo anche dove ci starebbero. */
  .compatto {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .compatto select {
    width: auto;
    padding: 0.3rem 0.5rem;
  }

  fieldset {
    margin: 0.9rem 0 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
    margin-bottom: 0.35rem;
    color: var(--testo-tenue);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .scelte {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
  }
</style>
