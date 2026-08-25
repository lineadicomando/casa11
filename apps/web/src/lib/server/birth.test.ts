/**
 * La lettura dei dati di nascita e delle opzioni, dai parametri.
 *
 * È il punto in cui ogni rotta che parte da una nascita entra nel motore: i
 * vicini di cartella — `moment.ts`, `place.ts`, `range.ts`, `errors.ts` — i
 * test ce li hanno tutti, e questo era rimasto scoperto.
 *
 * Il luogo è sempre la terna esplicita e mai `locationId`: quello passa dal
 * dataset GeoNames, e un test non deve dipendere da un database che potrebbe
 * non essere stato importato. Che `readBirth` legga bene una località lo prova
 * `lib/api.test.ts`, dove serve a un'altra domanda.
 */

import { describe, expect, it } from 'vitest';
import {
  placeLabel,
  readAyanamsa,
  readBirth,
  readChartOptions,
  readZodiacOptions,
} from './birth';

/** Estrae status e corpo da un errore sollevato da `error()`. */
function capture(run: () => unknown): { status: number; body: { message: string; code?: string } } {
  try {
    run();
  } catch (thrown) {
    return thrown as { status: number; body: { message: string; code?: string } };
  }
  throw new Error('non è stato sollevato nessun errore');
}

/** Il luogo scritto per esteso, che è la forma che non tocca il dataset. */
const NAPOLI = 'latitude=40.8518&longitude=14.2681&timezone=Europe/Rome';

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('readBirth', () => {
  it('legge la nascita dalla terna esplicita', () => {
    const { birth } = readBirth(params(`date=1968-03-12&time=14:30&${NAPOLI}`));

    expect(birth).toEqual({
      date: '1968-03-12',
      time: '14:30',
      latitude: 40.8518,
      longitude: 14.2681,
      timezone: 'Europe/Rome',
    });
  });

  it('pretende la data', () => {
    const result = capture(() => readBirth(params(NAPOLI)));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('DATA_MANCANTE');
  });

  it('lascia l’ora fuori quando non c’è, invece di metterci mezzanotte', () => {
    // Un tema senza ora è una carta senza case, e il motore lo sa fare: una
    // mezzanotte messa qui produrrebbe invece delle case sbagliate e mute.
    const { birth } = readBirth(params(`date=1968-03-12&${NAPOLI}`));

    expect(birth.time).toBeUndefined();
    expect('time' in birth).toBe(false);
  });

  it('tratta un’ora vuota come un’ora assente', () => {
    const { birth } = readBirth(params(`date=1968-03-12&time=&${NAPOLI}`));

    expect(birth.time).toBeUndefined();
  });

  it('non aggira il luogo mancante', () => {
    const result = capture(() => readBirth(params('date=1968-03-12')));

    expect(result.body.code).toBe('LUOGO_MANCANTE');
  });

  it('restituisce il luogo, che serve anche a intestare la risposta', () => {
    const { place } = readBirth(params(`date=1968-03-12&${NAPOLI}`));

    expect(place.timezone).toBe('Europe/Rome');
    // Due coordinate non sono un posto con un nome: l'etichetta la dà il
    // dataset, e qui non c'è.
    expect(place.label).toBeUndefined();
  });
});

describe('readZodiacOptions', () => {
  it('non decide niente quando non è stato chiesto niente', () => {
    // Un oggetto vuoto lascia i predefiniti al motore, che è l'unico posto in
    // cui sono scritti una volta sola.
    expect(readZodiacOptions(params(''))).toEqual({});
  });

  it('legge i due zodiachi', () => {
    expect(readZodiacOptions(params('zodiac=tropicale'))).toEqual({ zodiac: 'tropicale' });
    expect(readZodiacOptions(params('zodiac=siderale'))).toEqual({ zodiac: 'siderale' });
  });

  it('rifiuta uno zodiaco che non esiste', () => {
    const result = capture(() => readZodiacOptions(params('zodiac=vedico')));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('ZODIACO_NON_VALIDO');
  });

  it('porta l’ayanamsa accanto al siderale', () => {
    expect(readZodiacOptions(params('zodiac=siderale&ayanamsa=raman'))).toEqual({
      zodiac: 'siderale',
      ayanamsa: 'raman',
    });
  });

  it('rifiuta un ayanamsa senza zodiaco', () => {
    // Accettarlo vorrebbe dire restituire un tema in cui l'ayanamsa chiesto
    // non compare da nessuna parte, e nessuno se ne accorge finché non
    // confronta i gradi con un altro programma.
    const result = capture(() => readZodiacOptions(params('ayanamsa=raman')));

    expect(result.body.code).toBe('AYANAMSA_SENZA_ZODIACO');
  });

  it('rifiuta un ayanamsa sullo zodiaco tropicale', () => {
    const result = capture(() => readZodiacOptions(params('zodiac=tropicale&ayanamsa=raman')));

    expect(result.body.code).toBe('AYANAMSA_SENZA_ZODIACO');
  });
});

