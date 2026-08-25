import type {
  AspectId,
  BodyId,
  Element,
  Modality,
  NatalPointId,
  ZodiacSign,
} from './types.js';

/**
 * Ordine dei segni, ridichiarato invece di venire dal motore di calcolo.
 *
 * Non è duplicazione gratuita, ed è la stessa ragione per cui questo pacchetto
 * non importa affatto da `@dodicisegni/core`: importarne un *valore* ne
 * trascinerebbe l'intero grafo nel bundle del browser — effemeridi e modulo
 * nativo compresi — e importarne un *tipo* creerebbe il ciclo di compilazione
 * spiegato in `types.ts`.
 */
export const ZODIAC_ORDER: readonly ZodiacSign[] = [
  'ariete',
  'toro',
  'gemelli',
  'cancro',
  'leone',
  'vergine',
  'bilancia',
  'scorpione',
  'sagittario',
  'capricorno',
  'acquario',
  'pesci',
];

export function signOfLongitude(longitude: number): ZodiacSign {
  const normalized = ((longitude % 360) + 360) % 360;
  return ZODIAC_ORDER[Math.floor(normalized / 30)] ?? 'ariete';
}

/**
 * Variante testuale, U+FE0E.
 *
 * I dodici simboli zodiacali stanno nel blocco a cui Unicode assegna
 * presentazione **emoji** predefinita: senza questo selettore i font di
 * sistema li disegnano come pittogrammi colorati, e la ruota si riempie di
 * cerchietti. Va anche sui pianeti, dove ♀ e ♂ hanno lo stesso problema su
 * parte delle piattaforme; sui simboli già testuali è ignorato.
 */
const TESTO = '\uFE0E';

/**
 * Simboli astrologici Unicode: sono in tutti i font di sistema, quindi la
 * ruota non richiede un font dedicato né immagini.
 */
export const BODY_GLYPH: Readonly<Record<BodyId, string>> = {
  sole: `☉${TESTO}`,
  luna: `☽${TESTO}`,
  mercurio: `☿${TESTO}`,
  venere: `♀${TESTO}`,
  marte: `♂${TESTO}`,
  giove: `♃${TESTO}`,
  saturno: `♄${TESTO}`,
  urano: `♅${TESTO}`,
  nettuno: `♆${TESTO}`,
  plutone: `♇${TESTO}`,
  'nodo-nord': `☊${TESTO}`,
  'nodo-sud': `☋${TESTO}`,
  lilith: `⚸${TESTO}`,
  chirone: `⚷${TESTO}`,
};

/** Punti calcolati, non corpi celesti. */
export const POINT_GLYPH = {
  fortuna: `⊗${TESTO}`,
} as const;

export const BODY_LABEL: Readonly<Record<BodyId, string>> = {
  sole: 'Sole',
  luna: 'Luna',
  mercurio: 'Mercurio',
  venere: 'Venere',
  marte: 'Marte',
  giove: 'Giove',
  saturno: 'Saturno',
  urano: 'Urano',
  nettuno: 'Nettuno',
  plutone: 'Plutone',
  'nodo-nord': 'Nodo Nord',
  'nodo-sud': 'Nodo Sud',
  lilith: 'Lilith',
  chirone: 'Chirone',
};

/**
 * Gli assi, che un simbolo astrologico non ce l'hanno.
 *
 * Nella colonna dei glifi ci va la sigla con cui si nominano da sempre, che è
 * comunque più breve del nome. Sono lettere e non disegni, quindi vogliono un
 * corpo minore: `isNatalPointSigla` lo dice ai componenti.
 */
const ANGLE_SIGLA = {
  ascendente: 'ASC',
  'medio-cielo': 'MC',
  discendente: 'DSC',
  'fondo-cielo': 'IC',
} as const satisfies Partial<Record<NatalPointId, string>>;

const POINT_LABEL: Readonly<Partial<Record<NatalPointId, string>>> = {
  ascendente: 'Ascendente',
  'medio-cielo': 'Medio Cielo',
  discendente: 'Discendente',
  'fondo-cielo': 'Fondo Cielo',
  fortuna: 'Parte di Fortuna',
};

/** La stessa mappa vista come parziale su tutti i bersagli possibili. */
const SIGLE: Readonly<Partial<Record<NatalPointId, string>>> = ANGLE_SIGLA;

export function natalPointGlyph(id: NatalPointId): string {
  if (id === 'fortuna') return POINT_GLYPH.fortuna;
  return SIGLE[id] ?? BODY_GLYPH[id as BodyId] ?? id;
}

export function natalPointLabel(id: NatalPointId): string {
  return POINT_LABEL[id] ?? BODY_LABEL[id as BodyId] ?? id;
}

/** `true` quando al posto del glifo c'è una sigla di lettere. */
export function isNatalPointSigla(id: NatalPointId): boolean {
  return id in ANGLE_SIGLA;
}

