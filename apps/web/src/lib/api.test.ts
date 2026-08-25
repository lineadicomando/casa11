/**
 * Gli indirizzi che il client compone, e la rotta che li rilegge.
 *
 * Queste funzioni sono pure e non toccano la rete: prendono la nascita e le
 * opzioni e decidono che cosa finisce nella query. Da loro dipende una
 * proprietà che `routes/+page.svelte` dichiara per iscritto — il collegamento
 * che si copia dal tema deve ricalcolare **lo stesso** tema che si sta
 * guardando — e che è del genere peggiore da rompere, perché chi riceve
 * l'indirizzo ottiene un tema diverso senza avere modo di accorgersene.
 *
 * L'ultimo gruppo di prove è quello che la difende davvero: non guarda i nomi
 * dei parametri ma li fa rileggere a `lib/server/birth.ts`, cioè al codice
 * vero delle rotte. Un parametro rinominato da una parte sola cade lì.
 *
 * Il dataset GeoNames è sostituito da due località: `getLocation` è l'unica
 * cosa che `server/place.ts` gli chiede, e un test non deve dipendere da un
 * database da 215 MB che potrebbe non essere stato importato.
 */

import { describe, expect, it, vi } from 'vitest';

const { NAPOLI, TOKYO } = vi.hoisted(() => ({
  NAPOLI: {
    id: 3172394,
    name: 'Napoli',
    countryCode: 'IT',
    country: 'Italia',
    region: 'Campania',
    latitude: 40.8518,
    longitude: 14.2681,
    timezone: 'Europe/Rome',
    population: 966144,
  },
  TOKYO: {
    id: 1850147,
    name: 'Tokyo',
    countryCode: 'JP',
    country: 'Giappone',
    region: 'Tokyo',
    latitude: 35.6895,
    longitude: 139.6917,
    timezone: 'Asia/Tokyo',
    population: 8336599,
  },
}));

vi.mock('@dodicisegni/geo', () => ({
  getLocation: (id: number) => [NAPOLI, TOKYO].find((luogo) => luogo.id === id) ?? null,
}));

import {
  RequestError,
  chartParameters,
  electionParameters,
  jyotishaParameters,
  passageParameters,
  skyCalendarParameters,
  skyParameters,
  transitParameters,
  type ChartOptionsInput,
  type ElectionFilters,
  type JyotishaOptionsInput,
} from './api';
import { emptyBirthInput, resetCoordinates, type BirthInput } from './birth';
import { HOUSE_SYSTEMS } from './house-systems';
import type { MomentInput } from './moment';
import { AYANAMSAS } from './zodiacs';
import { readBirth, readChartOptions } from './server/birth';
import { LUOGO_TRANSITO, resolvePlace } from './server/place';

function nascita(): BirthInput {
  const input = emptyBirthInput();
  input.date = '1968-03-12';
  input.time = '14:30';
  input.location = NAPOLI;
  resetCoordinates(input);
  return input;
}

const OPZIONI: ChartOptionsInput = { houseSystem: 'placidus', minorAspects: false };

const ISTANTE: MomentInput = { date: '2026-09-01', time: '10:00', timezone: 'Europe/Rome' };

/** I parametri come oggetto, che si legge meglio di una query string. */
function letti(parameters: URLSearchParams): Record<string, string> {
  return Object.fromEntries(parameters);
}

