import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { formatDrishtiCompact } from '../src/format.js';
import { computeDrishti, housesSeenBy } from '../src/drishti.js';
import { ChartError } from '../src/errors.js';
import type { BirthData, BodyId, NodeDrishti } from '../src/types.js';

const NASCITA: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

const tema = () => computeNatalChart(NASCITA, { zodiac: 'siderale' });

/**
 * Da quale casa `to` vede `from`, se `from` vede `to` dalla casa `house`.
 *
 * Le case si contano sempre in avanti: da un punto al settimo ci sono sei
 * segni, e a tornare indietro se ne attraversano altri sei. Da cui la
 * simmetria del quattordici meno.
 */
const controcasa = (house: number): number => 14 - house;

describe('chi guarda che cosa', () => {
  it('dà a tutti e sette la settima', () => {
    for (const graha of ['sole', 'luna', 'mercurio', 'venere', 'marte', 'giove', 'saturno']) {
      expect(housesSeenBy(graha as BodyId, 'nessuna')).toContain(7);
    }
  });

  it('dà le speciali a Marte, Giove e Saturno', () => {
    expect(housesSeenBy('marte', 'nessuna')).toEqual([4, 7, 8]);
    expect(housesSeenBy('giove', 'nessuna')).toEqual([5, 7, 9]);
    expect(housesSeenBy('saturno', 'nessuna')).toEqual([3, 7, 10]);
    // Gli altri quattro hanno solo la settima.
    expect(housesSeenBy('sole', 'nessuna')).toEqual([7]);
    expect(housesSeenBy('luna', 'nessuna')).toEqual([7]);
  });

  it('non dà niente a chi graha non è', () => {
    // Qui l'esclusione non è una scelta del motore come nella tabella dei
    // nakshatra — là una divisione del cerchio vale per ogni longitudine —
    // ma una dottrina su corpi precisi. Dare una drishti a Urano vorrebbe
    // dire inventarla.
    for (const corpo of ['urano', 'nettuno', 'plutone', 'chirone', 'lilith']) {
      expect(housesSeenBy(corpo as BodyId, 'nessuna')).toEqual([]);
    }
  });

  it('tratta i nodi secondo la convenzione, e non ne sceglie una in silenzio', () => {
    expect(housesSeenBy('nodo-nord', 'nessuna')).toEqual([]);
    expect(housesSeenBy('nodo-sud', 'nessuna')).toEqual([]);
    expect(housesSeenBy('nodo-nord', 'gioviana')).toEqual([5, 7, 9]);
    expect(housesSeenBy('nodo-sud', 'gioviana')).toEqual([5, 7, 9]);
  });
});

describe('il verso dello sguardo', () => {
  it('rende la settima l\'unica reciproca da sola', () => {
    // Chi sta al settimo da me mi ha al settimo: sei segni per andare, sei per
    // tornare. È la sola casa che si specchi in sé stessa.
    expect(controcasa(7)).toBe(7);
  });

  it('non rende reciproche le speciali di Giove e Marte con sé stesse', () => {
    // La quinta di Giove si specchia nella nona, che pure è di Giove: ma
    // servono due Giove, e ce n'è uno solo. La quarta di Marte si specchia
    // nella decima, che Marte non guarda.
    expect(controcasa(5)).toBe(9);
    expect(controcasa(9)).toBe(5);
    expect(housesSeenBy('marte', 'nessuna')).not.toContain(controcasa(4));
    expect(housesSeenBy('marte', 'nessuna')).not.toContain(controcasa(8));
  });

  it('rende Marte e Saturno reciproci in quarta e decima', () => {
    // Il caso non ovvio: se Saturno sta al quarto da Marte, Marte lo guarda
    // con la sua quarta e Saturno guarda Marte con la sua decima. Si vedono
    // per case diverse, ma si vedono.
    expect(controcasa(4)).toBe(10);
    expect(housesSeenBy('saturno', 'nessuna')).toContain(controcasa(4));
    expect(housesSeenBy('marte', 'nessuna')).toContain(controcasa(10));
  });

  it("lascia l'undicesima e la seconda fuori da ogni sguardo", () => {
    // Sono le due che nessuno guarda, ed è la ragione per cui la terza di
    // Saturno non torna indietro: dal terzo si è undicesimi.
    for (const nodes of ['nessuna', 'gioviana'] as NodeDrishti[]) {
      const tutte = new Set(
        (
          [
            'sole',
            'luna',
            'mercurio',
            'venere',
            'marte',
            'giove',
            'saturno',
            'nodo-nord',
            'nodo-sud',
          ] as BodyId[]
        ).flatMap((graha) => [...housesSeenBy(graha, nodes)]),
      );
      expect(tutte.has(11)).toBe(false);
      expect(tutte.has(2)).toBe(false);
      expect(tutte.has(1)).toBe(false);
    }
  });
});

