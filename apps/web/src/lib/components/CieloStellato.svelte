<script lang="ts">
  import { onMount } from 'svelte';
  import {
    TAVOLOZZE,
    avvolgi,
    deriva,
    disponiFigure,
    luce,
    quanteStelle,
    seminaStelle,
    sorteggio,
    tinta,
    type Figura,
    type Stella,
    type Tavolozza,
  } from '$lib/cielo';
  import type { Cielo } from '$lib/cielo.svelte';
  import {
    COLOR_SCHEME_ATTRIBUTE,
    readColorScheme,
    resolveColorScheme,
    type ColorScheme,
  } from '$lib/color-scheme';

  /**
   * Il fondale: un `canvas` fisso dietro tutta la pagina, che il pulsante
   * della stella nella testata accende e spegne.
   *
   * Un `canvas` e non un SVG animato: le stelle sono qualche centinaio e
   * cambiano trasparenza a ogni fotogramma, e altrettanti nodi del documento da
   * ritoccare sessanta volte al secondo costerebbero molto più che ridisegnare
   * dei cerchi. Del disegno, qui, c'è solo il pennello — la geometria sta in
   * `lib/cielo.ts`, dove si può provare senza un browser.
   */
  interface Props {
    cielo: Cielo;
  }

  let { cielo }: Props = $props();

  let tela = $state<HTMLCanvasElement | null>(null);
  let larghezza = $state(0);
  let altezza = $state(0);
  let scelta = $state<ColorScheme>('auto');
  let sistemaScuro = $state(false);
  /** Chi ha chiesto meno movimento: il cielo c'è, ma sta fermo. */
  let immobile = $state(false);

  const aspetto = $derived(resolveColorScheme(scelta, sistemaScuro));

  // Il seme non cambia mai dentro una visita: ricalcolare la disposizione a
  // ogni ridimensionamento è inevitabile — le celle dipendono dallo schermo —
  // ma con lo stesso seme le costellazioni restano quelle di prima invece di
  // saltare da un angolo all'altro mentre si trascina la finestra.
  const seme = Math.floor(Math.random() * 2 ** 31);

  let stelle: Stella[] = [];
  let figure: Figura[] = [];
  /** Su che misure sono state seminate: sotto, non vale la pena rifare tutto. */
  let seminate = { larghezza: 0, altezza: 0 };

  onMount(() => {
    scelta = readColorScheme();

    const notte = window.matchMedia('(prefers-color-scheme: dark)');
    const quiete = window.matchMedia('(prefers-reduced-motion: reduce)');
    sistemaScuro = notte.matches;
    immobile = quiete.matches;

    const seguiNotte = () => (sistemaScuro = notte.matches);
    const seguiQuiete = () => (immobile = quiete.matches);
    notte.addEventListener('change', seguiNotte);
    quiete.addEventListener('change', seguiQuiete);

    // Il pulsante scrive sull'attributo di `<html>`, non qui: è da lì che si
    // viene a sapere che la luce è cambiata.
    const osservatore = new MutationObserver(() => (scelta = readColorScheme()));
    osservatore.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [COLOR_SCHEME_ATTRIBUTE],
    });

    return () => {
      notte.removeEventListener('change', seguiNotte);
      quiete.removeEventListener('change', seguiQuiete);
      osservatore.disconnect();
    };
  });

  /**
   * Semina il cielo, se le misure sono cambiate abbastanza da meritarlo.
   *
   * La soglia esiste per i telefoni: la barra dell'indirizzo che si ritira
   * mentre si scorre cambia l'altezza della finestra di qualche decina di
   * pixel, e senza soglia il cielo si rifarebbe da capo a ogni scorrimento.
   */
  function semina(): void {
    const cambiata =
      Math.abs(seminate.larghezza - larghezza) > 48 || Math.abs(seminate.altezza - altezza) > 96;
    if (!cambiata && stelle.length > 0) return;

    const caso = sorteggio(seme);
    stelle = seminaStelle(quanteStelle(larghezza, altezza), caso);
    figure = disponiFigure(larghezza, altezza, caso);
    seminate = { larghezza, altezza };
  }

  function dipingi(ctx: CanvasRenderingContext2D, tavolozza: Tavolozza, secondi: number): void {
    const forza = tavolozza.intensita;
    ctx.clearRect(0, 0, larghezza, altezza);

    const sfumatura = ctx.createLinearGradient(0, 0, 0, altezza);
    sfumatura.addColorStop(0, tinta(tavolozza.cieloAlto, 1));
    sfumatura.addColorStop(1, tinta(tavolozza.cieloBasso, 1));
    ctx.fillStyle = sfumatura;
    ctx.fillRect(0, 0, larghezza, altezza);

    const scorso = deriva(secondi);

    for (const stella of stelle) {
      const x = avvolgi(stella.x - scorso, 0, 1) * larghezza;
      const y = stella.y * altezza;
      ctx.fillStyle = tinta(tavolozza.stella, luce(stella, secondi) * forza);
      ctx.beginPath();
      ctx.arc(x, y, stella.raggio, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 1;
    for (const figura of figure) {
      // Il riquadro esce tutto da sinistra prima di rientrare da destra: una
      // figura tagliata a metà su un bordo sembrerebbe un errore di disegno.
      const x = avvolgi(figura.x - scorso * larghezza, -figura.lato, larghezza + figura.lato);
      const punto = (indice: number) => {
        const stella = figura.costellazione.stelle[indice]!;
        return { x: x + stella.x * figura.lato, y: figura.y + stella.y * figura.lato };
      };

      ctx.strokeStyle = tinta(tavolozza.linea, tavolozza.trama * forza);
      ctx.beginPath();
      for (const [da, a] of figura.costellazione.segmenti) {
        const uno = punto(da);
        const altro = punto(a);
        ctx.moveTo(uno.x, uno.y);
        ctx.lineTo(altro.x, altro.y);
      }
      ctx.stroke();

      ctx.fillStyle = tinta(tavolozza.figura, 0.85 * forza);
      for (let i = 0; i < figura.costellazione.stelle.length; i += 1) {
        const { x: cx, y: cy } = punto(i);
        ctx.beginPath();
        ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  $effect(() => {
    // Le dipendenze si dichiarano leggendole: aspetto, misure e quiete devono
    // far ricominciare l'effetto, perché ognuna cambia quel che si vede.
    const acceso = cielo.acceso;
    const tavolozza = TAVOLOZZE[aspetto];
    const fermo = immobile;
    if (!tela || !acceso || larghezza === 0 || altezza === 0) return;

    const ctx = tela.getContext('2d');
    if (!ctx) return;

    // Oltre il doppio non si vede la differenza e si dipingono quattro volte i
    // pixel: su uno schermo a densità tripla è tutto costo e niente resa.
    const densita = Math.min(2, window.devicePixelRatio || 1);
    tela.width = Math.round(larghezza * densita);
    tela.height = Math.round(altezza * densita);
    ctx.setTransform(densita, 0, 0, densita, 0, 0);

    semina();

    if (fermo) {
      dipingi(ctx, tavolozza, 0);
      return;
    }

    let tempo = 0;
    let precedente: number | null = null;
    let richiesta = 0;

    // Il tempo si accumula a passi invece di venire dall'orologio: in una
    // scheda in secondo piano `requestAnimationFrame` non viene chiamato, e
    // tornando si ripartirebbe con un salto di minuti. Il tetto sul passo lo
    // impedisce, e nel frattempo la scheda nascosta non dipinge nulla — che è
    // l'unica gestione della batteria di cui questo effetto abbia bisogno.
    const passo = (ora: number) => {
      const delta = precedente === null ? 0 : Math.min(0.05, (ora - precedente) / 1000);
      precedente = ora;
      tempo += delta;
      dipingi(ctx, tavolozza, tempo);
      richiesta = requestAnimationFrame(passo);
    };

    richiesta = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(richiesta);
  });
</script>

<svelte:window
  bind:innerWidth={larghezza}
  bind:innerHeight={altezza}
  onkeydown={(evento) => {
    if (evento.key === 'Escape' && cielo.acceso) cielo.spegni();
  }}
/>

<!-- Il disegno non porta informazione e non va letto: `aria-hidden`. Che sia
     comparso però va detto — ci si arriva anche col solo tasto Invio sul
     pulsante — e con lui il modo di mandarlo via. -->
<canvas class="cielo" class:acceso={cielo.acceso} bind:this={tela} aria-hidden="true"></canvas>

<p class="nascosto" aria-live="polite">
  {#if cielo.acceso}
    Cielo stellato acceso sullo sfondo. Premi Esc per spegnerlo.
  {/if}
</p>

<style>
  /*
   * Dietro tutto e fuori dalla portata del dito: il guscio si prende sopra un
   * livello suo, in `+layout.svelte`.
   *
   * `position: fixed` e non `absolute` perché il cielo non scorre con la
   * pagina: le stelle si muovono per conto loro, e vederle scivolare via
   * mentre si scende in una tabella di aspetti sarebbe un movimento di troppo.
   */
  .cielo {
    position: fixed;
    inset: 0;
    z-index: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0;
    /* Spento resta fuori dal disegno del browser; l'attesa sulla visibilità è
       lunga quanto la dissolvenza, se no sparirebbe di colpo a metà. */
    visibility: hidden;
    transition:
      opacity 900ms ease,
      visibility 0s linear 900ms;
  }

  .cielo.acceso {
    opacity: 1;
    visibility: visible;
    transition:
      opacity 900ms ease,
      visibility 0s linear 0s;
  }

  /* Chi ha chiesto meno movimento non vuole nemmeno una comparsa in
     dissolvenza: il cielo c'è o non c'è. */
  @media (prefers-reduced-motion: reduce) {
    .cielo {
      transition: none;
    }
  }

  /* Su carta non c'è nessun giro di pulsante da fare, e un fondo pieno di
     stelle è inchiostro speso per niente. */
  @media print {
    .cielo {
      display: none;
    }
  }
</style>
