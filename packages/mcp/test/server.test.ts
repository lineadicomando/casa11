import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { loadSchema, normalizeName } from '@undicesimacasa/geo';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

/**
 * Test d'integrazione sul protocollo reale: il server è collegato a un vero
 * client MCP tramite trasporto in memoria. Verifica ciò che vedrebbe un agente,
 * non le funzioni interne.
 */
let directory: string;
let databasePath: string;
let client: Client;

const ROMA_ID = 3169070;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'undicesimacasa-mcp-'));
  databasePath = join(directory, 'test.db');

  const database = new DatabaseSync(databasePath);
  database.exec(loadSchema());
  database
    .prepare(
      `INSERT INTO locations (id, name, country_code, country, region,
                              latitude, longitude, timezone, population)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(ROMA_ID, 'Rome', 'IT', 'Italy', 'Lazio', 41.8919, 12.5113, 'Europe/Rome', 2_318_895);
  database
    .prepare('INSERT INTO location_names (location_id, search_name) VALUES (?, ?)')
    .run(ROMA_ID, normalizeName('Roma'));
  database.close();

  const server = createServer({ databasePath });
  client = new Client({ name: 'test', version: '0.0.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client.close();
  rmSync(directory, { recursive: true, force: true });
});

/** Estrae il testo dal risultato di un tool, qualunque sia il tipo di blocco. */
function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as { type: string; text?: string }[] | undefined;
  return (content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n');
}

describe('superficie MCP', () => {
  it('espone i due tool con descrizione e schema', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);

    expect(names).toContain('search_location');
    expect(names).toContain('compute_natal_chart');

    const chartTool = tools.find((tool) => tool.name === 'compute_natal_chart');
    // La descrizione deve dire all'agente di NON convertire l'ora da sé: è
    // l'errore più costoso che possa commettere su questo dominio.
    expect(chartTool?.description).toMatch(/ora locale/i);
    expect(chartTool?.inputSchema.properties).toHaveProperty('location_id');
    expect(chartTool?.inputSchema.required).toEqual(['date']);
  });

  it('espone le risorse di riferimento', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((resource) => resource.uri);

    expect(uris).toContain('undicesimacasa://riferimento/aspetti');
    expect(uris).toContain('undicesimacasa://riferimento/sistemi-case');
  });

  it('serve il contenuto di una risorsa', async () => {
    const result = await client.readResource({ uri: 'undicesimacasa://riferimento/aspetti' });

    expect(String(result.contents[0]?.text)).toContain('congiunzione');
  });
});

describe('search_location', () => {
  it('restituisce location_id, coordinate e fuso orario', async () => {
    const result = await client.callTool({
      name: 'search_location',
      arguments: { query: 'Roma' },
    });
    const text = textOf(result);

    expect(text).toContain(`location_id ${ROMA_ID}`);
    expect(text).toContain('Europe/Rome');
    expect(text).toContain('Rome, Lazio, Italy');
  });

  it('spiega cosa fare quando non trova nulla, senza segnalare errore', async () => {
    const result = await client.callTool({
      name: 'search_location',
      arguments: { query: 'Qwertyuiop' },
    });

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toMatch(/Nessuna località trovata/);
  });
});

describe('compute_natal_chart', () => {
  it('calcola un tema a partire da location_id', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: { date: '1968-03-12', time: '14:30', location_id: ROMA_ID },
    });
    const text = textOf(result);

    expect(result.isError).toBeFalsy();
    expect(text).toContain('Luogo: Rome, Lazio, Italy');
    expect(text).toContain('TEMA NATALE');
    expect(text).toContain('ASSI');
  });

  it('accetta la terna esplicita di coordinate', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: {
        date: '1968-03-12',
        time: '14:30',
        latitude: 41.8919,
        longitude: 12.5113,
        timezone: 'Europe/Rome',
      },
    });

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain('TEMA NATALE');
  });

  it('restituisce JSON valido con format json', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: { date: '1968-03-12', time: '14:30', location_id: ROMA_ID, format: 'json' },
    });

    const chart = JSON.parse(textOf(result));
    expect(chart.bodies.length).toBeGreaterThan(0);
    expect(chart.houses).toHaveLength(12);
  });

  it('produce una carta senza case quando l\'ora è omessa', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: { date: '1968-03-12', location_id: ROMA_ID, format: 'json' },
    });

    const chart = JSON.parse(textOf(result));
    expect(chart.houses).toEqual([]);
    expect(chart.bodies.length).toBeGreaterThan(0);
    expect(chart.warnings.join(' ')).toMatch(/mezzogiorno locale/);
  });

  it('il formato compatto costa molti meno token del JSON', async () => {
    const args = { date: '1968-03-12', time: '14:30', location_id: ROMA_ID };
    const compact = textOf(await client.callTool({ name: 'compute_natal_chart', arguments: args }));
    const json = textOf(
      await client.callTool({
        name: 'compute_natal_chart',
        arguments: { ...args, format: 'json' },
      }),
    );

    expect(compact.length).toBeLessThan(json.length / 4);
  });

  it('spiega come rimediare se manca il luogo', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: { date: '1968-03-12', time: '14:30' },
    });

    expect(result.isError).toBe(true);
    // Il messaggio deve nominare il tool da chiamare, non limitarsi a dire
    // che manca un parametro: è ciò che permette all'agente di correggersi.
    expect(textOf(result)).toMatch(/search_location/);
  });

  it('spiega come rimediare se location_id è sconosciuto', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: { date: '1968-03-12', time: '14:30', location_id: 999_999_999 },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/search_location/);
  });

  it('segnala il fuso orario non valido con il proprio codice d\'errore', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: {
        date: '1968-03-12',
        time: '14:30',
        latitude: 41.9,
        longitude: 12.5,
        timezone: 'Europa/Roma',
      },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('FUSO_ORARIO_NON_VALIDO');
  });

  it('riporta le avvertenze sulle ore ambigue fino all\'agente', async () => {
    const result = await client.callTool({
      name: 'compute_natal_chart',
      arguments: { date: '2024-10-27', time: '02:30', location_id: ROMA_ID },
    });

    expect(textOf(result)).toMatch(/ambigua/);
  });
});
