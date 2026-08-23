/**
 * Se il cielo è acceso.
 *
 * Vive **in memoria e basta**, come la nascita in `birth-store.svelte.ts`: niente
 * `localStorage`. Non è pigrizia — l'informativa privacy dichiara una per una
 * le chiavi che il sito lascia sul dispositivo, e ricordarsi di un ornamento
 * vorrebbe dire aggiungerne una e andare a scriverlo là. Un ricaricamento lo
 * spegne, e riaccenderlo costa un clic sul pulsante che sta lì apposta.
 *
 * Lo stato sta qui e non nel pulsante perché a premerlo è la testata mentre a
 * dipingere è il guscio: sono due componenti diversi, e nessuno dei due
 * contiene l'altro.
 */

export class Cielo {
  #acceso = $state(false);

  get acceso(): boolean {
    return this.#acceso;
  }

  /** Il pulsante della stella: lo stesso gesto in andata e in ritorno. */
  commuta(): void {
    this.#acceso = !this.#acceso;
  }

  /** La via d'uscita che non passa dal pulsante: l'Esc, e il cambio di pagina. */
  spegni(): void {
    this.#acceso = false;
  }
}

export const cielo = new Cielo();
