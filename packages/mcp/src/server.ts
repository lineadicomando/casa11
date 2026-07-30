import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ASPECTS, HOUSE_SYSTEM_CODES } from '@temanatale/core';
import { registerComputeNatalChart, registerSearchLocation, type ToolContext } from './tools.js';

export const SERVER_NAME = 'temanatale';
export const SERVER_VERSION = '0.0.0';

/**
 * Costruisce il server MCP con i due tool e le risorse di riferimento.
 *
 * I tool sono due e non uno di proposito: la ricerca del luogo è separata dal
 * calcolo perché la disambiguazione deve essere una decisione esplicita e
 * visibile, non un'inferenza nascosta dentro il calcolo.
 */
export function createServer(context: ToolContext = {}): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        'Espone il calcolo del tema natale. Flusso tipico: search_location per ottenere ' +
        'un location_id, poi compute_natal_chart. Data e ora vanno passate in ora locale, ' +
        "come segnate sul documento di nascita. Il server restituisce solo dati astronomici: " +
        "l'interpretazione, se richiesta, spetta a te.",
    },
  );

  registerSearchLocation(server, context);
  registerComputeNatalChart(server, context);
  registerReferenceResources(server);

  return server;
}

/**
 * Materiale di riferimento caricabile su richiesta.
 *
 * Sta in risorse e non nella descrizione dei tool per non occupare contesto
 * a ogni conversazione: serve solo quando l'agente deve spiegare o motivare
 * un valore, non quando si limita a calcolarlo.
 */
function registerReferenceResources(server: McpServer): void {
  server.registerResource(
    'aspetti',
    'temanatale://riferimento/aspetti',
    {
      title: 'Aspetti e orbite',
      description:
        'Angoli e orbite usati dal motore di calcolo. Da consultare per spiegare ' +
        "perché un aspetto compare o non compare in un tema.",
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: aspectReference(),
        },
      ],
    }),
  );

  server.registerResource(
    'sistemi-case',
    'temanatale://riferimento/sistemi-case',
    {
      title: 'Sistemi di domificazione',
      description:
        'Sistemi di case accettati dal parametro house_system, con il criterio di divisione.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: houseSystemReference(),
        },
      ],
    }),
  );
}

function aspectReference(): string {
  const rows = ASPECTS.map(
    (aspect) =>
      `| ${aspect.id} | ${aspect.angle}° | ${aspect.orb}° | ${aspect.major ? 'maggiore' : 'minore'} |`,
  );

  return [
    '# Aspetti e orbite',
    '',
    "Un aspetto esiste quando la separazione angolare fra due corpi si avvicina a un valore",
    "notevole entro una tolleranza detta orbita. Sole e Luna ricevono 2° di orbita in più,",
    'secondo la prassi corrente.',
    '',
    '| Aspetto | Angolo | Orbita di base | Classe |',
    '|---|---|---|---|',
    ...rows,
    '',
    'Gli aspetti minori sono calcolati solo con `minor_aspects: true`.',
    '',
    'Un aspetto è **applicativo** quando si sta perfezionando (lo scarto diminuisce nel tempo),',
    '**separativo** quando si sta sciogliendo. La distinzione dipende dalla velocità relativa',
    'dei due corpi, quindi la retrogradazione può invertirla.',
  ].join('\n');
}

function houseSystemReference(): string {
  const descriptions: Record<string, string> = {
    placidus: 'Divisione temporale degli archi diurno e notturno. Il più diffuso in Occidente. Non definito oltre i circoli polari.',
    koch: 'Divisione temporale riferita alla latitudine di nascita. Come Placidus, degenera alle latitudini estreme.',
    'segni-interi': 'Ogni casa coincide con un segno intero, a partire da quello dell\'Ascendente. Il sistema dell\'astrologia ellenistica.',
    equale: 'Dodici settori di 30° a partire dall\'Ascendente. Definito a ogni latitudine.',
    regiomontano: 'Divisione dell\'equatore celeste in archi uguali. Tradizionale nell\'astrologia oraria.',
    campano: 'Divisione del primo verticale in archi uguali.',
    porfirio: 'Trisezione dei quadranti fra gli assi. Il più antico dei sistemi a quadranti.',
    topocentrico: 'Variante di Placidus basata sull\'orizzonte topocentrico.',
    alcabizio: 'Divisione oraria degli archi, di tradizione medievale.',
  };

  return [
    '# Sistemi di domificazione',
    '',
    'Valori accettati dal parametro `house_system` di `compute_natal_chart`.',
    'Il default è `placidus`.',
    '',
    ...Object.keys(HOUSE_SYSTEM_CODES).map(
      (system) => `- **${system}** — ${descriptions[system] ?? ''}`,
    ),
    '',
    'Gli assi (Ascendente, Medio Cielo, Discendente, Fondo Cielo) **non dipendono** dal',
    'sistema scelto: cambiano solo le cuspidi intermedie.',
    '',
    'Alle latitudini polari Placidus e Koch non sono matematicamente definiti: in quei casi',
    'il motore ripiega su un sistema alternativo e lo segnala fra le avvertenze del tema.',
  ].join('\n');
}
