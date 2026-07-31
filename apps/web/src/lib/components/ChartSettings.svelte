<script lang="ts">
  import type { HouseSystem } from '@undicesimacasa/core';

  const HOUSE_SYSTEMS: { value: HouseSystem; label: string }[] = [
    { value: 'placidus', label: 'Placidus' },
    { value: 'koch', label: 'Koch' },
    { value: 'segni-interi', label: 'Segni interi' },
    { value: 'equale', label: 'Equale' },
    { value: 'regiomontano', label: 'Regiomontano' },
    { value: 'campano', label: 'Campano' },
    { value: 'porfirio', label: 'Porfirio' },
    { value: 'topocentrico', label: 'Topocentrico' },
    { value: 'alcabizio', label: 'Alcabizio' },
  ];

  interface Props {
    houseSystem: HouseSystem;
    minorAspects: boolean;
    /** Senza ora di nascita non ci sono case: il sistema non ha nulla da scegliere. */
    housesDisabled?: boolean;
  }

  let {
    houseSystem = $bindable(),
    minorAspects = $bindable(),
    housesDisabled = false,
  }: Props = $props();
</script>

<div>
  <label for="case">Sistema di case</label>
  <select id="case" bind:value={houseSystem} disabled={housesDisabled}>
    {#each HOUSE_SYSTEMS as system (system.value)}
      <option value={system.value}>{system.label}</option>
    {/each}
  </select>
  <label class="interruttore">
    <input type="checkbox" bind:checked={minorAspects} />
    <span>Aspetti minori</span>
  </label>
</div>
