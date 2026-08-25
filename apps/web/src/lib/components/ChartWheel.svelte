<script lang="ts">
  import type { TransitChart } from '@dodicisegni/core';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import {
    ASPECT_COLOR,
    CENTER,
    ELEMENT_COLOR,
    PADDING,
    SIGN_ELEMENT,
    SIGN_GLYPH,
    SIZE,
    ZODIAC_ORDER,
    arcPath,
    natalPointLongitude,
    natalWheelPoints,
    polar,
    radiiFor,
    spread,
    transitWheelPoints,
    type WheelChart,
  } from '@dodicisegni/ruota';

  interface Props {
    chart: WheelChart;
    /**
     * Transiti da disegnare in un anello esterno. Quando ci sono, le linee
     * al centro sono i loro aspetti al tema e non quelli interni al tema:
     * sovrapporre le due trame renderebbe illeggibili entrambe.
     */
    transits?: TransitChart | null;
    /**
     * Il corpo isolato: gli aspetti che non lo toccano vengono attenuati.
     *
     * Condiviso con le tabelle. Il disegno non si limita a subirlo: ogni glifo
     * è un bersaglio, e da qui la scelta può partire invece che arrivare
     * soltanto — che è il gesto naturale, e l'unico possibile con un dito.
     */
    evidenza: Evidenza;
    /**
     * Descrizione per chi non vede il disegno. Ha un valore predefinito
     * perché la ruota nasce per il tema, ma il cielo di un istante non è un
     * tema e non va annunciato come tale.
     */
    label?: string;
    /**
     * Il nodo del disegno, per chi lo deve portare via.
     *
     * Lo usa la barra degli strumenti: esportare vuol dire leggere questo SVG
     * e fissarne i valori calcolati, e per farlo bisogna averlo in mano.
     */
    elemento?: SVGSVGElement | null;
  }

  let {
    chart,
    transits = null,
    evidenza,
    label = 'Ruota del tema natale con posizioni planetarie, case e aspetti',
    elemento = $bindable(null),
  }: Props = $props();

  const highlighted = $derived(evidenza.attivo);

  /**
   * Invio e barra spaziatrice fanno quello che fa il clic.
   *
   * Un `<g>` con `role="button"` non è un `<button>`: il browser non gli dà
   * nessuno dei due tasti, e va scritto. La barra va anche fermata, o la pagina
   * scorrerebbe di uno schermo mentre si sceglie un pianeta.
   */
  function daTastiera(event: KeyboardEvent, id: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    evidenza.commuta(id);
  }

  /** Ampiezza minima dell'arco di una congiunzione, in gradi. */
  const CONJUNCTION_MIN_SPAN = 5;

  /**
   * Quanto resta acceso un corpo che non è quello scelto.
   *
   * Era 0,3, ed era troppo poco: sul fondo chiaro un glifo attenuato scendeva a
   * 1,8:1 e un transitante a 1,5:1 — scegliere un pianeta non metteva gli altri
   * in secondo piano, li cancellava, e un corpo cancellato non si può più
   * scegliere. A 0,7 tutti restano sopra 3:1.
   *
   * La gerarchia non la fa questo numero: la fanno il colore d'accento, il peso
   * e il cerchio pieno che il corpo scelto si prende, e le linee degli aspetti
   * che non lo toccano — quelle non sono attenuate, non vengono disegnate.
   */
  const ATTENUATO = 0.7;

  const R = $derived(radiiFor(transits !== null));

  /**
   * Longitudine dell'eclittica che va posta a sinistra (ore 9).
   *
   * Con un'ora di nascita nota è l'Ascendente, secondo la convenzione della
   * carta occidentale. Senza ora non esiste un Ascendente: si ripiega su 0°
   * Ariete, e le case non vengono disegnate affatto.
   */
  const rotation = $derived(chart.angles?.ascendant ?? 0);

  const hasHouses = $derived(chart.houses.length === 12 && chart.angles !== undefined);

  function toXY(longitude: number, radius: number): { x: number; y: number } {
    return polar(longitude, radius, rotation);
  }

  const placedBodies = $derived(spread(natalWheelPoints(chart), R.separation));
  const placedTransits = $derived(
    transits ? spread(transitWheelPoints(transits), R.outerSeparation) : [],
  );

  /** Le linee al centro: gli aspetti del tema, o quelli dei transiti a esso. */
  const lines = $derived.by(() => {
    const drawn = transits
      ? transits.aspects
          .filter((a) => !highlighted || a.transiting === highlighted || a.natal === highlighted)
          .map((a) => ({
            aspect: a.aspect,
            orb: a.orb,
            from: transits.transiting.find((body) => body.id === a.transiting)?.longitude,
            to: natalPointLongitude(chart, a.natal),
          }))
      : chart.aspects
          .filter((a) => !highlighted || a.from === highlighted || a.to === highlighted)
          .map((a) => ({
            aspect: a.aspect,
            orb: a.orb,
            from: natalPointLongitude(chart, a.from),
            to: natalPointLongitude(chart, a.to),
          }));

    // Un capo mancante — un asse in un tema senza ora — darebbe una linea
    // tirata verso il centro della ruota, che non significa nulla.
    return drawn.filter(
      (line): line is { aspect: typeof line.aspect; orb: number; from: number; to: number } =>
        line.from !== undefined && line.to !== undefined,
    );
  });
