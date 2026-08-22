import { describe, expect, it } from 'vitest';
import {
  COSTELLAZIONI,
  GIRO,
  RESPIRO,
  avvolgi,
  contaScatti,
  disponiFigure,
  luce,
  quanteStelle,
  seminaStelle,
  sorteggio,
  tinta,
} from './cielo';
import { COLOR_SCHEMES } from './color-scheme';

describe('COSTELLAZIONI', () => {
  it('unisce stelle che esistono', () => {
    // Un indice fuori posto non romperebbe niente: disegnerebbe una linea che
    // parte da `undefined`, cioè da nessuna parte, e la figura perderebbe un
    // pezzo senza che nessuno se ne accorga finché non la guarda.
    for (const { nome, stelle, segmenti } of COSTELLAZIONI) {
      for (const [da, a] of segmenti) {
        expect(stelle[da], `${nome}: segmento da ${da}`).toBeDefined();
        expect(stelle[a], `${nome}: segmento a ${a}`).toBeDefined();
        expect(da, `${nome}: segmento su sé stesso`).not.toBe(a);
      }
    }
  });

  it('sta nel riquadro unitario', () => {
    for (const { nome, stelle } of COSTELLAZIONI) {
      for (const { x, y } of stelle) {
        expect(x, `${nome}`).toBeGreaterThanOrEqual(0);
        expect(x, `${nome}`).toBeLessThanOrEqual(1);
        expect(y, `${nome}`).toBeGreaterThanOrEqual(0);
        expect(y, `${nome}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('tiene tutte le stelle attaccate alla figura', () => {
    // Una stella disegnata e mai collegata sembra un errore di disegno, non
    // una stella in più.
    for (const { nome, stelle, segmenti } of COSTELLAZIONI) {
      const collegate = new Set(segmenti.flat());
      for (let i = 0; i < stelle.length; i += 1) {
        expect(collegate.has(i), `${nome}: la stella ${i} non tocca nessuna linea`).toBe(true);
      }
    }
  });
});

describe('seminaStelle', () => {
  it('sta dentro il riquadro, con lo stesso seme sempre uguale', () => {
    const stelle = seminaStelle(200, sorteggio(11));
    expect(stelle).toHaveLength(200);
    for (const stella of stelle) {
      expect(stella.x).toBeGreaterThanOrEqual(0);
      expect(stella.x).toBeLessThan(1);
      expect(stella.y).toBeGreaterThanOrEqual(0);
      expect(stella.y).toBeLessThan(1);
      expect(stella.raggio).toBeGreaterThan(0);
    }
    expect(seminaStelle(200, sorteggio(11))).toEqual(stelle);
  });

  it('non le fa scintillare tutte insieme', () => {
    const stelle = seminaStelle(50, sorteggio(3));
    const fasi = new Set(stelle.map((s) => s.fase.toFixed(4)));
    expect(fasi.size).toBeGreaterThan(40);
  });
});

describe('quanteStelle', () => {
  it('cresce con lo schermo, ma non oltre', () => {
    expect(quanteStelle(360, 640)).toBeLessThan(quanteStelle(1440, 900));
    expect(quanteStelle(120, 120)).toBeGreaterThanOrEqual(90);
    expect(quanteStelle(6000, 4000)).toBeLessThanOrEqual(460);
  });
});

describe('disponiFigure', () => {
  function riquadri(figure: ReturnType<typeof disponiFigure>) {
    return figure.map((f) => ({ x: f.x, y: f.y, lato: f.lato }));
  }

  it('non sovrappone due figure', () => {
    // Con qualunque seme: la garanzia deve venire dalla griglia, non dalla
    // fortuna del sorteggio.
    for (let seme = 0; seme < 40; seme += 1) {
      const figure = riquadri(disponiFigure(1440, 900, sorteggio(seme)));
      for (let i = 0; i < figure.length; i += 1) {
        for (let j = i + 1; j < figure.length; j += 1) {
          const a = figure[i]!;
          const b = figure[j]!;
          const staccate =
            a.x + a.lato <= b.x ||
            b.x + b.lato <= a.x ||
            a.y + a.lato <= b.y ||
            b.y + b.lato <= a.y;
          expect(staccate, `seme ${seme}: ${i} e ${j} si accavallano`).toBe(true);
        }
      }
    }
  });

  it('non sborda dallo schermo', () => {
    for (let seme = 0; seme < 40; seme += 1) {
      for (const [larghezza, altezza] of [
        [1440, 900],
        [390, 844],
        [1024, 500],
      ] as const) {
        for (const f of disponiFigure(larghezza, altezza, sorteggio(seme))) {
          expect(f.x).toBeGreaterThanOrEqual(0);
          expect(f.y).toBeGreaterThanOrEqual(0);
          expect(f.x + f.lato).toBeLessThanOrEqual(larghezza + 0.001);
          expect(f.y + f.lato).toBeLessThanOrEqual(altezza + 0.001);
        }
      }
    }
  });

  it('su uno schermo piccolo ne posa meno, non le ammucchia', () => {
    const strette = disponiFigure(300, 240, sorteggio(1));
    expect(strette.length).toBe(1);
    expect(disponiFigure(1440, 900, sorteggio(1)).length).toBe(COSTELLAZIONI.length);
  });
});

describe('avvolgi', () => {
  it('riporta dentro chi esce da un lato', () => {
    expect(avvolgi(0.25, 0, 1)).toBeCloseTo(0.25);
    expect(avvolgi(-0.25, 0, 1)).toBeCloseTo(0.75);
    expect(avvolgi(1.25, 0, 1)).toBeCloseTo(0.25);
    // Chi è uscito da un pezzo torna comunque, senza accumulare deriva.
    expect(avvolgi(-12.25, 0, 1)).toBeCloseTo(0.75);
  });

  it('vale anche per un intervallo che comincia in negativo', () => {
    // È il caso delle costellazioni: il riquadro deve poter uscire tutto dal
    // bordo sinistro prima di rientrare da destra.
    expect(avvolgi(-260, -200, 1400)).toBeCloseTo(1140);
    expect(avvolgi(-200, -200, 1400)).toBeCloseTo(-200);
  });
});

describe('luce', () => {
  it('non esce mai dalla trasparenza', () => {
    const stelle = seminaStelle(120, sorteggio(7));
    for (const stella of stelle) {
      for (let t = 0; t < 40; t += 0.37) {
        const valore = luce(stella, t);
        expect(valore).toBeGreaterThanOrEqual(0);
        expect(valore).toBeLessThanOrEqual(1);
      }
    }
  });

  it('scintilla', () => {
    const stella = seminaStelle(1, sorteggio(5))[0]!;
    const valori = new Set<string>();
    for (let t = 0; t < 12; t += 0.5) valori.add(luce(stella, t).toFixed(3));
    expect(valori.size).toBeGreaterThan(5);
  });
});

describe('tinta', () => {
  it('scrive un colore che il canvas capisce', () => {
    expect(tinta([1, 2, 3], 0.5)).toBe('rgba(1, 2, 3, 0.500)');
  });

  it('non lascia passare una trasparenza fuori scala', () => {
    // Un `rgba` con alfa 1.4 è una stringa non valida e il canvas la ignora in
    // silenzio: la stella smetterebbe di comparire senza dire perché.
    expect(tinta([1, 2, 3], 1.4)).toBe('rgba(1, 2, 3, 1.000)');
    expect(tinta([1, 2, 3], -0.2)).toBe('rgba(1, 2, 3, 0.000)');
  });
});

describe('contaScatti', () => {
  it('conta un giro di clic ravvicinati', () => {
    let scatti = 0;
    let ultimo: number | null = null;
    for (const ora of [1000, 1300, 1600]) {
      scatti = contaScatti(scatti, ultimo, ora);
      ultimo = ora;
    }
    expect(scatti).toBe(GIRO);
  });

  it('ricomincia se fra un clic e l’altro si è pensato ad altro', () => {
    expect(contaScatti(2, 1000, 1000 + RESPIRO + 1)).toBe(1);
  });

  it('vale quanto il ciclo del pulsante, non tre per sempre', () => {
    expect(GIRO).toBe(COLOR_SCHEMES.length);
  });
});
