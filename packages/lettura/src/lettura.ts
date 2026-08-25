/**
 * Il tema pronto da consegnare a chi lo interpreta.
 *
 * dodicisegni calcola e non interpreta: il significato è di chi consuma.
 * Questo pacchetto non tocca quella divisione, la rende praticabile — mette
 * insieme i dati già calcolati e le istruzioni per leggerli, e lascia
 * l'interpretazione fuori di qui, in un programma che sceglie chi legge.
 *
 * Sta fuori sia da `core` sia da `apps/web` per la stessa ragione di
 * `@dodicisegni/ruota`: **non è né calcolo né interfaccia**, ed è voluto da
 * tutte le superfici — la pagina che lo copia negli appunti, la riga di comando
 * che lo stampa, il server MCP che lo offre come prompt.
 *
 * Da `core` non dipende affatto, e qui costa meno che al disegno: riceve il
 * tema **già impaginato**, cioè una stringa, e non ha modo di calcolarne uno.
 * A produrla è `format.ts` di `core`, ed è la stessa tabella che leggono gli
 * agenti — riformattarla qui la farebbe divergere da quella.
 */

import { JYOTISHA } from './jyotisha.js';
import { TROPICALE } from './tropicale.js';

/**
 * Il sistema astrologico in cui il tema è scritto, che decide quale documento
 * di istruzioni lo accompagni.
 *
 * Due, e **non si estendono: si affiancano**. Un tema vedico ha un altro centro
 * — la Luna e il lagna, non il Sole — altri domicili, aspetti che non sono
 * orbite e un impianto temporale che in occidente non ha corrispettivo. Le
 * istruzioni tropicali applicate a quei dati non danno un errore, danno un
 * ibrido plausibile, che è peggio.
 */
export type Sistema = 'tropicale' | 'jyotisha';

const DOCUMENTI: Readonly<Record<Sistema, string>> = {
  tropicale: TROPICALE,
  jyotisha: JYOTISHA,
};

/**
 * I sistemi ammessi, ricavati dai documenti che esistono davvero.
 *
 * Serve a chi deve rifiutare un parametro sconosciuto invece di ricondurlo al
 * predefinito, e alla prova che ogni documento — non solo il primo — porti i
 * divieti che deve portare.
 */
export const SISTEMI: readonly Sistema[] = Object.keys(DOCUMENTI) as Sistema[];

/** Il documento di istruzioni di un sistema, senza nessun tema attaccato. */
export function istruzioniDi(sistema: Sistema = 'tropicale'): string {
  return DOCUMENTI[sistema];
}

export interface OpzioniLettura {
  /** Quale documento di istruzioni. Default: `tropicale`. */
  sistema?: Sistema;
  /**
   * URL pubblico del sorgente, per la riga di provenienza.
   *
   * Senza default apposta: questo pacchetto non può sapere da dove sia servita
   * la copia che sta girando, e l'AGPL obbliga a offrire **quel** sorgente, non
   * quello di chi ha scritto il programma. Omesso, la riga non compare — un
   * indirizzo promesso e non dato è peggio del silenzio.
   */
  repository?: string;
}

/**
 * Le istruzioni e il tema, in quest'ordine.
 *
 * L'ordine non è indifferente: chi legge incontra prima che cosa farne e poi i
 * dati, e un modello che trovasse la tabella per prima comincerebbe a
 * interpretarla mentre ancora non sa che cosa non deve fare.
 *
 * In fondo, la provenienza. Questo testo è fatto per essere portato altrove, e
 * altrove nessuno sa da dove vengano i numeri: la riga dice quale programma li
 * ha calcolati.
 */
export function letturaDaIncollare(tema: string, opzioni: OpzioniLettura = {}): string {
  const istruzioni = istruzioniDi(opzioni.sistema);
  const provenienza = opzioni.repository
    ? `\n\nTema calcolato da dodicisegni, con le effemeridi Swiss Ephemeris: ${opzioni.repository}`
    : '';

  return `${istruzioni}${provenienza}\n\n${tema}\n`;
}
