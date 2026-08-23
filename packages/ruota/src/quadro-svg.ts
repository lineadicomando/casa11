/**
 * Il quadro vedico come stringa SVG.
 *
 * A differenza della ruota non ha un gemello interattivo, ed è una scelta: la
 * ruota ne ha uno perché ci si sceglie un corpo e se ne isolano gli aspetti,
 * mentre qui non c'è niente di equivalente da offrire — le drishti si contano
 * a segni interi, non sono linee da illuminare. La pagina inserisce quindi
 * **questo stesso disegno**, con la garanzia che il file scaricato e quello a
 * schermo siano lo stesso oggetto. Se un giorno servisse l'interattività, la
 * geometria è già condivisa in `quadro.ts`, che è ciò che renderebbe economico
 * quel cambio.
 *
 * Le tre differenze dal disegno di pagina della ruota valgono anche qui: i
 * colori sono scritti e non ereditati da `var()`, sotto tutto c'è un
 * rettangolo di fondo, e non ci sono bersagli del tocco.
 */

import { SIGN_ELEMENT, SIGN_GLYPH } from './glyphs.js';
import type { BodyId } from './types.js';
import { CHIARA, type Palette } from './palette.js';
import {
  celleQuadro,
  centroInscritto,
  corpoCheEntra,
  distanzaDalBordo,
  ritaglia,
  GRAHA_SIGLA,
  QUADRO_SIZE,
  type BloccoDiTesto,
  type CellaQuadro,
  type Punto,
  type SquareChart,
  type StileQuadro,
} from './quadro.js';

/** Margine attorno al riquadro: qui niente sporge, serve solo a non tagliare il bordo. */
export const QUADRO_PADDING = 16;

/**
 * La larghezza di ogni sigla, in **multipli del corpo del carattere**.
 *
 * Misurate su DejaVu Sans, che è il font che il PNG carica e il primo che il
 * documento nomina. Servono a decidere quanto grande scrivere: senza, per
 * sapere se una riga ci sta bisognerebbe disegnarla, e il disegno è a valle
 * della decisione.
 *
 * **Una per sigla e non una per numero di sigle**: «Mo Ve Ju» e «Su Mo Me»
 * sono tre sigle tutt'e due, ma la seconda è più larga di mezzo em, e tarare
 * tutte le righe da tre sulla più larga possibile ruba corpo a ogni riga che
 * larga non è. È la stessa ragione per cui il corpo non è più una costante:
 * una misura di caso peggiore applicata al caso normale.
 */
const LARGHEZZA_SIGLA: Readonly<Partial<Record<BodyId, number>>> = {
  sole: 1.12,
  luna: 1.33,
  marte: 1.29,
  mercurio: 1.33,
  giove: 0.89,
  venere: 1.17,
  saturno: 1.1,
  'nodo-nord': 1.1,
  'nodo-sud': 1.07,
};

/** Lo spazio che separa due sigle sulla stessa riga. */
const LARGHEZZA_SPAZIO = 0.51;

/**
 * Il segno di retrogradazione appeso a una sigla: quanto la allarga, quanto è
 * grande e quanto sta in alto — tutto in multipli del corpo della riga.
 *
 * **Nel colore della sigla e non in quello tenue**, che è la sola differenza
 * dalla ruota. Là le sigle sono del colore del testo e il grigio serve a
 * mettere il segno un gradino sotto; qui le sigle portano già il colore
 * dell'elemento, e un ℞ grigio accanto a una sigla colorata si stacca invece
 * di appartenerle — oltre a non accendersi con lei quando la pagina la
 * illumina. A metterlo un gradino sotto bastano il corpo e l'apice.
 */
const RETROGRADO = { larghezza: 0.5, corpo: 0.5, apice: 0.28 } as const;

/** Quella dell'intestazione, glifo del segno e numero della casa insieme. */
const LARGHEZZA_INTESTAZIONE = 2.2;

