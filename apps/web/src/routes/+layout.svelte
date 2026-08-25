<script lang="ts">
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import { cielo } from '$lib/cielo.svelte';
  import CieloStellato from '$lib/components/CieloStellato.svelte';
  import CieloToggle from '$lib/components/CieloToggle.svelte';
  import ColorSchemeToggle from '$lib/components/ColorSchemeToggle.svelte';
  import Marchio from '$lib/components/Marchio.svelte';
  import { isActive, SECTIONS } from '$lib/navigation';
  import { REPOSITORY_URL } from '$lib/project';
  import { onMount } from 'svelte';
  import '../app.css';

  let { children } = $props();

  /**
   * Il service worker si registra da qui, e non da SvelteKit, perché ci sono
   * due posti in cui non deve girare.
   *
   * In **sviluppo**: una cache davanti a Vite significa passare le mattinate a
   * chiedersi perché una modifica non si veda. Il guscio conservato lo si prova
   * sulla build, che è anche l'unico posto in cui esiste davvero.
   *
   * Dentro **Electron**: `apps/desktop/src/main.ts` sorteggia a ogni avvio una
   * porta libera del loopback, quindi ogni avvio è un'origine diversa. Una
   * registrazione lì lascerebbe nel profilo di Chromium una cache per porta,
   * che nessun avvio successivo riuserà e che nessuno cancellerà: una
   * discarica che cresce di qualche megabyte a ogni doppio clic. E non
   * servirebbe a niente, perché quel server sta nella stessa macchina — l'app
   * desktop senza rete non ci va mai.
   */
  onMount(() => {
    if (dev) return;
    if (!('serviceWorker' in navigator)) return;
    if (/Electron\//.test(navigator.userAgent)) return;

    void navigator.serviceWorker.register('/service-worker.js');
  });
</script>

<CieloStellato {cielo} />

<div class="guscio" class:velato={cielo.acceso}>
  <header>
    <a class="marchio" href="/"><Marchio /></a>

    <!-- Dove si può andare e come si vede la pagina, sulla stessa riga: i
         pulsanti si guadagnano la fine di quella invece di prendersi una riga
         tutta loro, che sopra i 90rem sarebbe una riga vuota con dentro due
         glifi — là il marchio se n'è andato nel margine e non gli fa più
         compagnia. -->
    <div class="barra">
      <nav aria-label="Sezioni">
        <ul>
          {#each SECTIONS as section (section.href)}
            {@const attiva = isActive(section.href, page.url.pathname)}
            <li>
              <a href={section.href} aria-current={attiva ? 'page' : undefined} class:attiva>
                {section.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <div class="comandi">
        <CieloToggle {cielo} />
        <ColorSchemeToggle />
      </div>
    </div>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <!-- Prima delle attribuzioni, e con più aria sotto: le altre due righe
         dicono da dove vengono i dati e a quali condizioni, questa dice che
         cosa il sito è. Non disclama il calcolo — che è esatto, ed è l'unica
         cosa che il motore prometta — ma l'uso che se ne fa, e nomina i
         mestieri che nessuna lettura rimpiazza. Il limite è lo stesso che le
         istruzioni di `@dodicisegni/lettura` impongono al modello, detto
         qui a chi legge: due destinatari, due testi. -->
    <p class="avvertenza">
      Questo sito è uno spazio dedicato alla ricerca interiore e all'arricchimento
      personale e in nessun caso sostituisce il parere di professionisti per
      questioni mediche, legali, finanziarie o altro.
    </p>
    <!-- Ogni collegamento che esce dal sito porta `target="_blank"`, qui e
         nelle due informative. Sul web è una comodità; dentro Electron è
         quello che tiene la finestra dov'è, perché la navigazione di primo
         livello caricherebbe il sito remoto nel Chromium impacchettato, senza
         barra e senza modo di tornare indietro. Non è l'unico rimedio — il
         processo principale ha il suo, che vale anche quando questa riga viene
         dimenticata — ma è quello che si vede da qui.

         `rel="noopener"` toglie `window.opener` alla pagina che si apre. Il
         referrer invece non è un problema da risolvere: la politica
         predefinita dei browser è `strict-origin-when-cross-origin`, che fuori
         origine manda l'origine e non il percorso, e negli indirizzi di questo
         sito è il percorso a portare data e luogo di nascita. -->
    <p>
      Dati astronomici <a href="https://www.astro.com/swisseph/" target="_blank" rel="noopener">Swiss Ephemeris</a> ·
      località <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> (CC BY 4.0)
    </p>
    <p>
      <a href="/metodo">Metodo</a> ·
      <a href="/privacy">Privacy e cookie</a> ·
      {#if REPOSITORY_URL}
        <a href={REPOSITORY_URL} target="_blank" rel="noopener">codice sorgente</a>
      {:else}
        codice sorgente
      {/if}
      sotto licenza AGPL-3.0
    </p>
  </footer>
</div>

<style>
  .guscio {
    max-width: 72rem;
    margin: 0 auto;
    padding: 1.0rem 1.25rem 4rem;
    /* Sopra il cielo, che sta a `z-index: 0`: senza un livello dichiarato il
       guscio non ne avrebbe uno, e un elemento fisso disegnato dopo di lui gli
       finirebbe davanti. */
    position: relative;
    z-index: 1;
  }

  /*
   * Il velo che tiene il cielo al suo posto: dietro.
   *
   * Il fondo della pagina invece di sparire diventa quasi opaco, e quel poco
   * di cielo che passa basta a vedere che c'è. I margini oltre il guscio
   * restano scoperti, ed è là che l'effetto si guarda: è la ragione per cui il
   * velo può permettersi di essere fitto.
   *
   * Più fitto sul chiaro che sullo scuro, e non per simmetria mancata. Sul
   * fondo scuro il cielo è più buio della pagina, quindi il testo chiaro sopra
   * ci guadagna e il velo serve solo a non far scintillare le stelle dietro una
   * tabella. Sul fondo chiaro il cielo è inchiostro su carta e va nella stessa
   * direzione del testo: là il velo è l'unica cosa che tiene le due cose
   * distinte, e i cinque punti in più li spende per il caso peggiore — una
   * stella esattamente dietro una riga in `--testo-tenue`, che è il testo con
   * meno margine di tutta la pagina.
   *
   * Nessun `backdrop-filter`, per quanto sfocare lo sfondo sarebbe la cosa
   * ovvia da fare qui: un filtro sullo sfondo rende l'elemento il blocco
   * contenitore dei suoi discendenti fissi, e il sigillo nel margine —
   * `position: fixed` sopra i 90rem — smetterebbe di stare fermo mentre la
   * pagina gli scorre sotto, che è tutto quello che il sigillo fa.
   *
   * Il contrasto del testo regge in tutti e due gli aspetti, ed è per
   * costruzione e non per fortuna: le due tavolozze in `lib/cielo.ts` partono
   * dal fondo della pagina e vanno *verso lo scuro* in tutti e due i casi —
   * notte sul fondo scuro, carta più calda su quello chiaro — e quel che
   * traspare può solo scurire un fondo su cui il testo è già misurato. Il caso
   * peggiore è `--testo-tenue` sul fondo chiaro, esattamente sopra la stella
   * più luminosa che il cielo metta sotto il guscio: da 5,07:1 scende a 4,57:1,
   * che resta sopra il minimo di 4,5. È il numero più stretto della pagina, e
   * il velo al 91% è quello che glielo tiene: abbassarlo lo porta sotto.
   */
  .guscio.velato {
    background: light-dark(
      color-mix(in srgb, var(--sfondo) 91%, transparent),
      color-mix(in srgb, var(--sfondo) 86%, transparent)
    );
    /* Un foglio arriva in fondo. Senza, il velo finisce dove finisce il piè di
       pagina e lascia una riga netta in mezzo allo schermo: non sembra un
       foglio posato sulla notte, ma un riquadro rimasto aperto. */
    min-height: 100dvh;
  }

  header {
    /* Lo stacco che separa la navigazione dalla pagina. Era di 2,5rem quando
       sotto cominciava subito il modulo; col cappello di mezzo diventavano due
       vuoti in fila, e quaranta punti di aria prima della prima parola sono
       una pagina che comincia in ritardo. */
    margin-bottom: 1.5rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--linea);
  }

  /* Il marchio non è il titolo della pagina: con più sezioni il titolo scende
     nelle pagine, che così hanno ciascuna il proprio `h1`. */
  .marchio {
    /* In mezzo alla pagina: il marchio ha una riga tutta sua, e in un blocco
       centrato sopra una barra che va da un margine all'altro l'unica posizione
       che non sembra scelta a caso è il centro. Sopra i 90rem se ne va nel
       margine e questa regola non ha più niente da centrare. */
    display: block;
    width: fit-content;
    margin-inline: auto;
    /* Il nome dentro il marchio è disegno quanto il sigillo: sottolinearlo lo
       renderebbe l'unico link della pagina che sottolinea una parte di
       un'immagine. */
    text-decoration: none;
    /* Il disegno è l'unico contenuto del link: senza questo la riga di testo
       che lo contiene gli lascia sotto qualche pixel di spazio. */
    line-height: 0;
  }

  .marchio:hover {
    opacity: 0.75;
  }

  /*
   * Largo abbastanza da avere un margine, e il sigillo va a sedercisi dentro.
   *
   * Dove sta un sigillo: fuori dal campo che si legge, non dentro — e fermo
   * mentre la pagina gli scorre sotto. La soglia è il guscio (72rem) più lo
   * spazio per il marchio da tutt'e due i lati: sotto i 90rem non c'è margine
   * in cui andare, e un elemento fisso finirebbe sopra il testo invece che
   * accanto, quindi la testata se lo tiene in riga.
   *
   * Le misure del marchio non stanno qui dentro: gliele si passa con le
   * proprietà che `Marchio.svelte` dichiara, perché una regola scritta qui non
   * attraverserebbe il confine del componente.
   */
  @media (min-width: 90rem) {
    .marchio {
      position: fixed;
      /* La stessa `padding-top` del guscio: il sigillo comincia dove comincia
         la testata, invece di penzolarle sotto. */
      top: 1rem;
      /* 7rem di colonna, mezzo rem netto dal bordo del guscio. */
      left: calc(50% - 36rem - 7.5rem);
      width: 7rem;
      margin-inline: 0;

      --marchio-verso: column;
      --marchio-aria: 0.7rem;
      --marchio-sigillo: 5.5rem;
      --marchio-numero: 2.6rem;
      --marchio-parola: 0.68rem;
    }
  }

  /* Un foglio non scorre, e un elemento fisso sopra ci finisce una volta sola,
     su una pagina qualunque delle sue. */
  @media print {
    .marchio {
      position: static;
      width: fit-content;
      margin-inline: auto;

      --marchio-verso: row;
      --marchio-aria: 0.55rem;
      --marchio-sigillo: 3rem;
      --marchio-numero: 2rem;
      --marchio-parola: 0.62rem;
    }
  }

  /* Le voci a sinistra, i pulsanti a destra. Lo stacco dal marchio sta qui e
     non sull'elenco: messo là, il margine uscirebbe dal `nav` per accollamento
     e l'allineamento centrale lo troverebbe a metà strada, coi pulsanti più in
     basso delle voci di quei 0,7rem. */
  .barra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    margin-top: 0.7rem;
  }

  /* Sopra i 90rem quello stacco separa dal nulla: il marchio se n'è andato nel
     margine — `position: fixed`, sopra — e sotto la testata non c'è più niente
     da cui staccarsi. Restano soltanto gli undici punti, in cima alla pagina,
     dove la pagina dovrebbe già essere cominciata.

     La regola sta qui e non nel blocco del marchio, che pure ha la stessa
     soglia: là finirebbe *prima* di quella che deve scavalcare, e a parità di
     specificità vince l'ultima scritta. Un `@media` vale dove viene messo. */
  @media (min-width: 90rem) {
    .barra {
      margin-top: 0;
    }
  }

  /* I due pulsanti stanno appaiati e non si separano mai: se la barra va a
     capo, ci vanno insieme. */
  .comandi {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  nav ul {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  nav a {
    display: block;
    padding-bottom: 0.5rem;
    font-size: 0.85rem;
    text-decoration: none;
    color: var(--testo-tenue);
    /* Il bordo c'è sempre, trasparente quando la voce non è attiva: così la
       riga non sobbalza di un pixel passando da una sezione all'altra. */
    border-bottom: 2px solid transparent;
    margin-bottom: -0.65rem;
  }

  nav a:hover {
    color: var(--testo);
  }

  nav a.attiva {
    color: var(--testo);
    border-bottom-color: var(--accento);
  }

  footer {
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--linea);
    color: var(--testo-tenue);
    font-size: 0.85rem;
  }

  footer p {
    margin: 0;
  }

  footer p + p {
    margin-top: 0.3rem;
  }

  /* Da dove vengono i dati e a quali condizioni: due righe corte in mezzo alla
     pagina, come il marchio sopra. L'avvertenza no — è un blocco di prosa che
     può andare a capo, e un testo lungo centrato si legge male perché ogni
     riga comincia in un punto diverso. */
  footer p:not(.avvertenza) {
    text-align: center;
  }

  /* Un blocco a sé, non la prima di tre righe uguali: le attribuzioni che
     seguono sono un'altra cosa, e senza lo stacco l'avvertenza si legge come
     la prima voce del loro elenco.

     Larga quanto il guscio e in corpo più piccolo delle attribuzioni: è una
     nota a piè di pagina, e va letta come tale — chi la cerca la trova, chi
     legge il resto non ci inciampa. Il corpo resta sopra i 12px, che è il
     minimo perché una riga lunga come questa si legga ancora. */
  .avvertenza {
    margin-bottom: 0.9rem;
    font-size: 0.78rem;
  }
</style>