export const SIGN_GLYPH: Readonly<Record<ZodiacSign, string>> = {
  ariete: `♈${TESTO}`,
  toro: `♉${TESTO}`,
  gemelli: `♊${TESTO}`,
  cancro: `♋${TESTO}`,
  leone: `♌${TESTO}`,
  vergine: `♍${TESTO}`,
  bilancia: `♎${TESTO}`,
  scorpione: `♏${TESTO}`,
  sagittario: `♐${TESTO}`,
  capricorno: `♑${TESTO}`,
  acquario: `♒${TESTO}`,
  pesci: `♓${TESTO}`,
};

export const ASPECT_GLYPH: Readonly<Record<AspectId, string>> = {
  congiunzione: `☌${TESTO}`,
  opposizione: `☍${TESTO}`,
  trigono: `△${TESTO}`,
  quadrato: `□${TESTO}`,
  sestile: `✶${TESTO}`,
  semisestile: `⚺${TESTO}`,
  quinconce: `⚻${TESTO}`,
  semiquadrato: `∠${TESTO}`,
  sesquiquadrato: `⚼${TESTO}`,
};

/**
 * Le due classificazioni dei segni, ridichiarate qui per la stessa ragione di
 * `ZODIAC_ORDER`: sono valori, e un import di valore dal motore ne trascina
 * l'intero grafo nel bundle. I *tipi* invece vengono da lì, dove il conteggio
 * li usa — quelli non pesano niente.
 */
export const SIGN_ELEMENT: Readonly<Record<ZodiacSign, Element>> = {
  ariete: 'fuoco',
  leone: 'fuoco',
  sagittario: 'fuoco',
  toro: 'terra',
  vergine: 'terra',
  capricorno: 'terra',
  gemelli: 'aria',
  bilancia: 'aria',
  acquario: 'aria',
  cancro: 'acqua',
  scorpione: 'acqua',
  pesci: 'acqua',
};

export const SIGN_MODALITY: Readonly<Record<ZodiacSign, Modality>> = {
  ariete: 'cardinale',
  cancro: 'cardinale',
  bilancia: 'cardinale',
  capricorno: 'cardinale',
  toro: 'fisso',
  leone: 'fisso',
  scorpione: 'fisso',
  acquario: 'fisso',
  gemelli: 'mobile',
  vergine: 'mobile',
  sagittario: 'mobile',
  pesci: 'mobile',
};

/** L'ordine in cui i quattro elementi si nominano da sempre. */
export const ELEMENT_ORDER: readonly Element[] = ['fuoco', 'terra', 'aria', 'acqua'];

/** E le tre modalità, dal segno che apre la stagione a quello che la chiude. */
export const MODALITY_ORDER: readonly Modality[] = ['cardinale', 'fisso', 'mobile'];

/**
 * Riferimenti alle custom property, non esadecimali.
 *
 * I valori stanno in `app.css`, dove `light-dark()` ne tiene due per ciascuno:
 * un colore fisso è leggibile su un fondo solo, e la ruota si guarda in
 * entrambi gli aspetti. Qui resta la mappa da elemento a nome del colore, che
 * è l'unica cosa che il dominio abbia da dire in proposito.
 */
export const ELEMENT_COLOR: Readonly<Record<Element, string>> = {
  fuoco: 'var(--elemento-fuoco)',
  terra: 'var(--elemento-terra)',
  aria: 'var(--elemento-aria)',
  acqua: 'var(--elemento-acqua)',
};

/**
 * Colore per classe di aspetto: rosso per quelli di tensione, blu per quelli
 * di scorrevolezza, neutro per congiunzione e aspetti minori. È la convenzione
 * grafica corrente e rende la trama leggibile a colpo d'occhio.
 */
export const ASPECT_COLOR: Readonly<Record<AspectId, string>> = {
  congiunzione: 'var(--aspetto-neutro)',
  opposizione: 'var(--aspetto-tensione)',
  quadrato: 'var(--aspetto-tensione)',
  trigono: 'var(--aspetto-fluidita)',
  sestile: 'var(--aspetto-fluidita)',
  semisestile: 'var(--aspetto-minore)',
  quinconce: 'var(--aspetto-minore)',
  semiquadrato: 'var(--aspetto-minore)',
  sesquiquadrato: 'var(--aspetto-minore)',
};

export const ASPECT_MAJOR: Readonly<Record<AspectId, boolean>> = {
  congiunzione: true,
  opposizione: true,
  trigono: true,
  quadrato: true,
  sestile: true,
  semisestile: false,
  quinconce: false,
  semiquadrato: false,
  sesquiquadrato: false,
};

export const SIGN_LABEL: Readonly<Record<ZodiacSign, string>> = {
  ariete: 'Ariete',
  toro: 'Toro',
  gemelli: 'Gemelli',
  cancro: 'Cancro',
  leone: 'Leone',
  vergine: 'Vergine',
  bilancia: 'Bilancia',
  scorpione: 'Scorpione',
  sagittario: 'Sagittario',
  capricorno: 'Capricorno',
  acquario: 'Acquario',
  pesci: 'Pesci',
};
