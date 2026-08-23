#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  paletteDi,
  ruotaSvg,
  type NomeTema,
  type OpzioniDisegno,
  type WheelChart,
} from '@undicesimacasa/ruota';
import { ruotaPng } from '@undicesimacasa/ruota/png';
import { letturaDaIncollare, type OpzioniLettura } from '@undicesimacasa/lettura';
import { AYANAMSAS } from './ayanamsa.js';
import { computeNatalChart } from './chart.js';
import { ChartError } from './errors.js';
import {
  formatChartCompact,
  formatDashaCompact,
  formatElectionCompact,
  formatNakshatraCompact,
  formatPanchangaCompact,
  formatPassagesCompact,
  formatSkyCompact,
  formatSkyEventsCompact,
  formatSkyPassagesCompact,
  formatTransitsCompact,
} from './format.js';
import { findElectionHours } from './election.js';
import { computePanchanga } from './panchanga.js';
import { computeVimshottari } from './dasha.js';
import { findTransitPassages } from './passages.js';
import { findSignIngresses, findStations } from './sky-events.js';
import { findSkyPassages } from './sky-passages.js';
import { DEFAULT_PASSAGE_BODIES } from './constants.js';
import { computeSky } from './sky.js';
import { currentMoment, systemTimezone } from './time.js';
import { computeTransits } from './transits.js';
import type {
  BirthData,
  NatalChart,
  ChartOptions,
  ElectionOptions,
  HouseSystem,
  PassageOptions,
  PanchangaOptions,
  PassageRange,
  Place,
  SkyMoment,
  SkyEventOptions,
  SkyOptions,
  SkyPassageOptions,
  TransitMoment,
  TransitOptions,
  VimshottariDasha,
  VimshottariOptions,
  ZodiacOptions,
} from './types.js';

