/**
 * @temanatale/mcp — server MCP per il calcolo del tema natale.
 *
 * Adattatore sottile sopra @temanatale/core e @temanatale/geo: non contiene
 * logica di calcolo, solo la definizione dei tool e la traduzione degli errori
 * in messaggi da cui un agente possa correggersi.
 */

export { createServer, SERVER_NAME, SERVER_VERSION } from './server.js';
export {
  registerComputeNatalChart,
  registerSearchLocation,
  type ToolContext,
} from './tools.js';
