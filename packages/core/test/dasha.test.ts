import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { formatDashaCompact } from '../src/format.js';
import {
  computeVimshottari,
  DASHA_DAYS_PER_YEAR,
  dashaAt,
  VIMSHOTTARI_TOTAL,
  VIMSHOTTARI_YEARS,
} from '../src/dasha.js';
import { ChartError } from '../src/errors.js';
import type { BirthData, DashaPeriod } from '../src/types.js';

const NASCITA: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

const tema = () => computeNatalChart(NASCITA, { zodiac: 'siderale' });

/** La somma degli anni di un elenco di periodi. */
const anni = (periods: readonly DashaPeriod[]): number =>
  periods.reduce((totale, period) => totale + period.years, 0);

describe('la tabella vimshottari', () => {
  it('somma centoventi anni esatti su nove graha', () => {
    // È la sola cosa di questa tabella che si possa verificare senza aprire
    // un libro, ed è il motivo per cui vale la pena verificarla.
    const valori = Object.values(VIMSHOTTARI_YEARS);
    expect(valori).toHaveLength(9);
    expect(valori.reduce((a, b) => a + b, 0)).toBe(VIMSHOTTARI_TOTAL);
  });

  it('conosce due lunghezze dell\'anno, e non una sola', () => {
    expect(DASHA_DAYS_PER_YEAR.solare).toBe(365.25);
    expect(DASHA_DAYS_PER_YEAR.savana).toBe(360);
  });
});

describe('computeVimshottari', () => {
  it('parte dal nakshatra della Luna e ne calcola il saldo', () => {
    const dasha = computeVimshottari(tema());

    expect(dasha.nakshatra.name).toBe('Ashlesha');
    expect(dasha.nakshatra.lord).toBe('mercurio');
    // La Luna aveva percorso il 96% di Ashlesha: di diciassette anni di
    // Mercurio ne restavano otto mesi scarsi.
    expect(dasha.balance).toBeCloseTo(0.6702, 3);
    expect(dasha.periods[0]?.lord).toBe('mercurio');
  });

  it('copre centoventi anni in nove mahadasha', () => {
    const dasha = computeVimshottari(tema(), { levels: 1 });

    expect(dasha.periods).toHaveLength(9);
    expect(anni(dasha.periods)).toBeCloseTo(VIMSHOTTARI_TOTAL, 9);
    // Ogni mahadasha dura quanto il suo graha vale: il primo ordine spartisce
    // il ciclo intero, non gli anni del primo signore.
    for (const period of dasha.periods) {
      expect(period.years).toBeCloseTo(VIMSHOTTARI_YEARS[period.lord]!, 9);
    }
  });

  it('apre il primo mahadasha prima della nascita e lo chiude dopo', () => {
    // La nascita cade dentro il primo periodo, non al suo inizio: è la ragione
    // per cui esiste un saldo, e senza tornare indietro la catena avrebbe un
    // buco lungo quanto la parte già trascorsa.
    const carta = tema();
    const dasha = computeVimshottari(carta);
    const primo = dasha.periods[0]!;

    expect(primo.start < carta.time.utc).toBe(true);
    expect(primo.end > carta.time.utc).toBe(true);
    expect(primo.years).toBe(17);
  });

  it('segue l\'ordine vimshottari a partire dal signore del nakshatra', () => {
    const dasha = computeVimshottari(tema(), { levels: 1 });

    expect(dasha.periods.map((period) => period.lord)).toEqual([
      'mercurio',
      'nodo-sud',
      'venere',
      'sole',
      'luna',
      'marte',
      'nodo-nord',
      'giove',
      'saturno',
    ]);
  });

  it('spartisce ogni periodo nei nove con le stesse proporzioni', () => {
    const dasha = computeVimshottari(tema(), { levels: 3 });
    const primo = dasha.periods[0]!;

    expect(primo.periods).toHaveLength(9);
    expect(anni(primo.periods!)).toBeCloseTo(primo.years, 9);

    // Il primo antardasha è del signore stesso, e dura la sua quota del
    // mahadasha: diciassette anni per diciassette centoventesimi.
    const antar = primo.periods![0]!;
    expect(antar.lord).toBe('mercurio');
    expect(antar.years).toBeCloseTo((17 * 17) / 120, 9);
    expect(antar.level).toBe(2);

    // E ricorsivamente, con la stessa regola.
    expect(anni(antar.periods!)).toBeCloseTo(antar.years, 9);
    expect(antar.periods![0]?.level).toBe(3);
  });

  it('non calcola i sotto-periodi che non gli si chiedono', () => {
    expect(computeVimshottari(tema(), { levels: 1 }).periods[0]?.periods).toBeUndefined();
    expect(computeVimshottari(tema(), { levels: 2 }).periods[0]?.periods).toHaveLength(9);
    expect(
      computeVimshottari(tema(), { levels: 2 }).periods[0]?.periods?.[0]?.periods,
    ).toBeUndefined();
  });

  it('non lascia buchi né sovrapposizioni fra un periodo e il successivo', () => {
    const dasha = computeVimshottari(tema(), { levels: 2 });

    for (let i = 1; i < dasha.periods.length; i += 1) {
      expect(dasha.periods[i]!.start).toBe(dasha.periods[i - 1]!.end);
    }
    const antar = dasha.periods[0]!.periods!;
    expect(antar[0]!.start).toBe(dasha.periods[0]!.start);
    expect(antar[antar.length - 1]!.end).toBe(dasha.periods[0]!.end);
  });

  it('trova il periodo in corso a un istante, a ogni ordine', () => {
    const dasha = computeVimshottari(tema(), { levels: 2 });
    const corrente = dashaAt(dasha, '2026-08-23T12:00:00Z');

    expect(corrente.map((period) => period.lord)).toEqual(['nodo-nord', 'saturno']);
    expect(corrente.map((period) => period.level)).toEqual([1, 2]);
  });

  it('non trova nulla fuori dai centoventi anni', () => {
    const dasha = computeVimshottari(tema(), { levels: 1 });

    expect(dashaAt(dasha, '1900-01-01T00:00:00Z')).toEqual([]);
    expect(dashaAt(dasha, '2200-01-01T00:00:00Z')).toEqual([]);
  });
});

