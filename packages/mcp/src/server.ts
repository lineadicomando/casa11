import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerLetturaDelTema } from './prompts.js';
import { ASPECTS, HOUSE_SYSTEM_CODES, TRANSIT_ORB_BONUS, TRANSIT_ORBS } from '@dodicisegni/core';
import {
  registerComputeJyotishaChart,
  registerComputeNatalChart,
  registerComputeSky,
  registerComputeTransits,
  registerDrawChartWheel,
  registerDrawJyotishaChart,
  registerFindElectionHours,
  registerFindSkyEvents,
  registerFindTransitPassages,
  registerSearchLocation,
  type ToolContext,
} from './tools.js';

export const SERVER_NAME = 'dodicisegni';
export const SERVER_VERSION = '0.0.0';

/**
 * Costruisce il server MCP con i tool e le risorse di riferimento.
 *
 * La ricerca del luogo è separata dal calcolo di proposito: la
 * disambiguazione deve essere una decisione esplicita e visibile, non
 * un'inferenza nascosta dentro il calcolo.
 */
export function createServer(context: ToolContext = {}): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        'Espone il calcolo del tema natale, dei transiti e del cielo. Flusso tipico: ' +
        'search_location per ottenere un location_id, poi compute_natal_chart oppure ' +
        'compute_transits. Data e ora vanno passate in ora locale, come segnate sul documento ' +
        'di nascita. Per sapere quando un transito diventa esatto, e quante volte, c\'è ' +
        'find_transit_passages. Senza una nascita non esistono transiti ma solo il cielo: ' +
        'per quello c\'è compute_sky, che non chiede né data di nascita né luogo, e ' +
        'find_sky_events per gli incontri, gli ingressi e le stazioni di un periodo. ' +
        'Per scegliere QUANDO cominciare qualcosa in un luogo — ore planetarie, Ascendente ' +
        "che sorge, Luna vuota di corso — c'è find_election_hours, che vuole il luogo e " +
        'nessuna nascita. ' +
        'Per il presente ometti sempre la data: la data corrente la mette il server. ' +
        'Per MOSTRARE la carta invece che leggerla c\'è draw_chart_wheel, che ne restituisce ' +
        "l'immagine: si chiama dopo compute_natal_chart e non al posto suo, perché un disegno " +
        'non contiene le avvertenze del calcolo. ' +
        "Per l'astrologia indiana c'è compute_jyotisha_chart, che non è compute_natal_chart con " +
        "un'opzione: zodiaco siderale, case a segni interi, nakshatra, dasha e drishti. " +
        'Il Jyotisha si disegna quadrato e non in una ruota: per mostrarlo c\'è ' +
        'draw_jyotisha_chart, e non draw_chart_wheel. ' +
        "Il server restituisce solo dati astronomici: l'interpretazione, se richiesta, spetta a te. " +
        "Se chi scrive vuole una lettura e non i numeri, c'è il prompt lettura_del_tema, che " +
        'consegna il tema insieme alle istruzioni per interpretarlo.',
    },
  );

  registerSearchLocation(server, context);
  registerComputeNatalChart(server, context);
  registerComputeJyotishaChart(server, context);
  registerDrawChartWheel(server, context);
  registerDrawJyotishaChart(server, context);
  registerComputeSky(server, context);
  registerComputeTransits(server, context);
  registerFindTransitPassages(server, context);
  registerFindSkyEvents(server, context);
  registerFindElectionHours(server, context);
  registerLetturaDelTema(server, context);
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
    `${SERVER_NAME}://riferimento/aspetti`,
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
    `${SERVER_NAME}://riferimento/sistemi-case`,
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
      `| ${aspect.id} | ${aspect.angle}° | ${aspect.orb}° | ${TRANSIT_ORBS[aspect.id]}° | ${aspect.major ? 'maggiore' : 'minore'} |`,
  );

  return [
    '# Aspetti e orbite',
    '',
    "Un aspetto esiste quando la separazione angolare fra due corpi si avvicina a un valore",
    "notevole entro una tolleranza detta orbita. Sole e Luna ricevono ciascuno 2° di orbita",
    'in più, secondo la prassi corrente: un aspetto fra i due luminari ne somma quindi 4.',
    '',
    '| Aspetto | Angolo | Orbita natale | Orbita nei transiti | Classe |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    'Gli aspetti minori sono calcolati solo con `minor_aspects: true`.',
    '',
    '**Le orbite dei transiti sono più strette** perché un transito va collocato nel tempo:',
    `con gli 8° della congiunzione natale, Saturno resterebbe «in aspetto» per mesi di fila.`,
    `Nei transiti il bonus dei luminari vale ${TRANSIT_ORB_BONUS['luna']}° per la Luna e`,
    `${TRANSIT_ORB_BONUS['sole']}° per il Sole, su entrambi i lati della coppia.`,
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
