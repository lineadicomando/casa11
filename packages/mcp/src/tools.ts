import {
  ChartError,
  computeNatalChart,
  computeSky,
  computeTransits,
  currentMoment,
  findElectionHours,
  findSignIngresses,
  findSkyPassages,
  findStations,
  findTransitPassages,
  formatChartCompact,
  formatElectionCompact,
  formatPassagesCompact,
  formatSkyCompact,
  formatSkyEventsCompact,
  formatSkyPassagesCompact,
  formatTransitsCompact,
  type BirthData,
  computeJyotisha,
  computeVarga,
  formatJyotishaCompact,
  type AyanamsaId,
  type ChartOptions,
  type JyotishaOptions,
  type VargaId,
  type VimshottariOptions,
  type ZodiacOptions,
  type ElectionOptions,
  type HouseSystem,
  type PassageOptions,
  type PassageRange,
  type Place,
  type SkyEventOptions,
  type SkyMoment,
  type SkyOptions,
  type SkyPassageOptions,
  type TransitMoment,
  type TransitOptions,
} from '@dodicisegni/core';
import { GeoError, getLocation, searchLocations, type Location } from '@dodicisegni/geo';
import {
  paletteDi,
  type OpzioniDisegno,
  type StileQuadro,
  type WheelChart,
} from '@dodicisegni/ruota';
import { quadroPng, ruotaPng } from '@dodicisegni/ruota/png';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

