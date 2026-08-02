import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '../src/chart.js';
import { computeTransits } from '../src/transits.js';
import { formatTransitsCompact } from '../src/format.js';
import { angularSeparation } from '../src/math.js';
import type { BirthData, NatalChart, NatalPointId, TransitMoment } from '../src/types.js';

const NAPOLI: BirthData = {
  date: '1968-03-12',
  time: '14:30',
  latitude: 40.8518,
  longitude: 14.2681,
  timezone: 'Europe/Rome',
};

const natal: NatalChart = computeNatalChart(NAPOLI);

const OGGI: TransitMoment = { date: '2024-06-15', time: '12:00', timezone: 'Europe/Rome' };

/** La longitudine di un bersaglio natale, corpo o asse che sia. */
function longitudeOf(chart: NatalChart, id: NatalPointId): number {
  if (id === 'ascendente') return chart.angles!.ascendant;
  if (id === 'medio-cielo') return chart.angles!.midheaven;
  return chart.bodies.find((body) => body.id === id)?.longitude ?? Number.NaN;
}

describe('computeTransits', () => {
  it('riporta il Sole sulla sua posizione natale al compleanno', () => {
    // Il ritorno solare è l'invariante più forte dei transiti: verificabile
    // senza riferimenti esterni, perché la data di nascita lo fissa da sé.
    const transits = computeTransits(natal, {
      date: '2024-03-12',
      time: '12:00',
      timezone: 'Europe/Rome',
    });

    const ritorno = transits.aspects.find((a) => a.transiting === 'sole' && a.natal === 'sole');

    expect(ritorno?.aspect).toBe('congiunzione');
    // Il Sole avanza di circa un grado al giorno e la data anniversaria non
    // cade sull'istante esatto del ritorno: un grado scarso di scarto.
    expect(ritorno?.orb).toBeLessThan(1.5);
  });

  it('misura gli aspetti sulla separazione fra transitante e punto natale', () => {
    const transits = computeTransits(natal, OGGI, { minorAspects: true });

    for (const aspect of transits.aspects) {
      const moving = transits.transiting.find((body) => body.id === aspect.transiting)!;
      const separation = angularSeparation(moving.longitude, longitudeOf(natal, aspect.natal));
      expect(Math.abs(separation - aspect.angle)).toBeCloseTo(aspect.orb, 6);
    }
  });

  it('colloca i transitanti nelle case del tema natale', () => {
    const transits = computeTransits(natal, OGGI);

    for (const body of transits.transiting) {
      expect(body.house).toBeGreaterThanOrEqual(1);
      expect(body.house).toBeLessThanOrEqual(12);
    }
  });

  it('usa orbite molto più strette di quelle natali', () => {
    const transits = computeTransits(natal, OGGI, { minorAspects: true });

    // Il massimo concesso è 2° (congiunzione) più 1° per ciascun luminare
    // della coppia. Con le orbite natali si arriverebbe a 12°.
    for (const aspect of transits.aspects) {
      expect(aspect.orb).toBeLessThanOrEqual(4);
    }
  });

  it('accetta orbite su misura, che sostituiscono quelle predefinite', () => {
    const stretto = computeTransits(natal, OGGI, { orbs: { congiunzione: 0 } });

    expect(stretto.aspects.some((a) => a.aspect === 'congiunzione')).toBe(false);
    // Gli altri aspetti non sono toccati dalla sostituzione.
    expect(stretto.aspects.length).toBeGreaterThan(0);
  });

  it('bersaglia gli assi natali, non solo i corpi', () => {
    const transits = computeTransits(natal, OGGI, { targets: ['ascendente'] });

    expect(transits.aspects.length).toBeGreaterThan(0);
    expect(transits.aspects.every((a) => a.natal === 'ascendente')).toBe(true);
  });

  it('lascia fuori dai transitanti il Nodo Sud, che duplicherebbe il Nord', () => {
    const transits = computeTransits(natal, OGGI);

    expect(transits.transiting.some((body) => body.id === 'nodo-nord')).toBe(true);
    expect(transits.transiting.some((body) => body.id === 'nodo-sud')).toBe(false);
  });

  it('calcola i soli corpi richiesti', () => {
    const transits = computeTransits(natal, OGGI, { bodies: ['luna'] });

    expect(transits.transiting.map((body) => body.id)).toEqual(['luna']);
  });

  it('avvisa e prosegue se un bersaglio non è nel tema', () => {
    const transits = computeTransits(natal, OGGI, { targets: ['sole', 'chirone'] });

    expect(transits.warnings.some((w) => w.includes('chirone'))).toBe(true);
    expect(transits.aspects.every((a) => a.natal === 'sole')).toBe(true);
  });

  it('segnala come retrogrado il corpo che lo è a quell istante', () => {
    const transits = computeTransits(natal, OGGI);

    for (const aspect of transits.aspects) {
      const moving = transits.transiting.find((body) => body.id === aspect.transiting)!;
      expect(aspect.retrograde).toBe(moving.retrograde);
    }
  });

  describe('senza ora del transito', () => {
    const senzaOra = computeTransits(natal, { date: '2024-06-15', timezone: 'Europe/Rome' });

    it('ripiega su mezzogiorno locale e lo dice', () => {
      expect(senzaOra.time.timeKnown).toBe(false);
      expect(senzaOra.warnings.some((w) => w.includes('mezzogiorno locale'))).toBe(true);
    });

    it('avverte che nella giornata si sposta soprattutto la Luna', () => {
      const mezzanotte = computeTransits(natal, {
        date: '2024-06-15',
        time: '00:00',
        timezone: 'Europe/Rome',
      });

      const scarto = (id: string): number =>
        angularSeparation(
          senzaOra.transiting.find((b) => b.id === id)!.longitude,
          mezzanotte.transiting.find((b) => b.id === id)!.longitude,
        );

      expect(scarto('luna')).toBeGreaterThan(5);
      expect(scarto('saturno')).toBeLessThan(0.1);
    });
  });

  describe('con un luogo del transito', () => {
    // Tokyo e non Napoli: un luogo lontano da quello di nascita rende visibile
    // che sono gli assi a cambiare e non i corpi.
    const TOKYO = { latitude: 35.6895, longitude: 139.6917 };
    const daTokyo = computeTransits(natal, OGGI, { place: TOKYO });
    const senzaLuogo = computeTransits(natal, OGGI);

    it('non sposta di un grado le posizioni dei corpi', () => {
      for (const body of daTokyo.transiting) {
        const altrove = senzaLuogo.transiting.find((b) => b.id === body.id)!;
        expect(body.longitude).toBeCloseTo(altrove.longitude, 10);
      }
    });

    it('calcola assi, case e tempo siderale dell istante', () => {
      expect(daTokyo.angles).toBeDefined();
      expect(daTokyo.houses).toHaveLength(12);
      expect(daTokyo.houseSystem).toBe('placidus');
      expect(daTokyo.siderealTime?.hours).toBeGreaterThanOrEqual(0);
      expect(daTokyo.siderealTime?.hours).toBeLessThan(24);
    });

    it('dà a ogni corpo la casa dell istante accanto a quella natale', () => {
      for (const body of daTokyo.transiting) {
        expect(body.transitHouse).toBeGreaterThanOrEqual(1);
        expect(body.transitHouse).toBeLessThanOrEqual(12);
        // Le case natali sono quelle di sempre: il luogo non le tocca.
        expect(body.house).toBe(senzaLuogo.transiting.find((b) => b.id === body.id)!.house);
      }
    });

    it('mette il Sole sotto l orizzonte quando a Tokyo è notte', () => {
      // Mezzogiorno a Roma sono le 19 a Tokyo, in giugno poco prima del
      // tramonto: il Sole sta ancora nelle case occidentali diurne.
      const sole = daTokyo.transiting.find((b) => b.id === 'sole')!;
      expect(sole.transitHouse).toBeGreaterThanOrEqual(6);
      expect(sole.transitHouse).toBeLessThanOrEqual(7);
    });

    it('mette gli assi dell istante fra i transitanti', () => {
      const assi = daTokyo.aspects.filter(
        (a) => a.transiting === 'ascendente' || a.transiting === 'medio-cielo',
      );

      expect(assi.length).toBeGreaterThan(0);
      // Un asse non ha moto proprio da invertire.
      expect(assi.every((a) => a.retrograde === false)).toBe(true);
    });

    it('deriva la velocità degli assi dal loro moto reale', () => {
      // La velocità non compare nel risultato: si vede solo nel verso di
      // `applying`, e il modo di verificarla è guardare dieci secondi dopo.
      // Dieci e non sessanta perché un asse percorre un grado ogni quattro
      // minuti, e in un minuto potrebbe perfezionare l'aspetto e superarlo.
      const dopo = computeTransits(natal, { ...OGGI, time: '12:00:10' }, { place: TOKYO });
      const assi = daTokyo.aspects.filter(
        (a) => a.transiting === 'ascendente' || a.transiting === 'medio-cielo',
      );

      expect(assi.length).toBeGreaterThan(0);
      for (const aspect of assi) {
        const stesso = dopo.aspects.find(
          (a) =>
            a.transiting === aspect.transiting &&
            a.natal === aspect.natal &&
            a.aspect === aspect.aspect,
        )!;
        expect(stesso.orb < aspect.orb).toBe(aspect.applying);
      }
    });

    it('non calcola assi né case se manca l ora, e lo dice', () => {
      const senzaOra = computeTransits(
        natal,
        { date: '2024-06-15', timezone: 'Europe/Rome' },
        { place: TOKYO },
      );

      expect(senzaOra.angles).toBeUndefined();
      expect(senzaOra.houses).toHaveLength(0);
      expect(senzaOra.transiting.every((body) => body.transitHouse === undefined)).toBe(true);
      expect(senzaOra.warnings.some((w) => w.includes("assi e case dell'istante"))).toBe(true);
      // Il tempo siderale dipende dalla sola longitudine: quello resta.
      expect(senzaOra.siderealTime).toBeDefined();
    });

    it('rifiuta coordinate fuori intervallo', () => {
      expect(() =>
        computeTransits(natal, OGGI, { place: { latitude: 400, longitude: 0 } }),
      ).toThrow(/Latitudine/);
    });

    it('lascia il transito intatto quando il luogo non c è', () => {
      expect(senzaLuogo.place).toBeUndefined();
      expect(senzaLuogo.houses).toHaveLength(0);
      expect(senzaLuogo.aspects.every((a) => a.transiting !== 'ascendente')).toBe(true);
    });
  });

  describe('su un tema natale senza ora', () => {
    const senzaOraNatale = computeNatalChart({
      date: NAPOLI.date,
      latitude: NAPOLI.latitude,
      longitude: NAPOLI.longitude,
      timezone: NAPOLI.timezone,
    });
    const transits = computeTransits(senzaOraNatale, OGGI);

    it('non colloca i transitanti in nessuna casa, e lo dice', () => {
      expect(transits.transiting.every((body) => body.house === undefined)).toBe(true);
      expect(transits.warnings.some((w) => w.includes('senza ora'))).toBe(true);
    });

    it('non bersaglia assi che non esistono', () => {
      expect(transits.aspects.some((a) => a.natal === 'ascendente')).toBe(false);
      // I corpi restano bersagliabili: è il caso d'uso di un tema senza ora.
      expect(transits.aspects.length).toBeGreaterThan(0);
    });
  });
});

