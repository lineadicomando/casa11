import { describe, expect, it } from 'vitest';
import { distanceKm, formatCoordinateDMS, parseCoordinate } from './coordinates';

describe('parseCoordinate — formati decimali', () => {
  it('legge il punto decimale', () => {
    expect(parseCoordinate('38.1333', 'latitudine')).toBeCloseTo(38.1333, 6);
  });

  it('legge la virgola decimale', () => {
    // Una tastiera italiana produce la virgola: rifiutarla costringerebbe
    // l'utente a una conversione, cioè a un'occasione di sbagliare.
    expect(parseCoordinate('38,1333', 'latitudine')).toBeCloseTo(38.1333, 6);
  });

  it('legge i valori negativi', () => {
    expect(parseCoordinate('-38.1333', 'latitudine')).toBeCloseTo(-38.1333, 6);
    expect(parseCoordinate('-75.4375', 'longitudine')).toBeCloseTo(-75.4375, 6);
  });

  it('ignora la spaziatura', () => {
    expect(parseCoordinate('  38.1333  ', 'latitudine')).toBeCloseTo(38.1333, 6);
  });
});

describe('parseCoordinate — formati sessagesimali', () => {
  it('legge gradi e primi', () => {
    // 38°08' = 38 + 8/60
    expect(parseCoordinate("38°08'N", 'latitudine')).toBeCloseTo(38.1333, 4);
  });

  it('legge gradi, primi e secondi', () => {
    expect(parseCoordinate(`38° 08' 12" N`, 'latitudine')).toBeCloseTo(38 + 8 / 60 + 12 / 3600, 6);
  });

  it('accetta la lettera prima del numero', () => {
    expect(parseCoordinate("N 38°08'", 'latitudine')).toBeCloseTo(38.1333, 4);
  });

  it('interpreta S e W come emisferi negativi', () => {
    expect(parseCoordinate("38°08'S", 'latitudine')).toBeCloseTo(-38.1333, 4);
    expect(parseCoordinate("13°20'W", 'longitudine')).toBeCloseTo(-13.3333, 4);
  });

  it('accetta O per Ovest, come si scrive in italiano', () => {
    expect(parseCoordinate("13°20'O", 'longitudine')).toBeCloseTo(-13.3333, 4);
  });

  it('è indifferente alle maiuscole', () => {
    expect(parseCoordinate("38°08'n", 'latitudine')).toBeCloseTo(38.1333, 4);
  });
});

describe('parseCoordinate — input non validi', () => {
  it('rifiuta una stringa vuota', () => {
    expect(parseCoordinate('', 'latitudine')).toBeNull();
    expect(parseCoordinate('   ', 'latitudine')).toBeNull();
  });

  it('rifiuta il testo libero', () => {
    expect(parseCoordinate('Palermo', 'latitudine')).toBeNull();
    expect(parseCoordinate('circa 38', 'latitudine')).toBeNull();
  });

  it('rifiuta i valori fuori intervallo', () => {
    expect(parseCoordinate('91', 'latitudine')).toBeNull();
    expect(parseCoordinate('-91', 'latitudine')).toBeNull();
    expect(parseCoordinate('181', 'longitudine')).toBeNull();
  });

  it('accetta una longitudine che eccederebbe il limite di latitudine', () => {
    // 130° è una longitudine valida ma non una latitudine.
    expect(parseCoordinate('130', 'longitudine')).toBeCloseTo(130, 6);
    expect(parseCoordinate('130', 'latitudine')).toBeNull();
  });

  it('rifiuta primi e secondi fuori scala', () => {
    // Sono errori di battitura, non valori da normalizzare in silenzio.
    expect(parseCoordinate("38°75'N", 'latitudine')).toBeNull();
    expect(parseCoordinate(`38°08'99"N`, 'latitudine')).toBeNull();
  });

  it('rifiuta segno e emisfero contraddittori', () => {
    // "-38S" vorrebbe dire due volte negativo: è ambiguo, non lo si indovina.
    expect(parseCoordinate('-38S', 'latitudine')).toBeNull();
  });

  it('rifiuta due lettere di emisfero', () => {
    expect(parseCoordinate('38N S', 'latitudine')).toBeNull();
  });
});

describe('formatCoordinateDMS', () => {
  it('scrive latitudine e longitudine con la lettera giusta', () => {
    expect(formatCoordinateDMS(38.1333, 'latitudine')).toMatch(/^38°08'\d\d"N$/);
    expect(formatCoordinateDMS(-38.1333, 'latitudine')).toMatch(/^38°08'\d\d"S$/);
    // 13,3333° corrisponde a 13°20': l'arrotondamento dei secondi riporta sui primi.
    expect(formatCoordinateDMS(13.3333, 'longitudine')).toMatch(/^13°20'\d\d"E$/);
    expect(formatCoordinateDMS(-13.3333, 'longitudine')).toMatch(/^13°20'\d\d"O$/);
  });

  it('fa il giro completo con parseCoordinate', () => {
    for (const valore of [38.1333, -12.5, 0, 179.9, -89.5]) {
      const axis = Math.abs(valore) > 90 ? 'longitudine' : 'latitudine';
      const riletto = parseCoordinate(formatCoordinateDMS(valore, axis), axis);
      expect(riletto).toBeCloseTo(valore, 3);
    }
  });
});

describe('distanceKm', () => {
  it('restituisce zero per lo stesso punto', () => {
    expect(distanceKm(38.1333, 13.3333, 38.1333, 13.3333)).toBeCloseTo(0, 6);
  });

  it('misura lo scarto fra due centroidi della stessa città', () => {
    // Palermo secondo GeoNames contro Palermo secondo Astro-Seek.
    const distanza = distanceKm(38.1166, 13.3636, 38.1333, 13.3333);
    expect(distanza).toBeGreaterThan(1);
    expect(distanza).toBeLessThan(5);
  });

  it('rende evidente un errore di segno sulla longitudine', () => {
    // È la svista classica: Est al posto di Ovest produce coordinate valide
    // e un tema del tutto sbagliato. La distanza lo smaschera.
    expect(distanceKm(38.1333, 13.3333, 38.1333, -13.3333)).toBeGreaterThan(2000);
  });
});