function ok(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

/**
 * Il disegno come immagine, accompagnato da una riga di testo.
 *
 * PNG e non SVG: un modello non *vede* un SVG, lo legge come testo, e una
 * ruota serializzata sono ventimila caratteri di coordinate che non
 * assomigliano a niente. Il raster invece si guarda.
 *
 * La riga di testo che l'accompagna non è cortesia: dice su quali dati il
 * disegno è stato fatto, e serve a impedire che un'immagine venga presentata
 * per il tema di qualcun altro.
 */
function immagine(png: Buffer, didascalia: string): CallToolResult {
  return {
    content: [
      { type: 'text', text: didascalia },
      { type: 'image', data: png.toString('base64'), mimeType: 'image/png' },
    ],
  };
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

const AYANAMSAS = [
  'lahiri',
  'true-chitra',
  'krishnamurti',
  'raman',
  'yukteshwar',
  'fagan-bradley',
] as const;

/**
 * I due parametri dello zodiaco, uguali per ogni tool che riporti un segno.
 *
 * Una definizione sola e non quattro copie: le descrizioni dei tool sono la
 * documentazione del progetto, e quattro copie divergono alla prima modifica.
 */
const ZODIAC_SCHEMA = {
  zodiac: z
    .enum(['tropicale', 'siderale'])
    .optional()
    .describe(
      'Zodiaco in cui esprimere le longitudini. Default: tropicale, che è quello ' +
        "dell'astrologia occidentale. siderale è quello ancorato alle stelle fisse, " +
        "usato dall'astrologia indiana: fra i due corrono oltre ventiquattro gradi, " +
        'cioè quasi un segno intero. Non sceglierlo tu: è una convenzione di scuola, ' +
        'e va usata solo se chi scrive la chiede.',
    ),
  ayanamsa: z
    .enum(AYANAMSAS)
    .optional()
    .describe(
      "Convenzione siderale, cioè dove si fissa l'inizio dell'Ariete. Richiede " +
        'zodiac=siderale. Default: lahiri, ufficiale in India e la più diffusa.',
    ),
} as const;

const VARGA_IDS = ['d1', 'd3', 'd9', 'd10', 'd12', 'd30'] as const;

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

/**
 * Lo zodiaco chiesto, tradotto in opzioni del motore.
 *
 * Rifiuta l'ayanamsa senza il siderale invece di ignorarlo: accettarlo in
 * silenzio restituirebbe un tema in cui la convenzione chiesta non compare da
 * nessuna parte, e l'agente non avrebbe modo di accorgersene.
 */
function zodiacOptions(args: {
  zodiac?: string | undefined;
  ayanamsa?: string | undefined;
}): ZodiacOptions | { error: string } {
  if (args.ayanamsa && args.zodiac !== 'siderale') {
    return { error: 'Il parametro ayanamsa richiede zodiac=siderale.' };
  }
  const options: ZodiacOptions = {};
  if (args.zodiac) options.zodiac = args.zodiac as ZodiacOptions['zodiac'];
  if (args.ayanamsa) options.ayanamsa = args.ayanamsa as ZodiacOptions['ayanamsa'];
  return options;
}

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
            "Ora di nascita locale, formato HH:mm. Ometti se ignota: non tirare a indovinare.",
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
        ...ZODIAC_SCHEMA,
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

        const zodiaco = zodiacOptions(args);
        if ('error' in zodiaco) return fail(zodiaco.error);

        const options: ChartOptions = { minorAspects: args.minor_aspects ?? false, ...zodiaco };
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

export function registerComputeJyotishaChart(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'compute_jyotisha_chart',
    {
      title: 'Calcola un tema vedico',
      description:
        "Calcola un tema secondo l'astrologia indiana (Jyotisha): zodiaco siderale, case a " +
        'segni interi dal lagna, e in più i nakshatra dei graha, la catena delle dasha ' +
        'vimshottari, le carte divisionali e le drishti. ' +
        "NON è compute_natal_chart con un'opzione: i gradi sono contati dalle stelle fisse " +
        'invece che dal punto vernale, e fra i due zodiaci corrono oltre ventiquattro gradi, ' +
        'cioè quasi un segno. Chi qui ha il Sole in Acquario in occidente ce l\'ha in Pesci, e ' +
        'non è un errore. ' +
        'Usalo solo se chi scrive chiede astrologia vedica, indiana o Jyotisha: per il tema ' +
        'occidentale c\'è compute_natal_chart. ' +
        'Restituisce solo dati verificabili: nessuna interpretazione. Le dasha portano delle ' +
        'DATE, e sono aritmetica: dicono quando comincia un periodo, non che cosa accadrà ' +
        'dentro: non usarle per predire. ' +
        'Fornisci data e ora COME SONO SEGNATE sul documento di nascita, in ora locale. ' +
        "Se l'ora è ignota ometti time: le dasha diventano indicative di anni, non di giorni, " +
        'e il tool lo dichiara fra le avvertenze.',
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
            "Ora di nascita locale, formato HH:mm. Ometti se ignota, e non tirare a indovinare: " +
              'qui un\'ora sbagliata sposta le dasha di anni.',
          ),
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Identificatore GeoNames restituito da search_location.'),
        latitude: z.number().min(-90).max(90).optional().describe('Latitudine, positiva a Nord.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitudine, positiva a Est.'),
        timezone: z
          .string()
          .optional()
          .describe('Fuso orario IANA, es. "Asia/Kolkata". Obbligatorio se non usi location_id.'),
        ayanamsa: z
          .enum(AYANAMSAS)
          .optional()
          .describe(
            "La convenzione siderale, cioè dove si fissa l'inizio dell'Ariete. Default: " +
              'lahiri, ufficiale in India e la più diffusa. Fra lahiri e raman corre più di un ' +
              'grado e mezzo, abbastanza da spostare il nakshatra della Luna e con esso tutte ' +
              'le dasha: non cambiarlo se non te lo chiedono.',
          ),
        dasha_levels: z
          .number()
          .int()
          .min(1)
          .max(3)
          .optional()
          .describe(
            'Ordini di periodo nella catena. 1 sono nove mahadasha, 2 (default) sono ' +
              'ottantuno, 3 sono settecentoventinove: chiedi il terzo solo se ti serve davvero.',
          ),
        dasha_year: z
          .enum(['solare', 'savana'])
          .optional()
          .describe(
            "Quanti giorni valga un anno di dasha: solare (default, 365,25) è la convenzione " +
              'dei panchanga moderni, savana (360) quella tradizionale. Su ottant\'anni di ' +
              'catena la differenza supera l\'anno.',
          ),
        vargas: z
          .array(z.enum(VARGA_IDS))
          .optional()
          .describe(
            'Carte divisionali. Default: il solo d9 (navamsa), che è quella che si legge ' +
              'sempre accanto al tema. Le altre riguardano un\'area ciascuna.',
          ),
        drishti_nodes: z
          .enum(['nessuna', 'gioviana'])
          .optional()
          .describe(
            'Se Rahu e Ketu gettino sguardi. nessuna (default) è la forma classica; gioviana ' +
              'dà loro la quinta, la settima e la nona. Le scuole divergono.',
          ),
        format: z
          .enum(['compact', 'json'])
          .optional()
          .describe('compact (default): tabelle dense. json: oggetto completo.'),
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

        // Siderale e a segni interi non sono predefiniti che si possono
        // cambiare: sono ciò che rende vedico questo tema. Chi vuole altro
        // usa compute_natal_chart, che le opzioni ce le ha.
        const chartOptions: ChartOptions = { zodiac: 'siderale', houseSystem: 'segni-interi' };
        if (args.ayanamsa) chartOptions.ayanamsa = args.ayanamsa as AyanamsaId;
        if (context.ephemerisPath) chartOptions.ephemerisPath = context.ephemerisPath;

        const options: JyotishaOptions = {};
        const dasha: VimshottariOptions = {};
        if (args.dasha_levels) dasha.levels = args.dasha_levels as 1 | 2 | 3;
        if (args.dasha_year) dasha.yearLength = args.dasha_year;
        if (Object.keys(dasha).length > 0) options.dasha = dasha;
        if (args.vargas) options.vargas = args.vargas as VargaId[];
        if (args.drishti_nodes) options.drishti = { nodes: args.drishti_nodes };

        const jyotisha = computeJyotisha(computeNatalChart(birth, chartOptions), options);

        if (args.format === 'json') return ok(JSON.stringify(jyotisha, null, 2));

        const header = place.label ? `Luogo: ${place.label}\n` : '';
        return ok(header + formatJyotishaCompact(jyotisha));
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
        'tema in cui il transito cade. Se indichi anche un luogo del transito se ne aggiungono le ' +
        "case DELL'ISTANTE, che sono un'altra cosa: dicono dove i corpi stanno rispetto " +
        "all'orizzonte di quel posto, non in quale settore della vita passano. Non confonderle e " +
        'non sostituire le prime con le seconde. ' +
        'Le orbite sono molto più strette di quelle natali (due gradi contro otto) perché ' +
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
            'Fuso IANA in cui leggere transit_date e transit_time. Default: quello del luogo del ' +
              'transito se ne indichi uno, altrimenti quello di nascita. ' +
              'Le posizioni non cambiano, cambia solo come si nomina l\'istante.',
          ),
        transit_location_id: z
          .number()
          .int()
          .optional()
          .describe(
            'Luogo da cui si guarda il transito, da search_location. FACOLTATIVO: senza, i ' +
              'transiti sono completi lo stesso. Non è il luogo di nascita e non va riempito con ' +
              'quello. Indicalo solo se chi chiede dice da dove sta guardando.',
          ),
        transit_latitude: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe('Alternativa a transit_location_id. Va insieme a transit_longitude.'),
        transit_longitude: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe('Alternativa a transit_location_id. Va insieme a transit_latitude.'),
        ...ZODIAC_SCHEMA,
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

        const zodiaco = zodiacOptions(args);
        if ('error' in zodiaco) return fail(zodiaco.error);

        const options: ChartOptions = { minorAspects: args.minor_aspects ?? false, ...zodiaco };
        if (args.house_system) options.houseSystem = args.house_system as HouseSystem;
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;

        const chart = computeNatalChart(birth, options);

        // Il luogo del transito viaggia con i propri nomi: negli stessi
        // parametri della nascita, uno dei due andrebbe perso.
        const daDove = resolveObservation(
          {
            location_id: args.transit_location_id,
            latitude: args.transit_latitude,
            longitude: args.transit_longitude,
          },
          context,
          "i transiti si calcolano lo stesso, senza assi né case dell'istante",
          'transit_',
        );
        if ('error' in daDove) return fail(daDove.error);

        // Chi nomina una città per il transito intende l'ora di lì.
        const moment = transitMoment(args, daDove.timezone ?? place.timezone);

        const transitOptions: TransitOptions = { minorAspects: args.minor_aspects ?? false };
        if (args.house_system) transitOptions.houseSystem = args.house_system as HouseSystem;
        if (context.ephemerisPath) transitOptions.ephemerisPath = context.ephemerisPath;
        if (daDove.place) transitOptions.place = daDove.place;

        const transits = computeTransits(chart, moment, transitOptions);

        if (args.format === 'json') {
          return ok(JSON.stringify({ chart, transits }, null, 2));
        }

        const header =
          (place.label ? `Luogo di nascita: ${place.label}\n` : '') +
          (daDove.label ? `Luogo del transito: ${daDove.label}\n` : '');
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
        ...ZODIAC_SCHEMA,
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

        const zodiaco = zodiacOptions(args);
        if ('error' in zodiaco) return fail(zodiaco.error);

        const options: SkyOptions = { minorAspects: args.minor_aspects ?? false, ...zodiaco };
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
 * senza, il risultato è comunque completo. Mezzo luogo invece è un errore,
 * perché una coordinata sola metterebbe l'osservatore su un meridiano
 * arbitrario.
 *
 * `senzaLuogo` è ciò che si perde omettendolo, e cambia con lo strumento: il
 * cielo resterebbe senza Ascendente, i transiti senza gli assi dell'istante.
 * Dirlo per esteso è il modo di far scegliere un agente invece di fargli
 * indovinare un luogo pur di riprovare. `prefisso` serve allo stesso scopo:
 * nei transiti i parametri si chiamano `transit_latitude` e
 * `transit_longitude`, e un errore che nominasse gli altri manderebbe a
 * correggere il campo sbagliato.
 */
function resolveObservation(
  args: {
    location_id?: number | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
  },
  context: ToolContext,
  senzaLuogo = 'il cielo si calcola lo stesso, senza Ascendente e senza case',
  prefisso = '',
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
        `Luogo incompleto: ${prefisso}latitude e ${prefisso}longitude vanno indicate insieme. ` +
        `Se il luogo non ti serve, omettile entrambe: ${senzaLuogo}.`,
    };
  }

  return { place: { latitude, longitude } };
}

