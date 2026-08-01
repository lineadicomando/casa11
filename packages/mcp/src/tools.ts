import {
  ChartError,
  computeNatalChart,
  computeSky,
  computeTransits,
  currentMoment,
  findTransitPassages,
  formatChartCompact,
  formatPassagesCompact,
  formatSkyCompact,
  formatTransitsCompact,
  type BirthData,
  type ChartOptions,
  type HouseSystem,
  type PassageOptions,
  type PassageRange,
  type Place,
  type SkyMoment,
  type SkyOptions,
  type TransitMoment,
  type TransitOptions,
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
        part_of_fortune_formula: z
          .enum(['settore', 'diurna'])
          .optional()
          .describe(
            'Formula della Parte di Fortuna. settore (default): si inverte nei temi notturni, ' +
              'secondo la tradizione. diurna: sempre ASC + Luna − Sole, da usare solo per ' +
              'riprodurre il risultato di un programma che ignora il settore.',
          ),
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
        if (args.part_of_fortune_formula) {
          options.partOfFortuneFormula = args.part_of_fortune_formula;
        }
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

export function registerComputeTransits(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'compute_transits',
    {
      title: 'Calcola i transiti su un tema natale',
      description:
        'Calcola dove sono i pianeti in un dato momento e che aspetti formano con un tema di ' +
        'nascita. Vuole i dati di nascita come compute_natal_chart, più il momento del transito. ' +
        'OMETTI transit_date per il cielo di adesso: la data corrente la mette il server, tu non ' +
        'la sai e non devi indovinarla. Le case indicate sono quelle NATALI, cioè il settore del ' +
        'tema in cui il transito cade: i transiti non hanno una domificazione propria. ' +
        'Le orbite sono molto più strette di quelle natali — due gradi contro otto — perché ' +
        'altrimenti un transito di Saturno risulterebbe attivo per mesi di fila. ' +
        'Un transito è una FASE, non un evento con una data: non trasformarlo in una previsione, ' +
        'non dire che cosa accadrà né quando, e non attribuirgli un esito.',
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
            "Ora di nascita locale, formato HH:mm. Ometti se ignota: i transiti resteranno " +
              'senza case natali e senza aspetti agli assi.',
          ),
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Identificatore GeoNames restituito da search_location. Alternativo alla terna di coordinate.'),
        latitude: z.number().min(-90).max(90).optional().describe('Latitudine, positiva a Nord.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitudine, positiva a Est.'),
        timezone: z
          .string()
          .optional()
          .describe('Fuso orario IANA della nascita. Obbligatorio se non usi location_id.'),
        transit_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            'Giorno del transito, formato YYYY-MM-DD. OMETTILO per adesso, invece di scrivere ' +
              'una data che credi corrente.',
          ),
        transit_time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .describe(
            "Ora del transito, formato HH:mm. Se la ometti vale mezzogiorno: nell'arco della " +
              'giornata solo la Luna si sposta sensibilmente.',
          ),
        transit_timezone: z
          .string()
          .optional()
          .describe(
            'Fuso IANA in cui leggere transit_date e transit_time. Default: quello di nascita. ' +
              'Le posizioni non cambiano, cambia solo come si nomina l\'istante.',
          ),
        house_system: z
          .enum(HOUSE_SYSTEMS)
          .optional()
          .describe('Sistema di domificazione del tema natale. Default: placidus.'),
        minor_aspects: z
          .boolean()
          .optional()
          .describe('Includi semisestile, quinconce, semiquadrato, sesquiquadrato. Default: false.'),
        format: z
          .enum(['compact', 'json'])
          .optional()
          .describe(
            'compact (default): tabella densa. json: tema e transiti completi, da usare solo ' +
              'se devi elaborare i valori numerici.',
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
        const moment = transitMoment(args, place.timezone);

        const transitOptions: TransitOptions = { minorAspects: args.minor_aspects ?? false };
        if (context.ephemerisPath) transitOptions.ephemerisPath = context.ephemerisPath;

        const transits = computeTransits(chart, moment, transitOptions);

        if (args.format === 'json') {
          return ok(JSON.stringify({ chart, transits }, null, 2));
        }

        const header = place.label ? `Luogo di nascita: ${place.label}\n` : '';
        return ok(header + formatTransitsCompact(chart, transits));
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

/**
 * L'istante del transito.
 *
 * Senza `transit_date` vale adesso, e la data la mette il server: è la sola
 * fonte che la sappia davvero. Con un giorno ma senza ora decide il motore,
 * che ripiega su mezzogiorno e lo dichiara fra le avvertenze.
 */
function transitMoment(
  args: {
    transit_date?: string | undefined;
    transit_time?: string | undefined;
    transit_timezone?: string | undefined;
  },
  birthTimezone: string,
): TransitMoment {
  const timezone = args.transit_timezone ?? birthTimezone;

  if (args.transit_date === undefined) {
    const now = currentMoment(timezone);
    return args.transit_time ? { ...now, time: args.transit_time } : now;
  }

  const moment: TransitMoment = { date: args.transit_date, timezone };
  if (args.transit_time !== undefined) moment.time = args.transit_time;
  return moment;
}

export function registerComputeSky(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'compute_sky',
    {
      title: 'Calcola il cielo di un istante',
      description:
        'Calcola dove sono i pianeti in un dato momento e che aspetti formano fra loro, ' +
        'senza riferirli a nessuna nascita. USA QUESTO TOOL quando non c\'è un tema natale: ' +
        '"dov\'è la Luna adesso", "in che segno è Marte", "quando è il prossimo plenilunio". ' +
        'Se invece una data di nascita c\'è, e la domanda è che cosa il cielo tocchi di quella ' +
        'persona, il tool giusto è compute_transits: senza un tema non esistono transiti, ' +
        'esiste solo il cielo. Non chiamare questo tool inventando una nascita. ' +
        'OMETTI date per adesso: la data corrente la mette il server, tu non la sai. ' +
        'Il luogo è FACOLTATIVO perché le posizioni nello zodiaco sono le stesse ovunque ' +
        'sulla Terra: indicalo solo se ti servono Ascendente e case, e non inventarlo mai. ' +
        "Restano dati astronomici: l'interpretazione, se richiesta, spetta a te.",
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Giorno, formato YYYY-MM-DD. OMETTILO per adesso, invece di scrivere una data che credi corrente.'),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .describe(
            "Ora, formato HH:mm. Se la ometti vale mezzogiorno: nell'arco della giornata " +
              'solo la Luna si sposta sensibilmente, ma assi e case non verranno calcolati.',
          ),
        timezone: z
          .string()
          .optional()
          .describe(
            'Fuso IANA in cui leggere e scrivere l\'istante. Default: quello della località ' +
              'se ne indichi una, altrimenti UTC. Non cambia il cielo, solo come lo si data.',
          ),
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Luogo da cui si guarda, da search_location. Facoltativo: serve solo ad assi e case.'),
        latitude: z.number().min(-90).max(90).optional().describe('Latitudine, positiva a Nord. Va insieme a longitude.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitudine, positiva a Est. Va insieme a latitude.'),
        house_system: z
          .enum(HOUSE_SYSTEMS)
          .optional()
          .describe('Sistema di domificazione. Default: placidus. Ha effetto solo con un luogo.'),
        minor_aspects: z
          .boolean()
          .optional()
          .describe('Includi semisestile, quinconce, semiquadrato, sesquiquadrato. Default: false.'),
        format: z
          .enum(['compact', 'json'])
          .optional()
          .describe('compact (default): tabella densa. json: oggetto completo.'),
      },
    },
    async (args) => {
      try {
        const observation = resolveObservation(args, context);
        if ('error' in observation) return fail(observation.error);

        const timezone = args.timezone ?? observation.timezone ?? 'UTC';
        const moment = skyMoment(args, timezone);

        const options: SkyOptions = { minorAspects: args.minor_aspects ?? false };
        if (args.house_system) options.houseSystem = args.house_system as HouseSystem;
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;
        if (observation.place) options.place = observation.place;

        const sky = computeSky(moment, options);

        if (args.format === 'json') {
          return ok(JSON.stringify(sky, null, 2));
        }

        const header = observation.label ? `Luogo: ${observation.label}\n` : '';
        return ok(header + formatSkyCompact(sky));
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

/**
 * L'istante del cielo.
 *
 * Senza `date` vale adesso, e la data la mette il server: è la sola fonte che
 * la sappia davvero.
 */
function skyMoment(
  args: { date?: string | undefined; time?: string | undefined },
  timezone: string,
): SkyMoment {
  if (args.date === undefined) {
    const now = currentMoment(timezone);
    return args.time ? { ...now, time: args.time } : now;
  }

  const moment: SkyMoment = { date: args.date, timezone };
  if (args.time !== undefined) moment.time = args.time;
  return moment;
}

/**
 * Il punto di osservazione, che può non esserci.
 *
 * A differenza della nascita, qui il luogo non è un requisito ma un'aggiunta:
 * senza, il cielo è comunque completo. Mezzo luogo invece è un errore, perché
 * una coordinata sola metterebbe l'osservatore su un meridiano arbitrario.
 */
function resolveObservation(
  args: {
    location_id?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
  },
  context: ToolContext,
): { place?: Place; timezone?: string; label?: string } | { error: string } {
  if (args.location_id !== undefined) {
    const place = resolvePlace({ location_id: args.location_id }, context);
    if ('error' in place) return place;

    const resolved: { place: Place; timezone: string; label?: string } = {
      place: { latitude: place.latitude, longitude: place.longitude },
      timezone: place.timezone,
    };
    if (place.label) resolved.label = place.label;
    return resolved;
  }

  const { latitude, longitude } = args;
  if (latitude === undefined && longitude === undefined) return {};

  if (latitude === undefined || longitude === undefined) {
    return {
      error:
        'Luogo incompleto: latitude e longitude vanno indicate insieme. ' +
        'Se il luogo non ti serve, omettile entrambe: il cielo si calcola lo stesso, ' +
        'senza Ascendente e senza case.',
    };
  }

  return { place: { latitude, longitude } };
}

/** Tre anni: oltre, la ricerca costa più di quanto valga il risultato. */
const MAX_RANGE_DAYS = 1096;

export function registerFindTransitPassages(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'find_transit_passages',
    {
      title: 'Trova quando i transiti diventano esatti',
      description:
        "Elenca gli istanti in cui i transiti si perfezionano nell'arco di tempo indicato. " +
        'È la risposta a QUANDO e a QUANTE VOLTE, che compute_transits non può dare: quello ' +
        'fotografa un momento, questo guarda un periodo. Un pianeta lento che passa in ' +
        'retrogradazione tocca lo stesso punto natale tre volte — avanti, indietro, avanti — ' +
        'e quelle tre righe sono UN SOLO periodo letto in tre momenti, non tre fatti distinti: ' +
        'dillo, invece di elencarle come eventi separati. ' +
        'OMETTI from per partire da oggi: la data corrente la mette il server. ' +
        'La Luna è esclusa perché da sola perfeziona qualche migliaio di aspetti all\'anno. ' +
        "Restano dati astronomici: l'istante in cui un angolo si chiude, non un evento che " +
        'accadrà. Non trasformare una data in una previsione e non dire che cosa succederà.',
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe('Data di nascita locale, formato YYYY-MM-DD.'),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .describe("Ora di nascita locale. Ometti se ignota: niente case natali né assi."),
        location_id: z.number().int().optional().describe('Identificatore GeoNames da search_location.'),
        latitude: z.number().min(-90).max(90).optional().describe('Latitudine, positiva a Nord.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitudine, positiva a Est.'),
        timezone: z.string().optional().describe('Fuso IANA della nascita, se non usi location_id.'),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Primo giorno dell\'arco. OMETTILO per partire da oggi.'),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(`Ultimo giorno. Default: un anno dopo l'inizio. Massimo ${MAX_RANGE_DAYS} giorni.`),
        timezone_range: z
          .string()
          .optional()
          .describe('Fuso in cui leggere le date e gli istanti restituiti. Default: quello di nascita.'),
        bodies: z
          .array(z.string())
          .optional()
          .describe(
            'Corpi in transito da seguire, es. ["saturno", "plutone"]. Default: tutti tranne la Luna. ' +
              'Restringere a uno o due rende l\'elenco leggibile quando l\'arco è lungo.',
          ),
        targets: z
          .array(z.string())
          .optional()
          .describe('Punti natali da bersagliare, es. ["sole", "ascendente"]. Default: corpi, ASC e MC.'),
        minor_aspects: z.boolean().optional().describe('Includi anche gli aspetti minori. Default: false.'),
        format: z.enum(['compact', 'json']).optional().describe('compact (default) oppure json.'),
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
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;
        const chart = computeNatalChart(birth, options);

        const range = passageRange(args, place.timezone);
        const durata = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000;
        if (durata > MAX_RANGE_DAYS) {
          return fail(
            `Arco di ${Math.round(durata)} giorni: il massimo è ${MAX_RANGE_DAYS}, cioè tre anni. ` +
              'Chiedi periodi più brevi, uno dopo l\'altro, oppure restringi bodies ai soli pianeti che ti servono.',
          );
        }

        const passageOptions: PassageOptions = { minorAspects: args.minor_aspects ?? false };
        if (context.ephemerisPath) passageOptions.ephemerisPath = context.ephemerisPath;
        if (args.bodies) passageOptions.bodies = args.bodies as PassageOptions['bodies'];
        if (args.targets) passageOptions.targets = args.targets as PassageOptions['targets'];

        const { passages, warnings } = findTransitPassages(chart, range, passageOptions);

        if (args.format === 'json') {
          return ok(JSON.stringify({ range, passages, warnings }, null, 2));
        }

        const header = place.label ? `Luogo di nascita: ${place.label}\n` : '';
        return ok(header + formatPassagesCompact(chart, passages, range, warnings));
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

/**
 * L'arco su cui cercare.
 *
 * Senza `from` si parte da oggi, e la data la mette il server: è la sola
 * fonte che la sappia. Senza `to` si arriva a un anno dopo, che è il tempo in
 * cui un pianeta lento completa l'andirivieni su uno stesso punto.
 */
function passageRange(
  args: { from?: string | undefined; to?: string | undefined; timezone_range?: string | undefined },
  birthTimezone: string,
): PassageRange {
  const timezone = args.timezone_range ?? birthTimezone;
  const from = args.from ?? currentMoment(timezone).date;
  const to = args.to ?? addYear(from);
  return { from, to, timezone };
}

function addYear(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
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

/**
 * Compone l'etichetta di una località.
 *
 * Nelle città-stato regione e città coincidono ("Berlino, Berlino, Germania"):
 * la ripetizione non aggiunge nulla e si omette.
 */
function describeLocation(location: Location): string {
  const parts = [location.name];
  if (location.region && location.region !== location.name) parts.push(location.region);
  parts.push(location.country);
  return parts.join(', ');
}

function describeError(error: unknown): string {
  if (error instanceof ChartError || error instanceof GeoError) {
    return `${error.code}: ${error.message}`;
  }
  return `Errore inatteso: ${error instanceof Error ? error.message : String(error)}`;
}