describe('chartParameters', () => {
  it('scrive la nascita e le opzioni', () => {
    expect(letti(chartParameters(nascita(), OPZIONI))).toEqual({
      date: '1968-03-12',
      time: '14:30',
      locationId: '3172394',
      houseSystem: 'placidus',
      minorAspects: 'false',
    });
  });

  it('non manda l’ora quando è dichiarata ignota', () => {
    // Il campo può essere rimasto compilato da prima che la casella venisse
    // spuntata: quel che conta è la casella, non quel che c'è scritto sotto.
    const input = nascita();
    input.timeUnknown = true;
    expect(chartParameters(input, OPZIONI).has('time')).toBe(false);
  });

  it('rifiuta una nascita senza luogo', () => {
    const input = nascita();
    input.location = null;
    expect(() => chartParameters(input, OPZIONI)).toThrow(RequestError);
  });

  describe('lo zodiaco', () => {
    it('non scrive il tropicale, che è quel che dice un parametro assente', () => {
      const parameters = chartParameters(nascita(), { ...OPZIONI, zodiac: 'tropicale' });
      expect(parameters.has('zodiac')).toBe(false);
      expect(parameters.has('ayanamsa')).toBe(false);
    });

    it('scrive il siderale con il suo ayanamsa', () => {
      const parameters = chartParameters(nascita(), {
        ...OPZIONI,
        zodiac: 'siderale',
        ayanamsa: 'raman',
      });
      expect(parameters.get('zodiac')).toBe('siderale');
      expect(parameters.get('ayanamsa')).toBe('raman');
    });

    it('non porta l’ayanamsa fuori dal siderale', () => {
      // La rotta lo rifiuterebbe con AYANAMSA_SENZA_ZODIACO: scriverlo qui
      // trasformerebbe una scelta rimasta in memoria in un errore a schermo.
      const parameters = chartParameters(nascita(), { ...OPZIONI, ayanamsa: 'raman' });
      expect(parameters.has('ayanamsa')).toBe(false);
    });
  });

  describe('le coordinate corrette a mano', () => {
    it('non le manda quando la correzione è spenta', () => {
      const parameters = chartParameters(nascita(), OPZIONI);
      expect(parameters.has('latitude')).toBe(false);
      expect(parameters.has('longitude')).toBe(false);
    });

    it('le manda accanto alla località, non al posto suo', () => {
      const input = nascita();
      input.refineCoordinates = true;
      input.latitude = '40.82';
      input.longitude = '14.31';

      const parameters = chartParameters(input, OPZIONI);
      expect(parameters.get('latitude')).toBe('40.82');
      expect(parameters.get('longitude')).toBe('14.31');
      expect(parameters.get('locationId')).toBe('3172394');
    });

    it('non le manda a metà', () => {
      // Un campo illeggibile non deve produrre una richiesta che ripiega in
      // silenzio sul centroide: chi corregge lo fa per non usarlo.
      const input = nascita();
      input.refineCoordinates = true;
      input.latitude = '40.82';
      input.longitude = 'boh';
      expect(chartParameters(input, OPZIONI).has('latitude')).toBe(false);
    });
  });
});

describe('jyotishaParameters', () => {
  const OPZIONI_VEDICHE: JyotishaOptionsInput = {
    ayanamsa: 'lahiri',
    dashaLevels: 2,
    dashaYear: 'solare',
    vargas: ['d1', 'd9', 'd30'],
    drishtiNodes: 'nessuna',
  };

  it('scrive le sole scelte che questa sezione lascia fare', () => {
    expect(letti(jyotishaParameters(nascita(), OPZIONI_VEDICHE))).toEqual({
      date: '1968-03-12',
      time: '14:30',
      locationId: '3172394',
      ayanamsa: 'lahiri',
      dashaLevels: '2',
      dashaYear: 'solare',
      vargas: 'd1,d9,d30',
      drishtiNodes: 'nessuna',
    });
  });

  it('non scrive zodiaco e case, che qui non si scelgono', () => {
    // Siderale e segni interi sono ciò che rende vedico un tema, e la rotta
    // rifiuta `zodiac=tropicale` invece di ignorarlo.
    const parameters = jyotishaParameters(nascita(), OPZIONI_VEDICHE);
    expect(parameters.has('zodiac')).toBe(false);
    expect(parameters.has('houseSystem')).toBe(false);
    expect(parameters.has('minorAspects')).toBe(false);
  });

  it('tratta l’ora ignota e le coordinate come il tema', () => {
    const input = nascita();
    input.timeUnknown = true;
    input.refineCoordinates = true;
    input.latitude = '40.82';
    input.longitude = '14.31';

    const parameters = jyotishaParameters(input, OPZIONI_VEDICHE);
    expect(parameters.has('time')).toBe(false);
    expect(parameters.get('latitude')).toBe('40.82');
  });

  it('rifiuta una nascita senza luogo', () => {
    const input = nascita();
    input.location = null;
    expect(() => jyotishaParameters(input, OPZIONI_VEDICHE)).toThrow(RequestError);
  });
});