/** Quanto del corpo il testo occupa in altezza, e quanto passa fra due righe. */
const ALTEZZA_RIGA = 0.8;
const PASSO_RIGA = 1.25;

/** Quante sigle stanno su una riga prima di andare a capo. */
const SIGLE_PER_RIGA = 3;

/**
 * Il corpo oltre il quale non si sale, per quanto spazio ci sia.
 *
 * Serve al rombo del nord, che è largo il doppio dei triangoli che gli stanno
 * intorno: lasciarlo crescere quanto potrebbe darebbe a due sigle un corpo da
 * titolo. Oltre un certo punto il testo smette di sembrare grande e comincia a
 * sembrare sbagliato.
 */
const TETTO = 46;

/**
 * L'aria che resta fra il testo e le pareti della cella.
 *
 * `corpoCheEntra` restituisce il corpo che *tocca* il bordo, che è il limite e
 * non una misura da usare. Un settimo scarso di margine è quanto basta perché
 * la cella sembri contenere il testo invece di stringerlo.
 */
const MARGINE = 0.86;

/**
 * Quanto il cartellino sta sotto le sigle.
 *
 * Il segno e il numero della casa dicono dove si è, non che cosa c'è: sono
 * l'etichetta della cella e non il suo contenuto. Nel sud il segno per giunta
 * è dato dalla posizione e nel nord lo è la casa, quindi in entrambi gli stili
 * metà del cartellino ripete qualcosa che il disegno già dice.
 *
 * **Non è però il rapporto fra le due misure finali**, che il nome lo
 * prometterebbe: si applica alla stima della prima passata, cioè a quanto
 * starebbe nella cella intera. Le sigle poi hanno solo lo spazio che il
 * cartellino lascia, e finiscono più in basso di quella stima — nel sud di
 * pochissimo, nel nord di più, perché là il ritaglio morde il triangolo. Il
 * rapporto che si vede sul disegno finito è quindi un po' più alto di questo
 * numero, e non identico nei due stili.
 */
const RAPPORTO_INTESTAZIONE = 0.85;

/** E il numero della casa sta sotto il glifo del segno, per la stessa ragione. */
const RAPPORTO_NUMERO = 0.62;

const FONT = "'DejaVu Sans', system-ui, sans-serif";

export interface OpzioniQuadro {
  palette?: Palette;
  /**
   * Quale dei due stili. Default: `sud`.
   *
   * Il predefinito è quello che si disegna sempre. Lo stile del nord ha le
   * case fisse e senza lagna non si può disegnare affatto: farlo scegliere
   * esplicitamente evita che un tema senza ora di nascita sollevi da un
   * predefinito che chi chiama non ha scelto.
   */
  stile?: StileQuadro;
  /** Descrizione per chi non vede il disegno. */
  label?: string;
}

/**
 * Disegna il quadro e restituisce un documento SVG completo.
 *
 * Autosufficiente come quello della ruota: si apre in un browser, in un editor
 * vettoriale o si rasterizza.
 *
 * Prende un `SquareChart`, che un `VargaChart` del motore soddisfa così com'è:
 * lo stesso disegno vale per la carta rashi — che è il varga D-1 — e per tutte
 * le divisionali.
 */
