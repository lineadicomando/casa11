import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { ChartError } from '../src/errors.js';
import { computeVarga, VARGAS, vargaSignOf } from '../src/varga.js';
import type { BirthData, VargaId } from '../src/types.js';

const NASCITA: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

const tema = () => computeNatalChart(NASCITA, { zodiac: 'siderale' });

/** L'inizio del segno numero `n`, contando l'Ariete come 0. */
const inizioSegno = (n: number): number => n * 30;

describe('D-1, che non divide niente', () => {
  it('restituisce il segno stesso', () => {
    expect(vargaSignOf(0, 'd1')).toBe('ariete');
    expect(vargaSignOf(200, 'd1')).toBe('bilancia');
  });
});

describe('D-3, che procede per trigoni', () => {
  it('manda i tre decani al segno, al quinto e al nono', () => {
    expect([0, 10, 20].map((d) => vargaSignOf(d, 'd3'))).toEqual([
      'ariete',
      'leone',
      'sagittario',
    ]);
    // Da un segno d'acqua i trigoni sono d'acqua.
    expect([90, 100, 110].map((d) => vargaSignOf(d, 'd3'))).toEqual([
      'cancro',
      'scorpione',
      'pesci',
    ]);
  });
});

describe('D-9, che parte da dove dice la modalità', () => {
  it('apre ogni segno dove la regola vuole', () => {
    // Cardinali dal segno stesso, fissi dal nono, mobili dal quinto: detto
    // altrimenti, fuoco dall'Ariete, terra dal Capricorno, aria dalla
    // Bilancia, acqua dal Cancro. Le due formulazioni devono coincidere, e
    // questa prova è ciò che lo garantisce.
    const aperture = Array.from({ length: 12 }, (_, i) => vargaSignOf(inizioSegno(i), 'd9'));

    expect(aperture).toEqual([
      'ariete', // Ariete, cardinale di fuoco
      'capricorno', // Toro, fisso di terra
      'bilancia', // Gemelli, mobile d'aria
      'cancro', // Cancro, cardinale d'acqua
      'ariete', // Leone, fisso di fuoco
      'capricorno', // Vergine, mobile di terra
      'bilancia', // Bilancia, cardinale d'aria
      'cancro', // Scorpione, fisso d'acqua
      'ariete', // Sagittario, mobile di fuoco
      'capricorno', // Capricorno, cardinale di terra
      'bilancia', // Acquario, fisso d'aria
      'cancro', // Pesci, mobile d'acqua
    ]);
  });

  it('chiude ogni segno nove parti più avanti', () => {
    // L'ultimo navamsa dell'Ariete è il nono dall'Ariete, cioè il Sagittario.
    expect(vargaSignOf(29.99, 'd9')).toBe('sagittario');
    // E quello dei Pesci chiude il giro dei centootto.
    expect(vargaSignOf(359.99, 'd9')).toBe('pesci');
  });

  it("cambia navamsa ogni 3°20'", () => {
    expect(vargaSignOf(3.33, 'd9')).toBe('ariete');
    expect(vargaSignOf(3.34, 'd9')).toBe('toro');
  });
});

describe('D-10, che si biforca su pari e dispari', () => {
  it('parte dal segno nei dispari e dal nono nei pari', () => {
    expect(vargaSignOf(inizioSegno(0), 'd10')).toBe('ariete'); // Ariete, dispari
    expect(vargaSignOf(inizioSegno(1), 'd10')).toBe('capricorno'); // Toro, pari
    expect(vargaSignOf(inizioSegno(2), 'd10')).toBe('gemelli'); // Gemelli, dispari
  });

  it('cambia parte ogni 3°', () => {
    expect(vargaSignOf(2.9, 'd10')).toBe('ariete');
    expect(vargaSignOf(3.1, 'd10')).toBe('toro');
  });
});

describe('D-12, che parte sempre dal segno stesso', () => {
  it("avanza di un segno ogni 2°30'", () => {
    expect(vargaSignOf(0, 'd12')).toBe('ariete');
    expect(vargaSignOf(2.6, 'd12')).toBe('toro');
    expect(vargaSignOf(29.9, 'd12')).toBe('pesci');
    // Anche da un segno pari: qui non c'è biforcazione.
    expect(vargaSignOf(inizioSegno(1), 'd12')).toBe('toro');
  });
});

