#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { computeNatalChart } from './chart.js';
import { ChartError } from './errors.js';
import { formatChartCompact } from './format.js';
import type { BirthData, ChartOptions, HouseSystem } from './types.js';

const USAGE = `
temanatale — calcolo del tema natale da riga di comando

  temanatale --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome

Opzioni
  --date <YYYY-MM-DD>   Data di nascita locale (obbligatoria)
  --time <HH:mm>        Ora di nascita locale. Se omessa, carta senza case
  --lat <gradi>         Latitudine, positiva a Nord (obbligatoria)
  --lon <gradi>         Longitudine, positiva a Est (obbligatoria)
  --tz <IANA>           Fuso orario, es. Europe/Rome (obbligatorio)
  --houses <sistema>    placidus (default), koch, segni-interi, equale,
                        regiomontano, campano, porfirio, topocentrico, alcabizio
  --minor               Includi anche gli aspetti minori
  --json                Stampa il JSON completo invece della tabella compatta
  --ephe <percorso>     Cartella dei file .se1
  --help                Mostra questo messaggio
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
      json: { type: 'boolean', default: false },
      ephe: { type: 'string' },
      help: { type: 'boolean', default: false },
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

  const chart = computeNatalChart(birth, options);
  process.stdout.write(
    values.json ? `${JSON.stringify(chart, null, 2)}\n` : `${formatChartCompact(chart)}\n`,
  );
  return 0;
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
