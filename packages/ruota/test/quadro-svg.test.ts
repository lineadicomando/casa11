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

    expect(svg).toContain('Su Me Ve');
    expect(svg).toContain('Ma Sa Ra');
    expect(svg).not.toContain('☉');
  });

  it('non fa entrare i tre che graha non sono', () => {
    const svg = quadroSvg(CARTA);

    // Urano sta in Vergine insieme a Ketu: nella cella deve comparire il solo Ketu.
    expect(svg).toContain('Ke');
    expect(svg).not.toContain('Ur');
    expect(svg).not.toContain('Pl');
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
    const con = quadroSvg(CARTA, { stile: 'sud' });
    const senza = quadroSvg({ positions: CARTA.positions }, { stile: 'sud' });

    // Dodici numeri di casa, uno per cella, nel corpo più piccolo.
    const numeri = (svg: string) => (svg.match(/font-size="13"/g) ?? []).length;
    expect(numeri(con)).toBe(12);
    expect(numeri(senza)).toBe(0);
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

  it('dispone gli stessi graha in posti diversi nei due stili', () => {
    // Stessi dati, stesse sigle, geometria diversa: è la differenza fra i due
    // quadri, ed è tutta qui.
    const sud = quadroSvg(CARTA, { stile: 'sud' });
    const nord = quadroSvg(CARTA, { stile: 'nord' });

    expect(sud).not.toBe(nord);
    for (const sigla of ['Su Me Ve', 'Ma Sa Ra', 'Mo', 'Ju', 'Ke']) {
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
