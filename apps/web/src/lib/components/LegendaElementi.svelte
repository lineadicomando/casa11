<!--
  Che cosa vogliono dire i quattro colori della ruota.

  I settori sono colorati per elemento da sempre, ma il colore non si presenta:
  chi già sa che il rosso è fuoco lo legge, chi non lo sa vede una decorazione.
  Quattro parole sotto il disegno bastano a trasformarla in un dato.

  Non è la sola strada per arrivarci — l'elemento di un segno si ricava dal nome
  del segno, che nelle tabelle è scritto — e per questo il colore resta un
  rinforzo e non l'unico portatore dell'informazione.
-->
<script lang="ts">
  import { ELEMENT_COLOR, ELEMENT_ORDER } from '$lib/glyphs';
</script>

<ul class="legenda">
  {#each ELEMENT_ORDER as elemento (elemento)}
    <li>
      <span class="tacca" style:background={ELEMENT_COLOR[elemento]} aria-hidden="true"></span>
      {elemento}
    </li>
  {/each}
</ul>

<style>
  .legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 1rem;
    margin: 0.6rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.78rem;
    color: var(--testo-tenue);
  }

  .legenda li {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  /* Un quadratino e non un cerchio: nella ruota gli elementi sono settori, e
     una tacca piena richiama una superficie colorata meglio di un punto. */
  .tacca {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 0.15rem;
    /* La stessa trasparenza dei settori, o la legenda prometterebbe un colore
       molto più acceso di quello che si vede nel disegno. */
    opacity: 0.55;
  }
</style>
