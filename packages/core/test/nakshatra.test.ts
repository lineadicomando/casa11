import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { formatNakshatraCompact } from '../src/format.js';
import { ChartError } from '../src/errors.js';
import {
  grahaName,
  NAKSHATRAS,
  nakshatraOf,
  NAKSHATRA_SPAN,
  PADA_SPAN,
  requireSidereal,
  VIMSHOTTARI_ORDER,
} from '../src/nakshatra.js';
import type { BirthData } from '../src/types.js';

const NASCITA: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

describe('la tabella dei nakshatra', () => {
  it('ne conta ventisette, senza ripetizioni', () => {
    expect(NAKSHATRAS).toHaveLength(27);
    expect(new Set(NAKSHATRAS.map((n) => n.id)).size).toBe(27);
    expect(new Set(NAKSHATRAS.map((n) => n.name)).size).toBe(27);
  });

  it('divide il cerchio in parti da 13°20\', e ciascuna in quattro pada', () => {
    expect(NAKSHATRA_SPAN * 27).toBeCloseTo(360, 10);
    expect(NAKSHATRA_SPAN).toBeCloseTo(13 + 20 / 60, 10);
    expect(PADA_SPAN * 4).toBeCloseTo(NAKSHATRA_SPAN, 10);
  });

  it('ha nove signori che si ripetono tre volte', () => {
    expect(VIMSHOTTARI_ORDER).toHaveLength(9);
    expect(new Set(VIMSHOTTARI_ORDER).size).toBe(9);

    // Il primo di ogni giro è Ketu: è la struttura da cui il signore si
    // ricava invece di scriverlo in una colonna di ventisette righe.
    for (const indice of [1, 10, 19]) {
      expect(nakshatraOf((indice - 0.5) * NAKSHATRA_SPAN).lord).toBe('nodo-sud');
    }
    expect(nakshatraOf(359).lord).toBe('mercurio');
  });
});

describe('nakshatraOf', () => {
  it('apre in Ashwini a 0° e chiude in Revati a 360°', () => {
    const primo = nakshatraOf(0);
    expect(primo.id).toBe('ashwini');
    expect(primo.index).toBe(1);
    expect(primo.pada).toBe(1);
    expect(primo.degree).toBe(0);

    const ultimo = nakshatraOf(359.999);
    expect(ultimo.id).toBe('revati');
    expect(ultimo.index).toBe(27);
    expect(ultimo.pada).toBe(4);
  });

  it('cambia nakshatra esattamente al confine', () => {
    expect(nakshatraOf(NAKSHATRA_SPAN - 0.0001).id).toBe('ashwini');
    expect(nakshatraOf(NAKSHATRA_SPAN + 0.0001).id).toBe('bharani');
    expect(nakshatraOf(NAKSHATRA_SPAN + 0.0001).degree).toBeCloseTo(0, 3);
  });

  it('cambia pada a ogni 3°20\'', () => {
    expect(nakshatraOf(PADA_SPAN - 0.0001).pada).toBe(1);
    expect(nakshatraOf(PADA_SPAN + 0.0001).pada).toBe(2);
    expect(nakshatraOf(PADA_SPAN * 3 + 0.0001).pada).toBe(4);
  });

  it('normalizza una longitudine fuori giro invece di rifiutarla', () => {
    expect(nakshatraOf(360).id).toBe('ashwini');
    expect(nakshatraOf(-1).id).toBe('revati');
  });

  it('mette la Luna del tema di riferimento in Ashlesha, quarto pada', () => {
    // 12 marzo 1968, 13:30 UT, ayanamsa Lahiri: la Luna è a 119°28'.
    const chart = computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const luna = chart.bodies.find((body) => body.id === 'luna');
    const nakshatra = nakshatraOf(luna!.longitude);

    expect(nakshatra.name).toBe('Ashlesha');
    expect(nakshatra.index).toBe(9);
    expect(nakshatra.pada).toBe(4);
    expect(nakshatra.lord).toBe('mercurio');
  });

  it('cambia nakshatra alla Luna se si cambia ayanamsa', () => {
    // Fra Lahiri e Raman corre più di un grado e mezzo: abbastanza da spostare
    // un pada, e in qualche caso il nakshatra. È la ragione per cui la
    // convenzione viaggia col risultato.
    const lahiri = computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const raman = computeNatalChart(NASCITA, { zodiac: 'siderale', ayanamsa: 'raman' });

    const di = (chart: typeof lahiri) =>
      nakshatraOf(chart.bodies.find((body) => body.id === 'luna')!.longitude);

    expect(di(lahiri).pada).not.toBe(di(raman).pada);
  });
});

describe('i nomi dei graha', () => {
  it('chiama i due nodi Rahu e Ketu', () => {
    // In questo sistema non sono punti calcolati ma graha con un nome:
    // «periodo di Nodo Nord» non è una traduzione, è una cosa che nessuno dice.
    expect(grahaName('nodo-nord', 'Nodo Nord')).toBe('Rahu');
    expect(grahaName('nodo-sud', 'Nodo Sud')).toBe('Ketu');
  });

  it('lascia agli altri sette il nome che il motore usa già', () => {
    expect(grahaName('giove', 'Giove')).toBe('Giove');
  });

  it('ripiega sul nome del motore per chi graha non è', () => {
    // Urano, Nettuno e Plutone non esistono in questo sistema, che è più
    // vecchio di loro di qualche millennio.
    expect(grahaName('urano', 'Urano')).toBe('Urano');
    expect(grahaName('chirone', 'Chirone')).toBe('Chirone');
  });
});

describe('requireSidereal', () => {
  it('lascia passare il siderale', () => {
    expect(() => requireSidereal('siderale', 'Il nakshatra')).not.toThrow();
  });

  it('rifiuta il tropicale con un errore, non con un avviso', () => {
    // Un nakshatra tropicale non è un pezzo che manca: è un numero che sembra
    // buono e non lo è, e un'avvertenza accanto la legge chi già lo sa.
    expect(() => requireSidereal('tropicale', 'Il nakshatra')).toThrow(ChartError);

    try {
      requireSidereal('tropicale', 'Il nakshatra');
    } catch (errore) {
      expect((errore as ChartError).code).toBe('ZODIACO_NON_SIDERALE');
      expect((errore as ChartError).message).toContain('siderale');
    }
  });
});

describe('la tabella compatta dei nakshatra', () => {
  it('nomina i nodi Rahu e Ketu, e dà pada e signore', () => {
    const testo = formatNakshatraCompact(computeNatalChart(NASCITA, { zodiac: 'siderale' }));

    expect(testo).toContain('NAKSHATRA');
    expect(testo).toMatch(/Luna .*Ashlesha .*pada 4 .*sig\. Mercurio/);
    expect(testo).toMatch(/Rahu .*Revati/);
    expect(testo).toMatch(/Ketu .*Chitra/);
    expect(testo).not.toContain('Nodo Nord');
  });

  it('porta anche i tre che graha non sono, senza decidere per la scuola', () => {
    // Un nakshatra è una divisione del cerchio: ogni longitudine ne ha una.
    // Toglierli sarebbe il motore che decide chi conta.
    const testo = formatNakshatraCompact(computeNatalChart(NASCITA, { zodiac: 'siderale' }));

    expect(testo).toContain('Urano');
    expect(testo).toContain('Plutone');
  });

  it('si rifiuta di stampare una tabella tropicale', () => {
    expect(() => formatNakshatraCompact(computeNatalChart(NASCITA))).toThrow(ChartError);
  });
});