export function quadroSvg(chart: SquareChart, opzioni: OpzioniQuadro = {}): string {
  const { palette = CHIARA, stile = 'sud', label } = opzioni;

  const celle = celleQuadro(chart, stile);
  // Il ℞ è un segno grafico, e chi il disegno non lo vede non lo incontra:
  // qui si dice a parole quel che là si vede a colpo d'occhio.
  const vakri = celle[0]?.vakri ?? new Set<BodyId>();
  const retrogradi =
    vakri.size > 0
      ? `; retrogradi: ${[...vakri].map((graha) => GRAHA_SIGLA[graha] ?? graha).join(', ')}`
      : '';

  // La coda si aggiunge anche a una descrizione altrui: chi chiama sa che
  // carta è, ma quali graha siano retrogradi lo sa solo chi la disegna.
  const descrizione =
    (label ??
      `Quadro vedico in stile ${stile === 'nord' ? 'nord-indiano' : 'sud-indiano'}, ` +
        'con i nove graha nei dodici segni') + retrogradi;

  const pezzi: string[] = [
    `<rect x="${-QUADRO_PADDING}" y="${-QUADRO_PADDING}" width="${
      QUADRO_SIZE + QUADRO_PADDING * 2
    }" height="${QUADRO_SIZE + QUADRO_PADDING * 2}" fill="${palette.sfondo}"/>`,
  ];

  const layout = impagina(celle, stile);
  for (const cella of celle) pezzi.push(...disegnaCella(cella, stile, palette, layout));

  const vista = `${-QUADRO_PADDING} ${-QUADRO_PADDING} ${QUADRO_SIZE + QUADRO_PADDING * 2} ${
    QUADRO_SIZE + QUADRO_PADDING * 2
  }`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vista}" width="${
      QUADRO_SIZE + QUADRO_PADDING * 2
    }" height="${QUADRO_SIZE + QUADRO_PADDING * 2}" font-family="${FONT}" role="img" aria-label="${esc(
      descrizione,
    )}">`,
    `<title>${esc(descrizione)}</title>`,
    ...pezzi,
    '</svg>',
  ].join('\n');
}

/** Dove va il contenuto di ogni cella, e con che corpo si scrive. */
interface Impaginazione {
  /** Dove va il blocco dei graha, per cella. */
  ancora: Map<CellaQuadro, Punto>;
  /** Dove va il centro dell'intestazione. */
  testa: Map<CellaQuadro, Punto>;
  corpoSigla: number;
  corpoIntestazione: number;
}

/**
 * Il cartellino di una cella: dove sta, e da che parte è stato spinto.
 *
 * La direzione serve al ritaglio: è la stessa lungo cui il cartellino si è
 * allontanato dal centro, e quindi la normale della retta che lo separa dai
 * graha.
 */
interface Testa {
  punto: Punto;
  /** Versore che dal corpo della cella punta verso il cartellino. */
  fuori: Punto;
}

/**
 * Impagina il quadro: **una misura sola per tutto il disegno, ricavata dalla
 * cella che sta peggio.**
 *
 * Non una per cella: celle vicine con corpi diversi si leggono come un errore
 * di stampa, e il quadro è una tabella, non una nuvola di etichette. E non una
 * costante, che è ciò che c'era prima: una costante deve reggere nove graha in
 * un triangolo d'angolo del nord, e quel caso si trova cercandolo. Applicarla
 * al tema mediano — sei celle occupate su dodici, una o due sigle per cella —
 * vuol dire scrivere in venti punti dentro caselle che ne reggono
 * quarantacinque, ed è la ragione per cui il quadro sembrava vuoto.
 *
 * Due passate, perché le due misure si tengono per la coda: il cartellino è
 * una frazione delle sigle, e le sigle hanno solo lo spazio che il cartellino
 * lascia. Si stima, si posa il cartellino, si rimisura al netto di quello.
 */
