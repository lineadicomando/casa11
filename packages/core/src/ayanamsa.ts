/**
 * Lo zodiaco siderale: le stesse posizioni, contate da un'altra origine.
 *
 * I due zodiaci non sono due astronomie ma due convenzioni su dove cominci
 * l'Ariete. Il tropicale lo fa cominciare al punto vernale, che per via della
 * precessione degli equinozi si sposta all'indietro di circa un grado ogni
 * settantadue anni; il siderale lo àncora alle stelle fisse. Lo scarto fra i
 * due si chiama **ayanamsa** e oggi vale poco più di ventiquattro gradi: quasi
 * un segno intero, il che vuol dire che la stessa persona ha quasi sempre due
 * Soli diversi a seconda della convenzione.
 *
 * Non c'è un ayanamsa giusto. Dipende da quale stella si prenda come chiodo e
 * a quale longitudine la si fissi, e le scuole non concordano: fra Lahiri —
 * l'ufficiale del governo indiano — e Raman corre più di un grado e mezzo,
 * abbastanza da spostare la Luna di un nakshatra. Per questo il valore
 * viaggia col risultato invece di restare implicito: chi rifà il conto con
 * un'altra convenzione deve poter vedere quale si è usata qui.
 *
 * Il calcolo lo fa Swiss Ephemeris, che li conosce tutti e quaranta. Qui se ne
 * espongono sei, e uno sconosciuto viene rifiutato invece che ricondotto al
 * predefinito.
 */

import sweph from 'sweph';
import { ChartError } from './errors.js';
import type { EphemerisContext } from './ephemeris.js';
import type { AyanamsaId, AyanamsaInfo, ZodiacOptions } from './types.js';

interface AyanamsaDefinition {
  id: AyanamsaId;
  name: string;
  /** Nome della costante in `sweph.constants`. */
  swephConstant: string;
}

/**
 * Gli ayanamsa esposti, con il nome che si legge sui libri.
 *
 * Sei e non quaranta: gli altri di Swiss Ephemeris sono ricostruzioni storiche
 * — Suryasiddhanta, Aryabhata, i babilonesi — che servono a chi studia la
 * storia dell'astronomia, non a chi calcola un tema. Aggiungerne uno è una
 * riga qui.
 */
export const AYANAMSAS: readonly AyanamsaDefinition[] = [
  { id: 'lahiri', name: 'Lahiri', swephConstant: 'SE_SIDM_LAHIRI' },
  { id: 'true-chitra', name: 'Chitrapaksha vero', swephConstant: 'SE_SIDM_TRUE_CITRA' },
  { id: 'krishnamurti', name: 'Krishnamurti', swephConstant: 'SE_SIDM_KRISHNAMURTI' },
  { id: 'raman', name: 'Raman', swephConstant: 'SE_SIDM_RAMAN' },
  { id: 'yukteshwar', name: 'Yukteshwar', swephConstant: 'SE_SIDM_YUKTESHWAR' },
  { id: 'fagan-bradley', name: 'Fagan/Bradley', swephConstant: 'SE_SIDM_FAGAN_BRADLEY' },
];

/** L'ayanamsa predefinito: l'ufficiale del governo indiano, e il più diffuso. */
export const DEFAULT_AYANAMSA: AyanamsaId = 'lahiri';

/**
 * Il contesto con cui calcolare nello zodiaco richiesto.
 *
 * **Restituisce una copia e non tocca quello ricevuto**, che `initEphemeris`
 * tiene in cache per percorso: scriverci dentro i flag siderali significherebbe
 * che il primo tema in Lahiri li lascia addosso a tutti quelli dopo, tropicali
 * compresi. Un tema sbagliato di ventiquattro gradi, e nessun errore da nessuna
 * parte.
 *
 * Imposta anche il modo siderale di Swiss Ephemeris, che è **stato globale del
 * modulo nativo**. Perché sia sicuro deve valere che fra qui e l'ultima
 * `calc_ut` della carta non giri l'event loop: è la ragione del vincolo, in
 * `CLAUDE.md`, che vieta `await` nella catena di calcolo. Oggi non ce n'è
 * nessuno.
 */
export function zodiacContext(
  context: EphemerisContext,
  options: ZodiacOptions = {},
): EphemerisContext {
  if ((options.zodiac ?? 'tropicale') === 'tropicale') return context;

  const definition = findAyanamsa(options.ayanamsa ?? DEFAULT_AYANAMSA);
  sweph.set_sid_mode(constantOf(definition), 0, 0);

  return { ...context, flags: context.flags | sweph.constants.SEFLG_SIDEREAL };
}

/**
 * Lo scarto fra i due zodiaci all'istante dato, da riportare accanto al tema.
 *
 * Va chiamata dopo `zodiacContext`, che ha impostato di quale ayanamsa si
 * parli: da sola leggerebbe quello lasciato dall'ultimo calcolo.
 */
export function ayanamsaAt(
  julianDayUT: number,
  context: EphemerisContext,
  id: AyanamsaId,
): AyanamsaInfo {
  const definition = findAyanamsa(id);
  // Il flag dell'effemeride senza `SEFLG_SIDEREAL`: qui si chiede lo scarto,
  // non una posizione già scartata.
  const epheFlag =
    context.mode === 'swisseph' ? sweph.constants.SEFLG_SWIEPH : sweph.constants.SEFLG_MOSEPH;
  const result = sweph.get_ayanamsa_ex_ut(julianDayUT, epheFlag);

  if (result.flag < 0) {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      `Ayanamsa non calcolabile: ${result.error || 'errore sconosciuto'}.`,
    );
  }

  return { id: definition.id, name: definition.name, degrees: result.data };
}

/** L'ayanamsa richiesto, o un errore che elenca quelli ammessi. */
export function findAyanamsa(id: AyanamsaId): AyanamsaDefinition {
  const definition = AYANAMSAS.find((ayanamsa) => ayanamsa.id === id);
  if (!definition) {
    throw new ChartError(
      'AYANAMSA_NON_VALIDO',
      `Ayanamsa "${id}" non riconosciuto. Valori ammessi: ${AYANAMSAS.map((a) => a.id).join(', ')}.`,
    );
  }
  return definition;
}

function constantOf(definition: AyanamsaDefinition): number {
  const value = sweph.constants[definition.swephConstant as keyof typeof sweph.constants];
  if (typeof value !== 'number') {
    throw new ChartError(
      'ERRORE_EFFEMERIDI',
      `Costante Swiss Ephemeris ${definition.swephConstant} non disponibile.`,
    );
  }
  return value;
}
