import { describe, expect, it } from 'vitest';
import { ZODIAC_ORDER } from '../src/glyphs.js';
import {
  baricentro,
  caseDalLagna,
  celleQuadro,
  centroInscritto,
  corpoCheEntra,
  distanzaDalBordo,
  GRAHA,
  GRAHA_SIGLA,
  QUADRO_SIZE,
  ritaglia,
  type Punto,
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

describe('distanzaDalBordo', () => {
  const quadrato: Punto[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('misura il lato più vicino, e non uno qualunque', () => {
    expect(distanzaDalBordo(quadrato, { x: 5, y: 5 })).toBe(5);
    expect(distanzaDalBordo(quadrato, { x: 1, y: 5 })).toBe(1);
  });

  it('è nulla sul bordo e negativa fuori', () => {
    expect(distanzaDalBordo(quadrato, { x: 0, y: 5 })).toBe(0);
    expect(distanzaDalBordo(quadrato, { x: -3, y: 5 })).toBe(-3);
  });

  it('non dipende dal verso in cui i vertici sono scritti', () => {
    const alContrario = [...quadrato].reverse();
    expect(distanzaDalBordo(alContrario, { x: 5, y: 5 })).toBe(5);
    expect(distanzaDalBordo(alContrario, { x: -3, y: 5 })).toBe(-3);
  });
});

describe('centroInscritto', () => {
  it('coincide col baricentro dove la cella ha un centro di simmetria', () => {
    const rombo: Punto[] = [
      { x: 0, y: -2 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: -2, y: 0 },
    ];

    expect(centroInscritto(rombo)).toEqual(baricentro(rombo));
  });

  it('nel triangolo se ne discosta, e lascia più aria', () => {
    // È la differenza per cui esiste: il baricentro di un triangolo cade a due
    // terzi verso l'angolo retto, dove la cella è già stretta.
    const triangolo: Punto[] = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 0, y: 12 },
    ];

    const centro = centroInscritto(triangolo);
    expect(centro).not.toEqual(baricentro(triangolo));
    expect(distanzaDalBordo(triangolo, centro)).toBeGreaterThan(
      distanzaDalBordo(triangolo, baricentro(triangolo)),
    );
  });

  it('sta dentro ogni cella dei due stili, e più al largo del baricentro', () => {
    for (const stile of ['nord', 'sud'] as StileQuadro[]) {
      for (const cella of celleQuadro(CARTA, stile)) {
        const centro = centroInscritto(cella.polygon);
        expect(distanzaDalBordo(cella.polygon, centro)).toBeGreaterThan(0);
        expect(distanzaDalBordo(cella.polygon, centro)).toBeGreaterThanOrEqual(
          distanzaDalBordo(cella.polygon, baricentro(cella.polygon)),
        );
      }
    }
  });
});

describe('corpoCheEntra', () => {
  const cella: Punto[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const centro = { x: 50, y: 50 };
  const blocco = { righe: [4, 4], altezza: 0.8, passo: 1.25 };

  it('restituisce un corpo con cui il blocco ci sta davvero', () => {
    const corpo = corpoCheEntra(cella, centro, blocco, 200);
    const passo = corpo * blocco.passo;

    for (const [indice] of blocco.righe.entries()) {
      const y = centro.y - (blocco.righe.length * passo) / 2 + (indice + 0.5) * passo;
      expect(distanzaDalBordo(cella, { x: centro.x - 2 * corpo, y })).toBeGreaterThanOrEqual(-1e-6);
      expect(distanzaDalBordo(cella, { x: centro.x + 2 * corpo, y })).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it('si ferma al tetto quando ci starebbe anche di più', () => {
    expect(corpoCheEntra(cella, centro, blocco, 5)).toBe(5);
  });

  it('scende quando le righe crescono', () => {
    const due = corpoCheEntra(cella, centro, blocco, 200);
    const quattro = corpoCheEntra(cella, centro, { ...blocco, righe: [4, 4, 4, 4] }, 200);

    expect(quattro).toBeLessThan(due);
  });

  it('non è vincolato da una cella senza righe', () => {
    expect(corpoCheEntra(cella, centro, { ...blocco, righe: [] }, 200)).toBe(200);
  });
});

describe('ritaglia', () => {
  const quadrato: Punto[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('tiene la parte opposta alla normale', () => {
    // Si taglia a metà altezza guardando in su: resta la metà di sotto.
    const sotto = ritaglia(quadrato, { x: 0, y: 5 }, { x: 0, y: -1 });

    expect(sotto).toHaveLength(4);
    expect(Math.min(...sotto.map((punto) => punto.y))).toBe(5);
    expect(Math.max(...sotto.map((punto) => punto.y))).toBe(10);
  });

  it('lascia la cella intera quando la retta le passa oltre', () => {
    // Sotto la cella, guardando in su: non toglie niente.
    expect(ritaglia(quadrato, { x: 0, y: -5 }, { x: 0, y: -1 })).toHaveLength(4);
  });

  it('non lascia niente quando la cella sta tutta dalla parte sbagliata', () => {
    expect(ritaglia(quadrato, { x: 0, y: 20 }, { x: 0, y: -1 })).toHaveLength(0);
  });

  it('quel che resta sta dentro quel che c\'era', () => {
    const triangolo: Punto[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];
    const resto = ritaglia(triangolo, { x: 0, y: 3 }, { x: 0, y: -1 });

    expect(resto.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...resto.map((punto) => punto.y))).toBe(3);
    for (const punto of resto) {
      expect(distanzaDalBordo(triangolo, punto)).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe('i graha vakri', () => {
  it('raccoglie i retrogradi della carta, e nessun altro', () => {
    const celle = celleQuadro(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'sole', sign: 'ariete', retrograde: false },
          { id: 'giove', sign: 'toro', retrograde: true },
          { id: 'saturno', sign: 'toro', retrograde: true },
        ],
      },
      'sud',
    );

    expect([...(celle[0] as { vakri: ReadonlySet<string> }).vakri].sort()).toEqual([
      'giove',
      'saturno',
    ]);
  });

  it('è lo stesso insieme in tutte e dodici le celle', () => {
    // È una proprietà della carta, non della casella: dodici copie sarebbero
    // dodici occasioni di divergere.
    const celle = celleQuadro(CARTA, 'sud');
    for (const cella of celle) expect(cella.vakri).toBe(celle[0]?.vakri);
  });

  it('resta vuoto quando la carta non dice se i graha siano retrogradi', () => {
    // `retrograde` è opzionale: chi non lo sa non lo dice, e il disegno non
    // deve marcare «diretto» per finta.
    for (const cella of celleQuadro(CARTA, 'sud')) expect(cella.vakri.size).toBe(0);
  });

  it('non fa entrare i tre che graha non sono', () => {
    const celle = celleQuadro(
      {
        ascendant: 'ariete',
        positions: [
          { id: 'urano', sign: 'ariete', retrograde: true },
          { id: 'marte', sign: 'ariete', retrograde: true },
        ],
      },
      'sud',
    );

    expect([...(celle[0] as { vakri: ReadonlySet<string> }).vakri]).toEqual(['marte']);
  });
});
