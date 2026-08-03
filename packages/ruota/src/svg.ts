/**
 * La ruota come stringa SVG.
 *
 * È il gemello statico di `ChartWheel.svelte`, e i due non si possono
 * accorpare: quello disegna nodi vivi, che si sorvolano e si scelgono, e
 * l'interattività non sopravvive alla serializzazione. Condividono però
 * `wheel.ts` — la geometria, cioè la parte che si sbaglia in silenzio — e
 * `glyphs.ts`, così che a divergere possano essere solo i pesi e i colori.
 *
 * Tre differenze rispetto al disegno della pagina, tutte volute:
 *
 * - i colori sono **scritti**, non ereditati da `var()`, perché fuori dal
 *   documento non esiste nessuna custom property da risolvere;
 * - sotto tutto c'è un rettangolo di fondo, perché un file trasparente perde i
 *   glifi scuri su qualunque fondo scuro;
 * - non ci sono i bersagli del tocco, né i gruppi cliccabili: in un file non
 *   c'è nessun dito.
 */

import type { AspectId, TransitChart } from './types.js';
import { ASPECT_MAJOR, SIGN_ELEMENT, SIGN_GLYPH, ZODIAC_ORDER } from './glyphs.js';
import { CHIARA, type Palette } from './palette.js';
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
  type PlacedPoint,
  type WheelChart,
} from './wheel.js';

/** Ampiezza minima dell'arco di una congiunzione, in gradi. Vedi `ChartWheel`. */
const CONJUNCTION_MIN_SPAN = 5;

/**
 * I corpi dei caratteri, ripresi dal foglio di stile del componente.
 *
 * Stanno qui come numeri perché nel file non c'è nessun foglio di stile: ogni
 * misura va scritta sul nodo che la usa.
 */
const CORPO = {
  glifoSegno: 30,
  glifoCorpo: 27,
  glifoTransito: 24,
  /** ⊗ è un operatore matematico e i font lo disegnano più grande dei pianeti. */
  glifoPunto: 21,
  retrogrado: 13,
  numeroCasa: 15,
  etichettaAsse: 15,
} as const;

/**
 * La pila di font.
 *
 * `system-ui` in un contenitore non risolve niente: DejaVu Sans è l'unico font
 * ampiamente disponibile che porti tutti i simboli astrologici, `⊗` della
 * Parte di Fortuna compreso. Va nominato per primo perché è quello che ci sarà
 * davvero, e gli altri restano per chi apre il file su una macchina vera.
 */
const FONT = "'DejaVu Sans', system-ui, sans-serif";

export interface OpzioniDisegno {
  palette?: Palette;
  /**
   * Transiti da disegnare in un anello esterno. Quando ci sono, le linee al
   * centro sono i loro aspetti al tema e non quelli interni al tema.
   */
  transits?: TransitChart | null;
  /** Descrizione per chi non vede il disegno. */
  label?: string;
  /**
   * Aspetti minori nel disegno.
   *
   * Non è una duplicazione del parametro di calcolo: la carta può averli
   * calcolati e il disegno può volerne fare a meno, perché nove specie di
   * linea sullo stesso cerchio non sono più una trama leggibile.
   */
  aspettiMinori?: boolean;
}

/**
 * Disegna la ruota e restituisce un documento SVG completo.
 *
 * Autosufficiente: si apre in un browser, in un editor vettoriale o si
 * rasterizza, senza portarsi dietro né fogli di stile né font speciali.
 */
