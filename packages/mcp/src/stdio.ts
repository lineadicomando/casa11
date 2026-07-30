#!/usr/bin/env node
/**
 * Punto d'ingresso per il trasporto stdio: il modo in cui un client MCP
 * locale (Claude Code, un IDE, uno script) avvia il server come sottoprocesso.
 *
 * Su stdio il canale di uscita standard è riservato al protocollo: qualunque
 * diagnostica va su stderr, altrimenti corrompe i messaggi JSON-RPC.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import type { ToolContext } from './tools.js';

const context: ToolContext = {};
if (process.env['GEONAMES_DB_PATH']) context.databasePath = process.env['GEONAMES_DB_PATH'];
if (process.env['SE_EPHE_PATH']) context.ephemerisPath = process.env['SE_EPHE_PATH'];

const server = createServer(context);
const transport = new StdioServerTransport();

await server.connect(transport);
process.stderr.write('undicesimacasa MCP in ascolto su stdio\n');