const USAGE = `
casa11 — calcolo del tema natale da riga di comando

  casa11 --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome
  casa11 --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome \\
         --transits --on 2026-08-15
  casa11 --sky

Opzioni
  --date <YYYY-MM-DD>   Data di nascita locale (obbligatoria)
  --time <HH:mm>        Ora di nascita locale. Se omessa, carta senza case
  --lat <gradi>         Latitudine, positiva a Nord (obbligatoria)
  --lon <gradi>         Longitudine, positiva a Est (obbligatoria)
  --tz <IANA>           Fuso orario, es. Europe/Rome (obbligatorio)
  --houses <sistema>    placidus (default), koch, segni-interi, equale,
                        regiomontano, campano, porfirio, topocentrico, alcabizio
  --minor               Includi anche gli aspetti minori
  --zodiaco <nome>      tropicale (default) oppure siderale. Fra i due corrono
                        più di ventiquattro gradi: quasi un segno intero
  --ayanamsa <nome>     Con --zodiaco siderale: lahiri (default), true-chitra,
                        krishnamurti, raman, yukteshwar, fagan-bradley
  --nakshatra           Aggiunge la tabella dei ventisette nakshatra con pada e
                        signore. Richiede --zodiaco siderale: un nakshatra è un
                        tratto di cielo fra stelle fisse
  --dasha               Aggiunge la catena vimshottari: centoventi anni divisi
                        fra i nove graha, a partire dal nakshatra della Luna.
                        Richiede --zodiaco siderale
  --livelli <1|2|3>     Ordini di periodo. Default 2 — nove mahadasha con i loro
                        antardasha. Tre sono settecentoventinove righe
  --anno-dasha <nome>   solare (default, 365,25 giorni) oppure savana (360). Le
                        scuole divergono, e su ottant'anni è più di un anno
  --fortuna <formula>   Parte di Fortuna: settore (default, si inverte nei temi
                        notturni) oppure diurna (sempre ASC + Luna − Sole)
  --json                Stampa il JSON completo invece della tabella compatta
  --lettura             Stampa il tema preceduto dalle istruzioni per farlo
                        interpretare: si incolla in un assistente. Solo per il
                        tema natale, e non si combina con --json
  --repository <url>    Indirizzo del sorgente, per la riga di provenienza in
                        fondo a --lettura. Omesso, la riga non compare
  --ephe <percorso>     Cartella dei file .se1
  --help                Mostra questo messaggio

Disegno
  --svg <file>          Salva la ruota come disegno vettoriale
  --png <file>          Salva la ruota come immagine, al doppio del riquadro
  --tema <chiaro|scuro> Colori del disegno. Default chiaro, che è il fondo su
                        cui una carta viene stampata o incollata
  --larghezza <punti>   Larghezza del PNG. Default 1704
                        Il disegno vale anche con --transits, dove diventa una
                        bi-ruota, e con --sky. La tabella si stampa lo stesso:
                        salvare un disegno non è un modo di non vedere i dati

Transiti
  --transits            Calcola i transiti sul tema invece del tema soltanto
  --on <YYYY-MM-DD>     Giorno del transito. Se omesso, adesso
  --at <HH:mm>          Ora del transito. Se omessa, mezzogiorno locale
  --transit-tz <IANA>   Fuso del transito. Se omesso, quello di nascita
  --transit-lat <gradi> Luogo da cui si guarda il transito: facoltativo, non
  --transit-lon <gradi> sposta i corpi né le case natali in cui cadono. Aggiunge
                        assi e case dell'istante, e vuole anche --at

Passaggi
  --passages            Elenca gli istanti in cui i transiti si perfezionano
  --from <YYYY-MM-DD>   Inizio dell'arco. Se omesso, oggi
  --to <YYYY-MM-DD>     Fine dell'arco. Se omessa, un anno dopo l'inizio
  --moon                Includi la Luna, esclusa perché ne perfeziona a migliaia

Cielo
  --sky                 Il cielo di un istante, senza nessun tema natale.
                        Non richiede né data di nascita né luogo
  --on <YYYY-MM-DD>     Giorno. Se omesso, adesso
  --at <HH:mm>          Ora. Se omessa, mezzogiorno locale
  --tz <IANA>           Fuso in cui leggere e scrivere l'istante.
                        Se omesso, quello di sistema
  --lat --lon           Luogo da cui si guarda: facoltativo, serve solo ad
                        assi e case, che vogliono anche l'ora
  --sky --passages      Il calendario degli incontri fra i corpi in cielo,
                        con --from, --to e --moon come sopra
  --sky --events        Ingressi nei segni e stazioni, con --from e --to

Panchanga
  --panchanga           Le cinque parti del calendario indiano — tithi, vara,
                        nakshatra, yoga, karana — di un istante in un luogo.
                        Nessuna nascita, ma --lat e --lon sono obbligatorie: la
                        vara comincia all'alba. Siderale per definizione
  --on --at --tz        L'istante. Se omessi, adesso
  --ayanamsa <nome>     La convenzione siderale. Default lahiri

Elezione
  --elezione            Ore planetarie, Ascendente e vuoti di corso della Luna
                        in un luogo. Nessuna nascita, ma --lat e --lon sono
                        obbligatorie: alba e tramonto dipendono dal luogo
  --from --to           L'arco, al massimo 31 giorni. Se omessi, oggi
  --tz <IANA>           Fuso in cui leggere le date e scrivere le ore
  --reggitori <lista>   Solo le ore rette da questi, es. giove,venere
  --senza-vuoti         Scarta le ore che un vuoto di corso attraversa
`.trimStart();

/**
 * Lo zodiaco richiesto, o `null` se non è valido — nel qual caso il messaggio
 * è già stato scritto e a chi chiama resta solo da uscire con 2.
 *
 * Un valore non riconosciuto viene rifiutato invece che ricondotto al
 * predefinito: un refuso su `--ayanamsa` produrrebbe altrimenti un tema
 * siderale corretto ma di un'altra scuola, che non si distingue a occhio da
 * quello chiesto.
 */