export function ruotaSvg(chart: WheelChart, opzioni: OpzioniDisegno = {}): string {
  const {
    palette = CHIARA,
    transits = null,
    label = 'Ruota del tema natale con posizioni planetarie, case e aspetti',
    aspettiMinori = true,
  } = opzioni;

  const R = radiiFor(transits !== null);
  // Senza ora di nascita non esiste un Ascendente: si ripiega su 0° Ariete, e
  // le case non vengono disegnate affatto.
  const rotation = chart.angles?.ascendant ?? 0;
  const hasHouses = chart.houses.length === 12 && chart.angles !== undefined;

  const xy = (longitude: number, radius: number) => polar(longitude, radius, rotation);

  const pezzi: string[] = [];

  pezzi.push(
    `<rect x="${-PADDING}" y="${-PADDING}" width="${SIZE + PADDING * 2}" height="${
      SIZE + PADDING * 2
    }" fill="${palette.sfondo}"/>`,
  );

  // Settori dei segni, colorati per elemento
  for (const [index, sign] of ZODIAC_ORDER.entries()) {
    const start = index * 30;
    const colore = palette.elementi[SIGN_ELEMENT[sign]];
    const a = xy(start, R.zodiacInner);
    const b = xy(start, R.zodiacOuter);
    const c = xy(start + 30, R.zodiacOuter);
    const d = xy(start + 30, R.zodiacInner);
    const mid = xy(start + 15, (R.zodiacOuter + R.zodiacInner) / 2);

    pezzi.push(
      `<path d="M ${n(a.x)} ${n(a.y)} L ${n(b.x)} ${n(b.y)} A ${R.zodiacOuter} ${
        R.zodiacOuter
      } 0 0 0 ${n(c.x)} ${n(c.y)} L ${n(d.x)} ${n(d.y)} A ${R.zodiacInner} ${
        R.zodiacInner
      } 0 0 1 ${n(a.x)} ${n(a.y)} Z" fill="${colore}" fill-opacity="0.12" stroke="${
        palette.quadrante
      }" stroke-width="1.25"/>`,
    );
    pezzi.push(testo(mid.x, mid.y, SIGN_GLYPH[sign], CORPO.glifoSegno, colore));
  }

  // Tacche di grado: ogni 5°, più marcate ogni 10°
  for (let degree = 0; degree < 360; degree += 5) {
    const outer = xy(degree, R.zodiacInner);
    const inner = xy(degree, R.zodiacInner - (degree % 10 === 0 ? 12 : 6));
    pezzi.push(linea(outer, inner, palette.quadrante, 1.25));
  }

  if (R.outerBodies !== undefined) {
    pezzi.push(cerchio(R.houseSpanOuter, palette.quadrante));
  }
  pezzi.push(cerchio(R.houses, palette.quadrante));
  pezzi.push(cerchio(R.aspects, palette.quadrante));

  if (hasHouses) {
    for (const house of chart.houses) {
      const angolare =
        house.number === 1 || house.number === 4 || house.number === 7 || house.number === 10;
      const outer = xy(house.longitude, R.houseSpanOuter);
      const inner = xy(house.longitude, R.aspects);
      const next = chart.houses[house.number % 12]!;
      const span = (next.longitude - house.longitude + 360) % 360;
      const etichetta = xy(house.longitude + span / 2, R.houseNumbers);

      pezzi.push(
        linea(
          outer,
          inner,
          angolare ? palette.accento : palette.quadranteForte,
          angolare ? 2.5 : 1.5,
        ),
      );
      pezzi.push(
        testo(
          etichetta.x,
          etichetta.y,
          String(house.number),
          CORPO.numeroCasa,
          palette.testoTenue,
        ),
      );
    }

    const assi: readonly (readonly [string, number])[] = [
      ['ASC', chart.angles!.ascendant],
      ['MC', chart.angles!.midheaven],
      ['DSC', chart.angles!.descendant],
      ['IC', chart.angles!.imumCoeli],
    ];
    for (const [sigla, longitude] of assi) {
      const posizione = xy(longitude, R.zodiacOuter + 14);
      pezzi.push(
        testo(posizione.x, posizione.y, sigla, CORPO.etichettaAsse, palette.accento, {
          peso: 600,
          spaziatura: '0.04em',
        }),
      );
    }
  }

  for (const line of lineeAspetti(chart, transits, aspettiMinori)) {
    const spessore = line.orb < 2 ? 1.8 : 1;
    // L'orbita si legge dalla trasparenza: stretta è netta, larga è sfumata.
    // Il pavimento è 0,7 — vedi `ChartWheel` e i colori in `app.css`, che sono
    // scelti perché anche la linea più sfumata resti leggibile.
    const opacita = Math.max(0.7, 1 - line.orb / 14);
    const colore = palette.aspetti[line.aspect];

    if (line.aspect === 'congiunzione') {
      // Una corda fra due longitudini quasi uguali è invisibile: l'arco la
      // rende visibile e ne mostra l'ampiezza.
      const d = arcPath(line.from, line.to, R.aspects, rotation, CONJUNCTION_MIN_SPAN);
      pezzi.push(
        `<path d="${d}" fill="none" stroke="${colore}" stroke-width="${
          spessore + 1.2
        }" stroke-opacity="${n(opacita)}" stroke-linecap="round"/>`,
      );
    } else {
      const from = xy(line.from, R.aspects);
      const to = xy(line.to, R.aspects);
      pezzi.push(
        `<line x1="${n(from.x)}" y1="${n(from.y)}" x2="${n(to.x)}" y2="${n(
          to.y,
        )}" stroke="${colore}" stroke-width="${spessore}" stroke-opacity="${n(opacita)}"/>`,
      );
    }
  }

  if (transits && R.outerBodies !== undefined) {
    for (const posato of spread(transitWheelPoints(transits), R.outerSeparation)) {
      pezzi.push(
        ...corpo(posato, {
          xy,
          raggioGlifo: R.outerBodies,
          raggioTratto: [R.zodiacInner, R.outerBodies + 16],
          corpoGlifo: CORPO.glifoTransito,
          colore: palette.accento,
          coloreTratto: palette.accento,
          spessoreTratto: 1,
          palette,
        }),
      );
    }
  }

  for (const posato of spread(natalWheelPoints(chart), R.separation)) {
    pezzi.push(
      ...corpo(posato, {
        xy,
        raggioGlifo: R.bodies,
        raggioTratto: [R.houses, R.bodies + 16],
        corpoGlifo: posato.point.id === 'fortuna' ? CORPO.glifoPunto : CORPO.glifoCorpo,
        colore: palette.testo,
        coloreTratto: palette.quadranteForte,
        spessoreTratto: 1.5,
        palette,
      }),
    );
  }

  const vista = `${-PADDING} ${-PADDING} ${SIZE + PADDING * 2} ${SIZE + PADDING * 2}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vista}" width="${
      SIZE + PADDING * 2
    }" height="${SIZE + PADDING * 2}" font-family="${FONT}" role="img" aria-label="${esc(
      label,
    )}">`,
    `<title>${esc(label)}</title>`,
    ...pezzi,
    '</svg>',
  ].join('\n');
}