describe('computeDrishti', () => {
  it('conta le case a segni interi, senza orbita', () => {
    // Saturno è a 19°01' dei Pesci: guarda il Toro come terza, la Vergine
    // come settima, il Sagittario come decima. I gradi dentro il segno non
    // entrano nel conto.
    const sguardi = computeDrishti(tema()).signs.filter((s) => s.from === 'saturno');

    expect(sguardi).toEqual([
      { from: 'saturno', fromName: 'Saturno', house: 3, sign: 'toro' },
      { from: 'saturno', fromName: 'Saturno', house: 7, sign: 'vergine' },
      { from: 'saturno', fromName: 'Saturno', house: 10, sign: 'sagittario' },
    ]);
  });

  it('riporta anche i segni che nessuno abita', () => {
    // Una drishti su una casa vuota è un dato che questo sistema usa: tenerla
    // fuori sarebbe il motore che decide che cosa conti.
    const drishti = computeDrishti(tema());
    const segniColpiti = new Set(drishti.signs.map((s) => s.sign));
    const segniOccupati = new Set(tema().bodies.map((b) => b.sign));

    expect([...segniColpiti].some((sign) => !segniOccupati.has(sign))).toBe(true);
  });

  it('nomina i nodi Rahu e Ketu', () => {
    const drishti = computeDrishti(tema(), { nodes: 'gioviana' });
    const nomi = drishti.aspects.flatMap((a) => [a.fromName, a.toName]);

    expect(nomi).toContain('Rahu');
    expect(nomi).not.toContain('Nodo Nord');
  });

  it('dichiara la convenzione dei nodi nel risultato', () => {
    expect(computeDrishti(tema()).nodes).toBe('nessuna');
    expect(computeDrishti(tema(), { nodes: 'gioviana' }).nodes).toBe('gioviana');
  });

  it('aggiunge sguardi quando i nodi ne gettano', () => {
    const senza = computeDrishti(tema());
    const con = computeDrishti(tema(), { nodes: 'gioviana' });

    expect(con.aspects.length).toBeGreaterThan(senza.aspects.length);
    expect(con.signs.length).toBe(senza.signs.length + 6);
  });

  it('non fa guardare nessuno da Urano, Nettuno e Plutone', () => {
    const drishti = computeDrishti(tema());
    const chiGuarda = new Set(drishti.aspects.map((a) => a.from));

    expect(chiGuarda.has('urano')).toBe(false);
    expect(chiGuarda.has('plutone')).toBe(false);
    // Riceverli, però, possono: uno sguardo cade sul segno, e chi lo abita
    // se lo prende comunque.
    expect(drishti.aspects.some((a) => a.to === 'plutone')).toBe(true);
  });

  it('avverte che senza lagna gli sguardi non cadono su nessuna casa', () => {
    const senzaOra = computeNatalChart({ ...NASCITA, time: undefined }, { zodiac: 'siderale' });
    const drishti = computeDrishti(senzaOra);

    expect(drishti.warnings.join(' ')).toMatch(/lagna/);
    expect(drishti.aspects.every((a) => a.to !== 'lagna')).toBe(true);
    // Chi guarda chi resta: non dipende dall'ora.
    expect(drishti.aspects.length).toBeGreaterThan(0);
  });

  it('rifiuta un tema tropicale', () => {
    expect(() => computeDrishti(computeNatalChart(NASCITA))).toThrow(ChartError);
  });
});

describe('la resa compatta degli sguardi', () => {
  it('tiene separate le due tabelle, che dicono cose diverse', () => {
    // La prima i contatti fra graha, la seconda dove lo sguardo arriva anche
    // dove non trova nessuno: non è il riassunto dell'altra.
    const testo = formatDrishtiCompact(computeDrishti(tema()));

    expect(testo).toContain('DRISHTI');
    expect(testo).toContain('SEGNI GUARDATI');
    expect(testo).toMatch(/Saturno\s+→ Urano\s+7ª casa/);
    expect(testo).toMatch(/Saturno\s+3ª\s+toro/);
  });

  it('dichiara in testa la convenzione dei nodi', () => {
    expect(formatDrishtiCompact(computeDrishti(tema()))).toContain('forma classica');
    expect(formatDrishtiCompact(computeDrishti(tema(), { nodes: 'gioviana' }))).toContain(
      'come Giove',
    );
  });
});