describe('D-30, che abbandona le parti uguali', () => {
  it('divide i segni dispari in cinque tratti disuguali', () => {
    // 5° Marte, 5° Saturno, 8° Giove, 7° Mercurio, 5° Venere, ciascuno col
    // proprio segno dispari.
    expect([3, 7, 14, 20, 27].map((d) => vargaSignOf(d, 'd30'))).toEqual([
      'ariete',
      'acquario',
      'sagittario',
      'gemelli',
      'bilancia',
    ]);
  });

  it('rovescia l\'ordine nei segni pari, coi segni pari degli stessi pianeti', () => {
    expect([3, 7, 14, 22, 27].map((d) => vargaSignOf(30 + d, 'd30'))).toEqual([
      'toro',
      'vergine',
      'pesci',
      'capricorno',
      'scorpione',
    ]);
  });

  it('non è una divisione in trenta parti uguali', () => {
    // La prova che il varga sia quello giusto e non un trentesimo regolare: a
    // 14° un trentesimo uguale sarebbe alla quindicesima parte, qui siamo
    // ancora dentro gli otto gradi di Giove.
    expect(vargaSignOf(11, 'd30')).toBe(vargaSignOf(17, 'd30'));
    expect(vargaSignOf(9, 'd30')).not.toBe(vargaSignOf(11, 'd30'));
  });
});

describe('computeVarga', () => {
  it('porta con sé la regola che ha prodotto i segni', () => {
    // Fra le sedici divisioni le scuole divergono su più d'una: un segno
    // senza la sua regola non si può ricontrollare.
    for (const definizione of VARGAS) {
      const carta = computeVarga(tema(), definizione.id);
      expect(carta.rule).toBe(definizione.rule);
      expect(carta.rule.length).toBeGreaterThan(30);
      expect(carta.divisions).toBe(definizione.divisions);
      expect(carta.name).toBe(definizione.name);
    }
  });

  it('mette ogni corpo del tema in un segno, e ci aggiunge il lagna', () => {
    const carta = tema();
    const d9 = computeVarga(carta, 'd9');

    expect(d9.positions).toHaveLength(carta.bodies.length);
    expect(d9.ascendant).toBe(vargaSignOf(carta.angles!.ascendant, 'd9'));
  });

  it('nomina i nodi Rahu e Ketu come il resto del Jyotisha', () => {
    const d9 = computeVarga(tema(), 'd9');
    const nomi = d9.positions.map((position) => position.name);

    expect(nomi).toContain('Rahu');
    expect(nomi).toContain('Ketu');
    expect(nomi).not.toContain('Nodo Nord');
  });

  it('lascia il D-1 identico ai segni del tema', () => {
    // È la verifica che la serie cominci davvero dalla carta di partenza, e
    // non da una sua variante.
    const carta = tema();
    const d1 = computeVarga(carta, 'd1');

    for (const body of carta.bodies) {
      expect(d1.positions.find((p) => p.id === body.id)?.sign).toBe(body.sign);
    }
  });

  it('porta la retrogradazione in ogni varga, che è del corpo e non del segno', () => {
    // Il varga sposta dove un corpo cade, non come si muove: il moto
    // apparente a quell'istante resta quello in tutte e sedici le divisioni.
    // È la ragione per cui questo si può portare e il grado no — dentro un
    // segno di trimsamsa un grado non è nemmeno definito.
    const carta = tema();
    const vakri = new Set(
      carta.bodies.filter((body) => body.retrograde).map((body) => body.id),
    );
    expect(vakri.size).toBeGreaterThan(0);

    for (const definizione of VARGAS) {
      for (const position of computeVarga(carta, definizione.id).positions) {
        expect(position.retrograde).toBe(vakri.has(position.id));
      }
    }
  });

  it('non dà le case, che in un varga si contano dal lagna', () => {
    // Darle vorrebbe dire scegliere una domificazione dove il sistema non ne
    // prevede: dal segno del lagna e da quello del corpo la casa si ricava
    // senza altro calcolo.
    const d9 = computeVarga(tema(), 'd9');
    expect(d9).not.toHaveProperty('houses');
  });

  it('rifiuta un tema tropicale e un varga che non calcola', () => {
    expect(() => computeVarga(computeNatalChart(NASCITA), 'd9')).toThrow(ChartError);
    expect(() => vargaSignOf(0, 'd7' as VargaId)).toThrow(ChartError);
  });
});