describe('skyParameters', () => {
  it('porta il fuso di chi guarda e nessuna nascita', () => {
    expect(letti(skyParameters(ISTANTE, OPZIONI, null))).toEqual({
      date: '2026-09-01',
      time: '10:00',
      timezone: 'Europe/Rome',
      houseSystem: 'placidus',
      minorAspects: 'false',
    });
  });

  it('aggiunge il luogo quando c’è, e non il suo fuso', () => {
    // L'ora scritta nel modulo è quella dell'orologio di chi la scrive: un
    // luogo lontano orienta assi e case, non sposta l'orologio.
    const parameters = skyParameters(ISTANTE, OPZIONI, TOKYO);
    expect(parameters.get('locationId')).toBe('1850147');
    expect(parameters.get('timezone')).toBe('Europe/Rome');
  });

  it('omette l’ora vuota, che il motore legge come mezzogiorno', () => {
    const parameters = skyParameters({ ...ISTANTE, time: '' }, OPZIONI, null);
    expect(parameters.has('time')).toBe(false);
  });

  it('segue la stessa regola dello zodiaco del tema', () => {
    expect(skyParameters(ISTANTE, { ...OPZIONI, zodiac: 'tropicale' }, null).has('zodiac')).toBe(
      false,
    );
    expect(
      skyParameters(ISTANTE, { ...OPZIONI, zodiac: 'siderale', ayanamsa: 'raman' }, null).get(
        'ayanamsa',
      ),
    ).toBe('raman');
  });
});

describe('skyCalendarParameters', () => {
  it('compone l’arco dai mesi chiesti e non porta il luogo', () => {
    // Un incontro fra due pianeti avviene alla stessa ora ovunque lo si
    // guardi: resta il fuso, perché è in quello che le date vanno lette.
    expect(letti(skyCalendarParameters(ISTANTE, 3))).toEqual({
      from: '2026-09-01',
      to: '2026-12-01',
      timezone: 'Europe/Rome',
    });
  });

  it('scrive il siderale solo quando è chiesto', () => {
    expect(skyCalendarParameters(ISTANTE, 3, 'tropicale').has('zodiac')).toBe(false);
    expect(skyCalendarParameters(ISTANTE, 3, 'siderale').get('zodiac')).toBe('siderale');
  });
});

describe('electionParameters', () => {
  const NESSUN_FILTRO: ElectionFilters = { ruler: null, skipMoonVoid: false };

  it('vuole il luogo, e l’arco lo conta in giorni', () => {
    expect(letti(electionParameters(NAPOLI, '2026-09-01', 7, NESSUN_FILTRO))).toEqual({
      locationId: '3172394',
      from: '2026-09-01',
      to: '2026-09-08',
    });
  });

  it('scrive i filtri solo quando restringono qualcosa', () => {
    const parameters = electionParameters(NAPOLI, '2026-09-01', 1, {
      ruler: 'marte',
      skipMoonVoid: true,
    });
    expect(parameters.get('rulers')).toBe('marte');
    expect(parameters.get('skipMoonVoid')).toBe('true');
  });
});

describe('transitParameters', () => {
  it('sono quelli del tema più l’istante del transito', () => {
    expect(letti(transitParameters(nascita(), OPZIONI, ISTANTE))).toEqual({
      date: '1968-03-12',
      time: '14:30',
      locationId: '3172394',
      houseSystem: 'placidus',
      minorAspects: 'false',
      transitDate: '2026-09-01',
      transitTime: '10:00',
      transitTimezone: 'Europe/Rome',
    });
  });

  it('omette l’ora vuota del transito invece di scrivere mezzogiorno', () => {
    // Il motore ripiega su mezzogiorno e lo dichiara fra le avvertenze, che è
    // più onesto di un mezzogiorno implicito scritto qui.
    const parameters = transitParameters(nascita(), OPZIONI, { ...ISTANTE, time: '' });
    expect(parameters.has('transitTime')).toBe(false);
  });

  it('tiene separati i due luoghi', () => {
    const parameters = transitParameters(nascita(), OPZIONI, ISTANTE, TOKYO);
    expect(parameters.get('locationId')).toBe('3172394');
    expect(parameters.get('transitLocationId')).toBe('1850147');
  });

  it('eredita lo zodiaco del tema', () => {
    // I transiti si leggono nello stesso zodiaco della carta su cui cadono:
    // due convenzioni diverse nella stessa pagina sarebbero gradi che non si
    // possono confrontare.
    const parameters = transitParameters(
      nascita(),
      { ...OPZIONI, zodiac: 'siderale' },
      ISTANTE,
    );
    expect(parameters.get('zodiac')).toBe('siderale');
  });

  it('porta con sé le coordinate corrette a mano', () => {
    const input = nascita();
    input.refineCoordinates = true;
    input.latitude = '40.9';
    input.longitude = '14.3';

    const parameters = transitParameters(input, OPZIONI, ISTANTE);
    expect(parameters.get('latitude')).toBe('40.9');
    // La località resta, perché è lei a dare il fuso orario della nascita.
    expect(parameters.get('locationId')).toBe('3172394');
  });
});