/** Tre anni: oltre, la ricerca costa più di quanto valga il risultato. */
const MAX_RANGE_DAYS = 1096;

const SKY_EVENT_KINDS = ['incontri', 'ingressi', 'stazioni'] as const;

export function registerFindSkyEvents(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'find_sky_events',
    {
      title: 'Trova che cosa succede in cielo',
      description:
        "Elenca che cosa accade in cielo nell'arco di tempo indicato, senza riferirlo a " +
        'nessuna nascita: gli INCONTRI fra due corpi (compresi noviluni e pleniluni, che ' +
        'sono la congiunzione e l\'opposizione fra Sole e Luna), gli INGRESSI nei segni e le ' +
        'STAZIONI, cioè quando un pianeta si ferma e inverte il moto. ' +
        'Sta a find_transit_passages come compute_sky sta a compute_transits: qui non c\'è ' +
        'nessuno a cui riferire gli eventi. Se hai i dati di nascita e la domanda riguarda ' +
        'quella persona, il tool giusto è find_transit_passages. ' +
        'OMETTI from per partire da oggi: la data corrente la mette il server. ' +
        'La Luna è esclusa per impostazione predefinita perché cambia segno ogni due giorni ' +
        'e mezzo: chiedila per nome in bodies se ti servono le lunazioni. ' +
        'Un ingresso non è sempre un progresso: un pianeta che retrograda rientra nel segno ' +
        'da cui era uscito, e i tre attraversamenti sono un passaggio solo. ' +
        "Restano istanti astronomici, non eventi che accadranno a qualcuno.",
      inputSchema: {
        ...ZODIAC_SCHEMA,
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Primo giorno dell'arco. OMETTILO per partire da oggi."),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(`Ultimo giorno. Default: un anno dopo l'inizio. Massimo ${MAX_RANGE_DAYS} giorni.`),
        timezone: z
          .string()
          .optional()
          .describe('Fuso IANA in cui leggere le date e gli istanti restituiti. Default: UTC.'),
        include: z
          .array(z.enum(SKY_EVENT_KINDS))
          .optional()
          .describe(
            'Che cosa elencare. Default: tutto. Restringere accorcia la risposta quando ' +
              'la domanda riguarda una cosa sola, es. ["ingressi"].',
          ),
        bodies: z
          .array(z.string())
          .optional()
          .describe(
            'Corpi da seguire, es. ["saturno", "nettuno"] oppure ["sole", "luna"] per le ' +
              'lunazioni. Default: tutti tranne la Luna. Restringere rende leggibile un arco lungo.',
          ),
        minor_aspects: z
          .boolean()
          .optional()
          .describe('Includi anche gli aspetti minori fra gli incontri. Default: false.'),
        format: z.enum(['compact', 'json']).optional().describe('compact (default) oppure json.'),
      },
    },
    async (args) => {
      try {
        const timezone = args.timezone ?? 'UTC';
        const range = passageRange({ ...args, timezone_range: timezone }, timezone);

        const durata =
          (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000;
        if (durata > MAX_RANGE_DAYS) {
          return fail(
            `Arco di ${Math.round(durata)} giorni: il massimo è ${MAX_RANGE_DAYS}, cioè tre anni. ` +
              "Chiedi periodi più brevi, uno dopo l'altro, oppure restringi bodies.",
          );
        }

        const kinds = new Set<string>(args.include ?? SKY_EVENT_KINDS);

        const passageOptions: SkyPassageOptions = { minorAspects: args.minor_aspects ?? false };
        const zodiaco = zodiacOptions(args);
        if ('error' in zodiaco) return fail(zodiaco.error);

        // Solo gli eventi lo prendono: un incontro fra due corpi è una
        // differenza fra longitudini dello stesso istante, e l'ayanamsa le
        // sposta entrambe. Un ingresso invece è un confine, e i confini si
        // spostano di tutto l'ayanamsa.
        const eventOptions: SkyEventOptions = { ...zodiaco };
        if (context.ephemerisPath) {
          passageOptions.ephemerisPath = context.ephemerisPath;
          eventOptions.ephemerisPath = context.ephemerisPath;
        }
        if (args.bodies) {
          passageOptions.bodies = args.bodies as SkyPassageOptions['bodies'];
          eventOptions.bodies = args.bodies as SkyEventOptions['bodies'];
        }

        const incontri = kinds.has('incontri')
          ? findSkyPassages(range, passageOptions)
          : { passages: [], warnings: [] };
        const ingressi = kinds.has('ingressi')
          ? findSignIngresses(range, eventOptions)
          : { ingresses: [], warnings: [] };
        const stazioni = kinds.has('stazioni')
          ? findStations(range, eventOptions)
          : { stations: [], warnings: [] };

        // Le tre ricerche attraversano gli stessi corpi: le avvertenze
        // uscirebbero identiche, e ripeterle non aggiunge niente.
        const warnings = [
          ...new Set([...incontri.warnings, ...ingressi.warnings, ...stazioni.warnings]),
        ];

        if (args.format === 'json') {
          return ok(
            JSON.stringify(
              {
                range,
                passages: incontri.passages,
                ingresses: ingressi.ingresses,
                stations: stazioni.stations,
                warnings,
              },
              null,
              2,
            ),
          );
        }

        const parti: string[] = [];
        if (kinds.has('incontri')) {
          parti.push(formatSkyPassagesCompact(incontri.passages, range, warnings));
        }
        if (kinds.has('ingressi') || kinds.has('stazioni')) {
          parti.push(
            formatSkyEventsCompact(
              ingressi.ingresses,
              stazioni.stations,
              range,
              kinds.has('incontri') ? [] : warnings,
            ),
          );
        }

        return ok(parti.join('\n\n'));
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

/** Un mese: ogni giorno porta ventiquattro ore planetarie. */
const MAX_ELECTION_RANGE_DAYS = 31;

export function registerFindElectionHours(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'find_election_hours',
    {
      title: 'Trova le ore planetarie e i vuoti di corso di un luogo',
      description:
        "Restituisce di che cosa è fatto il tempo in un luogo: le ORE PLANETARIE con il " +
        "pianeta che le regge, l'ASCENDENTE che sorge all'inizio di ciascuna, e i tratti in " +
        'cui la LUNA È VUOTA DI CORSO, cioè non perfeziona più alcun aspetto maggiore prima ' +
        'di cambiare segno. È il materiale dell\'elezione, la tecnica che sceglie QUANDO ' +
        'cominciare qualcosa: non riguarda nessuna nascita e non va confuso con i transiti. ' +
        'Il luogo è OBBLIGATORIO e senza alternative: alba e tramonto vengono da lì, e senza ' +
        'di loro non ci sono ore planetarie. Non inventarlo, chiedilo o cercalo con ' +
        'search_location. ' +
        'OMETTI from per partire da oggi: la data corrente la mette il server. ' +
        "Un'ora planetaria dura sessanta minuti soltanto agli equinozi: d'estate quelle " +
        'diurne si allungano e le notturne si accorciano. Il giorno planetario comincia ' +
        "all'alba, non a mezzanotte. " +
        'Il risultato NON contiene raccomandazioni e non è una classifica: dice quale pianeta ' +
        'regge un\'ora, non se quell\'ora sia buona per qualcosa. Se ti viene chiesto quando ' +
        "giocare, scommettere o comprare un biglietto della lotteria, queste ore non lo " +
        "dicono: l'esito di un sorteggio non dipende dal momento in cui lo si compra. " +
        'Su archi lunghi restringi con rulers: un mese intero sono più di settecento ore.',
      inputSchema: {
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Identificatore GeoNames da search_location. La via preferibile.'),
        latitude: z.number().min(-90).max(90).optional().describe('Alternativa a location_id.'),
        longitude: z.number().min(-180).max(180).optional().describe('Alternativa a location_id.'),
        timezone: z
          .string()
          .optional()
          .describe('Fuso IANA del luogo. Obbligatorio se non usi location_id.'),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Primo giorno dell'arco. OMETTILO per partire da oggi."),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            `Ultimo giorno. Default: lo stesso di from, cioè un giorno solo. ` +
              `Massimo ${MAX_ELECTION_RANGE_DAYS} giorni.`,
          ),
        bodies: z
          .array(z.string())
          .optional()
          .describe(
            'Corpi il cui incontro toglie la Luna dal vuoto di corso. Default: i sei ' +
              'classici (Sole, Mercurio, Venere, Marte, Giove, Saturno), che è la regola ' +
              'nella forma in cui è nata. Aggiungere i pianeti moderni è una dottrina diversa.',
          ),
        rulers: z
          .array(z.string())
          .optional()
          .describe(
            'Restringe l\'elenco alle ore rette da questi pianeti, es. ["giove", "venere"]. ' +
              'USALO quando l\'arco supera i due o tre giorni: un mese intero sono più di ' +
              'settecento ore, che non sono un calendario ma un muro di righe.',
          ),
        skip_moon_void: z
          .boolean()
          .optional()
          .describe(
            'Scarta le ore che un vuoto di corso attraversa. I vuoti restano elencati, ' +
              'perché sono la ragione per cui quelle ore mancano. È una scelta di chi ' +
              'chiede, non un consiglio del server.',
          ),
        format: z.enum(['compact', 'json']).optional().describe('compact (default) oppure json.'),
      },
    },
    async (args) => {
      try {
        const place = resolvePlace(args, context);
        if ('error' in place) return fail(place.error);

        const from = args.from ?? currentMoment(place.timezone).date;
        const range: PassageRange = { from, to: args.to ?? from, timezone: place.timezone };

        const durata =
          (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000;
        if (durata > MAX_ELECTION_RANGE_DAYS) {
          return fail(
            `Arco di ${Math.round(durata)} giorni: il massimo è ${MAX_ELECTION_RANGE_DAYS}, ` +
              'perché ogni giorno porta ventiquattro ore planetarie. Chiedi periodi più brevi.',
          );
        }

        const options: ElectionOptions = {};
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;
        if (args.bodies) options.bodies = args.bodies as ElectionOptions['bodies'];
        if (args.rulers) options.rulers = args.rulers as ElectionOptions['rulers'];
        if (args.skip_moon_void) options.skipMoonVoid = true;

        const election = findElectionHours(
          range,
          { latitude: place.latitude, longitude: place.longitude },
          options,
        );

        if (args.format === 'json') {
          return ok(JSON.stringify(election, null, 2));
        }

        const intestazione = place.label ? `Luogo: ${place.label}\n` : '';
        return ok(`${intestazione}${formatElectionCompact(election)}`);
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

/**
 * Larghezza predefinita del disegno, in punti.
 *
 * Non la più grande possibile: un'immagine viaggia verso il modello come
 * token, e raddoppiare il lato ne quadruplica il costo senza aggiungere nulla
 * a un disegno di linee e glifi. A 900 punti la ruota resta leggibile —
 * pianeti, gradi e numeri delle case — e costa poco.
 */
const LARGHEZZA_MCP = 900;

export function registerDrawChartWheel(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'draw_chart_wheel',
    {
      title: 'Disegna la ruota di un tema natale',
      description:
        'Restituisce il tema come IMMAGINE: la ruota con i segni, le case, i corpi e le linee ' +
        'degli aspetti. Serve a mostrare la carta a chi la sta leggendo, non a calcolarla: i ' +
        'numeri stanno in compute_natal_chart, e un disegno non contiene le avvertenze del ' +
        'calcolo. Chiama prima quello: presentare una ruota senza aver letto i dati significa ' +
        'mostrare una carta di cui non sai se un corpo non è stato calcolato o se l\'ora era ' +
        'ambigua. ' +
        'Prende gli stessi parametri di nascita di compute_natal_chart, con le stesse regole: ' +
        "il luogo da search_location, l'ora come è segnata sul documento, e se è ignota si " +
        'omette, e la ruota uscirà senza case né assi, che è il disegno corretto in quel caso. ' +
        'Con with_transits diventa una bi-ruota: il tema al centro e i corpi in transito ' +
        "nell'anello esterno.",
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
            "Ora di nascita locale, formato HH:mm. Ometti se ignota, e non tirare a indovinare: " +
              'la ruota verrà disegnata senza case né assi.',
          ),
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Identificatore GeoNames restituito da search_location.'),
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
        ...ZODIAC_SCHEMA,
        house_system: z
          .enum(HOUSE_SYSTEMS)
          .optional()
          .describe('Sistema di domificazione. Default: placidus.'),
        minor_aspects: z
          .boolean()
          .optional()
          .describe(
            'Disegna anche semisestile, quinconce, semiquadrato e sesquiquadrato. Default: false. ' +
              'Non è solo una questione di calcolo: nove specie di linea sullo stesso cerchio ' +
              'smettono di essere una trama leggibile.',
          ),
        with_transits: z
          .boolean()
          .optional()
          .describe(
            'Disegna una bi-ruota con i corpi in transito in un anello esterno. Default: false. ' +
              'Le linee al centro diventano gli aspetti dei transiti al tema, non quelli interni ' +
              'al tema.',
          ),
        transit_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            'Giorno del transito, con with_transits. OMETTILO per adesso, invece di scrivere ' +
              'una data che credi corrente.',
          ),
        transit_time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .describe('Ora del transito. Se la ometti vale mezzogiorno.'),
        transit_timezone: z
          .string()
          .optional()
          .describe('Fuso IANA in cui leggere transit_date e transit_time. Default: quello di nascita.'),
        theme: z
          .enum(['chiaro', 'scuro'])
          .optional()
          .describe(
            'Colori del disegno. Default: chiaro, che è il fondo su cui una carta finisce ' +
              'quasi sempre: stampata, o incollata in un documento.',
          ),
        width: z
          .number()
          .int()
          .min(400)
          .max(2000)
          .optional()
          .describe(
            `Larghezza in punti. Default ${LARGHEZZA_MCP}. Alzala solo se chi guarda dice di ` +
              "non riuscire a leggere i glifi: un'immagine più grande costa token e non " +
              'aggiunge dettaglio a un disegno di linee.',
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

        const zodiaco = zodiacOptions(args);
        if ('error' in zodiaco) return fail(zodiaco.error);

        const options: ChartOptions = { minorAspects: args.minor_aspects ?? false, ...zodiaco };
        if (args.house_system) options.houseSystem = args.house_system as HouseSystem;
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;

        const chart = computeNatalChart(birth, options);

        const disegno: OpzioniDisegno = {
          palette: paletteDi(args.theme ?? 'chiaro'),
          aspettiMinori: args.minor_aspects ?? false,
        };

        let didascalia = descriviDisegno(chart, args.time, place.label);

        if (args.with_transits) {
          const moment = transitMoment(args, place.timezone);
          const transitOptions: TransitOptions = { minorAspects: args.minor_aspects ?? false };
          if (args.house_system) transitOptions.houseSystem = args.house_system as HouseSystem;
          if (context.ephemerisPath) transitOptions.ephemerisPath = context.ephemerisPath;

          const transits = computeTransits(chart, moment, transitOptions);
          disegno.transits = transits;
          disegno.label = 'Ruota con il tema natale, i corpi in transito e i loro aspetti';
          didascalia += `\nTransiti al ${transits.time.utc.slice(0, 16).replace('T', ' ')} UT.`;
        }

        const png = ruotaPng(chart as WheelChart, {
          ...disegno,
          larghezza: args.width ?? LARGHEZZA_MCP,
        });

        return immagine(png, didascalia);
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

/**
 * La riga che accompagna il disegno.
 *
 * Dice di quale carta si tratta, perché un'immagine da sola non lo dice e due
 * ruote di due persone diverse si somigliano abbastanza da confondersi. E dice
 * quando mancano le case, che nel disegno si vedrebbe solo sapendo dove
 * guardare.
 */
function descriviDisegno(
  chart: ReturnType<typeof computeNatalChart>,
  ora: string | undefined,
  luogo: string | undefined,
): string {
  const dove = luogo ? ` — ${luogo}` : '';
  const quando = ora ? ` ${ora}` : '';
  const senzaCase =
    chart.houses.length === 0
      ? "\nOra di nascita ignota: la ruota non ha case né assi, ed è ruotata su 0° Ariete invece che sull'Ascendente."
      : '';

  return `Ruota del tema natale — ${chart.input.date}${quando}${dove}.${senzaCase}`;
}

export function registerDrawJyotishaChart(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'draw_jyotisha_chart',
    {
      title: 'Disegna un quadro vedico',
      description:
        "Disegna il quadro di un tema vedico e ne restituisce l'immagine. Sta a " +
        'compute_jyotisha_chart come draw_chart_wheel sta a compute_natal_chart: si chiama ' +
        'dopo e non al posto suo, perché **un disegno non contiene le avvertenze del ' +
        'calcolo** né i gradi. ' +
        'Il Jyotisha non si disegna in una ruota ma in un quadrato, e in due forme: nel ' +
        'SUD i segni stanno fermi e le case si spostano, nel NORD il contrario. Dicono la ' +
        'stessa cosa in due disposizioni diverse (è presentazione, non dottrina), quindi ' +
        'non sceglierne una per conto tuo se chi scrive non la nomina. ' +
        'Disegna un varga alla volta: senza indicarne uno esce la carta rashi (d1), che è ' +
        'quella che si guarda per prima. ' +
        "Lo stile del nord richiede l'ora di nascita: le sue caselle sono case, e senza " +
        "lagna non c'è una prima casa da mettere in alto.",
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe('Data di nascita locale, formato YYYY-MM-DD.'),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/)
          .optional()
          .describe("Ora di nascita locale. Ometti se ignota: allora solo stile=sud."),
        location_id: z
          .number()
          .int()
          .optional()
          .describe('Identificatore GeoNames restituito da search_location.'),
        latitude: z.number().min(-90).max(90).optional().describe('Latitudine, positiva a Nord.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitudine, positiva a Est.'),
        timezone: z.string().optional().describe('Fuso orario IANA. Obbligatorio senza location_id.'),
        ayanamsa: z
          .enum(AYANAMSAS)
          .optional()
          .describe('La convenzione siderale. Default: lahiri. Non cambiarla se non te lo chiedono.'),
        stile: z
          .enum(['sud', 'nord'])
          .optional()
          .describe(
            'La forma del quadro. sud (default): segni fissi, case mobili, si disegna ' +
              "sempre. nord: case fisse, segni mobili, vuole l'ora di nascita.",
          ),
        varga: z
          .enum(VARGA_IDS)
          .optional()
          .describe('Quale carta disegnare. Default: d1, la carta rashi.'),
        theme: z.enum(['chiaro', 'scuro']).optional().describe('Colori. Default: chiaro.'),
        width: z
          .number()
          .int()
          .min(200)
          .max(4000)
          .optional()
          .describe(`Larghezza in punti. Default: ${LARGHEZZA_MCP}.`),
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

        const options: ChartOptions = { zodiac: 'siderale', houseSystem: 'segni-interi' };
        if (args.ayanamsa) options.ayanamsa = args.ayanamsa as AyanamsaId;
        if (context.ephemerisPath) options.ephemerisPath = context.ephemerisPath;

        const id = (args.varga ?? 'd1') as VargaId;
        const varga = computeVarga(computeNatalChart(birth, options), id);
        const stile = (args.stile ?? 'sud') as StileQuadro;

        // Il rifiuto prima del disegno: la geometria solleverebbe lo stesso,
        // ma con un messaggio che parla di poligoni invece che di che cosa fare.
        if (stile === 'nord' && !varga.ascendant) {
          return fail(
            "Lo stile del nord ha le case fisse, e senza ora di nascita non c'è un lagna da " +
              'mettere in prima casa. Usa stile=sud, dove a essere fissi sono i segni.',
          );
        }

        const png = quadroPng(varga, {
          stile,
          palette: paletteDi(args.theme ?? 'chiaro'),
          larghezza: args.width ?? LARGHEZZA_MCP,
        });

        const dove = place.label ? ` — ${place.label}` : '';
        const quale = varga.name === 'Rashi' ? 'Carta rashi' : `${varga.name} (${id.toUpperCase()})`;
        const forma = stile === 'nord' ? 'nord-indiano' : 'sud-indiano';

        return immagine(
          png,
          `${quale} in stile ${forma} — ${args.date}${dove}. ` +
            'I nove graha nei dodici segni, col ℞ sui retrogradi; i gradi e le ' +
            'avvertenze stanno in compute_jyotisha_chart, e un disegno non li porta.',
        );
      } catch (error) {
        return fail(describeError(error));
      }
    },
  );
}

export function registerFindTransitPassages(server: McpServer, context: ToolContext = {}): void {
  server.registerTool(
    'find_transit_passages',
    {
      title: 'Trova quando i transiti diventano esatti',
      description:
        "Elenca gli istanti in cui i transiti si perfezionano nell'arco di tempo indicato. " +
        'È la risposta a QUANDO e a QUANTE VOLTE, che compute_transits non può dare: quello ' +
        'fotografa un momento, questo guarda un periodo. Un pianeta lento che passa in ' +
        'retrogradazione tocca lo stesso punto natale tre volte (avanti, indietro, avanti) ' +
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

export interface ResolvedPlace {
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
export function resolvePlace(
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
          'Riesegui search_location e usa un location_id fra quelli restituiti.',
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
        'Luogo non specificato. Indica location_id (ottenuto da search_location) ' +
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

export function describeError(error: unknown): string {
  if (error instanceof ChartError || error instanceof GeoError) {
    return `${error.code}: ${error.message}`;
  }
  return `Errore inatteso: ${error instanceof Error ? error.message : String(error)}`;
}
