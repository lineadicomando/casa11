import {
  ChartError,
  computeNatalChart,
  formatChartCompact,
  type BirthData,
  type ChartOptions,
  type HouseSystem,
} from '@undicesimacasa/core';
import { GeoError, getLocation, searchLocations, type Location } from '@undicesimacasa/geo';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

function ok(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

/**
 * Un errore restituito come risultato, non sollevato.
 *
 * Un tool che lancia un'eccezione dice all'agente solo "è andata male"; un
 * tool che restituisce un messaggio con il rimedio gli permette di correggersi
 * da solo alla chiamata successiva. Da qui l'insistenza sul suggerire l'azione.
 */
function fail(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

const HOUSE_SYSTEMS = [
  'placidus',
  'koch',
  'segni-interi',
  'equale',
  'regiomontano',
  'campano',
  'porfirio',
  'topocentrico',
  'alcabizio',
] as const;

export interface ToolContext {
  /** Percorso del database delle località. Default: quello del pacchetto geo. */
  databasePath?: string;
  /** Percorso dei file di effemeridi. Default: quello del pacchetto core. */
  ephemerisPath?: string;
}

export function registerSearchLocation(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'search_location',
    {
      title: 'Cerca una località',
      description:
        'Cerca una località per nome e restituisce coordinate e fuso orario IANA. ' +
        'CHIAMA QUESTO TOOL PRIMA di compute_natal_chart ogni volta che hai un nome di città ' +
        'invece di coordinate già note: non inventare latitudine, longitudine o fuso orario. ' +
        'Molti nomi sono ambigui (esistono decine di "Roma" nel mondo): se la ricerca ' +
        'restituisce più candidati plausibili, chiedi conferma alla persona invece di ' +
        'scegliere il più popoloso. Passa poi location_id a compute_natal_chart.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe('Nome della località. Sono riconosciuti gli esonimi, es. "Monaco di Baviera".'),
        country_code: z
          .string()
          .length(2)
          .optional()
          .describe('Restringe la ricerca a un paese, codice ISO 3166-1 alpha-2, es. "IT".'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Numero massimo di candidati da restituire. Default 10.'),
      },
    },
    async (args) => {
      try {
        const options: Parameters<typeof searchLocations>[1] = {};
        if (context.databasePath) options.databasePath = context.databasePath;
        if (args.country_code) options.countryCode = args.country_code;
        if (args.limit !== undefined) options.limit = args.limit;

        const results = searchLocations(args.query, options);

        if (results.length === 0) {
          return ok(
            `Nessuna località trovata per "${args.query}".\n\n` +
              'Il dataset copre i centri abitati con più di 500 abitanti. Da provare: ' +
              'la grafia locale del nome, il nome del comune invece della frazione, ' +
              'oppure una città vicina più grande.',
          );
        }

        return ok(formatLocations(results, args.query));
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

export function registerComputeNatalChart(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'compute_natal_chart',
    {
      title: 'Calcola un tema natale',
      description:
        'Calcola le posizioni planetarie, le case, gli assi e gli aspetti di un tema natale. ' +
        'Restituisce solo dati astronomici verificabili: nessuna interpretazione. ' +
        'Indica il luogo con location_id (ottenuto da search_location) oppure con la terna ' +
        'latitude + longitude + timezone. Fornisci data e ora COME SONO SEGNATE sul documento ' +
        'di nascita, cioè in ora locale: la conversione a Tempo Universale la fa questo tool, ' +
        'applicando le regole storiche del fuso. Non convertire tu. ' +
        "Se l'ora di nascita è ignota, ometti il parametro time invece di indovinarne una: " +
        'il tema verrà calcolato senza case né assi, che è il risultato corretto in quel caso.',
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe('Data di nascita locale, formato YYYY-MM-DD.'),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .describe(
            "Ora di nascita locale, formato HH:mm. Ometti se ignota — non tirare a indovinare.",
          ),
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Identificatore GeoNames restituito da search_location. Alternativo alla terna di coordinate.'),
        latitude: z.number().min(-90).max(90).optional().describe('Latitudine, positiva a Nord.'),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe('Longitudine, positiva a Est.'),
        timezone: z
          .string()
          .optional()
          .describe('Fuso orario IANA, es. "Europe/Rome". Obbligatorio se non usi location_id.'),
        house_system: z
          .enum(HOUSE_SYSTEMS)
          .optional()
          .describe('Sistema di domificazione. Default: placidus.'),
        minor_aspects: z
          .boolean()
          .optional()
          .describe('Includi semisestile, quinconce, semiquadrato, sesquiquadrato. Default: false.'),
        format: z
          .enum(['compact', 'json'])
          .optional()
          .describe(
            'compact (default): tabella densa, circa un ottavo dei token. ' +
              'json: oggetto completo, da usare solo se devi elaborare i valori numerici.',
          ),
      },
    },
    async (args) => {
      try {
        const place = resolvePlace(args, context);
        if ('error' in place) return fail(place.error);

        const birth: BirthData = {
          date: args.date,
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone,
        };
        if (args.time !== undefined) birth.time = args.time;

        const options: ChartOptions = { minorAspects: args.minor_aspects ?? false };
        if (args.house_system) options.houseSystem = args.house_system as HouseSystem;
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;

        const chart = computeNatalChart(birth, options);

        if (args.format === 'json') {
          return ok(JSON.stringify(chart, null, 2));
        }

        const header = place.label ? `Luogo: ${place.label}\n` : '';
        return ok(header + formatChartCompact(chart));
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

interface ResolvedPlace {
  latitude: number;
  longitude: number;
  timezone: string;
  label?: string;
}

/**
 * Ricava il luogo da `location_id` oppure dalla terna esplicita.
 *
 * `location_id` è la via preferibile: evita che l'agente ricopi a mano tre
 * valori, che è il punto in cui si introducono errori silenziosi (una cifra
 * di longitudine sbagliata sposta l'Ascendente senza che nulla fallisca).
 */
function resolvePlace(
  args: {
    location_id?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    timezone?: string | undefined;
  },
  context: ToolContext,
): ResolvedPlace | { error: string } {
  if (args.location_id !== undefined) {
    const options = context.databasePath ? { databasePath: context.databasePath } : {};
    const location = getLocation(args.location_id, options);
    if (!location) {
      return {
        error:
          `Nessuna località con identificatore ${args.location_id}. ` +
          'Rieseguì search_location e usa un location_id fra quelli restituiti.',
      };
    }
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      label: describeLocation(location),
    };
  }

  const { latitude, longitude, timezone } = args;
  if (latitude === undefined || longitude === undefined || !timezone) {
    return {
      error:
        'Luogo di nascita non specificato. Indica location_id (ottenuto da search_location) ' +
        'oppure tutti e tre i valori latitude, longitude e timezone. ' +
        'Il fuso orario è indispensabile: senza non è possibile convertire ' +
        "l'ora locale in Tempo Universale.",
    };
  }

  return { latitude, longitude, timezone };
}

function formatLocations(results: Location[], query: string): string {
  const lines = [
    `${results.length} risultat${results.length === 1 ? 'o' : 'i'} per "${query}":`,
    '',
  ];

  for (const location of results) {
    lines.push(
      `location_id ${location.id} — ${describeLocation(location)}`,
      `  ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} | ` +
        `fuso ${location.timezone} | popolazione ${location.population.toLocaleString('it-IT')}`,
    );
  }

  if (results.length > 1) {
    lines.push(
      '',
      'Più candidati: se non è chiaro quale sia quello giusto, chiedi conferma ' +
        'invece di scegliere il primo.',
    );
  }

  return lines.join('\n');
}

function describeLocation(location: Location): string {
  return [location.name, location.region, location.country].filter(Boolean).join(', ');
}

function describeError(error: unknown): string {
  if (error instanceof ChartError || error instanceof GeoError) {
    return `${error.code}: ${error.message}`;
  }
  return `Errore inatteso: ${error instanceof Error ? error.message : String(error)}`;
}
