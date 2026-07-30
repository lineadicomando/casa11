<script lang="ts">
  import type { CelestialBody, NatalChart } from '@undicesimacasa/core';
  import {
    ASPECT_COLOR,
    BODY_GLYPH,
    ELEMENT_COLOR,
    SIGN_ELEMENT,
    SIGN_GLYPH,
    ZODIAC_ORDER,
  } from '$lib/glyphs';

  interface Props {
    chart: NatalChart;
    /** Corpo evidenziato: gli aspetti che non lo toccano vengono attenuati. */
    highlighted?: string | null;
  }

  let { chart, highlighted = null }: Props = $props();

  const SIZE = 800;
  const CENTER = SIZE / 2;
  /** Margine attorno al riquadro: le etichette degli assi sporgono dal cerchio. */
  const PADDING = 26;

  // Raggi dei vari anelli concentrici, dall'esterno verso l'interno.
  const R_ZODIAC_OUT = 390;
  const R_ZODIAC_IN = 335;
  const R_HOUSE_RING = 300;
  const R_PLANET = 268;
  const R_ASPECT = 232;

  /**
   * Longitudine dell'eclittica che va posta a sinistra (ore 9).
   *
   * Con un'ora di nascita nota è l'Ascendente, secondo la convenzione della
   * carta occidentale. Senza ora non esiste un Ascendente: si ripiega su 0°
   * Ariete, e le case non vengono disegnate affatto.
   */
  const rotation = $derived(chart.angles?.ascendant ?? 0);

  const hasHouses = $derived(chart.houses.length === 12 && chart.angles !== undefined);

  /**
   * Converte una longitudine eclittica in coordinate sullo schermo.
   *
   * L'origine è a sinistra e le longitudini crescenti scendono verso il basso
   * (verso il Fondo Cielo), come in una carta tracciata a mano.
   */
  function toXY(longitude: number, radius: number): { x: number; y: number } {
    const angle = ((180 + (longitude - rotation)) * Math.PI) / 180;
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER - radius * Math.sin(angle),
    };
  }

  /**
   * Posizione di disegno dei corpi, distanziata per evitare le sovrapposizioni.
   *
   * I pianeti restano ancorati alla loro longitudine reale per le linee degli
   * aspetti e per i trattini indicatori; a spostarsi è solo il glifo, così che
   * uno stellium resti leggibile senza mentire sulle posizioni.
   */
  const MIN_SEPARATION = 7;

  const placedBodies = $derived.by(() => {
    const sorted = [...chart.bodies].sort((a, b) => a.longitude - b.longitude);
    const display = sorted.map((body) => ({ body, display: body.longitude }));

    // Alcune passate di rilassamento: spinge via i vicini troppo stretti.
    for (let pass = 0; pass < 60; pass += 1) {
      let moved = false;
      for (let i = 0; i < display.length; i += 1) {
        const current = display[i]!;
        const next = display[(i + 1) % display.length]!;
        const gap = (next.display - current.display + 360) % 360;
        if (gap < MIN_SEPARATION && display.length > 1) {
          const push = (MIN_SEPARATION - gap) / 2;
          current.display = (current.display - push + 360) % 360;
          next.display = (next.display + push) % 360;
          moved = true;
        }
      }
      if (!moved) break;
    }

    return display;
  });

  const visibleAspects = $derived(
    highlighted
      ? chart.aspects.filter((a) => a.from === highlighted || a.to === highlighted)
      : chart.aspects,
  );

  function longitudeOf(id: string): number {
    return chart.bodies.find((body) => body.id === id)?.longitude ?? 0;
  }

  function bodyLabel(body: CelestialBody): string {
    const house = body.house !== undefined ? `, casa ${body.house}` : '';
    const retrograde = body.retrograde ? ', retrogrado' : '';
    return `${body.name} a ${body.signDegree.toFixed(0)} gradi ${body.sign}${house}${retrograde}`;
  }
</script>

<svg
  viewBox="{-PADDING} {-PADDING} {SIZE + PADDING * 2} {SIZE + PADDING * 2}"
  class="wheel"
  role="img"
  aria-label="Ruota del tema natale con posizioni planetarie, case e aspetti"
