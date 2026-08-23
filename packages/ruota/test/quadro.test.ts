import { describe, expect, it } from 'vitest';
import { ZODIAC_ORDER } from '../src/glyphs.js';
import {
  baricentro,
  caseDalLagna,
  celleQuadro,
  GRAHA,
  GRAHA_SIGLA,
  QUADRO_SIZE,
  type SquareChart,
  type StileQuadro,
} from '../src/quadro.js';
import type { BodyId, ZodiacSign } from '../src/types.js';

/**
 * Il tema di riferimento in forma di varga: Sole, Mercurio e Venere in
 * Acquario, Marte, Saturno e Rahu in Pesci, il lagna in Cancro.
 *
 * Tre graha in una cella non è un caso costruito: nel tema del 12 marzo 1968
 * escono così, ed è la condizione in cui questo disegno va provato.
 */
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
    { id: 'nettuno', sign: 'scorpione' },
    { id: 'plutone', sign: 'leone' },
    { id: 'nodo-nord', sign: 'pesci' },
    { id: 'nodo-sud', sign: 'vergine' },
  ],
};

const cella = (stile: StileQuadro, sign: ZodiacSign) =>
  celleQuadro(CARTA, stile).find((voce) => voce.sign === sign);

describe('caseDalLagna', () => {
  it('fa del segno del lagna la prima casa', () => {
    expect(caseDalLagna('cancro', 'cancro')).toBe(1);
  });

  it('conta a segni interi in avanti, chiudendo il giro', () => {
    expect(caseDalLagna('leone', 'cancro')).toBe(2);
    expect(caseDalLagna('capricorno', 'cancro')).toBe(7);
    expect(caseDalLagna('gemelli', 'cancro')).toBe(12);
    // Anche a cavallo dell'Ariete.
    expect(caseDalLagna('ariete', 'pesci')).toBe(2);
    expect(caseDalLagna('pesci', 'ariete')).toBe(12);
  });

  it('assegna dodici case distinte, una per segno', () => {
    for (const lagna of ZODIAC_ORDER) {
      const case_ = ZODIAC_ORDER.map((sign) => caseDalLagna(sign, lagna));
      expect(new Set(case_).size).toBe(12);
      expect(Math.min(...case_)).toBe(1);
      expect(Math.max(...case_)).toBe(12);
    }
  });
});

describe('lo stile del sud', () => {
  it('tiene i segni fermi nelle stesse caselle, qualunque sia il lagna', () => {
    // È la definizione dello stile: a muoversi sono le case.
    const conCancro = celleQuadro(CARTA, 'sud').map((voce) => voce.sign);
    const conAriete = celleQuadro({ ...CARTA, ascendant: 'ariete' }, 'sud').map((c) => c.sign);
    const senzaLagna = celleQuadro({ positions: CARTA.positions }, 'sud').map((c) => c.sign);

    expect(conCancro).toEqual([...ZODIAC_ORDER]);
    expect(conAriete).toEqual([...ZODIAC_ORDER]);
    expect(senzaLagna).toEqual([...ZODIAC_ORDER]);
  });

  it('mette i Pesci in alto a sinistra e gira in senso orario', () => {
    // La disposizione con cui questi quadri si stampano da sempre: cambiarla
    // renderebbe illeggibile a un occhio esperto un disegno per il resto giusto.
    const angolo = (sign: ZodiacSign) => cella('sud', sign)!.polygon[0];

    expect(angolo('pesci')).toEqual({ x: 0, y: 0 });
    expect(angolo('ariete')).toEqual({ x: QUADRO_SIZE / 4, y: 0 });
    expect(angolo('gemelli')).toEqual({ x: (QUADRO_SIZE * 3) / 4, y: 0 });
    expect(angolo('vergine')).toEqual({ x: (QUADRO_SIZE * 3) / 4, y: (QUADRO_SIZE * 3) / 4 });
    expect(angolo('sagittario')).toEqual({ x: 0, y: (QUADRO_SIZE * 3) / 4 });
  });

  it('lascia vuoto il centro della griglia', () => {
    // Le quattro caselle centrali non sono celle: è lì che vanno il nome e la
    // data, e nessun segno deve finirci.
    const lato = QUADRO_SIZE / 4;
    for (const voce of celleQuadro(CARTA, 'sud')) {
      const dentro = voce.centro.x > lato && voce.centro.x < lato * 3;
      const dentroY = voce.centro.y > lato && voce.centro.y < lato * 3;
      expect(dentro && dentroY).toBe(false);
    }
  });

  it('numera le case dal lagna, che qui può stare ovunque', () => {
    expect(cella('sud', 'cancro')?.house).toBe(1);
    expect(cella('sud', 'cancro')?.lagna).toBe(true);
    expect(cella('sud', 'capricorno')?.house).toBe(7);
    expect(cella('sud', 'gemelli')?.lagna).toBe(false);
  });

  it('si disegna anche senza lagna, perché i segni non dipendono dall\'ora', () => {
    const celle = celleQuadro({ positions: CARTA.positions }, 'sud');

    expect(celle).toHaveLength(12);
    expect(celle.every((voce) => voce.house === undefined)).toBe(true);
    expect(celle.every((voce) => voce.lagna === false)).toBe(true);
    // I graha ci sono lo stesso: stanno nei segni, non nelle case.
    expect(celle.find((voce) => voce.sign === 'acquario')?.bodies).toHaveLength(3);
  });
});