describe('readAyanamsa', () => {
  it('non chiede niente sullo zodiaco', () => {
    // Su /api/jyotish il siderale è per definizione: pretendere lì il
    // parametro che lo dice significherebbe farlo scrivere per non dire nulla.
    expect(readAyanamsa(params('ayanamsa=krishnamurti'))).toBe('krishnamurti');
  });

  it('tace quando non è stato chiesto', () => {
    expect(readAyanamsa(params(''))).toBeUndefined();
  });

  it('rifiuta quello che non conosce, e dice quali conosce', () => {
    const result = capture(() => readAyanamsa(params('ayanamsa=galattico')));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('AYANAMSA_NON_VALIDO');
    expect(result.body.message).toContain('lahiri');
  });
});

describe('readChartOptions', () => {
  it('vuole la parola esatta per gli aspetti minori', () => {
    // È l'unico booleano della rotta: qualunque altra cosa vale come assente,
    // perché un `minorAspects=1` che accendesse gli aspetti sarebbe una
    // convenzione in più da ricordare.
    expect(readChartOptions(params('minorAspects=true')).minorAspects).toBe(true);
    expect(readChartOptions(params('minorAspects=1')).minorAspects).toBe(false);
    expect(readChartOptions(params('')).minorAspects).toBe(false);
  });

  it('non sceglie un sistema di case al posto di chi non lo indica', () => {
    expect('houseSystem' in readChartOptions(params(''))).toBe(false);
  });

  it('legge i sistemi che conosce', () => {
    expect(readChartOptions(params('houseSystem=koch')).houseSystem).toBe('koch');
    expect(readChartOptions(params('houseSystem=segni-interi')).houseSystem).toBe('segni-interi');
  });

  it('rifiuta un sistema di case che non esiste', () => {
    const result = capture(() => readChartOptions(params('houseSystem=morinus')));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('SISTEMA_CASE_NON_VALIDO');
  });

  it('legge le due formule della Parte di Fortuna', () => {
    // Le scuole divergono, e il tema porta la formula con sé: qui si sceglie
    // quale, non che cosa significhi.
    expect(readChartOptions(params('partOfFortuneFormula=settore')).partOfFortuneFormula).toBe(
      'settore',
    );
    expect(readChartOptions(params('partOfFortuneFormula=diurna')).partOfFortuneFormula).toBe(
      'diurna',
    );
  });

  it('rifiuta una formula che non esiste', () => {
    const result = capture(() => readChartOptions(params('partOfFortuneFormula=notturna')));

    expect(result.body.code).toBe('FORMULA_FORTUNA_NON_VALIDA');
  });

  it('porta con sé lo zodiaco, che non è un’opzione a parte', () => {
    expect(readChartOptions(params('zodiac=siderale&ayanamsa=raman&houseSystem=koch'))).toEqual({
      minorAspects: false,
      zodiac: 'siderale',
      ayanamsa: 'raman',
      houseSystem: 'koch',
    });
  });
});

describe('placeLabel', () => {
  it('intesta la risposta al luogo che ha un nome', () => {
    expect(placeLabel({ label: 'Napoli, Campania, Italia', refined: true })).toEqual({
      label: 'Napoli, Campania, Italia',
      refined: true,
    });
  });

  it('non intesta niente a un luogo senza nome', () => {
    // Nel cielo di un istante il luogo è facoltativo, e la risposta si limita
    // a non intestarsi a nessun posto.
    expect(placeLabel(null)).toBeUndefined();
    expect(placeLabel({})).toBeUndefined();
  });

  it('senza dichiarazione, le coordinate non sono corrette a mano', () => {
    expect(placeLabel({ label: 'Napoli, Campania, Italia' })).toEqual({
      label: 'Napoli, Campania, Italia',
      refined: false,
    });
  });
});