</script>

<svg
  bind:this={elemento}
  viewBox="{-PADDING} {-PADDING} {SIZE + PADDING * 2} {SIZE + PADDING * 2}"
  class="wheel"
  role="img"
  aria-label={transits
    ? 'Ruota con il tema natale, i corpi in transito e i loro aspetti'
    : label}
>
  <!-- Settori dei segni, colorati per elemento -->
  {#each ZODIAC_ORDER as sign, index (sign)}
    {@const start = index * 30}
    {@const mid = toXY(start + 15, (R.zodiacOuter + R.zodiacInner) / 2)}
    {@const corners = [
      toXY(start, R.zodiacInner),
      toXY(start, R.zodiacOuter),
      toXY(start + 30, R.zodiacOuter),
      toXY(start + 30, R.zodiacInner),
    ]}
    <path
      d="M {corners[0].x} {corners[0].y}
         L {corners[1].x} {corners[1].y}
         A {R.zodiacOuter} {R.zodiacOuter} 0 0 0 {corners[2].x} {corners[2].y}
         L {corners[3].x} {corners[3].y}
         A {R.zodiacInner} {R.zodiacInner} 0 0 1 {corners[0].x} {corners[0].y} Z"
      style:fill={ELEMENT_COLOR[SIGN_ELEMENT[sign]]}
      fill-opacity="0.12"
      stroke="var(--quadrante)"
      stroke-width="1.25"
    />
    <text
      x={mid.x}
      y={mid.y}
      class="glifo-segno"
      style:fill={ELEMENT_COLOR[SIGN_ELEMENT[sign]]}
      text-anchor="middle"
      dominant-baseline="central">{SIGN_GLYPH[sign]}</text
    >
  {/each}

  <!-- Tacche di grado: ogni 5°, più marcate ogni 10°.

       Lo spessore è 1,25 e non 1 perché il riquadro di vista è largo 852 unità
       e il disegno si posa su cinquecento pixel scarsi: a spessore 1 la tacca
       esce sotto il pixel, e l'antialiasing le toglie il poco contrasto che le
       resta. È la stessa ragione per cui le tacche vogliono `--quadrante` e non
       `--linea`: il colore da solo non bastava. -->
  {#each Array.from({ length: 72 }, (_, i) => i * 5) as degree (degree)}
    {@const outer = toXY(degree, R.zodiacInner)}
    {@const inner = toXY(degree, R.zodiacInner - (degree % 10 === 0 ? 12 : 6))}
    <line
      x1={outer.x}
      y1={outer.y}
      x2={inner.x}
      y2={inner.y}
      stroke="var(--quadrante)"
      stroke-width="1.25"
    />
  {/each}

  <!-- Chiusura dell'anello dei transiti, che lo separa dalle case -->
  {#if R.outerBodies !== undefined}
    <circle
      cx={CENTER}
      cy={CENTER}
      r={R.houseSpanOuter}
      fill="none"
      stroke="var(--quadrante)"
      stroke-width="1.25"
    />
  {/if}

  <circle
    cx={CENTER}
    cy={CENTER}
    r={R.houses}
    fill="none"
    stroke="var(--quadrante)"
    stroke-width="1.25"
  />
  <circle
    cx={CENTER}
    cy={CENTER}
    r={R.aspects}
    fill="none"
    stroke="var(--quadrante)"
    stroke-width="1.25"
  />

  {#if hasHouses}
    <!-- Cuspidi delle case -->
    {#each chart.houses as house (house.number)}
      {@const isAngular =
        house.number === 1 || house.number === 4 || house.number === 7 || house.number === 10}
      {@const outer = toXY(house.longitude, R.houseSpanOuter)}
      {@const inner = toXY(house.longitude, R.aspects)}
      {@const next = chart.houses[house.number % 12]!}
      {@const span = (next.longitude - house.longitude + 360) % 360}
      {@const label = toXY(house.longitude + span / 2, R.houseNumbers)}
      <line
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke={isAngular ? 'var(--accento)' : 'var(--quadrante-forte)'}
        stroke-width={isAngular ? 2.5 : 1.5}
      />
      <text
        x={label.x}
        y={label.y}
        class="numero-casa"
        text-anchor="middle"
        dominant-baseline="central">{house.number}</text
      >
    {/each}

    <!-- Etichette degli assi -->
    {#each [['ASC', chart.angles!.ascendant], ['MC', chart.angles!.midheaven], ['DSC', chart.angles!.descendant], ['IC', chart.angles!.imumCoeli]] as const as [label, longitude] (label)}
      {@const position = toXY(longitude, R.zodiacOuter + 14)}
      <text
        x={position.x}
        y={position.y}
        class="etichetta-asse"
        text-anchor="middle"
        dominant-baseline="central">{label}</text
      >
    {/each}
  {/if}

  <!-- Aspetti: corda fra i due punti, arco quando sono congiunti -->
  <g class="aspetti">
    {#each lines as line, index (index)}
      {@const spessore = line.orb < 2 ? 1.8 : 1}
      <!-- L'orbita si legge dalla trasparenza: stretta è netta, larga è
           sfumata. Il pavimento è 0,7 e la cima è piena.

           A 0,4 la gradazione c'era ma le linee larghe non si vedevano: sul
           fondo chiaro stavano fra 1,57:1 e 1,81:1, dove a un oggetto grafico
           ne servono 3. Il pavimento non si può abbassare tornando a scurire i
           colori, perché è il pavimento a decidere quanto colore arriva a
           terra: i due valori vanno scelti insieme, e stanno scritti insieme —
           qui il numero, in `app.css` i colori che a questo numero reggono. -->
      {@const opacita = Math.max(0.7, 1 - line.orb / 14)}
      {#if line.aspect === 'congiunzione'}
        <!-- Una corda fra due longitudini quasi uguali è invisibile: l'arco
             la rende visibile e ne mostra l'ampiezza. -->
        <path
          d={arcPath(line.from, line.to, R.aspects, rotation, CONJUNCTION_MIN_SPAN)}
          fill="none"
          style:stroke={ASPECT_COLOR[line.aspect]}
          stroke-width={spessore + 1.2}
          stroke-opacity={opacita}
          stroke-linecap="round"
        />
      {:else}
        {@const from = toXY(line.from, R.aspects)}
        {@const to = toXY(line.to, R.aspects)}
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          style:stroke={ASPECT_COLOR[line.aspect]}
          stroke-width={spessore}
          stroke-opacity={opacita}
        />
      {/if}
    {/each}
  </g>

  <!-- Corpi in transito, nell'anello esterno -->
  {#if R.outerBodies !== undefined}
    {#each placedTransits as { point, display } (point.id)}
      {@const glyph = toXY(display, R.outerBodies)}
      {@const tickOuter = toXY(point.longitude, R.zodiacInner)}
      {@const tickInner = toXY(point.longitude, R.outerBodies + 16)}
      {@const dimmed = highlighted !== null && highlighted !== point.id}
      <g
        class="corpo transito"
        class:scelto={evidenza.fissato === point.id}
        opacity={dimmed ? ATTENUATO : 1}
        role="button"
        tabindex="0"
        aria-pressed={evidenza.fissato === point.id}
        aria-label="{point.label}. Isola i suoi aspetti."
        onclick={() => evidenza.commuta(point.id)}
        onkeydown={(event) => daTastiera(event, point.id)}
        onmouseenter={() => evidenza.sorvola(point.id)}
        onmouseleave={() => evidenza.sorvola(null)}
      >
        <!-- Il bersaglio del dito, invisibile: i glifi sono alti una ventina di
             pixel sullo schermo, molto sotto i quarantaquattro che un tocco
             vuole per non mancare il segno.

             `data-bersaglio` lo dichiara tale a chi esporta, che lo toglie: in
             un file non c'è nessun dito, e `transparent` non sopravvive al
             viaggio — vedi `lib/esporta.ts`. -->
        <circle cx={glyph.x} cy={glyph.y} r="26" fill="transparent" data-bersaglio />
        <line
          x1={tickOuter.x}
          y1={tickOuter.y}
          x2={tickInner.x}
          y2={tickInner.y}
          stroke="var(--accento)"
          stroke-width="1"
        />
        <text
          x={glyph.x}
          y={glyph.y}
          class="glifo-corpo glifo-transito"
          text-anchor="middle"
          dominant-baseline="central"
        >
          {point.glyph}{#if point.retrograde}<tspan class="retrogrado" dy="-7">℞</tspan>{/if}
          <title>{point.label}</title>
        </text>
      </g>
    {/each}
  {/if}

  <!-- Corpi del tema -->
  {#each placedBodies as { point, display } (point.id)}
    {@const glyph = toXY(display, R.bodies)}
    {@const tickOuter = toXY(point.longitude, R.houses)}
    {@const tickInner = toXY(point.longitude, R.bodies + 16)}
    {@const dimmed = highlighted !== null && highlighted !== point.id}
    <g
      class="corpo"
      class:attenuato={dimmed}
      class:scelto={evidenza.fissato === point.id}
      opacity={dimmed ? ATTENUATO : 1}
      role="button"
      tabindex="0"
      aria-pressed={evidenza.fissato === point.id}
      aria-label="{point.label}. Isola i suoi aspetti."
      onclick={() => evidenza.commuta(point.id)}
      onkeydown={(event) => daTastiera(event, point.id)}
      onmouseenter={() => evidenza.sorvola(point.id)}
      onmouseleave={() => evidenza.sorvola(null)}
    >
      <!-- Il bersaglio del dito: vedi il gemello nell'anello dei transiti. -->
      <circle cx={glyph.x} cy={glyph.y} r="26" fill="transparent" data-bersaglio />
      <!-- Trattino alla longitudine reale: il glifo può essere stato spostato.
           È l'unica cosa che dica dov'è davvero il corpo, e va vista. -->
      <line
        x1={tickOuter.x}
        y1={tickOuter.y}
        x2={tickInner.x}
        y2={tickInner.y}
        stroke="var(--quadrante-forte)"
        stroke-width="1.5"
      />
      <!-- Il ℞ è un apice del glifo e non un segno a sé.

           Stava su un anello suo, qualche pixel più in dentro: in uno stellium
           i marchi di tre pianeti vicini si accavallavano fra loro e con i
           trattini delle longitudini, e nessuno diceva più di chi fosse.
           Attaccato al glifo non può appartenere a nessun altro. -->
      <text
        x={glyph.x}
        y={glyph.y}
        class="glifo-corpo"
        class:glifo-punto={point.id === 'fortuna'}
        text-anchor="middle"
        dominant-baseline="central"
      >
        {point.glyph}{#if point.retrograde}<tspan class="retrogrado" dy="-7">℞</tspan>{/if}
        <title>{point.label}</title>
      </text>
    </g>
  {/each}
</svg>

<style>
  .wheel {
    width: 100%;
    height: auto;
    max-width: 44rem;
    font-family: system-ui, sans-serif;
    /* Ereditata da tutti i glifi: raddoppia il selettore U+FE0E che le mappe
       già portano, per i font che quello lo ignorano. Vedi `@dodicisegni/ruota`. */
    font-variant-emoji: text;
  }

  .glifo-segno {
    font-size: 30px;
  }

  .glifo-corpo {
    font-size: 27px;
    fill: var(--testo);
  }

  /* I transitanti portano il colore dell'accento, lo stesso degli assi: sono
     l'elemento mobile della carta, e vanno distinti a colpo d'occhio dai
     corpi di nascita anche quando i glifi sono gli stessi. */
  .glifo-transito {
    font-size: 24px;
    fill: var(--accento);
  }

  /*
   * Il glifo della Parte di Fortuna è ⊗ (U+2297), un operatore matematico:
   * i font di sistema lo disegnano molto più grande dei simboli astrologici
   * (U+2600–U+26FF) a parità di font-size. Va rimpicciolito per pareggiarlo.
   */
  .glifo-punto {
    font-size: 21px;
  }

  .retrogrado {
    font-size: 13px;
    fill: var(--testo-tenue);
  }

  /* Su uno schermo stretto la ruota scende sotto i trecento punti, e i glifi
     con lei: a dieci pixel non si distingue più ♃ da ♄, e il ℞ sparisce del
     tutto. Due rimedi insieme, perché nessuno dei due da solo basta.

     Il primo: il disegno esce dai margini del guscio e si prende la larghezza
     della finestra. Non con `100vw`, che conta anche la barra di scorrimento e
     lascerebbe la pagina scorrevole di lato, ma recuperando esattamente il
     padding che il guscio ha — che è noto, e sta scritto qui accanto. */
  @media (max-width: 30rem) {
    .wheel {
      width: calc(100% + 2.5rem);
      max-width: none;
      margin-inline: -1.25rem;
    }

    /* Il secondo: i glifi crescono più della ruota. Il disegno è lo stesso a
       ogni misura — è un SVG — ma la leggibilità no, e su un quadrante piccolo
       vale più un glifo grande di uno spazio vuoto attorno. */
    .glifo-segno {
      font-size: 38px;
    }

    .glifo-corpo {
      font-size: 36px;
    }

    .glifo-transito {
      font-size: 32px;
    }

    .glifo-punto {
      font-size: 28px;
    }

    .retrogrado {
      font-size: 18px;
    }

    .numero-casa,
    .etichetta-asse {
      font-size: 19px;
    }
  }

  .numero-casa {
    font-size: 15px;
    fill: var(--testo-tenue);
  }

  .etichetta-asse {
    font-size: 15px;
    font-weight: 600;
    fill: var(--accento);
    letter-spacing: 0.04em;
  }

  .corpo {
    transition: opacity 0.15s ease;
    cursor: pointer;
  }

  /* Il fuoco della tastiera si vede attorno al glifo e non attorno al gruppo,
     che comprende anche il trattino e arriverebbe fino all'anello dei segni. */
  .corpo:focus-visible {
    outline: none;
  }

  .corpo:focus-visible circle {
    fill: var(--accento-tenue);
    stroke: var(--accento);
    stroke-width: 2;
  }

  /* Scelto, il glifo resta acceso anche quando il puntatore è altrove: è la
     differenza fra l'aver guardato e l'aver deciso. */
  .corpo.scelto .glifo-corpo {
    fill: var(--accento);
    font-weight: 600;
  }

  .corpo.scelto circle {
    fill: var(--accento-tenue);
  }
</style>
