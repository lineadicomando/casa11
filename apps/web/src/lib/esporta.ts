/**
 * La ruota portata via dalla pagina.
 *
 * L'SVG è già lì, disegnato: sembrerebbe bastare serializzarlo. Non basta,
 * perché quel disegno non è autosufficiente — i colori sono `var(--elemento-*)`
 * e `var(--testo)`, e i corpi dei glifi stanno in una classe che vive nel
 * componente. Fuori dal documento non esiste né l'una cosa né l'altra: il file
 * salvato uscirebbe nero su nero, o senza colori affatto.
 *
 * Qui il disegno viene prima **fissato**: si legge il valore calcolato di ogni
 * proprietà che conti, nodo per nodo, e lo si scrive come attributo. Quello che
 * ne esce si apre in qualunque programma.
 */

/**
 * Le proprietà che il disegno usa davvero.
 *
 * Un elenco e non tutto quanto: copiare l'intero stile calcolato produce file
 * dieci volte più grandi, pieni di valori predefiniti che nessuno ha scelto.
 */
const PROPRIETA = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
] as const;

/**
 * Il colore del foglio su cui la ruota è disegnata, per chi non ha trasparenza.
 *
 * Non si legge da `--sfondo`. Le custom property non sono tipizzate, e
 * `getPropertyValue` ne restituisce il token scritto invece del colore: ne
 * usciva la stringa `light-dark(#faf8f4, #1a1917)`, che un browser recente sa
 * ancora risolvere ma che in un file è un `fill` invalido — e un `fill`
 * invalido, in SVG, è **nero**. Il disegno si apriva nero su nero in ogni
 * programma che di `light-dark()` non sappia nulla, cioè in quasi tutti.
 *
 * Il fondo del documento invece è una proprietà vera: il suo valore calcolato è
 * già un `rgb()`, che si scrive in un attributo ed è capito ovunque.
 */
export function coloreSfondo(): string {
  const dipinto = getComputedStyle(document.body).backgroundColor;
  // Un fondo trasparente non è un colore su cui posare dei glifi scuri.
  return dipinto && dipinto !== 'rgba(0, 0, 0, 0)' ? dipinto : '#ffffff';
}

/**
 * Una copia autosufficiente del disegno, con i valori al posto dei rimandi.
 *
 * Il clone va appeso al documento mentre si legge: uno `getComputedStyle` su un
 * nodo staccato non ha nessuna cascata da consultare e restituisce vuoto. Si
 * legge quindi dall'originale, che nel documento c'è, e si scrive sul clone —
 * i due alberi hanno la stessa forma, quindi si percorrono in parallelo.
 */
export function svgAutosufficiente(svg: SVGSVGElement): SVGSVGElement {
  const copia = svg.cloneNode(true) as SVGSVGElement;

  const originali = [svg, ...svg.querySelectorAll('*')];
  const copie = [copia, ...copia.querySelectorAll('*')];

  /**
   * I nodi che nel file non hanno ragione di esistere.
   *
   * Si tolgono alla fine e non durante il giro: i due elenchi si percorrono per
   * indice, e rimuovere un nodo mentre si cammina sfalserebbe tutto ciò che
   * viene dopo.
   */
  const daTogliere: Element[] = [];

  originali.forEach((nodo, i) => {
    const destinazione = copie[i];
    if (!(destinazione instanceof SVGElement)) return;

    // I bersagli del tocco. Sono cerchi larghi, dipinti di `transparent`, che
    // servono solo a dare al dito qualcosa di grande da colpire. Fissarli come
    // gli altri li scriveva `fill="rgba(0, 0, 0, 0)"` — che i browser capiscono
    // e i programmi di disegno no: valore invalido, ripiego a nero, e il file
    // usciva con un disco nero sopra ogni pianeta. Tradurre meglio il colore
    // non è il rimedio: in un file non c'è niente da toccare, e il modo di
    // esportare un elemento che esiste solo per essere premuto è non
    // esportarlo. Vale lo stesso ragionamento che poco più sotto toglie
    // `role` e `tabindex`.
    if (nodo.hasAttribute('data-bersaglio')) {
      daTogliere.push(destinazione);
      return;
    }

    const calcolato = getComputedStyle(nodo);
    for (const proprieta of PROPRIETA) {
      const valore = calcolato.getPropertyValue(proprieta);
      // Le unità di lunghezza CSS non sono universalmente ammesse negli
      // attributi di presentazione: `stroke-width="1px"` lo capiscono i
      // browser, non tutti i programmi di disegno.
      if (valore && valore !== 'none') destinazione.setAttribute(proprieta, valore.replace(/px$/, ''));
    }

    // Le classi non servono più: lo stile che portavano è appena diventato
    // attributo, e i nomi generati da Svelte non significano niente altrove.
    destinazione.removeAttribute('class');
    // Lo stile in riga nemmeno, ed è quello che conta di più: i colori del
    // disegno ci arrivano come `var(--elemento-fuoco)`, che ha la precedenza
    // sull'attributo appena scritto e fuori dal documento non risolve niente.
    // Lasciandolo, il file uscirebbe nero.
    destinazione.removeAttribute('style');
    // Nel file non c'è niente da premere.
    for (const attributo of ['role', 'tabindex', 'aria-pressed', 'aria-label']) {
      if (attributo !== 'aria-label' || destinazione !== copia) {
        destinazione.removeAttribute(attributo);
      }
    }
  });

  for (const nodo of daTogliere) nodo.remove();

  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return copia;
}