function impagina(celle: readonly CellaQuadro[], stile: StileQuadro): Impaginazione {
  // Prima passata: quanto starebbe nella cella intera. Serve solo a decidere
  // quanto grande fare il cartellino, che è una frazione di quella misura.
  const provvisorio = minimo(celle, (cella) =>
    corpoCheEntra(cella.polygon, centroInscritto(cella.polygon), bloccoDeiGraha(cella), TETTO),
  );

  // L'intestazione si posa prima e si misura dopo: dove vada dipende da quanto
  // è grande, e quanto possa essere grande dipende da dove si trova. Si rompe
  // il giro puntando alla misura voluta e ridimensionando se là non ci sta.
  const mira = Math.min(TETTO, provvisorio * MARGINE) * RAPPORTO_INTESTAZIONE;
  const teste = new Map(celle.map((cella) => [cella, testaDellaCella(cella, stile, mira)]));

  const corpoIntestazione = Math.min(
    mira,
    MARGINE *
      minimo(celle, (cella) =>
        corpoCheEntra(
          cella.polygon,
          (teste.get(cella) as Testa).punto,
          { righe: [LARGHEZZA_INTESTAZIONE], altezza: ALTEZZA_RIGA, passo: PASSO_RIGA },
          mira / MARGINE,
        ),
      ),
  );

  // Seconda passata sulla cella al netto del cartellino. Il blocco dei graha
  // può solo rimpicciolirsi rispetto alla prima, mai crescere: il ritaglio
  // toglie spazio e non ne aggiunge.
  const zone = new Map(
    celle.map((cella) => [cella, zonaDeiGraha(cella, teste.get(cella) as Testa, corpoIntestazione)]),
  );
  const ancora = new Map(
    [...zone].map(([cella, zona]) => [cella, centroInscritto(zona)] as const),
  );

  const corpoSigla = Math.min(
    TETTO,
    MARGINE *
      minimo(celle, (cella) =>
        corpoCheEntra(
          zone.get(cella) as Punto[],
          ancora.get(cella) as Punto,
          bloccoDeiGraha(cella),
          TETTO,
        ),
      ),
  );

  return {
    ancora,
    testa: new Map([...teste].map(([cella, testa]) => [cella, testa.punto] as const)),
    corpoSigla,
    corpoIntestazione,
  };
}

/**
 * La cella meno la fascia in cui sta il cartellino.
 *
 * Si taglia perpendicolarmente alla direzione in cui il cartellino è stato
 * spinto, appena al di qua di questo. Nel sud quella direzione è l'alto per
 * tutte e dodici le caselle; nel nord è il raggio che va verso la cornice, e
 * cambia con la cella.
 */
function zonaDeiGraha(cella: CellaQuadro, testa: Testa, corpo: number): Punto[] {
  // Il cartellino sporge di mezzo corpo scarso dal suo centro: sette decimi
  // lo scavalcano e lasciano un terzo di corpo d'aria. Di più non serve, e nel
  // nord costa — là ogni punto tolto al triangolo è un punto tolto alle sigle.
  const stacco = corpo * 0.72;
  const taglio = {
    x: testa.punto.x - testa.fuori.x * stacco,
    y: testa.punto.y - testa.fuori.y * stacco,
  };

  const zona = ritaglia(cella.polygon, taglio, testa.fuori);

  // Un cartellino grande dentro una cella piccola può non lasciare niente.
  // Meglio il blocco stretto della cella intera che nessun blocco: sarà la
  // misura del corpo, poi, a tenerlo dentro.
  return zona.length >= 3 ? zona : [...cella.polygon];
}

/** Le righe di sigle di una cella, misurate in em. Una cella vuota non vincola nessuno. */
function bloccoDeiGraha(cella: CellaQuadro): BloccoDiTesto {
  return {
    righe: aCapo(cella.bodies, SIGLE_PER_RIGA).map((riga) =>
      larghezzaDellaRiga(riga, cella.vakri),
    ),
    altezza: ALTEZZA_RIGA,
    passo: PASSO_RIGA,
  };
}

/**
 * Quanto è larga una riga di sigle, in em.
 *
 * La somma dei pezzi più gli spazi. Sovrastima di poco la riga vera — le
 * misure sono degli inchiostri, e messe in fila due sigle si stringono di
 * qualche centesimo — e **sovrastima è il verso giusto**: chi decide un corpo
 * di carattere da questo numero, sbagliando per eccesso scrive un po' più
 * piccolo, sbagliando per difetto manda il testo fuori dalla cella.
 */
