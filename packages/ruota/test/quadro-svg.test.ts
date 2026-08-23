import { describe, expect, it } from 'vitest';
import { CHIARA, SCURA } from '../src/palette.js';
import { quadroPng } from '../src/png.js';
import { quadroSvg } from '../src/quadro-svg.js';
import type { SquareChart } from '../src/quadro.js';

/** Il tema di riferimento: tre graha in Acquario, tre in Pesci, lagna in Cancro. */
const CARTA: SquareChart = {
  ascendant: 'cancro',
  positions: [
    { id: 'sole', sign: 'acquario' },
    { id: 'luna', sign: 'cancro' },
    { id: 'mercurio', sign: 'acquario' },
    { id: 'venere', sign: 'acquario' },
    { id: 'marte', sign: 'pesci' },
    { id: 'giove', sign: 'leone' },
    { id: 'saturno', sign: 'pesci' },
    { id: 'urano', sign: 'vergine' },
    { id: 'plutone', sign: 'leone' },
    { id: 'nodo-nord', sign: 'pesci' },
    { id: 'nodo-sud', sign: 'vergine' },
  ],
};

/** Quante celle sono state disegnate: i poligoni chiusi, senza il fondo. */
const celleDisegnate = (svg: string): number => (svg.match(/ Z"/g) ?? []).length;

describe('quadroSvg', () => {
  it('produce un documento autosufficiente', () => {
    const svg = quadroSvg(CARTA);

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('<title>');
    // Il font va nominato: fuori dal documento non c'è un foglio di stile.
    expect(svg).toContain('DejaVu Sans');
  });

  it('disegna dodici celle in entrambi gli stili', () => {
    expect(celleDisegnate(quadroSvg(CARTA, { stile: 'sud' }))).toBe(12);
    expect(celleDisegnate(quadroSvg(CARTA, { stile: 'nord' }))).toBe(12);
  });

  it('scrive il fondo, che un file trasparente perderebbe i glifi', () => {
    expect(quadroSvg(CARTA, { palette: CHIARA })).toContain(`fill="${CHIARA.sfondo}"`);
    expect(quadroSvg(CARTA, { palette: SCURA })).toContain(`fill="${SCURA.sfondo}"`);
  });

  it('usa le sigle e non i glifi dei pianeti', () => {
    // In una casella che al massimo è un ottavo del riquadro ce ne stanno tre
    // per riga, e la convenzione dei quadri vedici è questa.
    const svg = quadroSvg(CARTA);

    expect(svg).toContain('>Su</tspan>');
    expect(svg).toContain('>Ve</tspan>');
    expect(svg).toContain('>Ra</tspan>');
    expect(svg).not.toContain('☉');
  });

  it('dà a ogni sigla un nodo suo, col nome del graha sopra', () => {
    // Serve a chi inserisce il quadro in una pagina e vuole illuminarne uno
    // senza rigenerare il disegno. Nel file scaricato non dà fastidio a nessuno.
    const svg = quadroSvg(CARTA);

    expect(svg).toContain('<tspan data-graha="sole">Su</tspan>');
    expect(svg).toContain('<tspan data-graha="nodo-nord">Ra</tspan>');
    // Nove graha, nove nodi: uno per ciascuno, e nessuno di più.
    expect((svg.match(/data-graha=/g) ?? []).length).toBe(9);
  });

  it('tiene tre sigle per riga, che è ciò che sta nel triangolo più stretto', () => {
    const svg = quadroSvg(CARTA);
    // Acquario ne ha tre: una riga sola con tre tspan dentro.
    const righe = svg.match(/<text[^>]*>(<tspan[^>]*>[A-Za-z]{2}<\/tspan> ?)+<\/text>/g) ?? [];
    expect(righe.some((riga) => (riga.match(/tspan/g) ?? []).length === 6)).toBe(true);
  });

  it('marca col ℞ i graha retrogradi, e solo quelli', () => {
    const svg = quadroSvg(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'giove', sign: 'toro', retrograde: true },
          { id: 'marte', sign: 'toro', retrograde: false },
        ],
      },
      { stile: 'sud' },
    );

    expect(svg).toContain('℞');
    expect((svg.match(/℞/g) ?? []).length).toBe(1);

    // Il marchio sta **dentro** la tspan del graha: chi accende una sigla
    // accende anche il suo marchio, che di quella sigla fa parte.
    const giove = svg.slice(svg.indexOf('data-graha="giove"'));
    expect(giove.slice(0, giove.indexOf('</tspan>') + 8)).toContain('℞');
    expect(svg.slice(svg.indexOf('data-graha="marte"'))).not.toMatch(/^[^<]*℞/);
  });

  it("disfà lo scostamento dell'apice, che nel browser resterebbe", () => {
    // Uno `dy` sposta la posizione corrente e ci resta: senza il contrappeso
    // il resto della riga se ne va in su, e solo a schermo — chi rasterizza
    // qui non si comporta così, e il difetto non si vedrebbe nei PNG.
    const svg = quadroSvg(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'giove', sign: 'toro', retrograde: true },
          { id: 'saturno', sign: 'toro', retrograde: false },
        ],
      },
      { stile: 'sud' },
    );

    const scostamenti = [...svg.matchAll(/dy="(-?[\d.]+)"/g)].map((trovato) =>
      Number(trovato[1]),
    );
    expect(scostamenti.length).toBe(2);
    expect(scostamenti[0]).toBeLessThan(0);
    expect((scostamenti[0] as number) + (scostamenti[1] as number)).toBeCloseTo(0, 6);

    // E il contrappeso deve avere un carattere su cui applicarsi: uno `dy` su
    // una tspan vuota non fa niente, e la riga resta storta. Il difetto si
    // vede solo nella pagina, mai in un PNG.
    expect(svg).toMatch(/<tspan dy="[\d.]+"> <\/tspan>/);
    expect(svg).not.toMatch(/<tspan dy="[-\d.]+"><\/tspan>/);
  });

  it('non marca niente quando la carta non dice se i graha siano retrogradi', () => {
    // `CARTA` non porta `retrograde`: un tema che tace non fa dire al disegno
    // che i suoi graha sono diretti.
    expect(quadroSvg(CARTA, { stile: 'sud' })).not.toContain('℞');
    expect(quadroSvg(CARTA, { stile: 'nord' })).not.toContain('℞');
  });

  it('tiene conto del marchio quando decide quanto grande scrivere', () => {
    // Il ℞ allarga la riga, e una riga più larga vuole un corpo più piccolo:
    // se la misura lo ignorasse, il testo uscirebbe dalla cella.
    const conSigle = (retrograde: boolean) =>
      quadroSvg(
        {
          ascendant: 'ariete',
          positions: [
            { id: 'sole', sign: 'ariete', retrograde },
            { id: 'luna', sign: 'ariete', retrograde },
            { id: 'mercurio', sign: 'ariete', retrograde },
          ],
        },
        { stile: 'sud' },
      );

    const corpo = (svg: string) =>
      Number(svg.match(/font-size="([\d.]+)"[^>]*>(?=<tspan)/)?.[1] ?? 0);

    expect(corpo(conSigle(true))).toBeLessThan(corpo(conSigle(false)));
  });

  it('non fa entrare i tre che graha non sono', () => {
    const svg = quadroSvg(CARTA);

    // Urano sta in Vergine insieme a Ketu: nella cella deve comparire il solo Ketu.
    expect(svg).toContain('>Ke</tspan>');
    expect(svg).not.toContain('data-graha="urano"');
    expect(svg).not.toContain('data-graha="plutone"');
  });

  it('marca il lagna con l\'accento', () => {
    const svg = quadroSvg(CARTA, { palette: CHIARA });

    expect(svg).toContain(`stroke="${CHIARA.accento}"`);
  });

  it('taglia la diagonale del lagna solo nello stile del sud', () => {
    // È la convenzione con cui i quadri del sud si stampano. Nel nord il lagna
    // è la posizione stessa, e una diagonale in più sarebbe rumore.
    const sud = quadroSvg(CARTA, { stile: 'sud', palette: CHIARA });
    const nord = quadroSvg(CARTA, { stile: 'nord', palette: CHIARA });

    const diagonali = (svg: string) =>
      (svg.match(new RegExp(`stroke="${CHIARA.accento}" stroke-width="2"`, 'g')) ?? []).length;

    expect(diagonali(sud)).toBe(1);
    expect(diagonali(nord)).toBe(0);
  });

  it('numera le case quando c\'è un lagna, e tace quando non c\'è', () => {
    const con = quadroSvg(CARTA, { stile: 'sud', palette: CHIARA });
    const senza = quadroSvg({ positions: CARTA.positions }, { stile: 'sud', palette: CHIARA });

    // Dodici numeri di casa, uno per cella. Si contano dal colore e non dal
    // corpo: quello ormai lo decide la forma della cella, e cambia col tema.
    const numeri = (svg: string) =>
      (svg.match(new RegExp(`fill="${CHIARA.testoTenue}"`, 'g')) ?? []).length;
    expect(numeri(con)).toBe(12);
    expect(numeri(senza)).toBe(0);
  });

  it('scrive le sigle nel colore dell\'elemento del segno che le ospita', () => {
    // La cella si legge come una cosa sola invece che come una cornice
    // colorata con dentro del testo grigio. Non è una classificazione dei
    // graha: è il segno che dà il colore, e i graha ci stanno dentro.
    const svg = quadroSvg(CARTA, { stile: 'sud', palette: CHIARA });

    // Il Sole sta in Acquario, che è d'aria; Marte in Pesci, che è d'acqua.
    const riga = (sigla: string) =>
      svg
        .split('<text')
        .find((pezzo) => pezzo.includes(`>${sigla}</tspan>`)) ?? '';

    expect(riga('Su')).toContain(`fill="${CHIARA.elementi.aria}"`);
    expect(riga('Ma')).toContain(`fill="${CHIARA.elementi.acqua}"`);
    expect(svg).not.toContain(`fill="${CHIARA.testo}"`);
  });

  it('scrive più in grande quando le celle sono più libere', () => {
    // È la ragione di tutta l'impaginazione: il corpo non è una costante
    // tarata sul caso peggiore, ma la misura che la cella concede a *questa*
    // carta. Un tema con un graha per casella deve risultare più grande di
    // uno con otto graha in una casella sola.
    const corpo = (svg: string) =>
      Math.max(...[...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1])));

    const sparsa = quadroSvg(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'sole', sign: 'ariete' },
          { id: 'luna', sign: 'toro' },
          { id: 'marte', sign: 'gemelli' },
        ],
      },
      { stile: 'sud' },
    );
    const ammassata = quadroSvg(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'sole', sign: 'ariete' },
          { id: 'luna', sign: 'ariete' },
          { id: 'mercurio', sign: 'ariete' },
          { id: 'venere', sign: 'ariete' },
          { id: 'marte', sign: 'ariete' },
          { id: 'giove', sign: 'ariete' },
          { id: 'saturno', sign: 'ariete' },
          { id: 'nodo-nord', sign: 'ariete' },
        ],
      },
      { stile: 'sud' },
    );

    expect(corpo(sparsa)).toBeGreaterThan(corpo(ammassata));
  });

  it('sfrutta le righe strette invece di tararle sulla più larga', () => {
    // «Mo Ve Ju» e «Su Mo Me» sono tre sigle tutt'e due, ma la seconda è più
    // larga: misurate a numero di sigle darebbero lo stesso corpo, misurate
    // davvero no. È il caso peggiore che smette di pagare per tutti.
    const conSigle = (sigle: SquareChart['positions']) =>
      quadroSvg({ ascendant: 'ariete', positions: sigle }, { stile: 'sud' });

    const corpo = (svg: string) =>
      Number(svg.match(/font-size="([\d.]+)"[^>]*>(?=<tspan)/)?.[1] ?? 0);

    const strette = conSigle([
      { id: 'luna', sign: 'ariete' },
      { id: 'venere', sign: 'ariete' },
      { id: 'giove', sign: 'ariete' },
    ]);
    const larghe = conSigle([
      { id: 'sole', sign: 'ariete' },
      { id: 'luna', sign: 'ariete' },
      { id: 'mercurio', sign: 'ariete' },
    ]);

    expect(corpo(strette)).toBeGreaterThan(corpo(larghe));
  });

  it('usa un corpo solo per tutte le sigle del disegno', () => {
    // I rombi del nord sono larghi il doppio dei triangoli che li circondano,
    // e ne reggerebbero di più. La misura resta una sola e la detta il più
    // stretto: celle vicine con corpi diversi si leggono come un errore di
    // stampa, e il quadro è una tabella, non una nuvola di etichette.
    const corpiDelleSigle = (svg: string) =>
      new Set(
        [...svg.matchAll(/font-size="([\d.]+)"[^>]*>(?=<tspan)/g)].map((trovato) => trovato[1]),
      );

    expect(corpiDelleSigle(quadroSvg(CARTA, { stile: 'nord' })).size).toBe(1);
    expect(corpiDelleSigle(quadroSvg(CARTA, { stile: 'sud' })).size).toBe(1);
  });

  it('si disegna senza lagna al sud e si rifiuta al nord', () => {
    const senzaLagna = { positions: CARTA.positions };

    expect(celleDisegnate(quadroSvg(senzaLagna, { stile: 'sud' }))).toBe(12);
    expect(() => quadroSvg(senzaLagna, { stile: 'nord' })).toThrow(/lagna/);
  });

  it('dice nella descrizione quale stile sia', () => {
    // Chi il disegno non lo vede deve sapere di che forma si parla: sono due
    // disposizioni diverse degli stessi dati.
    expect(quadroSvg(CARTA, { stile: 'sud' })).toContain('sud-indiano');
    expect(quadroSvg(CARTA, { stile: 'nord' })).toContain('nord-indiano');
    expect(quadroSvg(CARTA, { label: 'Navamsa di prova' })).toContain('Navamsa di prova');
  });

  it('nomina i retrogradi a chi il disegno non lo vede', () => {
    // Il ℞ è un segno grafico: chi legge la descrizione non lo incontra, e
    // senza questo si perderebbe una cosa che a schermo si vede subito.
    const con = quadroSvg(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'giove', sign: 'toro', retrograde: true },
          { id: 'marte', sign: 'toro', retrograde: false },
        ],
      },
      { stile: 'sud' },
    );

    expect(con).toContain('retrogradi: Ju');
    expect(con).not.toContain('Ma,');
    // Nessun retrogrado, nessuna coda: non si annuncia un elenco vuoto.
    expect(quadroSvg(CARTA, { stile: 'sud' })).not.toContain('retrogradi');
  });

  it('dispone gli stessi graha in posti diversi nei due stili', () => {
    // Stessi dati, stesse sigle, geometria diversa: è la differenza fra i due
    // quadri, ed è tutta qui.
    const sud = quadroSvg(CARTA, { stile: 'sud' });
    const nord = quadroSvg(CARTA, { stile: 'nord' });

    expect(sud).not.toBe(nord);
    for (const sigla of ['>Su<', '>Me<', '>Ve<', '>Mo<', '>Ju<', '>Ke<']) {
      expect(sud).toContain(sigla);
      expect(nord).toContain(sigla);
    }
  });
});

