<!--
  Perché il pulsante di invio è spento.

  Da spento il pulsante si distingueva bene da acceso, ma restava muto: con tre
  campi obbligatori e il modulo che può essere chiuso, chi non capiva quale
  mancasse non aveva nessuna strada per scoprirlo.

  La riga sta sotto il pulsante e non accanto ai campi perché è al pulsante che
  risponde: la domanda nasce lì, quando non si preme.
-->
<script lang="ts">
  interface Props {
    /** I nomi per esteso, già in italiano: «la data di nascita», «il luogo». */
    campi: readonly string[];
    /** Per legarla al pulsante con `aria-describedby`. */
    id: string;
  }

  let { campi, id }: Props = $props();

  /**
   * L'elenco come lo direbbe una persona: virgole e una «e» prima dell'ultimo.
   *
   * `Intl.ListFormat` invece di unire a mano: la congiunzione, la virgola e la
   * spaziatura sono cose che le lingue fanno in modo diverso, e la lingua di
   * questo sito è dichiarata su `<html>` — tanto vale chiederlo a chi lo sa.
   */
  const elenco = $derived(
    new Intl.ListFormat('it', { style: 'long', type: 'conjunction' }).format(campi),
  );
</script>

{#if campi.length > 0}
  <!-- `aria-live` perché la riga cambia mentre si riempiono i campi, e chi non
       la vede deve accorgersi che è rimasta una cosa sola invece di tre. -->
  <p {id} class="mancanti" aria-live="polite">
    {campi.length === 1 ? 'Manca' : 'Mancano'}
    {elenco}.
  </p>
{/if}

<style>
  .mancanti {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--testo-tenue);
  }
</style>
