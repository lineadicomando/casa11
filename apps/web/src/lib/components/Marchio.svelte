<!--
  Il marchio: un sigillo e il nome sotto, su due righe.

  È disegnato dentro il componente e non caricato come immagine, per la stessa
  ragione di prima: un `<img>` non può seguire la scelta chiaro/scuro fatta col
  pulsante — le due varianti si commuterebbero solo con `prefers-color-scheme`,
  cioè col tema del sistema. Qui l'anello e i glifi valgono `currentColor` e la
  stella `--oro`, e cambiano con qualunque cosa cambi il colore del testo.

  Il sigillo ha tre giri, dal bordo al centro:

  - due cerchi sottili, che aprono la fascia;
  - dentro la fascia le due luci e sei decori;
  - al centro una stella a dodici punte.

  **La stella è dodici, come il nome.** Il cielo si divide in dodici — segni e
  case — ed è la sola cosa che il sigillo affermi. È il poligono stellato
  {12/5}, cioè i dodici punti di una divisione del cerchio uniti di cinque in
  cinque; un tratto solo che li tocca tutti e torna al principio, e ci riesce
  perché 5 e 12 non hanno divisori comuni.

  **Nella fascia si nominano solo le due luci**, ☽ a est e ☉ a ovest, cioè
  sull'orizzonte: sono i due corpi che chiunque riconosce senza sapere di
  astrologia, e restano riconoscibili anche a quaranta punti d'altezza,
  che è quanto il sigillo misura in testata. Sono glifi che il progetto già usa — stanno in
  `packages/ruota/src/glyphs.ts` — e qui non sono ridisegnati ma scritti.

  **Est è a sinistra**, come in ogni carta: chi guarda sta al centro rivolto a
  sud, e a sud rivolti l'oriente cade a sinistra. Il Sole tramonta a destra
  mentre la Luna sorge a sinistra, cioè i due luminari opposti sull'orizzonte —
  il plenilunio al tramonto, che è la scena che più gente al mondo ha guardato.

  **Il Sole non può stare dall'altra parte**, e la ragione non è simbolica. La
  falce di ☽ ha la gobba a destra: è la luna crescente, gobba a ponente. In
  cielo la parte illuminata guarda sempre il Sole, perché è una sfera e la luce
  viene da lì. Col Sole a sinistra la falce risulterebbe illuminata dal lato
  opposto alla sua sorgente — una scena che non esiste, e che si vede prima di
  saperla spiegare. Specchiare il glifo non è una via d'uscita: ☾ è l'ultimo
  quarto, non il simbolo della Luna. Finché le luci stavano sulla verticale la
  questione non si poneva, perché lì l'illuminazione della falce è ortogonale
  alla posizione del Sole e non può contraddirla.

  Le altre sei posizioni non portano altri glifi. Un anello di otto simboli
  diversi chiede di essere letto, e a questa misura non si lascia leggere: si
  guarda una fila di macchie e si prova a distinguerle. Al loro posto vanno sei
  stelline a quattro punte, che non dicono niente e non pretendono niente —
  tengono il ritmo di otto attorno alla fascia e lasciano il centro al segno che
  conta. Le due sulla verticale sono più grandi delle quattro sulle diagonali:
  gli assi del cerchio si vedono, come si vedono in una ruota, e le luci si
  sono prese l'orizzontale.

  Il favicon è lo stesso segno ridotto all'osso — solo la stella, piena invece
  che di tratto. Vedi `graphics/favicon.svg`.
-->
<script lang="ts">
  let { titolo = 'dodicisegni' }: { titolo?: string } = $props();

  /**
   * Variante testuale, U+FE0E: senza, parte dei font di sistema disegna questi
   * simboli come pittogrammi colorati. È la stessa precauzione di
   * `packages/ruota/src/glyphs.ts`, e sui simboli già testuali è ignorata.
   */
  const TESTO = '︎';

  /**
   * Le due luci ai capi dell'orizzonte, sul cerchio di raggio 41,5 dentro una
   * griglia di 100 — cioè in mezzo alla fascia. La Luna a est, che nel disegno
   * di una carta è a sinistra, e il Sole a ovest: l'ordine sta scritto per
   * esteso nel commento in cima, e non si inverte.
   */
  const LUCI = [
    { glifo: `☽${TESTO}`, x: 8.5, y: 50 },
    { glifo: `☉${TESTO}`, x: 91.5, y: 50 },
  ];

  /**
   * I sei decori, sullo stesso cerchio delle luci: quattro sulle diagonali e
   * due sulla verticale, più grandi. Con le due luci fanno otto posizioni a
   * 45 gradi l'una dall'altra.
   */
  const DECORI = [
    { x: 50.0, y: 8.5, r: 4.1 },
    { x: 79.345, y: 20.655, r: 3.1 },
    { x: 79.345, y: 79.345, r: 3.1 },
    { x: 50.0, y: 91.5, r: 4.1 },
    { x: 20.655, y: 79.345, r: 3.1 },
    { x: 20.655, y: 20.655, r: 3.1 },
  ];

  /**
   * Una stellina a quattro punte, disegnata attorno all'origine e portata al
   * suo posto con un `translate`: quattro archi che rientrano fino al centro,
   * cioè la forma che ha uno scintillio quando lo si disegna invece di
   * scriverlo. Il raggio è l'unica misura che cambia fra l'una e l'altra.
   */
  function stellina(r: number): string {
    return `M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}Z`;
  }

  /**
   * Il poligono stellato {12/5} di raggio 32, centrato in (50, 50).
   *
   * I dodici vertici sono quelli di un orologio; il tracciato li unisce di
   * cinque in cinque e, poiché 5 e 12 non hanno divisori comuni, li tocca tutti
   * prima di richiudersi. Le punte vengono a 30 gradi — sottili, e per questo i
   * vertici sono arrotondati: a punta viva la giunzione sporgerebbe in un ago
   * lungo il doppio del tratto.
   */
  const STELLA =
    'M50 18L66 77.713L22.287 34L82 50L22.287 66L66 22.287L50 82' +
    'L34 22.287L77.713 66L18 50L77.713 34L34 77.713Z';
