#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { DateTime } from 'luxon';
import { computeNatalChart } from './chart.js';
import { ChartError } from './errors.js';
import { formatChartCompact, formatTransitsCompact } from './format.js';
import { computeTransits } from './transits.js';
import type { BirthData, ChartOptions, HouseSystem, TransitMoment, TransitOptions } from './types.js';

const USAGE = `
casa11 — calcolo del tema natale da riga di comando

  casa11 --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome
  casa11 --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome \\
         --transits --on 2026-08-15

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

  if (!values.transits) {
    // Le opzioni del transito senza `--transits` verrebbero ignorate in
    // silenzio, e chi le ha scritte aspetterebbe un risultato che non arriva.
    const orphans = (['on', 'at', 'transit-tz'] as const).filter((key) => values[key]);
    if (orphans.length > 0) {
      process.stderr.write(
        `${orphans.map((o) => `--${o}`).join(', ')} richiede --transits.\n`,
      );
      return 2;
    }

    process.stdout.write(
      values.json ? `${JSON.stringify(chart, null, 2)}\n` : `${formatChartCompact(chart)}\n`,
    );
    return 0;
  }

  const moment = transitMoment(values, birth.timezone);
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
 * L'istante del transito.
 *
 * Senza `--on` vale adesso, ora compresa: chi non indica un giorno vuole il
 * cielo di questo momento. Con un giorno ma senza `--at` decide il motore,
 * che ripiega su mezzogiorno e lo dichiara fra le avvertenze.
 */
function transitMoment(
  values: { on?: string | undefined; at?: string | undefined; 'transit-tz'?: string | undefined },
  birthTimezone: string,
): TransitMoment {
  const timezone = values['transit-tz'] ?? birthTimezone;

  if (!values.on) {
    const now = DateTime.now().setZone(timezone);
    return { date: now.toFormat('yyyy-MM-dd'), time: values.at ?? now.toFormat('HH:mm'), timezone };
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