describe('lo stile del nord', () => {
  it('tiene le case ferme e fa scorrere i segni', () => {
    // La definizione dello stile, e il rovescio esatto del sud.
    const celle = celleQuadro(CARTA, 'nord');

    expect(celle.map((voce) => voce.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Lagna in Cancro: la prima casa è il Cancro, la seconda il Leone.
    expect(celle[0]?.sign).toBe('cancro');
    expect(celle[1]?.sign).toBe('leone');
    expect(celle[6]?.sign).toBe('capricorno');

    const conAriete = celleQuadro({ ...CARTA, ascendant: 'ariete' }, 'nord');
    expect(conAriete[0]?.sign).toBe('ariete');
    expect(conAriete.map((voce) => voce.house)).toEqual(celle.map((voce) => voce.house));
  });

  it('mette la prima casa nel rombo in alto e la settima in quello in basso', () => {
    const celle = celleQuadro(CARTA, 'nord');
    const m = QUADRO_SIZE / 2;

    expect(celle[0]?.polygon).toContainEqual({ x: m, y: 0 });
    expect(celle[6]?.polygon).toContainEqual({ x: m, y: QUADRO_SIZE });
    // Quarta a sinistra, decima a destra: sono i quattro rombi.
    expect(celle[3]?.polygon).toContainEqual({ x: 0, y: m });
    expect(celle[9]?.polygon).toContainEqual({ x: QUADRO_SIZE, y: m });
  });

  it('gira in senso antiorario, che è il verso che si sbaglia', () => {
    // Dopo la prima casa in alto viene la seconda a sinistra, non a destra.
    // Nell'altro verso escono dodici caselle piene di segni sbagliati e un
    // disegno che sembra a posto.
    const celle = celleQuadro(CARTA, 'nord');
    const m = QUADRO_SIZE / 2;

    expect(celle[1]?.centro.x).toBeLessThan(m);
    expect(celle[11]?.centro.x).toBeGreaterThan(m);
    expect(celle[3]?.centro.x).toBeLessThan(celle[0]!.centro.x);
    expect(celle[9]?.centro.x).toBeGreaterThan(celle[0]!.centro.x);
  });

  it('ha quattro rombi e otto triangoli', () => {
    const celle = celleQuadro(CARTA, 'nord');
    const rombi = celle.filter((voce) => voce.polygon.length === 4);
    const triangoli = celle.filter((voce) => voce.polygon.length === 3);

    expect(rombi).toHaveLength(4);
    expect(triangoli).toHaveLength(8);
    // I rombi sono le quattro case angolari.
    expect(rombi.map((voce) => voce.house)).toEqual([1, 4, 7, 10]);
  });

  it('si rifiuta di disegnare senza lagna, invece di inventarne uno', () => {
    // Le sue caselle sono case: senza Ascendente non c'è una prima casa da
    // mettere in alto, e una messa a caso sarebbe indistinguibile da quella
    // giusta.
    expect(() => celleQuadro({ positions: CARTA.positions }, 'nord')).toThrow(/lagna/);
  });
});

describe('i due stili dicono la stessa cosa', () => {
  it('collocano ogni graha nello stesso segno', () => {
    // La prova che la differenza sia di presentazione e non di dottrina: i due
    // disegni sono riconvertibili senza perdere niente.
    const coppie = (stile: StileQuadro) =>
      celleQuadro(CARTA, stile)
        .flatMap((voce) => voce.bodies.map((body) => `${body}:${voce.sign}`))
        .sort();

    expect(coppie('nord')).toEqual(coppie('sud'));
  });

  it('danno a ogni segno la stessa casa', () => {
    const case_ = (stile: StileQuadro) =>
      Object.fromEntries(celleQuadro(CARTA, stile).map((voce) => [voce.sign, voce.house]));

    expect(case_('nord')).toEqual(case_('sud'));
  });
});

describe('chi entra nel quadro', () => {
  it('sono i nove graha e nessun altro', () => {
    // Non è la scelta fatta per i nakshatra, dove ogni longitudine ha una
    // divisione del cerchio: qui è una forma con una dottrina attaccata.
    const dentro = celleQuadro(CARTA, 'sud').flatMap((voce) => voce.bodies);

    expect(new Set(dentro)).toEqual(new Set(GRAHA));
    expect(dentro).not.toContain('urano');
    expect(dentro).not.toContain('nettuno');
    expect(dentro).not.toContain('plutone');
  });

  it('mette insieme i graha che condividono un segno', () => {
    expect(cella('sud', 'acquario')?.bodies).toEqual(['sole', 'mercurio', 'venere']);
    expect(cella('sud', 'pesci')?.bodies).toEqual(['marte', 'saturno', 'nodo-nord']);
    expect(cella('sud', 'ariete')?.bodies).toEqual([]);
  });

  it('ha una sigla per ciascuno dei nove, e chiama i nodi Rahu e Ketu', () => {
    for (const graha of GRAHA) expect(GRAHA_SIGLA[graha]).toMatch(/^[A-Z][a-z]$/);
    expect(GRAHA_SIGLA['nodo-nord']).toBe('Ra');
    expect(GRAHA_SIGLA['nodo-sud']).toBe('Ke');
    expect(GRAHA_SIGLA['urano' as BodyId]).toBeUndefined();
  });
});

describe('baricentro', () => {
  it('sta al centro di un rombo e dentro un triangolo', () => {
    expect(baricentro([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ])).toEqual({ x: 0, y: 0 });

    expect(baricentro([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 3 },
    ])).toEqual({ x: 1, y: 1 });
  });

  it('tiene ogni cella dentro il riquadro', () => {
    for (const stile of ['nord', 'sud'] as StileQuadro[]) {
      for (const voce of celleQuadro(CARTA, stile)) {
        expect(voce.centro.x).toBeGreaterThan(0);
        expect(voce.centro.x).toBeLessThan(QUADRO_SIZE);
        expect(voce.centro.y).toBeGreaterThan(0);
        expect(voce.centro.y).toBeLessThan(QUADRO_SIZE);
      }
    }
  });
});