describe('formatTransitsCompact', () => {
  const reso = formatTransitsCompact(natal, computeTransits(natal, OGGI));

  it('intesta con l istante del transito e con la nascita su cui si legge', () => {
    // Un quadro di transiti senza la data di nascita è un cielo qualsiasi.
    expect(reso).toContain('TRANSITI — 2024-06-15 12:00 (Europe/Rome, UTC+02:00)');
    expect(reso).toContain('Tema natale: 1968-03-12 14:30 — 40.8518N 14.2681E');
    expect(reso).toContain('Case natali: placidus');
  });

  it('elenca i corpi in transito con la casa natale in cui cadono', () => {
    expect(reso).toMatch(/^Sole {8}\d{1,2}°\d{2}' \w{3} +casa +\d{1,2}$/m);
  });

  it('distingue i due lati di ogni aspetto', () => {
    expect(reso).toContain('ASPETTI (in transito → natale)');
  });

  it('nomina gli assi natali fra i bersagli', () => {
    const soloAsse = formatTransitsCompact(
      natal,
      computeTransits(natal, OGGI, { targets: ['ascendente', 'medio-cielo'] }),
    );

    expect(soloAsse).toMatch(/Ascendente|Medio Cielo/);
  });

  it('segna il moto retrogrado', () => {
    // Il Nodo Nord medio è retrogrado per definizione: nessuna data lo smentisce.
    expect(reso).toMatch(/^Nodo Nord.* R /m);
  });

  describe('con un luogo del transito', () => {
    const conLuogo = formatTransitsCompact(
      natal,
      computeTransits(natal, OGGI, { place: { latitude: 35.6895, longitude: 139.6917 } }),
    );

    it('intesta con il luogo, il tempo siderale e la domificazione dell istante', () => {
      expect(conLuogo).toContain('Luogo del transito: 35.6895N 139.6917E');
      expect(conLuogo).toMatch(/TSL: \d{2}:\d{2}:\d{2}/);
      expect(conLuogo).toContain("Case dell'istante: placidus");
    });

    it('spiega la seconda casa in cima alla colonna, non su ogni riga', () => {
      expect(conLuogo).toContain("IN TRANSITO (casa natale, fra parentesi la casa dell'istante)");
      expect(conLuogo).toMatch(/^Sole {8}\d{1,2}°\d{2}' \w{3} +casa +\d{1,2} +\( ?\d{1,2}\)$/m);
    });

    it('elenca assi e cuspidi dell istante', () => {
      expect(conLuogo).toContain("ASSI DELL'ISTANTE");
      expect(conLuogo).toContain("CUSPIDI DELL'ISTANTE");
    });

    it('nomina gli assi anche dal lato in transito', () => {
      const assi = conLuogo
        .split('\n')
        .filter((line) => /^(Ascendente|Medio Cielo) /.test(line));

      expect(assi.length).toBeGreaterThan(0);
    });
  });

  it('dichiara l assenza di aspetti invece di lasciare la sezione vuota', () => {
    const nessuno = computeTransits(natal, OGGI, { bodies: ['plutone'], targets: ['plutone'] });

    expect(nessuno.aspects).toHaveLength(0);
    expect(formatTransitsCompact(natal, nessuno)).toContain('(nessuno entro le orbite dei transiti)');
  });

  it('riporta le avvertenze in coda', () => {
    const senzaOra = computeTransits(natal, { date: '2024-06-15', timezone: 'Europe/Rome' });

    expect(formatTransitsCompact(natal, senzaOra)).toContain('AVVERTENZE');
  });
});
