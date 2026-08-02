/**
 * Il corpo che si sta isolando nella ruota e nelle tabelle.
 *
 * Prima era una sola variabile scritta da `mouseenter` e cancellata da
 * `mouseleave`: funzionava soltanto con un mouse. Su un telefono non c'è nessun
 * «sopra» in cui passare, e da tastiera non c'era modo di arrivarci — la sola
 * cosa che la ruota facesse, isolare gli aspetti di un corpo, era inaccessibile
 * a chi non punta.
 *
 * Qui i modi sono due e convivono. Il **sorvolo** è quello di prima: dura
 * quanto il puntatore resta dov'è. Il **fisso** si mette con un clic, con
 * l'Invio o con un tocco, e resta finché non lo si toglie — è l'unico che serva
 * a chi legge una tabella lunga senza tenere il dito su una riga.
 *
 * Il fisso vince sul sorvolo: chi ha scelto un corpo non se lo vede cambiare
 * sotto il puntatore mentre scorre l'elenco per cercarne le posizioni.
 */
export class Evidenza {
  #fissato = $state<string | null>(null);
  #sorvolato = $state<string | null>(null);

  /** Il corpo da evidenziare adesso, comunque ci si sia arrivati. */
  get attivo(): string | null {
    return this.#fissato ?? this.#sorvolato;
  }

  /** Il corpo scelto, che resta. Serve a distinguerlo nel disegno da un sorvolo. */
  get fissato(): string | null {
    return this.#fissato;
  }

  sorvola(id: string | null): void {
    this.#sorvolato = id;
  }

  /**
   * Sceglie un corpo, o lo lascia se era già quello.
   *
   * Lo stesso gesto in andata e in ritorno: senza, per tornare a vedere la
   * trama intera bisognerebbe cercare un posto vuoto dove cliccare, e in una
   * ruota di posti vuoti ce ne sono pochi.
   */
  commuta(id: string): void {
    this.#fissato = this.#fissato === id ? null : id;
  }

  libera(): void {
    this.#fissato = null;
    this.#sorvolato = null;
  }
}
