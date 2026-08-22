/**
 * Se il cielo è acceso, e il gesto che lo accende.
 *
 * Vive **in memoria e basta**, come la nascita in `birth-store.svelte.ts`: niente
 * `localStorage`. Non è pigrizia — l'informativa privacy dichiara una per una
 * le chiavi che il sito lascia sul dispositivo, e ricordarsi di un ornamento
 * vorrebbe dire aggiungerne una e andare a scriverlo là. Un ricaricamento lo
 * spegne, ritrovarlo costa tre clic, e chi non lo cerca non se lo porta dietro.
 *
 * Lo stato sta qui e non nel pulsante perché a premerlo è la testata mentre a
 * dipingere è il guscio: sono due componenti diversi, e nessuno dei due
 * contiene l'altro.
 */

import { GIRO, contaScatti } from './cielo';

export class Cielo {
  #acceso = $state(false);

  /**
   * A che punto è il giro. Non è `$state`: nessuno lo guarda mentre cresce, e
   * un conteggio a metà non deve ridisegnare niente.
   */
  #scatti = 0;
  #ultimo: number | null = null;

  get acceso(): boolean {
    return this.#acceso;
  }

  /**
   * Un clic sul pulsante dell'aspetto.
   *
   * Il pulsante continua a fare quello che ha sempre fatto: questo è un
   * conteggio che gli corre accanto, non una condizione che gli si mette
   * davanti. Al giro compiuto commuta — lo stesso gesto in andata e in
   * ritorno, come l'evidenza sulla ruota — perché chi ha appena scoperto una
   * cosa cliccando tre volte prova a rifarlo per mandarla via.
   */
  scatta(ora: number = Date.now()): void {
    this.#scatti = contaScatti(this.#scatti, this.#ultimo, ora);
    this.#ultimo = ora;

    if (this.#scatti < GIRO) return;

    this.#scatti = 0;
    this.#ultimo = null;
    this.#acceso = !this.#acceso;
  }

  /** La via d'uscita che non passa dal pulsante: l'Esc, e il cambio di pagina. */
  spegni(): void {
    this.#scatti = 0;
    this.#ultimo = null;
    this.#acceso = false;
  }
}

export const cielo = new Cielo();