function larghezzaDellaRiga(riga: readonly BodyId[], vakri: ReadonlySet<BodyId>): number {
  const sigle = riga.reduce(
    (somma, graha) =>
      somma + (LARGHEZZA_SIGLA[graha] ?? 1.4) + (vakri.has(graha) ? RETROGRADO.larghezza : 0),
    0,
  );

  return sigle + Math.max(0, riga.length - 1) * LARGHEZZA_SPAZIO;
}

function minimo(celle: readonly CellaQuadro[], quanto: (cella: CellaQuadro) => number): number {
  return celle.reduce((meno, cella) => Math.min(meno, quanto(cella)), Infinity);
}

/**
 * Dove sta la testa della cella, cioè il suo cartellino.
 *
 * **I due stili chiedono due regole**, ed è la stessa divergenza che
 * `celleQuadro` ha già: il sud è una griglia e si legge come una tabella, dove
 * i cartellini devono stare tutti nello stesso spigolo o non sembrano una
 * colonna; il nord è una raggiera attorno a un centro, dove «lo stesso
 * spigolo» non vuol dire niente e il posto naturale è in fuori, sul lato che
 * dà sulla cornice.
 *
 * Sta qui e non in `quadro.ts` per la ragione di sempre: la forma di una cella
 * è un fatto e resta quella, dove convenga scrivere è una scelta del disegno.
 */
function testaDellaCella(cella: CellaQuadro, stile: StileQuadro, corpo: number): Testa {
  if (stile === 'sud') {
    const x = Math.min(...cella.polygon.map((punto) => punto.x));
    const y = Math.min(...cella.polygon.map((punto) => punto.y));

    // Nella casella del lagna lo spigolo è già occupato dalla diagonale, che
    // è la marca con cui questi quadri si stampano da sempre e non si tocca.
    // Il cartellino le passa sotto invece di attraversarla.
    const scarto = cella.lagna ? tagliaDelLagna(cella.polygon) : 0;

    return {
      punto: { x: x + scarto + corpo * (LARGHEZZA_INTESTAZIONE / 2 + 0.35), y: y + corpo * 0.85 },
      fuori: { x: 0, y: -1 },
    };
  }

  // Nel nord si esce dal centro inscritto lungo il raggio che viene dal centro
  // del quadro, e ci si ferma quando il bordo si avvicina troppo. Gli ultimi
  // due decimi si lasciano: appiccicato alla cornice il cartellino sembra
  // appartenere a quella e non alla cella.
  const centro = centroInscritto(cella.polygon);
  const origine = QUADRO_SIZE / 2;
  const lunghezza = Math.hypot(centro.x - origine, centro.y - origine) || 1;
  const fuori = { x: (centro.x - origine) / lunghezza, y: (centro.y - origine) / lunghezza };
  const passo = quantoSiEsce(cella.polygon, centro, fuori, corpo * 0.6);

  return {
    punto: { x: centro.x + fuori.x * passo * 0.8, y: centro.y + fuori.y * passo * 0.8 },
    fuori,
  };
}

/** Quanto si può camminare da `da` nella direzione data restando a `margine` dal bordo. */
function quantoSiEsce(
  polygon: readonly Punto[],
  da: Punto,
  verso: Punto,
  margine: number,
): number {
  let dentro = 0;
  let fuori = QUADRO_SIZE;

  for (let giro = 0; giro < 30; giro += 1) {
    const mezzo = (dentro + fuori) / 2;
    const punto = { x: da.x + verso.x * mezzo, y: da.y + verso.y * mezzo };
    if (distanzaDalBordo(polygon, punto) >= margine) dentro = mezzo;
    else fuori = mezzo;
  }

  return dentro;
}