describe('quadroPng', () => {
  it('produce un PNG vero', () => {
    const png = quadroPng(CARTA, { larghezza: 400 });

    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(png.byteLength).toBeGreaterThan(1000);
  });

  it('rispetta la larghezza chiesta, ed è quadrato', () => {
    const png = quadroPng(CARTA, { larghezza: 500 });

    expect(png.readUInt32BE(16)).toBe(500);
    expect(png.readUInt32BE(20)).toBe(500);
  });

  it('porta lo stile fino al raster', () => {
    const sud = quadroPng(CARTA, { stile: 'sud', larghezza: 400 });
    const nord = quadroPng(CARTA, { stile: 'nord', larghezza: 400 });

    expect(sud.equals(nord)).toBe(false);
  });

  it('disegna davvero il testo, che senza font sparirebbe in silenzio', () => {
    // Il caso che il commento di `rasterizza` descrive: senza fontconfig il
    // PNG esce senza una lettera e sembra riuscito. Un quadro con i graha
    // deve pesare più di uno vuoto.
    const pieno = quadroPng(CARTA, { larghezza: 600 });
    const vuoto = quadroPng({ ascendant: 'cancro', positions: [] }, { larghezza: 600 });

    expect(pieno.byteLength).toBeGreaterThan(vuoto.byteLength);
  });

  it('cambia con la palette', () => {
    const chiaro = quadroPng(CARTA, { larghezza: 400, palette: CHIARA });
    const scuro = quadroPng(CARTA, { larghezza: 400, palette: SCURA });

    expect(chiaro.equals(scuro)).toBe(false);
  });
});
