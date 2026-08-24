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

  **Nella fascia si nominano solo le due luci**, ☉ in alto e ☽ in basso, sul
  verticale: sono i due corpi che chiunque riconosce senza sapere di
  astrologia, e restano riconoscibili anche a quaranta punti d'altezza,
  che è quanto il sigillo misura in testata. Sono glifi che il progetto già usa — stanno in
  `packages/ruota/src/glyphs.ts` — e qui non sono ridisegnati ma scritti.

  Le altre sei posizioni non portano altri glifi. Un anello di otto simboli
  diversi chiede di essere letto, e a questa misura non si lascia leggere: si
  guarda una fila di macchie e si prova a distinguerle. Al loro posto vanno sei
  stelline a quattro punte, che non dicono niente e non pretendono niente —
  tengono il ritmo di otto attorno alla fascia e lasciano il centro al segno che
  conta. Le due sull'orizzontale sono più grandi delle quattro sulle diagonali:
  gli assi del cerchio si vedono, come si vedono in una ruota.

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
   * Le due luci, in cima e in fondo al cerchio di raggio 41,5 dentro una
   * griglia di 100 — cioè in mezzo alla fascia.
   */
  const LUCI = [
    { glifo: `☉${TESTO}`, x: 50, y: 8.5 },
    { glifo: `☽${TESTO}`, x: 50, y: 91.5 },
  ];

  /**
   * I sei decori, sullo stesso cerchio delle luci: quattro sulle diagonali e
   * due sull'orizzontale, più grandi. Con le due luci fanno otto posizioni a
   * 45 gradi l'una dall'altra.
   */
  const DECORI = [
    { x: 79.345, y: 20.655, r: 3.1 },
    { x: 91.5, y: 50.0, r: 4.1 },
    { x: 79.345, y: 79.345, r: 3.1 },
    { x: 20.655, y: 79.345, r: 3.1 },
    { x: 8.5, y: 50.0, r: 4.1 },
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

  <!-- «dodicisegni» spezzato nelle sue due metà, con la prima scritta in cifre
       romane: il numero è già una parola, e su due righe il marchio sta nella
       colonna stretta del margine invece di attraversarla. Il romano è quello
       con cui si numerano le case in una carta, quindi lega la scritta al
       sigillo invece di ripetere il dominio così com'è scritto. -->
  <span class="nome" aria-hidden="true">
    <span class="numero">XII</span>
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
    height: var(--marchio-sigillo, 2.5rem);
    width: auto;
    flex: none;
  }

  /* «XII» sta in mezzo a «segni» e non sul suo inizio: sono due righe di uno
     stesso blocco, e a bandiera la più corta si legge come una riga sfuggita
     invece che come la prima delle due. Vale in tutte e due le disposizioni. */
  .nome {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--serif);
    line-height: 1;
  }

  .numero {
    font-size: var(--marchio-numero, 1.35rem);
    letter-spacing: 0.06em;
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
