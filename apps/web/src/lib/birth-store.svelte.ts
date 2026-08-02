/**
 * La nascita, condivisa fra le sezioni.
 *
 * Il tema, i transiti e l'elezione partono dagli stessi dati, e ridigitarli a
 * ogni voce del menù è il modo più rapido di introdurre un errore che non si
 * vede: una data giusta in una sezione e sbagliata in un'altra non stanno mai
 * sullo stesso schermo, quindi non si contraddicono davanti a nessuno.
 *
 * Vive **in memoria e basta** — niente `localStorage`, niente cookie. Dura
 * quanto la navigazione, perché SvelteKit cambia pagina senza ricaricare, e un
 * ricaricamento la cancella. È una comodità dentro una sessione, non un
 * archivio di dati di nascita.
 *
 * Lo stato sta dentro un campo invece di essere l'oggetto esportato: a una
 * costante non si assegna, e `bind:value` ha bisogno di poterlo fare.
 */

import { emptyBirthInput, type BirthInput } from './birth';

export const birthStore = $state<{ value: BirthInput }>({ value: emptyBirthInput() });
