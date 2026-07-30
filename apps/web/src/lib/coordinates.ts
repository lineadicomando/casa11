/**
 * Lettura e scrittura di coordinate geografiche inserite a mano.
 *
 * L'input viene da fonti eterogenee: un altro programma astrologico che le
 * scrive in sessagesimale (`38°08'N`), una mappa che le dà in decimale
 * (`38.1333`), una tastiera italiana che produce la virgola invece del punto.
 * Accettarle tutte evita che l'utente debba convertirle, cioè evita l'unico
 * punto in cui potrebbe sbagliare la conversione.
 */

export type Axis = 'latitudine' | 'longitudine';

const LIMITE: Record<Axis, number> = { latitudine: 90, longitudine: 180 };

/** Lettere che indicano l'emisfero negativo: Sud, West, Ovest. */
const NEGATIVE = new Set(['S', 'W', 'O']);
const POSITIVE = new Set(['N', 'E']);

/**
 * Interpreta una coordinata scritta a mano.
 *
 * Restituisce `null` se la stringa non è interpretabile o cade fuori
 * dall'intervallo ammesso: il chiamante distingue "non ho ancora finito di
 * scrivere" da "valore valido" senza dover gestire eccezioni.
 *
 * Formati riconosciuti, con o senza spazi:
 *   38.1333   38,1333   -38.1333
 *   38°08'N   38° 08' 12" N   N 38°08'
 *   13°20'E   13°20'O   13°20'W
 */
export function parseCoordinate(input: string, axis: Axis): number | null {
  const testo = input.trim().toUpperCase().replace(/,/g, '.');
  if (testo === '') return null;

  const lettere = [...testo].filter((carattere) => /[A-Z]/.test(carattere));
  // Una sola lettera di emisfero: due indicano un input incoerente ("38N S").
  if (lettere.length > 1) return null;

  const emisfero = lettere[0];
  if (emisfero !== undefined && !NEGATIVE.has(emisfero) && !POSITIVE.has(emisfero)) return null;

  const numeri = testo.match(/-?\d+(?:\.\d+)?/g);
  if (!numeri || numeri.length === 0 || numeri.length > 3) return null;

  const [gradi, primi = '0', secondi = '0'] = numeri;
  const g = Number(gradi);
  const m = Number(primi);
  const s = Number(secondi);
  if (!Number.isFinite(g) || !Number.isFinite(m) || !Number.isFinite(s)) return null;

  // Primi e secondi non possono essere negativi né sforare: `38°-8'` o
  // `38°75'` indicano un errore di battitura, non un valore da correggere.
  if (numeri.length > 1 && (m < 0 || m >= 60 || s < 0 || s >= 60)) return null;

  const magnitudine = Math.abs(g) + m / 60 + s / 3600;
  const negativo = (emisfero !== undefined && NEGATIVE.has(emisfero)) || g < 0;
  // Segno meno ed emisfero negativo insieme si annullerebbero: `-38S` è ambiguo.
  if (g < 0 && emisfero !== undefined && NEGATIVE.has(emisfero)) return null;

  const valore = negativo ? -magnitudine : magnitudine;
  return Math.abs(valore) <= LIMITE[axis] ? valore : null;
}

/** Formatta in decimale, la forma che si rilegge e si ricorregge più facilmente. */
export function formatCoordinate(value: number, decimali = 4): string {
  return value.toFixed(decimali);
}

/** Formatta in sessagesimale con la lettera dell'emisfero, es. `38°08'12"N`. */
export function formatCoordinateDMS(value: number, axis: Axis): string {
  const positivo = value >= 0;
  const lettera = axis === 'latitudine' ? (positivo ? 'N' : 'S') : positivo ? 'E' : 'O';

  const totale = Math.abs(value);
  let gradi = Math.floor(totale);
  const primiDecimali = (totale - gradi) * 60;
  let primi = Math.floor(primiDecimali);
  let secondi = Math.round((primiDecimali - primi) * 60);

  // L'arrotondamento può produrre 60: il riporto va propagato aritmeticamente.
  // Ricalcolare in modo ricorsivo non converge, perché il valore riscritto
  // torna a produrre 59,999… per l'errore in virgola mobile.
  if (secondi === 60) {
    secondi = 0;
    primi += 1;
  }
  if (primi === 60) {
    primi = 0;
    gradi += 1;
  }

  return `${gradi}°${String(primi).padStart(2, '0')}'${String(secondi).padStart(2, '0')}"${lettera}`;
}

const RAGGIO_TERRESTRE_KM = 6371;

/**
 * Distanza in chilometri fra due punti (formula dell'emisenoverso).
 *
 * Serve a mostrare di quanto ci si è allontanati dal punto di riferimento:
 * un errore di segno sulla longitudine produce coordinate perfettamente valide
 * e un tema del tutto sbagliato, ma una distanza di migliaia di chilometri lo
 * rende evidente.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = (gradi: number) => (gradi * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * RAGGIO_TERRESTRE_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
