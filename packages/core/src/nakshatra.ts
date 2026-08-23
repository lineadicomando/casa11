/**
 * I nakshatra: la divisione dello zodiaco in ventisette parti invece che in
 * dodici.
 *
 * Sono le tappe di un giro della Luna, non del Sole — ventisette perché tanti
 * sono i giorni in cui la Luna torna al punto di partenza — e ciascuno misura
 * 13°20', cioè 800 primi tondi. Nell'astrologia indiana pesano quanto i segni
 * e in più d'un caso di più: il nakshatra della Luna alla nascita è il dato da
 * cui si ricava la sequenza delle dasha, ed è quello che si chiede quando si
 * chiede a qualcuno «sotto quale stella sei nato».
 *
 * **Valgono solo nello zodiaco siderale.** Non è una preferenza di scuola: un
 * nakshatra è un tratto di cielo fra stelle fisse, e contarlo dal punto vernale
 * lo staccherebbe dalle stelle che lo nominano. Chi chiede un nakshatra su una
 * longitudine tropicale sta facendo una domanda malposta, e il motore lo dice
 * invece di rispondere con un numero.
 *
 * Ogni nakshatra si divide in quattro **pada** di 3°20', che è la scala su cui
 * lavorano i varga.
 */

import { ChartError } from './errors.js';
import { normalize360 } from './math.js';
import type { BodyId, NakshatraId, NakshatraPosition, Zodiac } from './types.js';

/** Ampiezza di un nakshatra in gradi: 360 / 27. */
export const NAKSHATRA_SPAN = 360 / 27;

/** Ampiezza di un pada in gradi: un quarto di nakshatra. */
export const PADA_SPAN = NAKSHATRA_SPAN / 4;

/**
 * I ventisette, nell'ordine in cui la Luna li attraversa a partire da 0°
 * dell'Ariete siderale.
 *
 * I nomi restano in sanscrito e non si traducono: «dimore lunari» è una
 * perifrasi, non un nome, e non si trova in nessun libro.
 */
export const NAKSHATRAS: readonly { id: NakshatraId; name: string }[] = [
  { id: 'ashwini', name: 'Ashwini' },
  { id: 'bharani', name: 'Bharani' },
  { id: 'krittika', name: 'Krittika' },
  { id: 'rohini', name: 'Rohini' },
  { id: 'mrigashira', name: 'Mrigashira' },
  { id: 'ardra', name: 'Ardra' },
  { id: 'punarvasu', name: 'Punarvasu' },
  { id: 'pushya', name: 'Pushya' },
  { id: 'ashlesha', name: 'Ashlesha' },
  { id: 'magha', name: 'Magha' },
  { id: 'purva-phalguni', name: 'Purva Phalguni' },
  { id: 'uttara-phalguni', name: 'Uttara Phalguni' },
  { id: 'hasta', name: 'Hasta' },
  { id: 'chitra', name: 'Chitra' },
  { id: 'swati', name: 'Swati' },
  { id: 'vishakha', name: 'Vishakha' },
  { id: 'anuradha', name: 'Anuradha' },
  { id: 'jyeshtha', name: 'Jyeshtha' },
  { id: 'mula', name: 'Mula' },
  { id: 'purva-ashadha', name: 'Purva Ashadha' },
  { id: 'uttara-ashadha', name: 'Uttara Ashadha' },
  { id: 'shravana', name: 'Shravana' },
  { id: 'dhanishta', name: 'Dhanishta' },
  { id: 'shatabhisha', name: 'Shatabhisha' },
  { id: 'purva-bhadrapada', name: 'Purva Bhadrapada' },
  { id: 'uttara-bhadrapada', name: 'Uttara Bhadrapada' },
  { id: 'revati', name: 'Revati' },
];