function zodiacoDa(values: {
  zodiaco?: string | undefined;
  ayanamsa?: string | undefined;
}): ZodiacOptions | null {
  const options: ZodiacOptions = {};

  if (values.zodiaco !== undefined) {
    if (values.zodiaco !== 'tropicale' && values.zodiaco !== 'siderale') {
      process.stderr.write(
        'Valore di --zodiaco non riconosciuto: atteso "tropicale" oppure "siderale".\n',
      );
      return null;
    }
    options.zodiac = values.zodiaco;
  }

  if (values.ayanamsa !== undefined) {
    const definition = AYANAMSAS.find((ayanamsa) => ayanamsa.id === values.ayanamsa);
    if (!definition) {
      process.stderr.write(
        `Ayanamsa "${values.ayanamsa}" non riconosciuto. Ammessi: ` +
          `${AYANAMSAS.map((a) => a.id).join(', ')}.\n`,
      );
      return null;
    }
    if (options.zodiac !== 'siderale') {
      // Accettarlo in silenzio sullo zodiaco tropicale vuol dire consegnare un
      // tema in cui l'ayanamsa scelto non compare da nessuna parte.
      process.stderr.write('--ayanamsa richiede --zodiaco siderale.\n');
      return null;
    }
    options.ayanamsa = definition.id;
  }

  return options;
}

/**
 * La catena vimshottari con le opzioni della riga di comando, o `null` se
 * qualcosa non va — nel qual caso il messaggio è già stato scritto.
 */
function catenaDa(
  chart: NatalChart,
  values: { livelli?: string | undefined; 'anno-dasha'?: string | undefined },
): VimshottariDasha | null {
  const options: VimshottariOptions = {};

  const livelli = values.livelli;
  if (livelli !== undefined) {
    if (livelli !== '1' && livelli !== '2' && livelli !== '3') {
      process.stderr.write('--livelli vuole 1, 2 oppure 3.\n');
      return null;
    }
    options.levels = Number(livelli) as 1 | 2 | 3;
  }

  const anno = values['anno-dasha'];
  if (anno !== undefined) {
    if (anno !== 'solare' && anno !== 'savana') {
      process.stderr.write('--anno-dasha vuole "solare" oppure "savana".\n');
      return null;
    }
    options.yearLength = anno;
  }

  return computeVimshottari(chart, options);
}

