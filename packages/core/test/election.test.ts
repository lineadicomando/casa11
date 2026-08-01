import { describe, expect, it } from 'vitest';
import { findElectionHours, MAX_ELECTION_DAYS } from '../src/election.js';
import { ChartError } from '../src/errors.js';
import { formatElectionCompact } from '../src/format.js';
import { computeSky } from '../src/sky.js';
import { riseOrSet } from '../src/rise.js';
import { initEphemeris } from '../src/ephemeris.js';
import { findSignIngresses } from '../src/sky-events.js';
import type { PassageRange, Place } from '../src/types.js';

/** Palermo: le coordinate del dataset GeoNames. */
const PALERMO: Place = { latitude: 38.1166, longitude: 13.3636 };
/** Tromsø, oltre il circolo polare: qui il Sole d'estate non tramonta. */
const TROMSO: Place = { latitude: 69.6496, longitude: 18.956 };

/** Venerdì 24 e sabato 25 agosto 2029. */
const DUE_GIORNI: PassageRange = {
  from: '2029-08-24',
  to: '2029-08-25',
  timezone: 'Europe/Rome',
};

describe('findElectionHours', () => {
  it('affida la prima ora del giorno al pianeta del giorno della settimana', () => {
    // Il 24 agosto 2029 è un venerdì e il 25 un sabato: la prima ora diurna
    // spetta a Venere e poi a Saturno. È la verifica che il giorno planetario
    // parta dall'alba: fra mezzanotte e l'alba regge ancora il giorno prima.
    const { hours } = findElectionHours(DUE_GIORNI, PALERMO);

    const prime = hours.filter((hour) => hour.diurnal && hour.index === 1);
    expect(prime.map((hour) => [hour.local.start.slice(0, 10), hour.ruler])).toEqual([
      ['2029-08-24', 'venere'],
      ['2029-08-25', 'saturno'],
    ]);
  });

  it('fa avanzare la catena caldea di tre posizioni ogni ventiquattro ore', () => {
    // Ventiquattro ore consecutive rette secondo l'ordine caldeo riportano al
    // pianeta del giorno successivo: è il meccanismo da cui discende l'ordine
    // dei giorni della settimana, ed è l'unico modo di sbagliarlo senza
    // accorgersene.
    const { hours } = findElectionHours(DUE_GIORNI, PALERMO);

    const venerdi = hours.findIndex(
      (hour) => hour.diurnal && hour.index === 1 && hour.local.start.startsWith('2029-08-24'),
    );
    expect(hours[venerdi]!.ruler).toBe('venere');
    expect(hours[venerdi + 24]!.ruler).toBe('saturno');
    // La catena nel mezzo: Venere, Mercurio, Luna, Saturno, Giove, Marte, Sole.
    expect(hours.slice(venerdi, venerdi + 7).map((hour) => hour.ruler)).toEqual([
      'venere',
      'mercurio',
      'luna',
      'saturno',
      'giove',
      'marte',
      'sole',
    ]);
  });

  it('divide il giorno in dodici parti e la notte in altre dodici', () => {
    const { hours } = findElectionHours(DUE_GIORNI, PALERMO);

    const venerdi = hours.filter((hour) => hour.local.start.startsWith('2029-08-24'));
    const diurne = venerdi.filter((hour) => hour.diurnal);
    const notturne = venerdi.filter((hour) => !hour.diurnal);

    // Ogni dodicina ha una durata sola, e le due insieme fanno il giorno.
    expect(new Set(diurne.map((hour) => hour.minutes)).size).toBe(1);
    const diurna = diurne[0]!.minutes;
    const notturna = notturne[0]!.minutes;
    expect(diurna * 12 + notturna * 12).toBeCloseTo(1440, 0);

    // Fine agosto in Sicilia: il giorno è ancora più lungo della notte, e
    // un'ora planetaria non dura sessanta minuti se non agli equinozi.
    expect(diurna).toBeGreaterThan(60);
    expect(notturna).toBeLessThan(60);
  });

  it('incastra le ore una nell altra senza buchi né sovrapposizioni', () => {
    const { hours } = findElectionHours(DUE_GIORNI, PALERMO);

    for (let i = 1; i < hours.length; i += 1) {
      expect(hours[i]!.start).toBe(hours[i - 1]!.end);
    }
  });

  it('fa sorgere all alba il grado occupato dal Sole', () => {
    // Verifica incrociata sul confine fra i due calcoli: all'alba il Sole è
    // sull'Ascendente per definizione, e le due strade per arrivarci —
    // `rise_trans` e le cuspidi — sono indipendenti. Uno scarto grosso qui
    // significherebbe un'ora planetaria spostata di un quarto d'ora.
    const { hours } = findElectionHours(DUE_GIORNI, PALERMO);
    const alba = hours.find((hour) => hour.diurnal && hour.index === 1)!;

    const sky = computeSky({
      date: alba.local.start.slice(0, 10),
      time: alba.local.start.slice(11, 16),
      timezone: 'Europe/Rome',
      latitude: PALERMO.latitude,
      longitude: PALERMO.longitude,
    });
    const sole = sky.bodies.find((body) => body.id === 'sole')!;

    // Il minuto di arrotondamento degli orari vale un quarto di grado scarso.
    expect(Math.abs(sole.longitude - alba.ascendant.longitude)).toBeLessThan(0.5);
  });

  it('chiude ogni vuoto di corso con un cambio di segno della Luna', () => {
    // Un vuoto finisce quando la Luna lascia il segno: la fine di ogni tratto
    // deve coincidere con un ingresso, altrimenti si sta elencando un
    // intervallo che la dottrina non conosce.
    const settimana: PassageRange = {
      from: '2029-08-01',
      to: '2029-08-14',
      timezone: 'Europe/Rome',
    };
    const { voids } = findElectionHours(settimana, PALERMO);
    const { ingresses } = findSignIngresses(
      { from: '2029-07-28', to: '2029-08-18', timezone: 'Europe/Rome' },
      { bodies: ['luna'] },
    );

    expect(voids.length).toBeGreaterThan(3);
    for (const period of voids) {
      expect(ingresses.map((ingress) => ingress.exact)).toContain(period.end);
      // Il segno in cui entra è quello dichiarato come successivo.
      const ingresso = ingresses.find((i) => i.exact === period.end)!;
      expect(ingresso.sign).toBe(period.nextSign);
      expect(period.minutes).toBeGreaterThan(0);
    }
  });

  it('marca vuote le ore che il vuoto attraversa, e solo quelle', () => {
    const { hours, voids } = findElectionHours(DUE_GIORNI, PALERMO);
    const period = voids[0]!;

    for (const hour of hours) {
      const sovrapposta = voids.some(
        (candidate) => candidate.start < hour.end && candidate.end > hour.start,
      );
      expect(hour.moonVoid).toBe(sovrapposta);
    }

    // Il tratto noto: la Luna resta vuota in Acquario fino a entrare in Pesci.
    expect(period.sign).toBe('acquario');
    expect(period.nextSign).toBe('pesci');
    expect(period.lastAspect).toEqual({ body: 'saturno', aspect: 'quadrato' });
  });

  it('restringe le ore ai reggitori richiesti, dichiarandolo', () => {
    const { hours, filters } = findElectionHours(DUE_GIORNI, PALERMO, {
      rulers: ['giove', 'venere'],
    });

    expect(hours.length).toBeGreaterThan(0);
    expect(new Set(hours.map((hour) => hour.ruler))).toEqual(new Set(['giove', 'venere']));
    // Il filtro viaggia col risultato: senza, un elenco ridotto passerebbe
    // per completo.
    expect(filters).toEqual({ rulers: ['giove', 'venere'] });

    // Filtrare non sposta le ore rimaste: sono le stesse dell'elenco intero.
    const tutte = findElectionHours(DUE_GIORNI, PALERMO);
    const attese = tutte.hours.filter((hour) => hour.ruler === 'giove' || hour.ruler === 'venere');
    expect(hours.map((hour) => hour.start)).toEqual(attese.map((hour) => hour.start));
  });

  it('scarta le ore attraversate da un vuoto, ma non i vuoti', () => {
    const intera = findElectionHours(DUE_GIORNI, PALERMO);
    const { hours, voids, filters } = findElectionHours(DUE_GIORNI, PALERMO, {
      skipMoonVoid: true,
    });

    expect(hours.every((hour) => !hour.moonVoid)).toBe(true);
    expect(hours.length).toBe(intera.hours.filter((hour) => !hour.moonVoid).length);
    expect(hours.length).toBeLessThan(intera.hours.length);
    // I vuoti restano: sono la ragione per cui quelle ore mancano.
    expect(voids).toEqual(intera.voids);
    expect(filters).toEqual({ skipMoonVoid: true });
  });

  it('non dichiara filtri quando non ce ne sono', () => {
    expect(findElectionHours(DUE_GIORNI, PALERMO).filters).toBeUndefined();
  });

  it('rifiuta un arco più lungo di un mese', () => {
    expect(() =>
      findElectionHours(
        { from: '2029-08-01', to: '2029-10-31', timezone: 'Europe/Rome' },
        PALERMO,
      ),
    ).toThrowError(ChartError);

    // Il limite è dichiarato, non nascosto in un messaggio.
    expect(MAX_ELECTION_DAYS).toBe(31);
  });

  it('avvisa invece di inventare le ore dove il Sole non tramonta', () => {
    // A Tromsø, a giugno, non c'è alba né tramonto: il calcolo restituisce un
    // elenco vuoto e lo dice. Dodici parti di un arco diurno che dura tutto il
    // giorno sarebbero un risultato plausibile e falso.
    const { hours, warnings } = findElectionHours(
      { from: '2029-06-20', to: '2029-06-21', timezone: 'Europe/Oslo' },
      TROMSO,
    );

    expect(hours).toHaveLength(0);
    expect(warnings.join(' ')).toMatch(/latitudini polari/);
  });
});

