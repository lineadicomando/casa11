<script lang="ts">
  import type { Cielo } from '$lib/cielo.svelte';

  /**
   * Il pulsante che accende il cielo stellato dietro la pagina.
   *
   * Accanto a quello dell'aspetto, e prima di lui: sono due comandi della
   * stessa specie — cambiano come si vede il sito, non che cosa dice — e stanno
   * nell'ordine in cui pesano, l'ornamento prima della luce di tutta la pagina.
   *
   * Una stella e non un interruttore qualunque: dice da sola che cosa compare,
   * ed è l'unico glifo della testata che non appartenga già alla ruota — il
   * Sole e la Luna là dentro sono due pianeti, una stella a cinque punte no.
   */
  interface Props {
    cielo: Cielo;
  }

  let { cielo }: Props = $props();
</script>

<!-- Un interruttore, e lo dichiara: `aria-pressed` dice se il cielo è acceso,
     che è quello che il pieno del glifo mostra a chi lo guarda. -->
<button
  type="button"
  class="stellato"
  onclick={() => cielo.commuta()}
  aria-pressed={cielo.acceso}
  aria-label="Cielo stellato: {cielo.acceso ? 'acceso' : 'spento'}"
  title="Cielo stellato"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <!-- La stella a cinque punte, punta in alto. Le cinque punte stanno sul
         cerchio di raggio 9 del pulsante accanto — così i due glifi occupano
         lo stesso tondo — e i cinque rientri sul cerchio che il pentagono
         interno impone, cos 72° / cos 36° di quello, cioè 3,44: è l'unico
         raggio che tiene i lati dritti da una punta all'altra. -->
    <path
      d="M12 3 L14.02 9.22 L20.56 9.22 L15.27 13.06 L17.29 19.28 L12 15.44 L6.71 19.28 L8.73 13.06 L3.44 9.22 L9.98 9.22 Z"
      fill={cielo.acceso ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  /* Le stesse misure del pulsante dell'aspetto: due comandi appaiati che non
     combaciassero si vedrebbero subito. */
  .stellato {
    display: flex;
    align-items: center;
    background: none;
    border: 1px solid var(--linea);
    border-radius: var(--raggio);
    padding: 0.3rem;
    color: var(--testo-tenue);
    cursor: pointer;
  }

  .stellato svg {
    display: block;
    width: 1.1rem;
    height: 1.1rem;
  }

  .stellato:hover {
    color: var(--testo);
    border-color: var(--linea-forte);
  }

  /* Acceso il pulsante lo dice anche col colore: il pieno del glifo da solo, a
     1,1rem, è una differenza che si nota solo confrontandola con prima. */
  .stellato[aria-pressed='true'] {
    color: var(--accento);
    border-color: var(--accento);
  }
</style>