interface LineaAspetto {
  aspect: AspectId;
  orb: number;
  from: number;
  to: number;
}

/** Le linee al centro: gli aspetti del tema, o quelli dei transiti a esso. */
function lineeAspetti(
  chart: WheelChart,
  transits: TransitChart | null,
  minori: boolean,
): LineaAspetto[] {
  const grezze = transits
    ? transits.aspects.map((a) => ({
        aspect: a.aspect,
        orb: a.orb,
        from: transits.transiting.find((body) => body.id === a.transiting)?.longitude,
        to: natalPointLongitude(chart, a.natal),
      }))
    : chart.aspects.map((a) => ({
        aspect: a.aspect,
        orb: a.orb,
        from: natalPointLongitude(chart, a.from),
        to: natalPointLongitude(chart, a.to),
      }));

  return grezze.filter(
    (line): line is LineaAspetto =>
      // Un capo mancante — un asse in un tema senza ora — darebbe una linea
      // tirata verso il centro della ruota, che non significa nulla.
      line.from !== undefined && line.to !== undefined && (minori || ASPECT_MAJOR[line.aspect]),
  );
}

interface OpzioniCorpo {
  xy: (longitude: number, radius: number) => { x: number; y: number };
  raggioGlifo: number;
  raggioTratto: readonly [number, number];
  corpoGlifo: number;
  colore: string;
  coloreTratto: string;
  spessoreTratto: number;
  palette: Palette;
}

/**
 * Un corpo: il trattino alla longitudine vera, e il glifo dove `spread` lo ha
 * spostato. I due possono non coincidere, ed è il trattino a dire il dato.
 */
function corpo({ point, display }: PlacedPoint, o: OpzioniCorpo): string[] {
  const glifo = o.xy(display, o.raggioGlifo);
  const fuori = o.xy(point.longitude, o.raggioTratto[0]);
  const dentro = o.xy(point.longitude, o.raggioTratto[1]);

  const marchio = point.retrograde
    ? `<tspan dy="-7" font-size="${CORPO.retrogrado}" fill="${o.palette.testoTenue}">℞</tspan>`
    : '';

  return [
    linea(fuori, dentro, o.coloreTratto, o.spessoreTratto),
    `<text x="${n(glifo.x)}" y="${n(glifo.y)}" font-size="${o.corpoGlifo}" fill="${
      o.colore
    }" text-anchor="middle" dominant-baseline="central">${esc(
      point.glyph,
    )}${marchio}<title>${esc(point.label)}</title></text>`,
  ];
}

function cerchio(raggio: number, colore: string): string {
  return `<circle cx="${CENTER}" cy="${CENTER}" r="${raggio}" fill="none" stroke="${colore}" stroke-width="1.25"/>`;
}

function linea(
  a: { x: number; y: number },
  b: { x: number; y: number },
  colore: string,
  spessore: number,
): string {
  return `<line x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(
    b.y,
  )}" stroke="${colore}" stroke-width="${spessore}"/>`;
}

function testo(
  x: number,
  y: number,
  contenuto: string,
  corpoCarattere: number,
  colore: string,
  extra: { peso?: number; spaziatura?: string } = {},
): string {
  const peso = extra.peso ? ` font-weight="${extra.peso}"` : '';
  const spaziatura = extra.spaziatura ? ` letter-spacing="${extra.spaziatura}"` : '';
  return `<text x="${n(x)}" y="${n(
    y,
  )}" font-size="${corpoCarattere}" fill="${colore}"${peso}${spaziatura} text-anchor="middle" dominant-baseline="central">${esc(
    contenuto,
  )}</text>`;
}

/**
 * Le coordinate arrivano da seni e coseni: senza arrotondamento il file si
 * riempie di diciassette cifre decimali per ogni punto, che nessun disegno usa.
 */
function n(valore: number): string {
  return String(Math.round(valore * 100) / 100);
}

function esc(testoGrezzo: string): string {
  return testoGrezzo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