describe('riseOrSet', () => {
  it('trova alba e tramonto nell ordine in cui capitano', () => {
    const context = initEphemeris();
    const partenza = 2462372.5; // 2029-08-24 00:00 UT

    const alba = riseOrSet('rise', partenza, PALERMO, context)!;
    const tramonto = riseOrSet('set', alba, PALERMO, context)!;

    expect(alba).toBeGreaterThan(partenza);
    expect(tramonto).toBeGreaterThan(alba);
    // Fine agosto a Palermo: fra le tredici e le quattordici ore di luce.
    expect((tramonto - alba) * 24).toBeGreaterThan(13);
    expect((tramonto - alba) * 24).toBeLessThan(14);
  });
});

describe('formatElectionCompact', () => {
  it('raggruppa per giorno e dichiara la durata di ogni ora', () => {
    const election = findElectionHours(DUE_GIORNI, PALERMO);
    const testo = formatElectionCompact(election);

    expect(testo).toContain('ELEZIONE — dal 2029-08-24 al 2029-08-25 (Europe/Rome)');
    expect(testo).toContain('— 2029-08-24');
    expect(testo).toContain('LUNA VUOTA DI CORSO');
    // Una durata in minuti per riga, e nessuna è di sessanta.
    expect(testo).toMatch(/\d{2}:\d{2}-\d{2}:\d{2} \w+\s+[dn]\s?\d+\s+\d{2}m/);
  });

  it('dichiara in testa che l elenco è filtrato', () => {
    const testo = formatElectionCompact(
      findElectionHours(DUE_GIORNI, PALERMO, { rulers: ['giove'], skipMoonVoid: true }),
    );

    expect(testo).toContain('Elenco filtrato: solo le ore di Giove');
    expect(testo).toContain('Luna vuota di corso');
    // I vuoti restano elencati in coda anche quando le loro ore sono sparite.
    expect(testo).toMatch(/LUNA VUOTA DI CORSO/);
  });
});