function disegnaCella(
  cella: CellaQuadro,
  stile: StileQuadro,
  palette: Palette,
  layout: Impaginazione,
): string[] {
  const pezzi: string[] = [];
  const colore = palette.elementi[SIGN_ELEMENT[cella.sign]];

  // Il bordo del lagna prende l'accento e uno spessore doppio. Nel nord la
  // prima casa sta sempre in alto e il segno sarebbe superfluo; si marca
  // ugualmente, perché chi non conosce la disposizione a memoria non ha altro
  // modo di trovarla.
  pezzi.push(
    `<path d="${percorso(cella.polygon)}" fill="${colore}" fill-opacity="${
      cella.lagna ? 0.14 : 0.05
    }" stroke="${cella.lagna ? palette.accento : palette.quadrante}" stroke-width="${
      cella.lagna ? 2.5 : 1.25
    }"/>`,
  );

  // Il segno del lagna porta anche la diagonale d'angolo, che è il modo in cui
  // lo si marca nei quadri del sud da sempre. Nel nord non si usa: là il lagna
  // è la posizione stessa.
  if (cella.lagna && stile === 'sud') pezzi.push(diagonaleDelLagna(cella.polygon, palette));

  pezzi.push(...intestazione(cella, layout, colore, palette));

  // Le sigle stanno da sole al centro della cella, e l'intestazione è uscita
  // dalla pila: una cella vuota si legge allora come una cella etichettata e
  // vuota, invece che come una cella con dentro un glifo perso.
  const righe = aCapo(cella.bodies, SIGLE_PER_RIGA);
  if (righe.length === 0) return pezzi;

  const { corpoSigla } = layout;
  const ancora = layout.ancora.get(cella) as Punto;
  const passo = corpoSigla * PASSO_RIGA;
  const prima = ancora.y - (righe.length * passo) / 2 + passo / 2;

  pezzi.push(
    ...righe.map((riga, indice) =>
      rigaDiSigle(ancora.x, prima + indice * passo, riga, cella.vakri, corpoSigla, colore),
    ),
  );

  return pezzi;
}

/** Spezza i graha di una cella in righe da al massimo `quanti`. */
function aCapo(bodies: readonly BodyId[], quanti: number): BodyId[][] {
  const righe: BodyId[][] = [];
  for (let i = 0; i < bodies.length; i += quanti) righe.push([...bodies.slice(i, i + quanti)]);
  return righe;
}

/**
 * Una riga di sigle, **una `tspan` per graha**.
 *
 * Non un testo solo con le sigle unite da uno spazio, che sarebbe più corto da
 * scrivere: così ogni graha ha un nodo suo con il proprio nome sopra, e chi
 * inserisce il quadro in una pagina può illuminarne uno senza rigenerare il
 * disegno. Nel file scaricato gli attributi non danno fastidio a nessuno.
 *
 * Le sigle prendono **il colore dell'elemento del segno che le ospita**, lo
 * stesso del velo della cella e del glifo in testa. Non è una classificazione
 * dei graha, che sarebbe una dottrina e non spetta al disegno dichiararla: è
 * la cella che si legge come una cosa sola invece che come una cornice colorata
 * con dentro del testo grigio.
 */
function rigaDiSigle(
  x: number,
  y: number,
  riga: readonly BodyId[],
  vakri: ReadonlySet<BodyId>,
  corpo: number,
  colore: string,
): string {
  const pezzi: string[] = [];

  riga.forEach((graha, indice) => {
    // Lo spazio che separa due sigle è anche ciò che rimette in riga la
    // seconda quando la prima porta il marchio: vedi `marchioVakri`.
    const precedente = riga[indice - 1];
    if (indice > 0) {
      pezzi.push(
        precedente !== undefined && vakri.has(precedente)
          ? `<tspan dy="${n(corpo * RETROGRADO.apice)}"> </tspan>`
          : ' ',
      );
    }

    pezzi.push(
      `<tspan data-graha="${esc(graha)}">${esc(GRAHA_SIGLA[graha] ?? graha)}${
        vakri.has(graha) ? marchioVakri(corpo) : ''
      }</tspan>`,
    );
  });

  return `<text x="${n(x)}" y="${n(y)}" font-size="${n(
    corpo,
  )}" fill="${colore}" text-anchor="middle" dominant-baseline="central">${pezzi.join('')}</text>`;
}

