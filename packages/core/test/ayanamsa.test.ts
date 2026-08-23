import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { normalize360 } from '../src/math.js';
import { ChartError } from '../src/errors.js';
import { formatChartCompact } from '../src/format.js';
import { findTransitPassages } from '../src/passages.js';
import { findSignIngresses } from '../src/sky-events.js';
import { computeSky } from '../src/sky.js';
import { computeTransits } from '../src/transits.js';
import type { BirthData } from '../src/types.js';

const NASCITA: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

/** Longitudine di un corpo, per non ripetere la stessa `find` a ogni riga. */
function longitudine(
  bodies: readonly { id: string; longitude: number }[],
  id: string,
): number {
  const body = bodies.find((corpo) => corpo.id === id);
  if (!body) throw new Error(`corpo ${id} assente`);
  return body.longitude;
}

describe('zodiaco siderale', () => {
  it('è tropicale se non si chiede altro, e lo dichiara', () => {
    const chart = computeNatalChart(NASCITA);

    expect(chart.zodiac).toBe('tropicale');
    // Nessun ayanamsa: nel tropicale non ce n'è uno, e un valore a zero
    // sarebbe un dato inventato.
    expect(chart.ayanamsa).toBeUndefined();
    expect(longitudine(chart.bodies, 'sole')).toBeCloseTo(352.0454, 3);
  });

  it('sposta ogni longitudine di un ayanamsa, e dice di quanto', () => {
    const chart = computeNatalChart(NASCITA, { zodiac: 'siderale' });

    expect(chart.zodiac).toBe('siderale');
    expect(chart.ayanamsa?.id).toBe('lahiri');
    expect(chart.ayanamsa?.name).toBe('Lahiri');
    expect(chart.ayanamsa?.degrees).toBeCloseTo(23.411417, 4);

    // 12 marzo 1968, 13:30 UT: il Sole passa dai Pesci all'Acquario.
    expect(longitudine(chart.bodies, 'sole')).toBeCloseTo(328.6339, 3);
    expect(chart.bodies.find((b) => b.id === 'sole')?.sign).toBe('acquario');
  });

  it('scarta il tropicale esattamente dell\'ayanamsa dichiarato', () => {
    // È la prova che il valore riportato serva davvero a rifare il conto: chi
    // segue un'altra scuola sottrae la differenza invece di ricalcolare.
    const tropicale = computeNatalChart(NASCITA);
    const siderale = computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const scarto = siderale.ayanamsa?.degrees ?? 0;

    for (const corpo of ['sole', 'luna', 'marte', 'saturno', 'nodo-nord']) {
      const atteso = normalize360(longitudine(tropicale.bodies, corpo) - scarto);
      expect(longitudine(siderale.bodies, corpo)).toBeCloseTo(atteso, 6);
    }
    expect(siderale.angles!.ascendant).toBeCloseTo(
      normalize360(tropicale.angles!.ascendant - scarto),
      6,
    );
  });

  it('cambia ayanamsa quando glielo si chiede', () => {
    const raman = computeNatalChart(NASCITA, { zodiac: 'siderale', ayanamsa: 'raman' });

    expect(raman.ayanamsa?.id).toBe('raman');
    expect(raman.ayanamsa?.degrees).toBeCloseTo(21.965115, 4);
    // Più di un grado e mezzo da Lahiri: abbastanza da spostare un nakshatra.
    expect(longitudine(raman.bodies, 'sole')).toBeCloseTo(330.0803, 3);
  });

  it('non lascia i flag siderali addosso al tema successivo', () => {
    // La prova che il contesto siderale sia una copia. `initEphemeris` tiene in
    // cache un contesto per percorso: scriverci dentro `SEFLG_SIDEREAL`
    // significherebbe che il primo tema in Lahiri sposta di ventiquattro gradi
    // tutti quelli dopo, senza un errore da nessuna parte.
    const prima = computeNatalChart(NASCITA);
    computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const dopo = computeNatalChart(NASCITA);

    expect(dopo.zodiac).toBe('tropicale');
    expect(dopo.ayanamsa).toBeUndefined();
    expect(longitudine(dopo.bodies, 'sole')).toBe(longitudine(prima.bodies, 'sole'));
    expect(dopo.angles?.ascendant).toBe(prima.angles?.ascendant);
  });

  it('non si fa contagiare da un ayanamsa chiesto poco prima', () => {
    computeNatalChart(NASCITA, { zodiac: 'siderale', ayanamsa: 'raman' });
    const lahiri = computeNatalChart(NASCITA, { zodiac: 'siderale' });

    expect(lahiri.ayanamsa?.degrees).toBeCloseTo(23.411417, 4);
  });

  it('rifiuta un ayanamsa che non conosce invece di ripiegare', () => {
    expect(() =>
      // @ts-expect-error: è proprio il valore fuori tipo che si vuole provare.
      computeNatalChart(NASCITA, { zodiac: 'siderale', ayanamsa: 'inesistente' }),
    ).toThrow(ChartError);
  });
});