/** Il disegno come testo, con lo sfondo dipinto sotto. */
export function serializza(svg: SVGSVGElement): string {
  const copia = svgAutosufficiente(svg);

  // Un rettangolo grande quanto il riquadro di vista: senza, il file è
  // trasparente e i glifi scuri spariscono su qualunque fondo scuro.
  const viewBox = (copia.getAttribute('viewBox') ?? '0 0 800 800').split(/\s+/).map(Number);
  const sfondo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  sfondo.setAttribute('x', String(viewBox[0] ?? 0));
  sfondo.setAttribute('y', String(viewBox[1] ?? 0));
  sfondo.setAttribute('width', String(viewBox[2] ?? 800));
  sfondo.setAttribute('height', String(viewBox[3] ?? 800));
  sfondo.setAttribute('fill', coloreSfondo());
  copia.insertBefore(sfondo, copia.firstChild);

  return new XMLSerializer().serializeToString(copia);
}

/**
 * Il disegno come immagine a punti.
 *
 * Passa da un `<img>` e da una tela: il browser sa già disegnare un SVG, e i
 * font di sistema che i glifi astrologici usano sono gli stessi che ha sotto
 * mano. `scala` moltiplica il lato del riquadro di vista — a 2 il file regge lo
 * zoom e la stampa senza scalettare.
 */
export async function comePng(svg: SVGSVGElement, scala = 2): Promise<Blob> {
  const testo = serializza(svg);
  const url = URL.createObjectURL(new Blob([testo], { type: 'image/svg+xml' }));

  try {
    const immagine = new Image();
    await new Promise<void>((risolvi, rifiuta) => {
      immagine.onload = () => risolvi();
      immagine.onerror = () => rifiuta(new Error('Il disegno non si è lasciato caricare.'));
      immagine.src = url;
    });

    const viewBox = (svg.getAttribute('viewBox') ?? '0 0 800 800').split(/\s+/).map(Number);
    const tela = document.createElement('canvas');
    tela.width = (viewBox[2] ?? 800) * scala;
    tela.height = (viewBox[3] ?? 800) * scala;

    const pennello = tela.getContext('2d');
    if (!pennello) throw new Error('La tela non si è lasciata aprire.');
    pennello.drawImage(immagine, 0, 0, tela.width, tela.height);

    return await new Promise<Blob>((risolvi, rifiuta) => {
      tela.toBlob(
        (blob) => (blob ? risolvi(blob) : rifiuta(new Error('Immagine non prodotta.'))),
        'image/png',
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Manda un file al disco, con il nome che gli si è dato. */
export function scarica(contenuto: Blob, nome: string): void {
  const url = URL.createObjectURL(contenuto);
  const collegamento = document.createElement('a');
  collegamento.href = url;
  collegamento.download = nome;
  collegamento.click();
  // Non subito: Firefox comincia a scaricare dopo il giro corrente, e un URL
  // già revocato gli lascerebbe un file vuoto.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Un nome di file che dica che cosa c'è dentro.
 *
 * Senza accenti né spazi: questi file finiscono in cartelle condivise e su
 * sistemi che non li trattano tutti allo stesso modo.
 */
export function nomeFile(parti: readonly (string | null | undefined)[]): string {
  return (
    parti
      .filter((parte): parte is string => Boolean(parte))
      .join('-')
      .normalize('NFD')
      // I segni combinanti che `NFD` ha appena staccato dalle lettere. Per
      // categoria Unicode e non per intervallo di codici: l'intervallo scritto
      // qui dentro sarebbe una fila di caratteri invisibili nel sorgente.
      .replace(/\p{M}/gu, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'ruota'
  );
}