/**
 * I nove graha nell'ordine in cui reggono i nakshatra, e con essi le dasha.
 *
 * Nove e non dodici: Urano, Nettuno e Plutone non esistono in questo sistema,
 * che è più vecchio di loro di qualche millennio. Ai sette classici si
 * aggiungono i due nodi lunari, che qui non sono punti calcolati ma graha a
 * pieno titolo, con un nome ciascuno.
 *
 * L'ordine si ripete tre volte lungo i ventisette, ed è **da questa
 * ripetizione** che si ricava il signore di ciascuno: scriverlo a mano in una
 * colonna nasconderebbe la struttura e darebbe ventisette occasioni di
 * sbagliare invece di una.
 */
export const VIMSHOTTARI_ORDER: readonly BodyId[] = [
  'nodo-sud',
  'venere',
  'sole',
  'luna',
  'marte',
  'nodo-nord',
  'giove',
  'saturno',
  'mercurio',
];

/**
 * Come si chiamano i nove graha quando è il Jyotisha a parlare.
 *
 * I sette classici tengono il nome italiano, che chi legge conosce già e che
 * il motore usa dappertutto. I due nodi no: in questo sistema **Rahu e Ketu
 * non sono i nodi dell'orbita lunare**, sono due graha con un nome, e leggere
 * «periodo di Nodo Nord» al posto di «periodo di Rahu» non è una traduzione,
 * è una cosa che nessuno dice.
 */
export const GRAHA_NAMES: Readonly<Partial<Record<BodyId, string>>> = {
  sole: 'Sole',
  luna: 'Luna',
  mercurio: 'Mercurio',
  venere: 'Venere',
  marte: 'Marte',
  giove: 'Giove',
  saturno: 'Saturno',
  'nodo-nord': 'Rahu',
  'nodo-sud': 'Ketu',
};

/** Il nome di un graha, o quello del motore se non è uno dei nove. */
export function grahaName(id: BodyId, fallback: string): string {
  return GRAHA_NAMES[id] ?? fallback;
}

/**
 * Il nakshatra in cui cade una longitudine **siderale**.
 *
 * Prende una longitudine nuda e non una carta, come `signOf`: è una divisione
 * del cerchio, e vale per un corpo, una cuspide o un punto calcolato allo
 * stesso modo.
 */
export function nakshatraOf(siderealLongitude: number): NakshatraPosition {
  const longitude = normalize360(siderealLongitude);
  const index = Math.floor(longitude / NAKSHATRA_SPAN);
  const definition = NAKSHATRAS[index];

  // Irraggiungibile con una longitudine normalizzata, ma il tipo non lo sa e
  // un `!` qui nasconderebbe un errore vero se un giorno la tabella si
  // accorciasse.
  if (!definition) {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      `Longitudine ${siderealLongitude} fuori dai ventisette nakshatra.`,
    );
  }

  const degree = longitude - index * NAKSHATRA_SPAN;

  return {
    id: definition.id,
    name: definition.name,
    index: index + 1,
    lord: VIMSHOTTARI_ORDER[index % 9] as BodyId,
    pada: (Math.floor(degree / PADA_SPAN) + 1) as 1 | 2 | 3 | 4,
    degree,
  };
}

/**
 * Impedisce di chiedere un nakshatra su un tema tropicale.
 *
 * Non è un avvertimento ma un errore, e la differenza sta nel tipo di guasto:
 * un corpo non calcolabile è un pezzo che manca da un risultato per il resto
 * valido, mentre un nakshatra tropicale è un numero che sembra buono e non lo
 * è. Restituirlo con un'avvertenza accanto significherebbe consegnarlo a chi
 * l'avvertenza non la legge.
 */
export function requireSidereal(zodiac: Zodiac, cosa: string): void {
  if (zodiac === 'siderale') return;
  throw new ChartError(
    'ZODIACO_NON_SIDERALE',
    `${cosa} esiste solo nello zodiaco siderale: è un tratto di cielo fra stelle ` +
      'fisse, e contarlo dal punto vernale lo staccherebbe dalle stelle che lo ' +
      'nominano. Ricalcola con zodiac: "siderale".',
  );
}
