<script lang="ts">
  import type { TransitChart } from '@undicesimacasa/core';
  import type { Evidenza } from '$lib/evidenza.svelte';
  import {
    ASPECT_COLOR,
    ELEMENT_COLOR,
    SIGN_ELEMENT,
    SIGN_GLYPH,
    ZODIAC_ORDER,
  } from '$lib/glyphs';
  import {
    CENTER,
    PADDING,
    SIZE,
    arcPath,
    natalPointLongitude,
    natalWheelPoints,
    polar,
    radiiFor,
    spread,
    transitWheelPoints,
    type WheelChart,
  } from '$lib/wheel';

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
      stroke="var(--linea)"
      stroke-width="1"
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

  <!-- Tacche di grado: ogni 5°, più marcate ogni 10° -->
  {#each Array.from({ length: 72 }, (_, i) => i * 5) as degree (degree)}
    {@const outer = toXY(degree, R.zodiacInner)}
    {@const inner = toXY(degree, R.zodiacInner - (degree % 10 === 0 ? 12 : 6))}
    <line
      x1={outer.x}
      y1={outer.y}
      x2={inner.x}
      y2={inner.y}
      stroke="var(--linea)"
      stroke-width="1"
    />
  {/each}

  <!-- Chiusura dell'anello dei transiti, che lo separa dalle case -->
  {#if R.outerBodies !== undefined}
    <circle cx={CENTER} cy={CENTER} r={R.houseSpanOuter} fill="none" stroke="var(--linea)" />
  {/if}

  <circle cx={CENTER} cy={CENTER} r={R.houses} fill="none" stroke="var(--linea)" />
  <circle cx={CENTER} cy={CENTER} r={R.aspects} fill="none" stroke="var(--linea)" />

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
        stroke={isAngular ? 'var(--accento)' : 'var(--linea-forte)'}
        stroke-width={isAngular ? 2.5 : 1}
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
           sfumata. Il fondo scala però resta 0,4 e la cima è piena — sotto,
           una linea già sottile perdeva il poco contrasto che il suo colore
           le dava, e nessuna arrivava mai a mostrarlo tutto. -->
      {@const opacita = Math.max(0.4, 1 - line.orb / 14)}
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
        opacity={dimmed ? 0.3 : 1}
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
             vuole per non mancare il segno. -->
        <circle cx={glyph.x} cy={glyph.y} r="26" fill="transparent" />
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
          {point.glyph}
          <title>{point.label}</title>
        </text>
        {#if point.retrograde}
          {@const mark = toXY(display, R.outerBodies - 20)}
          <text
            x={mark.x}
            y={mark.y}
            class="retrogrado"
            text-anchor="middle"
            dominant-baseline="central">℞</text
          >
        {/if}
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
      opacity={dimmed ? 0.3 : 1}
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
           pixel sullo schermo, molto sotto i quarantaquattro che un tocco vuole
           per non mancare il segno. -->
      <circle cx={glyph.x} cy={glyph.y} r="26" fill="transparent" />
      <!-- Trattino alla longitudine reale: il glifo può essere stato spostato -->
      <line
        x1={tickOuter.x}
        y1={tickOuter.y}
        x2={tickInner.x}
        y2={tickInner.y}
        stroke="var(--linea-forte)"
        stroke-width="1"
      />
      <text
        x={glyph.x}
        y={glyph.y}
        class="glifo-corpo"
        class:glifo-punto={point.id === 'fortuna'}
        text-anchor="middle"
        dominant-baseline="central"
      >
        {point.glyph}
        <title>{point.label}</title>
      </text>
      {#if point.retrograde}
        {@const mark = toXY(display, R.bodies - 22)}
        <text
          x={mark.x}
          y={mark.y}
          class="retrogrado"
          text-anchor="middle"
          dominant-baseline="central">℞</text
        >
      {/if}
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
       già portano, per i font che quello lo ignorano. Vedi `lib/glyphs.ts`. */
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