</script>

<span class="marchio-disegno">
  <svg class="sigillo" viewBox="0 0 100 100" role="img" aria-label={titolo} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="0.9">
      <circle cx="50" cy="50" r="47.5" />
      <circle cx="50" cy="50" r="35.5" />
    </g>

    <path
      d={STELLA}
      fill="none"
      stroke="var(--oro)"
      stroke-width="0.8"
      stroke-linejoin="round"
    />

    <g fill="currentColor" font-size="10.5" text-anchor="middle" dominant-baseline="central">
      {#each LUCI as { glifo, x, y } (glifo)}
        <text {x} {y}>{glifo}</text>
      {/each}
    </g>

    <g fill="currentColor">
      {#each DECORI as { x, y, r } (`${x},${y}`)}
        <path d={stellina(r)} transform="translate({x} {y})" />
      {/each}
    </g>
  </svg>

  <!-- «dodicisegni» spezzato nelle sue due metà, con la prima scritta in cifre:
       il numero è già una parola, e su due righe il marchio sta nella colonna
       stretta del margine invece di attraversarla.

       **Cifre arabe e non romane.** «XII» in italiano si legge tanto «dodici»
       quanto «dodicesima» — è il numero con cui si contano le case in una
       carta, e lì vuol dire la dodicesima — mentre il nome dice dodici segni,
       non il dodicesimo di qualcosa. Il romano legava la scritta al sigillo al
       prezzo di quell'equivoco. «12» dice un numero e basta, e a questa misura
       si vede prima della parola che gli sta sotto. -->
  <span class="nome" aria-hidden="true">
    <span class="numero">12</span>
    <span class="parola">segni</span>
  </span>
</span>

<style>
  /*
   * Riga o colonna, e quanto grande: le due cose le decide chi lo posa, con le
   * due proprietà qui sotto. Il marchio in testata sta su una riga; nel margine
   * della finestra larga sta in colonna e più grande — ma la soglia fra i due
   * casi è la larghezza del guscio, che il marchio non conosce e il layout sì.
   * Le proprietà personalizzate attraversano il confine del componente, dove
   * una regola scritta là fuori non arriverebbe.
   */
  .marchio-disegno {
    display: flex;
    flex-direction: var(--marchio-verso, row);
    align-items: center;
    gap: var(--marchio-aria, 0.55rem);
    color: var(--testo);
  }

  /* Altezza e mai larghezza: il sigillo è quadrato, e a fissargli la larghezza
     si schiaccerebbe da solo quando la riga che lo contiene si stringe. */
  .sigillo {
    display: block;
    height: var(--marchio-sigillo, 3rem);
    width: auto;
    flex: none;
  }

  /* «12» sta in mezzo a «segni» e non sul suo inizio: sono due righe di uno
     stesso blocco, e a bandiera la più corta si legge come una riga sfuggita
     invece che come la prima delle due. Vale in tutte e due le disposizioni. */
  .nome {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--serif);
    line-height: 1;
  }

  /*
   * **Il numero è grande quanto serve a pareggiare la parola**, non quanto
   * sarebbe naturale per una riga di testo: a corpo pari le due cifre stanno
   * in poco più di metà di «SEGNI» spaziato, e le due righe fanno un cuneo. A
   * questo corpo fanno un rettangolo, e il rettangolo è la ragione di tutto il
   * resto — il sigillo è un cerchio, cioè ciò che gira e torna, e il nome
   * sotto è la figura ferma che lo regge. Sono anche le due geometrie che il
   * progetto disegna davvero: la ruota per l'occidentale, il quadro per il
   * Jyotisha.
   *
   * Il pareggio si fa a occhio e non con un calcolo, perché la larghezza della
   * parola dipende dal serif che il sistema presta: le misure qui sotto sono
   * giuste per la catena di `--serif` e restano vicine col resto.
   */
  .numero {
    font-size: var(--marchio-numero, 2rem);
    /* Cifre alte come le maiuscole. Parte dei serif di sistema — Georgia per
       prima, che è la nostra — disegna i numeri in stile antico, cioè
       all'altezza della x, e «12» verrebbe più basso del romano che sostituisce
       proprio dove deve farsi vedere. Dove la variante non c'è la richiesta
       cade da sé e restano le cifre del font. */
    font-variant-numeric: lining-nums;
    /* Poca, e non quanta ne ha la parola: serve ad aprire le due cifre, non a
       separarle. Oltre un quinto di quadratone «12» si legge «1» e «2». */
    letter-spacing: 0.18em;
    /* Come per la parola qui sotto: la spaziatura si somma anche dopo l'ultima
       cifra, e su due sole cifre lo scarto dal centro si vede. */
    margin-right: -0.18em;
  }

  /* Il nome della proprietà non nomina la parola: chi la posa decide una
     misura, non che cosa ci sta scritto. Al prossimo nome cambia la scritta e
     non il foglio di stile di chi lo usa. */
  .parola {
    font-size: var(--marchio-parola, 0.62rem);
    text-transform: uppercase;
    /* La spaziatura si somma anche dopo l'ultima lettera: senza toglierla la
       parola sarebbe centrata tenendo conto di uno spazio che non si vede, e
       risulterebbe di mezza spaziatura a sinistra del numero. */
    letter-spacing: 0.3em;
    margin-right: -0.3em;
    margin-top: 0.28em;
    color: var(--testo-tenue);
  }
</style>