describe('passageParameters', () => {
  it('parte dal giorno che si sta guardando', () => {
    const parameters = passageParameters(nascita(), OPZIONI, ISTANTE, 2);
    expect(parameters.get('from')).toBe('2026-09-01');
    expect(parameters.get('to')).toBe('2026-11-01');
    expect(parameters.get('transitTimezone')).toBe('Europe/Rome');
  });

  it('porta con sé la nascita', () => {
    const parameters = passageParameters(nascita(), OPZIONI, ISTANTE, 2);
    expect(parameters.get('date')).toBe('1968-03-12');
    expect(parameters.get('locationId')).toBe('3172394');
  });
});

/**
 * L'andata e il ritorno.
 *
 * Qui non si guardano i nomi dei parametri ma si dà l'indirizzo composto dal
 * client al codice che le rotte usano per rileggerlo. È il punto in cui un
 * nome cambiato da una parte sola smette di essere un dettaglio e diventa un
 * tema diverso da quello a schermo.
 */
describe('l’indirizzo condiviso ricalcola lo stesso tema', () => {
  it('rilegge la nascita che era nel modulo', () => {
    const { birth, place } = readBirth(chartParameters(nascita(), OPZIONI));

    expect(birth).toEqual({
      date: '1968-03-12',
      time: '14:30',
      latitude: NAPOLI.latitude,
      longitude: NAPOLI.longitude,
      timezone: 'Europe/Rome',
    });
    expect(place.label).toBe('Napoli, Campania, Italia');
    expect(place.refined).toBe(false);
  });

  it('rilegge l’ora ignota come assente, non come mezzanotte', () => {
    const input = nascita();
    input.timeUnknown = true;
    const { birth } = readBirth(chartParameters(input, OPZIONI));

    expect(birth.time).toBeUndefined();
  });

  it('rilegge le coordinate corrette tenendo il fuso della località', () => {
    const input = nascita();
    input.refineCoordinates = true;
    input.latitude = '40.82';
    input.longitude = '14.31';

    const { birth, place } = readBirth(chartParameters(input, OPZIONI));

    expect(birth.latitude).toBe(40.82);
    expect(birth.longitude).toBe(14.31);
    expect(birth.timezone).toBe('Europe/Rome');
    expect(place.refined).toBe(true);
  });

  it('rilegge le stesse opzioni', () => {
    const opzioni: ChartOptionsInput = {
      houseSystem: 'koch',
      minorAspects: true,
      zodiac: 'siderale',
      ayanamsa: 'krishnamurti',
    };

    expect(readChartOptions(chartParameters(nascita(), opzioni))).toEqual({
      houseSystem: 'koch',
      minorAspects: true,
      zodiac: 'siderale',
      ayanamsa: 'krishnamurti',
    });
  });

  it.each(HOUSE_SYSTEMS.map((sistema) => sistema.value))(
    'la rotta riconosce il sistema %s che il modulo propone',
    (houseSystem) => {
      const parameters = chartParameters(nascita(), { ...OPZIONI, houseSystem });
      expect(readChartOptions(parameters).houseSystem).toBe(houseSystem);
    },
  );

  it.each(AYANAMSAS.map((ayanamsa) => ayanamsa.value))(
    'la rotta riconosce l’ayanamsa %s che il modulo propone',
    (ayanamsa) => {
      const parameters = chartParameters(nascita(), { ...OPZIONI, zodiac: 'siderale', ayanamsa });
      expect(readChartOptions(parameters).ayanamsa).toBe(ayanamsa);
    },
  );

  it('rilegge i due luoghi dei transiti senza scambiarli', () => {
    // Sono nei medesimi parametri, e a tenerli distinti c'è solo il prefisso
    // dei nomi: confonderli darebbe le case di un altro posto.
    const parameters = transitParameters(nascita(), OPZIONI, ISTANTE, TOKYO);

    expect(resolvePlace(parameters).timezone).toBe('Europe/Rome');
    expect(resolvePlace(parameters, LUOGO_TRANSITO).timezone).toBe('Asia/Tokyo');
  });

  it('rilegge la nascita anche dai parametri dei passaggi', () => {
    const { birth } = readBirth(passageParameters(nascita(), OPZIONI, ISTANTE, 2));
    expect(birth.date).toBe('1968-03-12');
    expect(birth.timezone).toBe('Europe/Rome');
  });
});