/**
 * Il ℞ dei graha *vakri*, i retrogradi.
 *
 * **Sta dentro la `tspan` del graha**, non accanto: chi accende una sigla
 * accende anche il suo marchio, che di quella sigla fa parte.
 *
 * Lo `dy` che lo alza va poi disfatto, perché nell'SVG uno scostamento sposta
 * la posizione corrente e ci resta: senza contrappeso il resto della riga se
 * ne andrebbe in su. Il contrappeso però **non può stare su una `tspan`
 * vuota** — uno `dy` si applica al primo carattere del suo contenuto, e senza
 * contenuto non si applica affatto — quindi lo porta lo spazio che separa la
 * sigla dalla successiva, che un carattere è. Dopo l'ultima sigla non serve:
 * non c'è più niente da rimettere in riga.
 *
 * Chi rasterizza qui lo scostamento non se lo porta dietro e il difetto non si
 * vedrebbe in un PNG: si vedeva solo nella pagina.
 */
function marchioVakri(corpo: number): string {
  return `<tspan dy="${n(-corpo * RETROGRADO.apice)}" font-size="${n(
    corpo * RETROGRADO.corpo,
  )}">℞</tspan>`;
}

/** Il glifo del segno e, se c'è, il numero della casa: in testa alla cella. */
function intestazione(
  cella: CellaQuadro,
  layout: Impaginazione,
  colore: string,
  palette: Palette,
): string[] {
  const { corpoIntestazione: corpo } = layout;
  const testa = layout.testa.get(cella) as Punto;

  // Il glifo sta dove sta anche quando il numero non c'è: un tema senza ora di
  // nascita non ha case, e i suoi cartellini devono restare in colonna con
  // quelli di uno che ce l'ha.
  const pezzi = [testo(testa.x - corpo * 0.52, testa.y, SIGN_GLYPH[cella.sign], corpo, colore)];
  if (cella.house === undefined) return pezzi;

  // Il numero sta a destra del glifo, più piccolo e più tenue: dice una cosa
  // che nel sud si muove e nel nord è già nella posizione, quindi non deve
  // contendere l'occhio al segno.
  pezzi.push(
    testo(
      testa.x + corpo * 0.62,
      testa.y,
      String(cella.house),
      corpo * RAPPORTO_NUMERO,
      palette.testoTenue,
    ),
  );

  return pezzi;
}

/** Quanto lato la diagonale del lagna taglia. */
function tagliaDelLagna(polygon: readonly Punto[]): number {
  const xs = polygon.map((punto) => punto.x);
  return (Math.max(...xs) - Math.min(...xs)) * 0.32;
}

/**
 * La diagonale che nel quadro del sud marca la casella del lagna.
 *
 * Va dall'angolo in alto a sinistra della cella verso l'interno, tagliandone
 * un triangolo: è la convenzione con cui questi quadri si stampano, e vale
 * come segno d'orientamento per chi la sa leggere.
 */
function diagonaleDelLagna(polygon: readonly Punto[], palette: Palette): string {
  const x = Math.min(...polygon.map((punto) => punto.x));
  const y = Math.min(...polygon.map((punto) => punto.y));
  const taglio = tagliaDelLagna(polygon);

  return `<path d="M ${n(x)} ${n(y + taglio)} L ${n(x + taglio)} ${n(y)}" stroke="${
    palette.accento
  }" stroke-width="2" fill="none"/>`;
}

function percorso(polygon: readonly Punto[]): string {
  const punti = polygon.map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${n(punto.x)} ${n(punto.y)}`);
  return `${punti.join(' ')} Z`;
}

function testo(
  x: number,
  y: number,
  contenuto: string,
  corpoCarattere: number,
  colore: string,
): string {
  return `<text x="${n(x)}" y="${n(y)}" font-size="${n(
    corpoCarattere,
  )}" fill="${colore}" text-anchor="middle" dominant-baseline="central">${esc(
    contenuto,
  )}</text>`;
}

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
