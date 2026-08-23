import { describe, expect, it } from 'vitest';
import { computePanchanga, karanaOf, tithiOf, yogaOf } from '../src/panchanga.js';
import type { Place } from '../src/types.js';

const DELHI: Place = { latitude: 28.6139, longitude: 77.209 };
const TROMSO: Place = { latitude: 69.65, longitude: 18.96 };

/**
 * Domenica 23 agosto 2026, Delhi.
 *
 * I valori attesi vengono dai panchanga pubblicati per quella data e quel
 * luogo: Shukla Ekadashi, nakshatra Mula, yoga Vishkambha all'alba, alba alle
 * 05:54. È l'unico modo di provare che le convenzioni siano quelle giuste e
 * non solo internamente coerenti — un off-by-uno nella numerazione dei tithi
 * darebbe un risultato che torna con sé stesso e sbaglia di un giorno.
 */
const RIFERIMENTO = { date: '2026-08-23', time: '12:00', timezone: 'Asia/Kolkata' };

describe('computePanchanga', () => {
  it('concorda con i panchanga pubblicati per Delhi', () => {
    const p = computePanchanga(RIFERIMENTO, DELHI);

    expect(p.tithi.name).toBe('Ekadashi');
    expect(p.tithi.paksha).toBe('shukla');
    expect(p.tithi.index).toBe(11);
    expect(p.nakshatra.name).toBe('Mula');
    expect(p.vara?.name).toBe('Ravivara');
    expect(p.vara?.lord).toBe('sole');
  });

  it("usa l'alba degli almanacchi e non quella geometrica", () => {
    // Quattro minuti di differenza, e sono quelli in cui la vara calcolata qui
    // direbbe un giorno diverso da quelli stampati.
    const p = computePanchanga(RIFERIMENTO, DELHI);

    expect(p.vara?.local.slice(11, 16)).toBe('05:54');
  });

  it('cambia vara all\'alba e non a mezzanotte', () => {
    // Alle tre del mattino di domenica regge ancora il sabato: è la regola che
    // governa anche le ore planetarie dell'elezione.
    const prima = computePanchanga({ ...RIFERIMENTO, time: '03:00' }, DELHI);
    const dopo = computePanchanga({ ...RIFERIMENTO, time: '06:30' }, DELHI);

    expect(prima.vara?.name).toBe('Shanivara');
    expect(prima.vara?.lord).toBe('saturno');
    expect(dopo.vara?.name).toBe('Ravivara');
  });

  it('porta le due longitudini da cui tutto discende', () => {
    const p = computePanchanga(RIFERIMENTO, DELHI);

    // Chi vuole ricontrollare non deve fidarsi: da queste due si rifà ogni
    // conto delle cinque parti.
    expect(p.tithi.index).toBe(tithiOf((p.moon - p.sun + 360) % 360).index);
    expect(p.karana.index).toBe(karanaOf((p.moon - p.sun + 360) % 360).index);
    expect(p.yoga.index).toBe(yogaOf((p.moon + p.sun) % 360).index);
    expect(p.nakshatra.index).toBe(Math.floor(p.moon / (360 / 27)) + 1);
  });

  it('è sempre siderale, e lo dichiara con la convenzione usata', () => {
    const p = computePanchanga(RIFERIMENTO, DELHI);

    expect(p.zodiac).toBe('siderale');
    expect(p.ayanamsa.id).toBe('lahiri');
    expect(p.ayanamsa.degrees).toBeGreaterThan(24);
  });

  it('cambia nakshatra e yoga con l\'ayanamsa, ma non tithi e karana', () => {
    // Tithi e karana vengono da una differenza fra longitudini, e una
    // differenza non cambia se si spostano entrambe. Lo yoga viene dalla
    // somma, che l'ayanamsa sposta due volte.
    const lahiri = computePanchanga(RIFERIMENTO, DELHI);
    const raman = computePanchanga(RIFERIMENTO, DELHI, { ayanamsa: 'raman' });

    expect(raman.tithi.index).toBe(lahiri.tithi.index);
    expect(raman.karana.index).toBe(lahiri.karana.index);
    expect(raman.tithi.degree).toBeCloseTo(lahiri.tithi.degree, 9);

    const scarto = lahiri.ayanamsa.degrees - raman.ayanamsa.degrees;
    expect(raman.yoga.degree - lahiri.yoga.degree).toBeCloseTo(2 * scarto, 6);
  });

  it('rinuncia alla vara dove il Sole non sorge, e lo dice', () => {
    const p = computePanchanga(
      { date: '2026-06-15', time: '12:00', timezone: 'Europe/Oslo' },
      TROMSO,
    );

    expect(p.vara).toBeUndefined();
    expect(p.warnings.join(' ')).toMatch(/Vara non calcolabile/);
    // Le altre quattro parti restano: non dipendono da un orizzonte.
    expect(p.tithi.name).toBeTruthy();
    expect(p.nakshatra.name).toBeTruthy();
  });

  it('avverte quando manca l\'ora, che qui pesa più che altrove', () => {
    const p = computePanchanga({ date: '2026-08-23', timezone: 'Asia/Kolkata' }, DELHI);

    expect(p.warnings.join(' ')).toMatch(/mezzogiorno locale/);
  });
});

describe('le divisioni del mese lunare', () => {
  it('apre il mese con Pratipada e lo chiude con Amavasya', () => {
    expect(tithiOf(0).name).toBe('Pratipada');
    expect(tithiOf(0).paksha).toBe('shukla');
    expect(tithiOf(359.9).name).toBe('Amavasya');
    expect(tithiOf(359.9).paksha).toBe('krishna');
  });

  it('mette la Luna piena a metà, non alla fine', () => {
    // Purnima è il quindicesimo tithi, cioè l'opposizione: da lì il mese
    // comincia a calare, e i quindici che seguono sono un\'altra metà.
    const purnima = tithiOf(14 * 12 + 6);
    expect(purnima.name).toBe('Purnima');
    expect(purnima.index).toBe(15);
    expect(purnima.numberInPaksha).toBe(15);

    const dopo = tithiOf(15 * 12 + 1);
    expect(dopo.paksha).toBe('krishna');
    expect(dopo.name).toBe('Pratipada');
  });

  it('conta trenta tithi e sessanta karana in un giro', () => {
    expect(tithiOf(359.999).index).toBe(30);
    expect(karanaOf(359.999).index).toBe(60);
  });

  it('mette i quattro karana fissi in testa e in coda', () => {
    // Uno apre il mese e tre lo chiudono; in mezzo restano cinquantasei
    // posti, che sono otto giri esatti dei sette mobili.
    expect(karanaOf(0)).toMatchObject({ name: 'Kimstughna', movable: false });
    expect(karanaOf(57 * 6 + 1)).toMatchObject({ name: 'Shakuni', movable: false });
    expect(karanaOf(58 * 6 + 1)).toMatchObject({ name: 'Chatushpada', movable: false });
    expect(karanaOf(59 * 6 + 1)).toMatchObject({ name: 'Naga', movable: false });

    // Il secondo è il primo dei mobili, e dopo sette torna sé stesso.
    expect(karanaOf(1 * 6 + 1).name).toBe('Bava');
    expect(karanaOf(8 * 6 + 1).name).toBe('Bava');
  });

  it('conta ventisette yoga come i nakshatra, ma dalla somma', () => {
    expect(yogaOf(0).name).toBe('Vishkambha');
    expect(yogaOf(0).index).toBe(1);
    expect(yogaOf(359.9).name).toBe('Vaidhriti');
    expect(yogaOf(359.9).index).toBe(27);
  });
});
