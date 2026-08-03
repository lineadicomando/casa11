<!--
  Quanti punti cadono in ciascun elemento e in ciascuna modalità.

  Prende la distribuzione, non il tema: il cielo di un istante ne ha una uguale
  pur non essendo un tema, e legarla a `NatalChart` la renderebbe inutilizzabile
  lì — è la stessa regola delle altre tabelle.

  **Non c'è un totale**, e non è una dimenticanza. Sommare i gruppi vorrebbe
  dire scegliere una scuola — sette pianeti o dieci, con o senza i nodi, con o
  senza l'Ascendente — e presentarne il risultato come un fatto. Le righe stanno
  separate perché ciascuno sommi le sue.
-->
<script lang="ts">
  import type { Distribution, DistributionGroup } from '@undicesimacasa/core';
  import { ELEMENT_COLOR, ELEMENT_ORDER, MODALITY_ORDER } from '$lib/glyphs';

  interface Props {
    distribution: Distribution;
    title?: string;
  }

  let { distribution, title = 'Distribuzione' }: Props = $props();

  /**
   * I gruppi che hanno qualcosa dentro.
   *
   * Un tema senza ora non ha assi: una riga di zeri si leggerebbe come «nessun
   * asse in nessun elemento» invece che «non pervenuti», che è il contrario di
   * quello che è successo.
   */
  const righe = $derived(
    (
      [
        ['Pianeti', distribution.planets],
        ['Punti', distribution.points],
        ['Assi', distribution.angles],
      ] as [string, DistributionGroup][]
    ).filter(([, gruppo]) => gruppo.counted.length > 0),
  );
</script>

<section>
  <h3 class="titolo-sezione">{title}</h3>

  <table>
    <thead>
      <tr>
        <th></th>
        {#each ELEMENT_ORDER as elemento (elemento)}
          <!-- Il colore è quello dei settori della ruota: la tabella e il
               disegno parlano dello stesso elemento, e devono dirlo con lo
               stesso segno. Il nome resta scritto, perché il colore da solo
               non è un'informazione. -->
          <th class="numerico" style:color={ELEMENT_COLOR[elemento]}>{elemento}</th>
        {/each}
        {#each MODALITY_ORDER as modo, indice (modo)}
          <th class="numerico" class:stacco={indice === 0}>{modo}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each righe as [nome, gruppo] (nome)}
        <tr>
          <!-- Il titolo della riga porta nel `title` ciò che ha contato: è la
               risposta alla sola domanda che un conteggio del genere solleva,
               e per tre gruppi non vale una colonna in più. -->
          <td class="gruppo" title={gruppo.counted.join(', ')}>
            {nome}
            <span class="quanti">{gruppo.counted.length}</span>
          </td>
          {#each ELEMENT_ORDER as elemento (elemento)}
            <td class="numerico" class:zero={gruppo.elements[elemento] === 0}>
              {gruppo.elements[elemento]}
            </td>
          {/each}
          {#each MODALITY_ORDER as modo, indice (modo)}
            <td
              class="numerico"
              class:stacco={indice === 0}
              class:zero={gruppo.modalities[modo] === 0}
            >
              {gruppo.modalities[modo]}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  /* Una riga verticale sottile fra i due gruppi di colonne: sono due
     classificazioni indipendenti, e senza stacco si leggono come sette colonne
     di una cosa sola. */
  .stacco {
    border-left: 1px solid var(--linea);
    padding-left: 0.5rem;
  }

  .gruppo {
    white-space: nowrap;
  }

  /* Quanti punti sono stati contati in quella riga: è la somma della riga
     stessa, e serve a verificarla in un'occhiata. */
  .quanti {
    color: var(--testo-tenue);
    font-variant-numeric: tabular-nums;
  }

  /* Uno zero non è un valore da leggere, è l'assenza di valori: attenuandolo,
     i numeri che contano emergono da soli.

     Attenuato però resta un numero, e un numero va letto: prendeva
     `--linea-forte`, che è il colore di un bordo — 1,89:1 sulla superficie
     chiara, dove a un testo ne servono 4,5. `--testo-tenue` fa la stessa cosa
     al terzo di intensità giusto, ed è il colore che in tutto il resto del
     sito significa «secondario». */
  .zero {
    color: var(--testo-tenue);
  }
</style>
