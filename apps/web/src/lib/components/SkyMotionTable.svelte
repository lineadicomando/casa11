<script lang="ts">
  import type { SignIngress, Station } from '@dodicisegni/core';
  import { BODY_GLYPH, BODY_LABEL, SIGN_GLYPH, SIGN_LABEL } from '@dodicisegni/ruota';
  import { formatSignDegree } from '$lib/format';

  /**
   * Ingressi nei segni e stazioni, in un elenco solo.
   *
   * Stanno insieme perché sono la stessa cosa vista da due lati — che cosa fa
   * un corpo, non che cosa forma con un altro — e perché si spiegano a
   * vicenda: un pianeta che si ferma appena dentro un segno lo lascerà di
   * nuovo, e la sequenza si legge solo in ordine di tempo.
   */
  interface Props {
    ingresses: SignIngress[];
    stations: Station[];
    title?: string;
  }

  let { ingresses, stations, title = 'Ingressi e stazioni' }: Props = $props();

  interface Riga {
    local: string;
    body: SignIngress['body'];
    glifo: string;
    testo: string;
    retrograde: boolean;
  }

  const righe = $derived(
    [
      ...ingresses.map(
        (ingress): Riga => ({
          local: ingress.local,
          body: ingress.body,
          glifo: SIGN_GLYPH[ingress.sign],
          testo: ingress.retrograde
            ? `rientra in ${SIGN_LABEL[ingress.sign]}, all'indietro`
            : `entra in ${SIGN_LABEL[ingress.sign]}`,
          retrograde: ingress.retrograde,
        }),
      ),
      ...stations.map(
        (station): Riga => ({
          local: station.local,
          body: station.body,
          glifo: SIGN_GLYPH[station.sign],
          testo:
            station.direction === 'retrograda'
              ? `si ferma e retrograda a ${formatSignDegree(station.signDegree)} ${SIGN_LABEL[station.sign]}`
              : `riprende il moto diretto a ${formatSignDegree(station.signDegree)} ${SIGN_LABEL[station.sign]}`,
          retrograde: station.direction === 'retrograda',
        }),
      ),
    ].sort((a, b) => a.local.localeCompare(b.local)),
  );

  /** `2026-01-26T18:35+01:00` → `26 gen 2026, 18:35`. */
  function quando(local: string): string {
    return new Date(local).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<section>
  <h3 class="titolo-sezione">{title} <span class="conteggio">{righe.length}</span></h3>
  {#if righe.length === 0}
    <p class="tenue">Nessun ingresso e nessuna stazione in questo arco di tempo.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Quando</th>
          <th>Corpo</th>
          <th></th>
          <th>Cosa fa</th>
        </tr>
      </thead>
      <tbody>
        {#each righe as riga, index (index)}
          <tr>
            <td class="quando">{quando(riga.local)}</td>
            <td>
              <span class="glifo-piccolo">{BODY_GLYPH[riga.body]}</span>
              {BODY_LABEL[riga.body]}
            </td>
            <td class="glifo-piccolo">{riga.glifo}</td>
            <td class="tenue">{riga.testo}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  /* Il numero accanto al nome della sezione. Prendeva `--linea-forte`, che è
     il colore di un bordo: 1,89:1 sulla superficie chiara, illeggibile. Sta già
     dentro un titolo tenue, quindi non c'è un colore più debole da dargli — la
     subordinazione la fa il peso, che il titolo ha a 600 e lui no. */
  .conteggio {
    color: var(--testo-tenue);
    font-weight: 400;
  }

  .quando {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
</style>