describe('la lunghezza dell\'anno', () => {
  it('sposta le date, e lo scarto cresce lungo la catena', () => {
    // Non è una sfumatura: l'anno savana è più corto dell'1,46%, e su ottanta
    // anni di catena diventa più di un anno di differenza.
    const solare = computeVimshottari(tema(), { levels: 1 });
    const savana = computeVimshottari(tema(), { levels: 1, yearLength: 'savana' });

    expect(savana.yearLength).toBe('savana');
    expect(savana.daysPerYear).toBe(360);
    // Il saldo in anni è lo stesso: cambia quanto dura un anno, non quanti ne
    // restano.
    expect(savana.balance).toBeCloseTo(solare.balance, 9);

    const giorniDiScarto = (indice: number): number =>
      (Date.parse(solare.periods[indice]!.start) - Date.parse(savana.periods[indice]!.start)) /
      86_400_000;

    expect(giorniDiScarto(1)).toBeGreaterThan(3);
    expect(giorniDiScarto(8)).toBeGreaterThan(400);
  });
});

describe('quello che le dasha dichiarano di non sapere', () => {
  it('rifiuta un tema tropicale', () => {
    expect(() => computeVimshottari(computeNatalChart(NASCITA))).toThrow(ChartError);
  });

  it('avverte che senza ora di nascita la catena è indicativa per intero', () => {
    // Dodici ore di Luna sono sei gradi e mezzo, che su un mahadasha lungo
    // valgono quasi cinque anni: qui l'ora ignota non sposta i confini, li
    // rende inservibili.
    const senzaOra = computeNatalChart(
      { ...NASCITA, time: undefined },
      { zodiac: 'siderale' },
    );

    expect(computeVimshottari(senzaOra).warnings.join(' ')).toMatch(/Ora di nascita ignota/);
  });

  it('avverte del ripiego su Moshier, che qui vale ore di calendario', () => {
    const carta = tema();
    // Si simula il ripiego invece di nascondere le effemeridi: la proprietà da
    // provare è che l'avvertenza compaia, non quali file ci siano sul disco.
    const dasha = computeVimshottari({ ...carta, ephemerisMode: 'moshier' });

    expect(dasha.warnings.join(' ')).toMatch(/Moshier/);
    expect(dasha.warnings.join(' ')).toMatch(/qualche ora/);
  });
});

describe('la resa compatta della catena', () => {
  it('mette il saldo in testa e nomina i graha alla maniera indiana', () => {
    const testo = formatDashaCompact(computeVimshottari(tema(), { levels: 1 }));

    expect(testo).toContain('Saldo alla nascita: 0.67 anni');
    expect(testo).toContain('anno solare (365.25 giorni)');
    expect(testo).toMatch(/Rahu +2018-11-12/);
    expect(testo).toMatch(/Ketu +1968-11-12/);
    expect(testo).not.toContain('nodo-nord');
  });

  it('rientra i sotto-periodi invece di ripetere il signore che li contiene', () => {
    const testo = formatDashaCompact(computeVimshottari(tema(), { levels: 2 }));

    expect(testo).toMatch(/\nMercurio {4}1951-11-13/);
    expect(testo).toMatch(/\n {2}Mercurio {2}1951-11-13/);
  });

  it('scrive le durate tonde senza decimale, e i mesi sotto l\'anno', () => {
    // «7.0 anni» fa sembrare approssimato ciò che è esatto per costruzione, e
    // «12 mesi» è un anno scritto male.
    const testo = formatDashaCompact(computeVimshottari(tema(), { levels: 2 }));

    expect(testo).toMatch(/17 anni/);
    expect(testo).toMatch(/1 anno/);
    expect(testo).toMatch(/10 mesi/);
    expect(testo).not.toMatch(/7\.0 anni/);
    expect(testo).not.toMatch(/12 mesi/);
  });
});