describe('lo zodiaco nelle altre superfici', () => {
  it('il cielo lo prende come opzione e lo riporta', () => {
    const sky = computeSky(
      { date: '2026-08-01', time: '18:30', timezone: 'Europe/Rome' },
      { zodiac: 'siderale', ayanamsa: 'krishnamurti' },
    );

    expect(sky.zodiac).toBe('siderale');
    expect(sky.ayanamsa?.id).toBe('krishnamurti');
  });

  it('i transiti ereditano lo zodiaco del tema, senza poterlo contraddire', () => {
    const natal = computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const transits = computeTransits(natal, { date: '2026-08-01', timezone: 'Europe/Rome' });

    expect(transits.zodiac).toBe('siderale');
    expect(transits.ayanamsa?.id).toBe('lahiri');
  });

  it('lascia intatti gli aspetti interni al tema', () => {
    // Un aspetto fra due corpi dello stesso istante non cambia da uno zodiaco
    // all'altro: è una differenza fra due longitudini, e l'ayanamsa le sposta
    // entrambe. Vale dentro il tema e vale nel cielo.
    const tropicale = computeNatalChart(NASCITA);
    const siderale = computeNatalChart(NASCITA, { zodiac: 'siderale' });

    // Ordinati, non nell'ordine in cui escono. L'asse dei Nodi produce coppie
    // di aspetti con l'orbita esattamente uguale — i due nodi sono opposti per
    // costruzione — e fra due pari l'ordinamento sceglie per un'inezia in
    // fondo ai decimali, che l'ayanamsa può ribaltare. Il fatto da provare è
    // quali aspetti ci siano e quanto siano stretti.
    const chiave = (a: { from: string; aspect: string; to: string; orb: number }) =>
      `${a.from}-${a.aspect}-${a.to} ${a.orb.toFixed(9)}`;

    expect(siderale.aspects.map(chiave).sort()).toEqual(tropicale.aspects.map(chiave).sort());
  });

  it('sposta invece i transiti, di quanto l\'ayanamsa è cresciuto fra le due epoche', () => {
    // Qui i due lati stanno in epoche diverse, e fra il 1968 e il 2026
    // l'ayanamsa è cresciuto di quasi un grado: la precessione avanza di circa
    // cinquantun secondi d'arco l'anno. È la ragione per cui un ritorno di
    // Saturno siderale non cade quando cade quello tropicale, e non è un
    // arrotondamento.
    const momento = { date: '2026-08-01', time: '12:00', timezone: 'Europe/Rome' };
    const natalTropicale = computeNatalChart(NASCITA);
    const natalSiderale = computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const tropicali = computeTransits(natalTropicale, momento);
    const siderali = computeTransits(natalSiderale, momento);

    const deriva = siderali.ayanamsa!.degrees - natalSiderale.ayanamsa!.degrees;
    expect(deriva).toBeCloseTo(0.8196, 3);

    // La separazione fra transitante e punto natale si accorcia esattamente
    // della deriva: è la verifica che il numero riportato spieghi lo scarto.
    const saturnoT = (chart: typeof tropicali) =>
      chart.transiting.find((b) => b.id === 'saturno')!.longitude;
    const saturnoN = (chart: typeof natalTropicale) =>
      chart.bodies.find((b) => b.id === 'saturno')!.longitude;

    const separazioneTropicale = normalize360(saturnoT(tropicali) - saturnoN(natalTropicale));
    const separazioneSiderale = normalize360(saturnoT(siderali) - saturnoN(natalSiderale));
    expect(separazioneSiderale).toBeCloseTo(normalize360(separazioneTropicale - deriva), 6);
  });

  it('riporta l\'ayanamsa dell\'istante del transito, non quello della nascita', () => {
    // È quello con cui i transitanti sono stati davvero calcolati: riportare
    // il natale darebbe un numero con cui il conto non torna.
    const natal = computeNatalChart(NASCITA, { zodiac: 'siderale' });
    const transits = computeTransits(natal, { date: '2026-08-01', timezone: 'Europe/Rome' });

    expect(transits.ayanamsa!.degrees).toBeGreaterThan(natal.ayanamsa!.degrees);
    expect(transits.ayanamsa!.degrees).toBeCloseTo(24.231053, 4);
  });

  it('perfeziona i passaggi in istanti diversi nei due zodiaci', () => {
    // Stesso aspetto, la stessa deriva vista sopra ma letta sull'asse del
    // tempo: Saturno sul Sole natale cade il 12 marzo 2025 nel tropicale e il
    // 18 nel siderale. Sei giorni, che su un transito di Saturno sono la
    // differenza fra due settimane diverse della vita di qualcuno.
    const range = { from: '2025-01-01', to: '2025-12-31', timezone: 'Europe/Rome' };
    const opzioni = { targets: ['sole'], bodies: ['saturno'] } as const;
    const tropicali = findTransitPassages(computeNatalChart(NASCITA), range, {
      targets: [...opzioni.targets],
      bodies: [...opzioni.bodies],
    });
    const siderali = findTransitPassages(
      computeNatalChart(NASCITA, { zodiac: 'siderale' }),
      range,
      { targets: [...opzioni.targets], bodies: [...opzioni.bodies] },
    );

    expect(tropicali.passages).toHaveLength(1);
    expect(siderali.passages).toHaveLength(1);
    expect(tropicali.passages[0]!.aspect).toBe('congiunzione');
    expect(siderali.passages[0]!.aspect).toBe('congiunzione');
    expect(tropicali.passages[0]!.exact.slice(0, 10)).toBe('2025-03-12');
    expect(siderali.passages[0]!.exact.slice(0, 10)).toBe('2025-03-18');
  });

  it('sposta invece gli ingressi nei segni, che dipendono da dove comincia l\'Ariete', () => {
    const range = { from: '2026-01-01', to: '2026-12-31', timezone: 'Europe/Rome' };
    const tropicali = findSignIngresses(range, { bodies: ['giove'] });
    const siderali = findSignIngresses(range, { bodies: ['giove'], zodiac: 'siderale' });

    // Stesso corpo, stesso arco, confini diversi: gli istanti non possono
    // coincidere, e i segni in cui entra nemmeno.
    expect(siderali.ingresses.map((i) => i.exact)).not.toEqual(
      tropicali.ingresses.map((i) => i.exact),
    );
  });
});

describe('la resa compatta', () => {
  it('dichiara lo zodiaco anche quando è quello atteso', () => {
    // Un\'assenza non è un\'affermazione: chi non trova la riga non sa se il
    // tema sia tropicale o se qualcuno se ne sia dimenticato.
    expect(formatChartCompact(computeNatalChart(NASCITA))).toContain('Zodiaco: tropicale');
  });

  it('nomina la scuola e il valore quando è siderale', () => {
    const testo = formatChartCompact(computeNatalChart(NASCITA, { zodiac: 'siderale' }));

    expect(testo).toContain('Zodiaco: siderale (Lahiri 23°25');
  });
});