>
  <!-- Settori dei segni, colorati per elemento -->
  {#each ZODIAC_ORDER as sign, index (sign)}
    {@const start = index * 30}
    {@const mid = toXY(start + 15, (R_ZODIAC_OUT + R_ZODIAC_IN) / 2)}
    {@const corners = [
      toXY(start, R_ZODIAC_IN),
      toXY(start, R_ZODIAC_OUT),
      toXY(start + 30, R_ZODIAC_OUT),
      toXY(start + 30, R_ZODIAC_IN),
    ]}
    <path
      d="M {corners[0].x} {corners[0].y}
         L {corners[1].x} {corners[1].y}
         A {R_ZODIAC_OUT} {R_ZODIAC_OUT} 0 0 0 {corners[2].x} {corners[2].y}
         L {corners[3].x} {corners[3].y}
         A {R_ZODIAC_IN} {R_ZODIAC_IN} 0 0 1 {corners[0].x} {corners[0].y} Z"
      fill={ELEMENT_COLOR[SIGN_ELEMENT[sign]]}
      fill-opacity="0.12"
      stroke="var(--linea)"
      stroke-width="1"
    />
    <text
      x={mid.x}
      y={mid.y}
      class="glifo-segno"
      fill={ELEMENT_COLOR[SIGN_ELEMENT[sign]]}
      text-anchor="middle"
      dominant-baseline="central">{SIGN_GLYPH[sign]}</text
    >
  {/each}

  <!-- Tacche di grado: ogni 5°, più marcate ogni 10° -->
  {#each Array.from({ length: 72 }, (_, i) => i * 5) as degree (degree)}
    {@const outer = toXY(degree, R_ZODIAC_IN)}
    {@const inner = toXY(degree, R_ZODIAC_IN - (degree % 10 === 0 ? 12 : 6))}
    <line
      x1={outer.x}
      y1={outer.y}
      x2={inner.x}
      y2={inner.y}
      stroke="var(--linea)"
      stroke-width="1"
    />
  {/each}

  <circle cx={CENTER} cy={CENTER} r={R_HOUSE_RING} fill="none" stroke="var(--linea)" />
  <circle cx={CENTER} cy={CENTER} r={R_ASPECT} fill="none" stroke="var(--linea)" />

  {#if hasHouses}
    <!-- Cuspidi delle case -->
    {#each chart.houses as house (house.number)}
      {@const isAngular = house.number === 1 || house.number === 4 || house.number === 7 || house.number === 10}
      {@const outer = toXY(house.longitude, R_ZODIAC_IN)}
      {@const inner = toXY(house.longitude, R_ASPECT)}
      {@const next = chart.houses[house.number % 12]!}
      {@const span = (next.longitude - house.longitude + 360) % 360}
      {@const label = toXY(house.longitude + span / 2, (R_HOUSE_RING + R_ASPECT) / 2)}
      <line
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke={isAngular ? 'var(--accento)' : 'var(--linea-forte)'}
        stroke-width={isAngular ? 2.5 : 1}
      />
      <text x={label.x} y={label.y} class="numero-casa" text-anchor="middle" dominant-baseline="central"
        >{house.number}</text
      >
    {/each}

    <!-- Etichette degli assi -->
    {#each [['ASC', chart.angles!.ascendant], ['MC', chart.angles!.midheaven], ['DSC', chart.angles!.descendant], ['IC', chart.angles!.imumCoeli]] as const as [label, longitude] (label)}
      {@const position = toXY(longitude, R_ZODIAC_OUT + 14)}
      <text
        x={position.x}
        y={position.y}
        class="etichetta-asse"
        text-anchor="middle"
        dominant-baseline="central">{label}</text
      >
    {/each}
  {/if}

  <!-- Linee degli aspetti -->
  <g class="aspetti">
    {#each visibleAspects as aspect, index (index)}
      {@const from = toXY(longitudeOf(aspect.from), R_ASPECT)}
      {@const to = toXY(longitudeOf(aspect.to), R_ASPECT)}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={ASPECT_COLOR[aspect.aspect]}
        stroke-width={aspect.orb < 2 ? 1.8 : 1}
        stroke-opacity={Math.max(0.2, 0.85 - aspect.orb / 12)}
        stroke-dasharray={aspect.aspect === 'congiunzione' ? '4 3' : undefined}
      />
    {/each}
  </g>

  <!-- Corpi celesti -->
  {#each placedBodies as { body, display } (body.id)}
    {@const glyph = toXY(display, R_PLANET)}
    {@const tickOuter = toXY(body.longitude, R_HOUSE_RING)}
    {@const tickInner = toXY(body.longitude, R_PLANET + 16)}
    {@const dimmed = highlighted !== null && highlighted !== body.id}
    <g class="corpo" class:attenuato={dimmed} opacity={dimmed ? 0.3 : 1}>
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
        text-anchor="middle"
        dominant-baseline="central"
      >
        {BODY_GLYPH[body.id]}
        <title>{bodyLabel(body)}</title>
      </text>
      {#if body.retrograde}
        {@const mark = toXY(display, R_PLANET - 22)}
        <text x={mark.x} y={mark.y} class="retrogrado" text-anchor="middle" dominant-baseline="central"
          >℞</text
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
  }

  .glifo-segno {
    font-size: 30px;
  }

  .glifo-corpo {
    font-size: 27px;
    fill: var(--testo);
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
  }
</style>
