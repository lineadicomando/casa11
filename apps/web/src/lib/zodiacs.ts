/**
 * Lo zodiaco e gli ayanamsa, con i nomi da mostrare.
 *
 * Stesso mestiere di `house-systems.ts`, e stessa ragione per stare fuori dal
 * componente che li sceglie: una pagina può arrivare con lo zodiaco già
 * scritto nel proprio indirizzo, e chiedere se quella parola esista non è una
 * domanda da fare a un componente.
 *
 * Del motore si importano i soli **tipi**: un import di valore ne trascinerebbe
 * l'intero grafo nel bundle del browser.
 */

import type { AyanamsaId, Zodiac } from '@undicesimacasa/core';

export const ZODIACS: readonly { value: Zodiac; label: string }[] = [
  { value: 'tropicale', label: 'Tropicale' },
  { value: 'siderale', label: 'Siderale' },
];

/**
 * Gli ayanamsa esposti, nell'ordine in cui conviene incontrarli: prima i due
 * più diffusi, poi gli altri.
 *
 * Sei dei quaranta che Swiss Ephemeris conosce. Gli altri sono ricostruzioni
 * storiche, utili a chi studia l'astronomia antica e non a chi calcola un
 * tema.
 */
export const AYANAMSAS: readonly { value: AyanamsaId; label: string }[] = [
  { value: 'lahiri', label: 'Lahiri' },
  { value: 'true-chitra', label: 'Chitrapaksha vero' },
  { value: 'krishnamurti', label: 'Krishnamurti' },
  { value: 'raman', label: 'Raman' },
  { value: 'yukteshwar', label: 'Yukteshwar' },
  { value: 'fagan-bradley', label: 'Fagan/Bradley' },
];

/**
 * Lo zodiaco scritto in un indirizzo, se è uno dei due che esistono.
 *
 * Come per le case, ripiega invece di far fallire: un carattere sbagliato in
 * una query string non deve aprire la pagina su un messaggio rosso.
 */
export function zodiacOrDefault(value: string | null): Zodiac {
  return ZODIACS.some((zodiac) => zodiac.value === value) ? (value as Zodiac) : 'tropicale';
}

/** L'ayanamsa scritto in un indirizzo, se esiste. Altrimenti Lahiri. */
export function ayanamsaOrDefault(value: string | null): AyanamsaId {
  return AYANAMSAS.some((ayanamsa) => ayanamsa.value === value) ? (value as AyanamsaId) : 'lahiri';
}
