import type { AspectId, BodyId, NatalPointId, ZodiacSign } from '@undicesimacasa/core';

/**
 * Ordine dei segni, ridichiarato qui invece di importarlo da `@undicesimacasa/core`.
 *
 * Non è duplicazione gratuita: importare un *valore* dal motore di calcolo
 * ne trascinerebbe l'intero grafo nel bundle del browser — effemeridi e
 * modulo nativo compresi. Il client conosce solo i tipi.
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
 * Simboli astrologici Unicode: sono in tutti i font di sistema, quindi la
 * ruota non richiede un font dedicato né immagini.
 */
export const BODY_GLYPH: Readonly<Record<BodyId, string>> = {
  sole: '☉',
  luna: '☽',
  mercurio: '☿',
  venere: '♀',
  marte: '♂',
  giove: '♃',
  saturno: '♄',
  urano: '♅',
  nettuno: '♆',
  plutone: '♇',
  'nodo-nord': '☊',
  'nodo-sud': '☋',
  lilith: '⚸',
  chirone: '⚷',
};

/** Punti calcolati, non corpi celesti. */
export const POINT_GLYPH = {
  fortuna: '⊗',
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
 * I bersagli natali che non sono corpi.
 *
 * Gli assi non hanno un simbolo astrologico: nella colonna dei glifi ci va
 * la sigla con cui si nominano da sempre, che è comunque più breve del nome.
 */
const ANGLE_GLYPH: Readonly<Record<Exclude<NatalPointId, BodyId>, string>> = {
  ascendente: 'ASC',
  'medio-cielo': 'MC',
  discendente: 'DSC',
  'fondo-cielo': 'IC',
  fortuna: POINT_GLYPH.fortuna,
};

const ANGLE_LABEL: Readonly<Record<Exclude<NatalPointId, BodyId>, string>> = {
  ascendente: 'Ascendente',
  'medio-cielo': 'Medio Cielo',
  discendente: 'Discendente',
  'fondo-cielo': 'Fondo Cielo',
  fortuna: 'Parte di Fortuna',
};

/** Le stesse mappe viste come parziali su tutti i bersagli possibili. */
const ANGLE_GLYPHS: Readonly<Partial<Record<NatalPointId, string>>> = ANGLE_GLYPH;
const ANGLE_LABELS: Readonly<Partial<Record<NatalPointId, string>>> = ANGLE_LABEL;

export function natalPointGlyph(id: NatalPointId): string {
  return ANGLE_GLYPHS[id] ?? BODY_GLYPH[id as BodyId] ?? id;
}

export function natalPointLabel(id: NatalPointId): string {
  return ANGLE_LABELS[id] ?? BODY_LABEL[id as BodyId] ?? id;
}

/**
 * `true` quando al posto del glifo c'è una sigla di lettere.
 *
 * Le sigle vanno in corpo minore: alla dimensione dei simboli astrologici
 * sarebbero fuori scala. Si riconoscono dall'essere più lunghe di un
 * carattere, che è la differenza fra una parola e un disegno.
 */
export function isNatalPointSigla(id: NatalPointId): boolean {
  return natalPointGlyph(id).length > 1;
}

export const SIGN_GLYPH: Readonly<Record<ZodiacSign, string>> = {
  ariete: '♈',
  toro: '♉',
  gemelli: '♊',
  cancro: '♋',
  leone: '♌',
  vergine: '♍',
  bilancia: '♎',
  scorpione: '♏',
  sagittario: '♐',
  capricorno: '♑',
  acquario: '♒',
  pesci: '♓',
};

export const ASPECT_GLYPH: Readonly<Record<AspectId, string>> = {
  congiunzione: '☌',
  opposizione: '☍',
  trigono: '△',
  quadrato: '□',
  sestile: '✶',
  semisestile: '⚺',
  quinconce: '⚻',
  semiquadrato: '∠',
  sesquiquadrato: '⚼',
};

export type Element = 'fuoco' | 'terra' | 'aria' | 'acqua';

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

export const ELEMENT_COLOR: Readonly<Record<Element, string>> = {
  fuoco: '#c1512f',
  terra: '#6b7f4a',
  aria: '#c9a227',
  acqua: '#3d6b8c',
};

/**
 * Colore per classe di aspetto: rosso per quelli di tensione, blu per quelli
 * di scorrevolezza, neutro per congiunzione e aspetti minori. È la convenzione
 * grafica corrente e rende la trama leggibile a colpo d'occhio.
 */
export const ASPECT_COLOR: Readonly<Record<AspectId, string>> = {
  congiunzione: '#8a7f6a',
  opposizione: '#c1512f',
  quadrato: '#c1512f',
  trigono: '#3d6b8c',
  sestile: '#3d6b8c',
  semisestile: '#a89c85',
  quinconce: '#a89c85',
  semiquadrato: '#a89c85',
  sesquiquadrato: '#a89c85',
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
