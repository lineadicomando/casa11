#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { computeNatalChart } from './chart.js';
import { ChartError } from './errors.js';
import {
  formatChartCompact,
  formatPassagesCompact,
  formatSkyCompact,
  formatSkyPassagesCompact,
  formatTransitsCompact,
} from './format.js';
import { findTransitPassages } from './passages.js';
import { findSkyPassages } from './sky-passages.js';
import { DEFAULT_PASSAGE_BODIES } from './constants.js';
import { computeSky } from './sky.js';
import { currentMoment, systemTimezone } from './time.js';
import { computeTransits } from './transits.js';
import type {
  BirthData,
  ChartOptions,
  HouseSystem,
  PassageOptions,
  PassageRange,
  SkyMoment,
  SkyOptions,
  SkyPassageOptions,
  TransitMoment,
  TransitOptions,
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
  --fortuna <formula>   Parte di Fortuna: settore (default, si inverte nei temi
                        notturni) oppure diurna (sempre ASC + Luna − Sole)
  --json                Stampa il JSON completo invece della tabella compatta
  --ephe <percorso>     Cartella dei file .se1
  --help                Mostra questo messaggio

Transiti
  --transits            Calcola i transiti sul tema invece del tema soltanto
  --on <YYYY-MM-DD>     Giorno del transito. Se omesso, adesso
  --at <HH:mm>          Ora del transito. Se omessa, mezzogiorno locale
  --transit-tz <IANA>   Fuso del transito. Se omesso, quello di nascita

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
`.trimStart();

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
      fortuna: { type: 'string' },
      json: { type: 'boolean', default: false },
      ephe: { type: 'string' },
      help: { type: 'boolean', default: false },
      transits: { type: 'boolean', default: false },
      passages: { type: 'boolean', default: false },
      sky: { type: 'boolean', default: false },
      from: { type: 'string' },
      to: { type: 'string' },
      moon: { type: 'boolean', default: false },
      on: { type: 'string' },
      at: { type: 'string' },
      'transit-tz': { type: 'string' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  // Il cielo si calcola prima di controllare i dati di nascita: è la sola
  // domanda del programma che non ne ha bisogno.
  if (values.sky) {
    if (values.transits) {
      process.stderr.write('--sky non si combina con --transits: un transito vuole un tema.\n');
      return 2;
    }
    return values.passages ? printSkyPassages(values) : printSky(values);
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

  const options: ChartOptions = { minorAspects: values.minor };
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
    const orphans = (['on', 'at', 'transit-tz'] as const).filter((key) => values[key]);
    if (orphans.length > 0) {
      process.stderr.write(
        `${orphans.map((o) => `--${o}`).join(', ')} richiede --transits oppure --sky.\n`,
      );
      return 2;
    }

    process.stdout.write(
      values.json ? `${JSON.stringify(chart, null, 2)}\n` : `${formatChartCompact(chart)}\n`,
    );
    return 0;
  }

  const moment = momentFrom(values, birth.timezone);
  const transitOptions: TransitOptions = { minorAspects: values.minor };
  if (values.ephe) transitOptions.ephemerisPath = values.ephe;

  const transits = computeTransits(chart, moment, transitOptions);
  process.stdout.write(
    values.json
      ? `${JSON.stringify({ chart, transits }, null, 2)}\n`
      : `${formatTransitsCompact(chart, transits)}\n`,
  );
  return 0;
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

  const options: SkyOptions = { minorAspects: values.minor };
  if (values.houses) options.houseSystem = values.houses as HouseSystem;
  if (values.ephe) options.ephemerisPath = values.ephe;
  if (values.lat && values.lon) {
    options.place = { latitude: Number(values.lat), longitude: Number(values.lon) };
  }

  const sky = computeSky(moment, options);
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

function addYear(date: string): string {
  const [year, rest] = [date.slice(0, 4), date.slice(4)];
  return `${Number(year) + 1}${rest}`;
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