function main(argv: string[]): number {
  const { values } = parseArgs({
    args: argv,
    options: {
      date: { type: 'string' },
      time: { type: 'string' },
      lat: { type: 'string' },
      lon: { type: 'string' },
      tz: { type: 'string' },
      houses: { type: 'string' },
      minor: { type: 'boolean', default: false },
      zodiaco: { type: 'string' },
      ayanamsa: { type: 'string' },
      nakshatra: { type: 'boolean', default: false },
      panchanga: { type: 'boolean', default: false },
      dasha: { type: 'boolean', default: false },
      livelli: { type: 'string' },
      'anno-dasha': { type: 'string' },
      fortuna: { type: 'string' },
      json: { type: 'boolean', default: false },
      lettura: { type: 'boolean', default: false },
      repository: { type: 'string' },
      ephe: { type: 'string' },
      svg: { type: 'string' },
      png: { type: 'string' },
      tema: { type: 'string' },
      larghezza: { type: 'string' },
      help: { type: 'boolean', default: false },
      transits: { type: 'boolean', default: false },
      passages: { type: 'boolean', default: false },
      sky: { type: 'boolean', default: false },
      events: { type: 'boolean', default: false },
      elezione: { type: 'boolean', default: false },
      reggitori: { type: 'string' },
      'senza-vuoti': { type: 'boolean', default: false },
      from: { type: 'string' },
      to: { type: 'string' },
      moon: { type: 'boolean', default: false },
      on: { type: 'string' },
      at: { type: 'string' },
      'transit-tz': { type: 'string' },
      'transit-lat': { type: 'string' },
      'transit-lon': { type: 'string' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  // La lettura vale per il tema natale e per nient'altro. Le istruzioni
  // parlano di chi è una persona a partire da Sole, Luna e Ascendente: su un
  // elenco di transiti o su un calendario di ore planetarie non hanno appiglio,
  // e un modello a cui arrivassero lo stesso riempirebbe il vuoto.
  if (values.lettura) {
    if (values.json) {
      process.stderr.write(
        '--lettura e --json chiedono due cose diverse: un testo da far leggere e i dati grezzi.\n',
      );
      return 2;
    }
    const altrove = (['transits', 'passages', 'sky', 'events', 'elezione'] as const).filter(
      (key) => values[key],
    );
    if (altrove.length > 0) {
      process.stderr.write(
        `--lettura vale solo per il tema natale, non con ${altrove
          .map((key) => `--${key}`)
          .join(', ')}.\n`,
      );
      return 2;
    }
  } else if (values.repository) {
    process.stderr.write('--repository richiede --lettura: altrove non compare da nessuna parte.\n');
    return 2;
  }

  // L'elezione, come il cielo, non riguarda nessuna nascita: si risponde prima
  // di chiedere una data di nascita che non servirebbe.
  if (values.elezione) return printElection(values);

  // Il panchanga nemmeno: è la qualità di un istante in un luogo.
  if (values.panchanga) return printPanchanga(values);

  // Il cielo si calcola prima di controllare i dati di nascita: è la sola
  // domanda del programma che non ne ha bisogno.
  if (values.sky) {
    if (values.transits) {
      process.stderr.write('--sky non si combina con --transits: un transito vuole un tema.\n');
      return 2;
    }
    if (values.passages && values.events) {
      process.stderr.write('--passages e --events sono due elenchi diversi: chiedine uno.\n');
      return 2;
    }
    if (values.passages) return printSkyPassages(values);
    if (values.events) return printSkyEvents(values);
    return printSky(values);
  }

  if (values.events) {
    process.stderr.write('--events richiede --sky: ingressi e stazioni non hanno un tema.\n');
    return 2;
  }

  const missing = (['date', 'lat', 'lon', 'tz'] as const).filter((key) => !values[key]);
  if (missing.length > 0) {
    process.stderr.write(`Parametri mancanti: ${missing.map((m) => `--${m}`).join(', ')}\n\n${USAGE}`);
    return 2;
  }

  const birth: BirthData = {
    date: values.date as string,
    latitude: Number(values.lat),
    longitude: Number(values.lon),
    timezone: values.tz as string,
  };
  if (values.time) birth.time = values.time;

  const zodiaco = zodiacoDa(values);
  if (zodiaco === null) return 2;

  const options: ChartOptions = { minorAspects: values.minor, ...zodiaco };
  if (values.houses) options.houseSystem = values.houses as HouseSystem;
  if (values.ephe) options.ephemerisPath = values.ephe;
  if (values.fortuna) {
    // Un valore non riconosciuto agirebbe come `diurna` in silenzio:
    // meglio rifiutarlo subito.
    if (values.fortuna !== 'settore' && values.fortuna !== 'diurna') {
      process.stderr.write(
        `Valore di --fortuna non riconosciuto: atteso "settore" oppure "diurna".\n`,
      );
      return 2;
    }
    options.partOfFortuneFormula = values.fortuna;
  }

  const chart = computeNatalChart(birth, options);

  if (values.passages) {
    const range = passageRange(values, birth.timezone);
    const passageOptions: PassageOptions = { minorAspects: values.minor };
    if (values.ephe) passageOptions.ephemerisPath = values.ephe;
    if (values.moon) passageOptions.bodies = [...DEFAULT_PASSAGE_BODIES, 'luna'];

    const { passages, warnings } = findTransitPassages(chart, range, passageOptions);
    process.stdout.write(
      values.json
        ? `${JSON.stringify({ chart, range, passages, warnings }, null, 2)}\n`
        : `${formatPassagesCompact(chart, passages, range, warnings)}\n`,
    );
    return 0;
  }

  if (!values.transits) {
    // Le opzioni del transito senza `--transits` verrebbero ignorate in
    // silenzio, e chi le ha scritte aspetterebbe un risultato che non arriva.
    const orphans = (['on', 'at', 'transit-tz', 'transit-lat', 'transit-lon'] as const).filter(
      (key) => values[key],
    );
    if (orphans.length > 0) {
      process.stderr.write(
        `${orphans.map((o) => `--${o}`).join(', ')} richiede --transits oppure --sky.\n`,
      );
      return 2;
    }

    const disegno = scriviDisegno(chart, values);
    if (disegno !== null) return disegno;

    if (values.lettura) {
      const opzioni: OpzioniLettura = {};
      if (values.repository) opzioni.repository = values.repository;
      process.stdout.write(`${letturaDaIncollare(formatChartCompact(chart), opzioni)}`);
      return 0;
    }

    if (values.json) {
      process.stdout.write(`${JSON.stringify(chart, null, 2)}\n`);
      return 0;
    }

    // I nakshatra dopo il tema e non al posto suo: sono un'altra lettura dello
    // stesso cielo, non un cielo diverso.
    const nakshatra = values.nakshatra ? `\n${formatNakshatraCompact(chart)}\n` : '';

    let dasha = '';
    if (values.dasha) {
      const catena = catenaDa(chart, values);
      if (catena === null) return 2;
      dasha = `\n${formatDashaCompact(catena)}\n`;
    }

    process.stdout.write(`${formatChartCompact(chart)}\n${nakshatra}${dasha}`);
    return 0;
  }

  // Mezzo luogo è un errore: una coordinata sola metterebbe chi guarda su un
  // meridiano arbitrario, e le cuspidi che ne uscirebbero sarebbero di nessuno.
  if (Boolean(values['transit-lat']) !== Boolean(values['transit-lon'])) {
    process.stderr.write('--transit-lat e --transit-lon vanno indicate insieme.\n');
    return 2;
  }

  const moment = momentFrom(values, birth.timezone);
  const transitOptions: TransitOptions = { minorAspects: values.minor };
  if (values.ephe) transitOptions.ephemerisPath = values.ephe;
  // Lo stesso sistema delle case natali: chiederne due sarebbe un'opzione in
  // più per un confronto che nessuno fa.
  if (values.houses) transitOptions.houseSystem = values.houses as HouseSystem;
  if (values['transit-lat'] && values['transit-lon']) {
    transitOptions.place = {
      latitude: Number(values['transit-lat']),
      longitude: Number(values['transit-lon']),
    };
  }

  const transits = computeTransits(chart, moment, transitOptions);

  // Con i transiti la ruota diventa una bi-ruota: i transitanti fuori, e al
  // centro i loro aspetti al tema invece di quelli interni al tema.
  const disegno = scriviDisegno(chart, values, {
    transits,
    label: 'Ruota con il tema natale, i corpi in transito e i loro aspetti',
  });
  if (disegno !== null) return disegno;

  process.stdout.write(
    values.json
      ? `${JSON.stringify({ chart, transits }, null, 2)}\n`
      : `${formatTransitsCompact(chart, transits)}\n`,
  );
  return 0;
}

interface OpzioniDisegnoCli {
  svg?: string | undefined;
  png?: string | undefined;
  tema?: string | undefined;
  larghezza?: string | undefined;
  minor: boolean;
}

/**
 * Salva la ruota, se è stata chiesta.
 *
 * Restituisce `null` quando è andato tutto bene — anche quando non c'era
 * niente da salvare — e un codice d'uscita quando un valore non va. Il
 * chiamante stampa comunque la tabella: un disegno si aggiunge ai dati, non
 * li sostituisce.
 */
function scriviDisegno(
  chart: WheelChart,
  values: OpzioniDisegnoCli,
  extra: OpzioniDisegno = {},
): number | null {
  if (!values.svg && !values.png) return null;

  // Un valore non riconosciuto agirebbe come `chiaro` in silenzio, e chi ha
  // scritto `--tema scura` si ritroverebbe il disegno sbagliato senza saperlo.
  if (values.tema && values.tema !== 'chiaro' && values.tema !== 'scuro') {
    process.stderr.write('Valore di --tema non riconosciuto: atteso "chiaro" oppure "scuro".\n');
    return 2;
  }

  let larghezza: number | undefined;
  if (values.larghezza) {
    larghezza = Number(values.larghezza);
    if (!Number.isFinite(larghezza) || larghezza < 100) {
      process.stderr.write('--larghezza vuole un numero di punti, almeno 100.\n');
      return 2;
    }
  }

  const disegno: OpzioniDisegno = {
    ...extra,
    palette: paletteDi(values.tema as NomeTema | undefined),
    aspettiMinori: values.minor,
  };

  if (values.svg) {
    writeFileSync(values.svg, ruotaSvg(chart, disegno));
    process.stderr.write(`${values.svg}\n`);
  }
  if (values.png) {
    writeFileSync(values.png, ruotaPng(chart, { ...disegno, ...(larghezza ? { larghezza } : {}) }));
    process.stderr.write(`${values.png}\n`);
  }

  return null;
}

/**
 * Stampa il cielo di un istante.
 *
 * Nessun parametro è obbligatorio, ed è il punto: `casa11 --sky` risponde
 * subito. Il fuso, se non indicato, è quello della macchina — non sposta il
 * cielo, decide solo come vengono scritte data e ora.
 */
function printSky(values: {
  on?: string | undefined;
  at?: string | undefined;
  tz?: string | undefined;
  'transit-tz'?: string | undefined;
  lat?: string | undefined;
  lon?: string | undefined;
  houses?: string | undefined;
  ephe?: string | undefined;
  zodiaco?: string | undefined;
  ayanamsa?: string | undefined;
  svg?: string | undefined;
  png?: string | undefined;
  tema?: string | undefined;
  larghezza?: string | undefined;
  minor: boolean;
  json: boolean;
}): number {
  if (values['transit-tz']) {
    process.stderr.write('Con --sky il fuso si indica con --tz.\n');
    return 2;
  }
  // Mezzo luogo non è un luogo: senza una delle due coordinate assi e case
  // uscirebbero calcolati su un meridiano arbitrario.
  if (Boolean(values.lat) !== Boolean(values.lon)) {
    process.stderr.write('--lat e --lon vanno indicati insieme.\n');
    return 2;
  }

  const moment: SkyMoment = momentFrom(values, values.tz ?? systemTimezone());

  const zodiaco = zodiacoDa(values);
  if (zodiaco === null) return 2;

  const options: SkyOptions = { minorAspects: values.minor, ...zodiaco };
  if (values.houses) options.houseSystem = values.houses as HouseSystem;
  if (values.ephe) options.ephemerisPath = values.ephe;
  if (values.lat && values.lon) {
    options.place = { latitude: Number(values.lat), longitude: Number(values.lon) };
  }

  const sky = computeSky(moment, options);

  // Il cielo non è un tema: senza luogo non ha né assi né case, e va annunciato
  // per quello che è a chi il disegno non lo vede.
  const disegno = scriviDisegno(sky, values, {
    label: 'Ruota del cielo con le posizioni planetarie e i loro aspetti',
  });
  if (disegno !== null) return disegno;

  process.stdout.write(
    values.json ? `${JSON.stringify(sky, null, 2)}\n` : `${formatSkyCompact(sky)}\n`,
  );
  return 0;
}

/**
 * Stampa il calendario degli incontri in cielo.
 *
 * Le stesse opzioni d'arco dei passaggi natali, senza nessuna nascita: qui i
 * corpi si incontrano fra loro.
 */
function printSkyPassages(values: {
  from?: string | undefined;
  to?: string | undefined;
  tz?: string | undefined;
  ephe?: string | undefined;
  minor: boolean;
  moon: boolean;
  json: boolean;
}): number {
  const timezone = values.tz ?? systemTimezone();
  const range = passageRange({ from: values.from, to: values.to }, timezone);

  const options: SkyPassageOptions = { minorAspects: values.minor };
  if (values.ephe) options.ephemerisPath = values.ephe;
  if (values.moon) options.bodies = [...DEFAULT_PASSAGE_BODIES, 'luna'];

  const { passages, warnings } = findSkyPassages(range, options);
  process.stdout.write(
    values.json
      ? `${JSON.stringify({ range, passages, warnings }, null, 2)}\n`
      : `${formatSkyPassagesCompact(passages, range, warnings)}\n`,
  );
  return 0;
}

/**
 * Stampa ingressi e stazioni dell'arco.
 *
 * Sono gli eventi di un corpo solo: non c'è nessuna coppia, e quindi nemmeno
 * la Luna da escludere per rumore — anche se resta fuori dai predefiniti,
 * dove cambierebbe segno ogni due giorni e mezzo.
 */
/**
 * Le cinque parti del calendario indiano per un istante in un luogo.
 *
 * Il luogo è obbligatorio come nell'elezione, e per la stessa ragione: la vara
 * comincia all'alba, e un'alba vuole un orizzonte.
 */
function printPanchanga(values: {
  on?: string | undefined;
  at?: string | undefined;
  tz?: string | undefined;
  lat?: string | undefined;
  lon?: string | undefined;
  ayanamsa?: string | undefined;
  zodiaco?: string | undefined;
  ephe?: string | undefined;
  json: boolean;
}): number {
  if (!values.lat || !values.lon) {
    process.stderr.write(
      '--panchanga richiede --lat e --lon: la vara comincia con il Sole che sorge,\n' +
        "e senza un orizzonte non c'è un'alba.\n",
    );
    return 2;
  }

  if (values.zodiaco && values.zodiaco !== 'siderale') {
    // Non si ripiega in silenzio: chi ha scritto tropicale ha in mente
    // un'altra cosa, e va detto che quella cosa non esiste.
    process.stderr.write(
      'Il panchanga è siderale per definizione: --zodiaco tropicale non si applica.\n',
    );
    return 2;
  }

  const zodiaco = zodiacoDa({ zodiaco: 'siderale', ...(values.ayanamsa ? { ayanamsa: values.ayanamsa } : {}) });
  if (zodiaco === null) return 2;

  const timezone = values.tz ?? systemTimezone();
  const adesso = currentMoment(timezone);
  const moment: SkyMoment = {
    date: values.on ?? adesso.date,
    timezone,
    ...(values.at ?? (values.on ? undefined : adesso.time)
      ? { time: values.at ?? adesso.time }
      : {}),
  };

  const options: PanchangaOptions = {};
  if (zodiaco.ayanamsa) options.ayanamsa = zodiaco.ayanamsa;
  if (values.ephe) options.ephemerisPath = values.ephe;

  const panchanga = computePanchanga(
    moment,
    { latitude: Number(values.lat), longitude: Number(values.lon) },
    options,
  );

  process.stdout.write(
    values.json
      ? `${JSON.stringify(panchanga, null, 2)}\n`
      : `${formatPanchangaCompact(panchanga)}\n`,
  );
  return 0;
}

function printSkyEvents(values: {
  from?: string | undefined;
  to?: string | undefined;
  tz?: string | undefined;
  ephe?: string | undefined;
  zodiaco?: string | undefined;
  ayanamsa?: string | undefined;
  moon: boolean;
  json: boolean;
}): number {
  const timezone = values.tz ?? systemTimezone();
  const range = passageRange({ from: values.from, to: values.to }, timezone);

  const zodiaco = zodiacoDa(values);
  if (zodiaco === null) return 2;

  const options: SkyEventOptions = { ...zodiaco };
  if (values.ephe) options.ephemerisPath = values.ephe;
  if (values.moon) options.bodies = [...DEFAULT_PASSAGE_BODIES, 'luna'];

  const { ingresses, warnings } = findSignIngresses(range, options);
  const { stations, warnings: more } = findStations(range, options);
  const tutte = [...new Set([...warnings, ...more])];

  process.stdout.write(
    values.json
      ? `${JSON.stringify({ range, ingresses, stations, warnings: tutte }, null, 2)}\n`
      : `${formatSkyEventsCompact(ingresses, stations, range, tutte)}\n`,
  );
  return 0;
}

/**
 * Stampa il calendario elettivo di un luogo.
 *
 * È l'unico comando che pretende le coordinate senza alternative: le ore
 * planetarie nascono da alba e tramonto, e quelle senza un punto sulla Terra
 * non esistono. Il fuso serve a leggere le date e a scrivere gli orari, e se
 * manca è quello della macchina.
 */
function printElection(values: {
  from?: string | undefined;
  to?: string | undefined;
  lat?: string | undefined;
  lon?: string | undefined;
  tz?: string | undefined;
  ephe?: string | undefined;
  reggitori?: string | undefined;
  'senza-vuoti': boolean;
  json: boolean;
}): number {
  if (!values.lat || !values.lon) {
    process.stderr.write(
      '--elezione richiede --lat e --lon: le ore planetarie dipendono da alba e tramonto,\n' +
        'che cambiano con il luogo.\n',
    );
    return 2;
  }

  const timezone = values.tz ?? systemTimezone();
  const from = values.from ?? currentMoment(timezone).date;
  const range: PassageRange = { from, to: values.to ?? from, timezone };
  const place: Place = { latitude: Number(values.lat), longitude: Number(values.lon) };

  const options: ElectionOptions = {};
  if (values.ephe) options.ephemerisPath = values.ephe;
  if (values['senza-vuoti']) options.skipMoonVoid = true;
  if (values.reggitori) {
    const rulers = values.reggitori
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');
    if (rulers.length === 0) {
      process.stderr.write('--reggitori è vuoto: elenca i pianeti separati da virgola.\n');
      return 2;
    }
    options.rulers = rulers as ElectionOptions['rulers'];
  }

  const election = findElectionHours(range, place, options);
  process.stdout.write(
    values.json
      ? `${JSON.stringify(election, null, 2)}\n`
      : `${formatElectionCompact(election)}\n`,
  );
  return 0;
}

/**
 * L'arco su cui cercare i passaggi.
 *
 * Senza `--from` si parte da oggi, che è la domanda che si fa quasi sempre;
 * senza `--to` si arriva a un anno dopo, perché è la durata entro cui un
 * pianeta lento completa il suo andirivieni su uno stesso punto.
 */
function passageRange(
  values: { from?: string | undefined; to?: string | undefined; 'transit-tz'?: string | undefined },
  birthTimezone: string,
): PassageRange {
  const timezone = values['transit-tz'] ?? birthTimezone;
  const from = values.from ?? currentMoment(timezone).date;
  const to = values.to ?? addYear(from);
  return { from, to, timezone };
}

/** Un anno dopo, alla stessa data: il 29 febbraio diventa il 1° marzo. */
function addYear(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * L'istante di cui si vuole il cielo, che sia in rapporto a un tema o no.
 *
 * Senza `--on` vale adesso, ora compresa: chi non indica un giorno vuole il
 * cielo di questo momento. Con un giorno ma senza `--at` decide il motore,
 * che ripiega su mezzogiorno e lo dichiara fra le avvertenze.
 */
function momentFrom(
  values: { on?: string | undefined; at?: string | undefined; 'transit-tz'?: string | undefined },
  fallbackTimezone: string,
): TransitMoment {
  const timezone = values['transit-tz'] ?? fallbackTimezone;

  if (!values.on) {
    const now = currentMoment(timezone);
    return values.at ? { ...now, time: values.at } : now;
  }

  const moment: TransitMoment = { date: values.on, timezone };
  if (values.at) moment.time = values.at;
  return moment;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  if (error instanceof ChartError) {
    process.stderr.write(`Errore [${error.code}]: ${error.message}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
