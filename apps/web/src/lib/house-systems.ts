/**
 * I sistemi di case, con i nomi da mostrare.
 *
 * Stavano dentro `ChartSettings.svelte`, che è il posto in cui si scelgono. Da
 * quando una pagina può arrivare con il sistema già scritto nel suo indirizzo,
 * però, quell'elenco serve anche a un'altra domanda — se la parola che è
 * arrivata sia una di queste — e una domanda non si fa a un componente.
 *
 * Del motore si importano i soli **tipi**: un import di valore ne trascinerebbe
 * l'intero grafo nel bundle del browser.
 */

import type { HouseSystem } from '@undicesimacasa/core';

export const HOUSE_SYSTEMS: readonly { value: HouseSystem; label: string }[] = [
  { value: 'placidus', label: 'Placidus' },
  { value: 'koch', label: 'Koch' },
  { value: 'segni-interi', label: 'Segni interi' },
  { value: 'equale', label: 'Equale' },
  { value: 'regiomontano', label: 'Regiomontano' },
  { value: 'campano', label: 'Campano' },
  { value: 'porfirio', label: 'Porfirio' },
  { value: 'topocentrico', label: 'Topocentrico' },
  { value: 'alcabizio', label: 'Alcabizio' },
];

/**
 * Il sistema scritto in un indirizzo, se è uno di quelli che esistono.
 *
 * Mandare al motore una parola qualsiasi produrrebbe un errore di dominio
 * corretto ma inutile: la pagina si aprirebbe su un messaggio rosso invece che
 * sul tema, per un carattere sbagliato in una query string. Qui ripiega su
 * Placidus, che è il valore da cui la pagina sarebbe partita comunque.
 */
export function houseSystemOrDefault(value: string | null): HouseSystem {
  return HOUSE_SYSTEMS.some((system) => system.value === value)
    ? (value as HouseSystem)
    : 'placidus';
}
