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
/** Serve al luogo del transito: lontano da Roma di fuso e di orizzonte. */
const TOKYO_ID = 1850147;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'undicesimacasa-mcp-'));
  databasePath = join(directory, 'test.db');

  const database = new DatabaseSync(databasePath);
  database.exec(loadSchema());
  database
    .prepare(
      `INSERT INTO locations (id, name_en, name_it, country_code, country_en, country_it,
                              region_en, region_it, latitude, longitude, timezone, population)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      ROMA_ID, 'Rome', 'Roma', 'IT', 'Italy', 'Italia', 'Lazio', 'Lazio',
      41.8919, 12.5113, 'Europe/Rome', 2_318_895,
    );
  database
    .prepare(
      `INSERT INTO locations (id, name_en, name_it, country_code, country_en, country_it,
                              region_en, region_it, latitude, longitude, timezone, population)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      TOKYO_ID, 'Tokyo', 'Tokyo', 'JP', 'Japan', 'Giappone', 'Tokyo', 'Tokyo',
      35.6895, 139.6917, 'Asia/Tokyo', 8_336_599,
    );
  database
    .prepare('INSERT INTO location_names (location_id, search_name) VALUES (?, ?)')
    .run(ROMA_ID, normalizeName('Roma'));
  database
    .prepare('INSERT INTO location_names (location_id, search_name) VALUES (?, ?)')
    .run(TOKYO_ID, normalizeName('Tokyo'));
  database.close();

  const server = createServer({ databasePath });
  client = new Client({ name: 'test', version: '0.0.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  // `client` resta undefined se beforeAll fallisce: senza guardia l'errore
  // di pulizia maschera quello vero.
  await client?.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

/** Estrae il testo dal risultato di un tool, qualunque sia il tipo di blocco. */
function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as { type: string; text?: string }[] | undefined;
  return (content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n');
}

/** La resa compatta senza il blocco finale delle avvertenze. */
function senzaAvvertenze(compact: string): string {
  const inizio = compact.indexOf('\nAVVERTENZE');
  return inizio === -1 ? compact : compact.slice(0, inizio);
}

/** Lo stesso JSON senza il campo `warnings`, riimpaginato come lo serve il tool. */
function senzaJsonWarnings(json: string): string {
  const parsed = JSON.parse(json) as { warnings?: unknown };
  delete parsed.warnings;
  return JSON.stringify(parsed, null, 2);
}

/** Il primo blocco immagine del risultato, se c'è. */
function imageOf(
  result: Awaited<ReturnType<Client['callTool']>>,
): { data: string; mimeType: string } | undefined {
  const content = result.content as { type: string; data?: string; mimeType?: string }[] | undefined;
  const blocco = (content ?? []).find((block) => block.type === 'image');
  return blocco ? { data: blocco.data ?? '', mimeType: blocco.mimeType ?? '' } : undefined;
}

describe('superficie MCP', () => {
  it('espone gli otto tool con descrizione e schema', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);

    expect(names).toContain('search_location');
    expect(names).toContain('compute_natal_chart');
    expect(names).toContain('draw_chart_wheel');
    expect(names).toContain('compute_sky');
    expect(names).toContain('compute_transits');
    expect(names).toContain('find_transit_passages');
    expect(names).toContain('find_sky_events');
    expect(names).toContain('find_election_hours');

    const wheelTool = tools.find((tool) => tool.name === 'draw_chart_wheel');
    // La descrizione deve dire che il disegno non sostituisce i dati: una
    // ruota non porta le avvertenze del calcolo, e mostrarla da sola
    // significa mostrare una carta di cui non si sa se sia completa.
    expect(wheelTool?.description).toMatch(/compute_natal_chart/);
    expect(wheelTool?.description).toMatch(/avvertenze/i);
    expect(wheelTool?.inputSchema.required).toEqual(['date']);

    const electionTool = tools.find((tool) => tool.name === 'find_election_hours');
    // Il luogo è l'unico dato senza cui il tool non ha senso, e la descrizione
    // deve dirlo: alba e tramonto non hanno un predefinito ragionevole.
    expect(electionTool?.description).toMatch(/obbligatorio/i);
    expect(electionTool?.description).toMatch(/ometti from/i);
    // E deve chiudere la porta all'uso per cui verrebbe cercato per primo.
    expect(electionTool?.description).toMatch(/sorteggio/i);
    expect(electionTool?.inputSchema.required).toBeUndefined();

    const eventsTool = tools.find((tool) => tool.name === 'find_sky_events');
    // Anche qui la coppia va tenuta distinta: il calendario del cielo non è
    // quello di una persona.
    expect(eventsTool?.description).toMatch(/find_transit_passages/);
    expect(eventsTool?.description).toMatch(/ometti from/i);
    expect(eventsTool?.inputSchema.required).toBeUndefined();

    const skyTool = tools.find((tool) => tool.name === 'compute_sky');
    // La descrizione deve tenere separate le due domande: senza una nascita
    // non esistono transiti, e con una nascita il cielo da solo non basta.
    expect(skyTool?.description).toMatch(/compute_transits/);
    expect(skyTool?.description).toMatch(/facoltativo/i);
    // Nessun parametro obbligatorio: è la differenza che rende utile il tool.
    expect(skyTool?.inputSchema.required).toBeUndefined();

    const transitTool = tools.find((tool) => tool.name === 'compute_transits');
    // La descrizione deve dissuadere l'agente dall'inventare la data di oggi
    // e dal trasformare un transito in una previsione.
    expect(transitTool?.description).toMatch(/ometti transit_date/i);
    expect(transitTool?.description).toMatch(/previsione/i);
    // Due specie di case nello stesso risultato vanno tenute distinte, o
    // l'agente leggerà le une per le altre.
    expect(transitTool?.description).toMatch(/case dell'istante/i);
    expect(transitTool?.inputSchema.properties).toHaveProperty('transit_location_id');
    expect(transitTool?.inputSchema.required).toEqual(['date']);

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

  it('espone il prompt di lettura, che non è un tool', async () => {
    // Prompt e non tool perché lo sceglie chi usa il client, non il modello:
    // il server continua a non chiedere a nessuno di interpretare niente.
    const { prompts } = await client.listPrompts();
    const lettura = prompts.find((prompt) => prompt.name === 'lettura_del_tema');

    expect(lettura).toBeDefined();
    expect(lettura?.description).toContain('non i suoi numeri');

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).not.toContain('lettura_del_tema');
  });

  it('consegna le istruzioni prima della tabella, senza farla riscrivere', async () => {
    const result = await client.getPrompt({
      name: 'lettura_del_tema',
      arguments: { date: '1968-03-12', time: '14:30', location_id: String(ROMA_ID) },
    });

    const testo = String(result.messages[0]?.content?.text);
    expect(result.messages[0]?.role).toBe('user');
    expect(testo).toContain('ricalcolarlo e non correggerlo');
    expect(testo.indexOf('Scrivi da un centro')).toBeLessThan(testo.indexOf('CORPI'));
    // Il luogo in testa come nel tool: nel JSON sta in un campo a parte.
    expect(testo).toContain('Luogo di nascita: Roma');
  });

  it('rifiuta un sistema che non esiste invece di leggerne un altro', async () => {
    const result = await client.getPrompt({
      name: 'lettura_del_tema',
      arguments: { date: '1968-03-12', location_id: String(ROMA_ID), sistema: 'vedico' },
    });

    const testo = String(result.messages[0]?.content?.text);
    expect(testo).toContain('non riconosciuto');
    expect(testo).toContain('tropicale');
    expect(testo).not.toContain('Scrivi da un centro');
  });

  it('spiega un luogo inesistente invece di fallire di protocollo', async () => {
    // Chi ha invocato il prompt dal menu del client si aspetta di vedere
    // qualcosa nella conversazione: un errore di protocollo lì sparisce.
    const result = await client.getPrompt({
      name: 'lettura_del_tema',
      arguments: { date: '1968-03-12', location_id: '999999999' },
    });

    expect(String(result.messages[0]?.content?.text)).toContain('search_location');
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
    expect(text).toContain('Roma, Lazio, Italia');
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
    expect(text).toContain('Luogo: Roma, Lazio, Italia');
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

    // Al netto delle avvertenze, che sono lo stesso testo nelle due rese e
    // quindi pesano sul compatto molto più che sul JSON. Quante ne compaiano
    // dipende dalla macchina — su un clone senza effemeridi ce n'è una in più
    // per il ripiego su Moshier — e la proprietà da dimostrare qui è come il
    // motore impagina un tema, non quale effemeride abbia sottomano.
    expect(senzaAvvertenze(compact).length).toBeLessThan(senzaJsonWarnings(json).length / 4);
  });

  it('accetta la formula alternativa della Parte di Fortuna', async () => {
    // Tema notturno: è il caso in cui le due formule divergono.
    const args = { date: '1968-03-12', time: '23:30', location_id: ROMA_ID, format: 'json' };

    const settore = JSON.parse(
      textOf(await client.callTool({ name: 'compute_natal_chart', arguments: args })),
    );
    const diurna = JSON.parse(
      textOf(
        await client.callTool({
          name: 'compute_natal_chart',
          arguments: { ...args, part_of_fortune_formula: 'diurna' },
        }),
      ),
    );

    expect(settore.sect).toBe('notturna');
    expect(settore.partOfFortune.longitude).not.toBeCloseTo(diurna.partOfFortune.longitude, 2);
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

describe('draw_chart_wheel', () => {
  it('restituisce un PNG vero, non un SVG travestito', async () => {
    const result = await client.callTool({
      name: 'draw_chart_wheel',
      arguments: { date: '1968-03-12', time: '14:30', location_id: ROMA_ID },
    });

    const immagine = imageOf(result);
    expect(immagine?.mimeType).toBe('image/png');

    // La firma del formato, non solo il tipo dichiarato: un modello che riceve
    // un mimeType sbagliato non vede l'immagine e non sa perché.
    const byte = Buffer.from(immagine?.data ?? '', 'base64');
    expect([...byte.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(byte.byteLength).toBeGreaterThan(1000);
  });

  it('dice di quale carta è il disegno', async () => {
    // Due ruote di due persone diverse si somigliano abbastanza da
    // confondersi: l'immagine da sola non basta.
    const result = await client.callTool({
      name: 'draw_chart_wheel',
      arguments: { date: '1968-03-12', time: '14:30', location_id: ROMA_ID },
    });

    expect(textOf(result)).toContain('1968-03-12');
    expect(textOf(result)).toContain('14:30');
    expect(textOf(result)).toContain('Roma');
  });

  it('avvisa che senza ora la ruota non ha case né assi', async () => {
    const result = await client.callTool({
      name: 'draw_chart_wheel',
      arguments: { date: '1968-03-12', location_id: ROMA_ID },
    });

    expect(textOf(result)).toMatch(/ora di nascita ignota/i);
    expect(textOf(result)).toMatch(/non ha case/i);
    expect(imageOf(result)?.mimeType).toBe('image/png');
  });

  it('disegna la bi-ruota quando si chiedono i transiti', async () => {
    const semplice = await client.callTool({
      name: 'draw_chart_wheel',
      arguments: { date: '1968-03-12', time: '14:30', location_id: ROMA_ID, width: 400 },
    });
    const doppia = await client.callTool({
      name: 'draw_chart_wheel',
      arguments: {
        date: '1968-03-12',
        time: '14:30',
        location_id: ROMA_ID,
        with_transits: true,
        transit_date: '2026-08-15',
        width: 400,
      },
    });

    expect(textOf(doppia)).toMatch(/transiti al 2026-08-15/i);
    // Un anello di corpi in più non può produrre lo stesso identico file.
    expect(imageOf(doppia)?.data).not.toBe(imageOf(semplice)?.data);
  });

  it('spiega come rimediare se manca il luogo', async () => {
    const result = await client.callTool({
      name: 'draw_chart_wheel',
      arguments: { date: '1968-03-12', time: '14:30' },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/search_location|location_id/);
  });
});

describe('compute_transits', () => {
  const NASCITA = { date: '1968-03-12', time: '14:30', location_id: ROMA_ID };

  it('calcola i transiti a una data indicata', async () => {
    const result = await client.callTool({
      name: 'compute_transits',
      arguments: { ...NASCITA, transit_date: '2026-08-15', transit_time: '12:00' },
    });
    const text = textOf(result);

    expect(result.isError).toBeFalsy();
    expect(text).toContain('Luogo di nascita: Roma, Lazio, Italia');
    expect(text).toContain('TRANSITI — 2026-08-15 12:00');
    expect(text).toContain('IN TRANSITO');
    // Il verso dei due lati va dichiarato: i glifi sono gli stessi.
    expect(text).toContain('in transito → natale');
  });

  it('usa la data corrente quando transit_date è omessa', async () => {
    // È il punto della scelta: un agente la data di oggi non la sa, e senza
    // questa via la inventerebbe.
    const result = await client.callTool({
      name: 'compute_transits',
      arguments: { ...NASCITA, format: 'json' },
    });

    const { transits } = JSON.parse(textOf(result));
    const oggi = new Date().toISOString().slice(0, 10);

    // Il fuso del transito è quello di nascita: a cavallo della mezzanotte
    // può essere il giorno prima o dopo rispetto a UTC.
    expect(Math.abs(Date.parse(transits.input.date) - Date.parse(oggi))).toBeLessThanOrEqual(
      86_400_000,
    );
  });

  it('colloca i transiti nelle case natali', async () => {
    const result = await client.callTool({
      name: 'compute_transits',
      arguments: { ...NASCITA, transit_date: '2026-08-15', format: 'json' },
    });

    const { transits } = JSON.parse(textOf(result));
    expect(transits.transiting.length).toBeGreaterThan(0);
    for (const body of transits.transiting) {
      expect(body.house).toBeGreaterThanOrEqual(1);
      expect(body.house).toBeLessThanOrEqual(12);
    }
  });

  it('avverte che senza ora di nascita non ci sono case né assi', async () => {
    const result = await client.callTool({
      name: 'compute_transits',
      arguments: { date: '1968-03-12', location_id: ROMA_ID, transit_date: '2026-08-15' },
    });

    expect(textOf(result)).toMatch(/Tema natale senza ora/);
  });

  it('spiega come rimediare se manca il luogo', async () => {
    const result = await client.callTool({
      name: 'compute_transits',
      arguments: { date: '1968-03-12', transit_date: '2026-08-15' },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/search_location/);
  });

  describe('con un luogo del transito', () => {
    const DA_TOKYO = {
      ...NASCITA,
      transit_date: '2026-08-15',
      transit_time: '09:00',
      transit_location_id: TOKYO_ID,
    };

    it('aggiunge assi e case dell istante senza toccare quelle natali', async () => {
      const result = await client.callTool({
        name: 'compute_transits',
        arguments: { ...DA_TOKYO, format: 'json' },
      });

      const { transits } = JSON.parse(textOf(result));
      expect(transits.angles).toBeDefined();
      expect(transits.houses).toHaveLength(12);

      for (const body of transits.transiting) {
        expect(body.house).toBeGreaterThanOrEqual(1);
        expect(body.transitHouse).toBeGreaterThanOrEqual(1);
      }
    });

    it('intesta con entrambi i luoghi, che non sono lo stesso', async () => {
      const result = await client.callTool({ name: 'compute_transits', arguments: DA_TOKYO });
      const text = textOf(result);

      expect(text).toContain('Luogo di nascita: Roma, Lazio, Italia');
      expect(text).toContain('Luogo del transito: Tokyo, Giappone');
      expect(text).toContain("ASSI DELL'ISTANTE");
    });

    it('legge l ora del transito sull orologio di quel luogo', async () => {
      const result = await client.callTool({
        name: 'compute_transits',
        arguments: { ...DA_TOKYO, format: 'json' },
      });

      const { transits } = JSON.parse(textOf(result));
      expect(transits.input.timezone).toBe('Asia/Tokyo');
      // Le nove a Tokyo sono le ventitré del giorno prima in UT.
      expect(transits.time.utc).toBe('2026-08-15T00:00:00Z');
    });

    it('lascia comandare transit_timezone quando c è', async () => {
      const result = await client.callTool({
        name: 'compute_transits',
        arguments: { ...DA_TOKYO, transit_timezone: 'Europe/Rome', format: 'json' },
      });

      const { transits } = JSON.parse(textOf(result));
      expect(transits.input.timezone).toBe('Europe/Rome');
    });

    it('nomina i propri parametri se il luogo è mezzo', async () => {
      const result = await client.callTool({
        name: 'compute_transits',
        arguments: { ...NASCITA, transit_date: '2026-08-15', transit_latitude: 35.68 },
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toMatch(/transit_longitude/);
    });
  });
});

describe('compute_sky', () => {
  it('risponde senza nessun parametro: è il motivo per cui esiste', async () => {
    const result = await client.callTool({ name: 'compute_sky', arguments: {} });

    const testo = textOf(result);
    expect(result.isError).toBeFalsy();
    expect(testo).toMatch(/^CIELO — /);
    // Senza luogo il cielo è completo lo stesso, e lo dichiara invece di
    // lasciar credere a un calcolo mancato.
    expect(testo).toMatch(/Senza luogo/);
    expect(testo).not.toMatch(/\nASSI\n/);
  });

  it('aggiunge assi e case quando il luogo c è', async () => {
    const result = await client.callTool({
      name: 'compute_sky',
      arguments: { date: '2026-08-01', time: '18:30', location_id: ROMA_ID },
    });

    const testo = textOf(result);
    expect(testo).toMatch(/Luogo: Roma, Lazio, Italia/);
    // Il fuso viene dalla località: l'istante è scritto in ora di Roma.
    expect(testo).toMatch(/2026-08-01 18:30 \(Europe\/Rome/);
    expect(testo).toMatch(/\nASSI\n/);
    expect(testo).toMatch(/\nCUSPIDI\n/);
  });

  it('dà le stesse posizioni con e senza luogo', async () => {
    // È la ragione per cui il luogo è facoltativo, e va verificata dal lato
    // che un agente vede davvero.
    const [senza, con] = await Promise.all([
      client.callTool({
        name: 'compute_sky',
        arguments: { date: '2026-08-01', time: '18:30', timezone: 'Europe/Rome', format: 'json' },
      }),
      client.callTool({
        name: 'compute_sky',
        arguments: { date: '2026-08-01', time: '18:30', location_id: ROMA_ID, format: 'json' },
      }),
    ]);

    const posizioni = (result: typeof senza): Record<string, number> =>
      Object.fromEntries(
        (JSON.parse(textOf(result)).bodies as { id: string; longitude: number }[]).map((body) => [
          body.id,
          body.longitude,
        ]),
      );

    expect(posizioni(con)).toEqual(posizioni(senza));
    expect(JSON.parse(textOf(senza)).angles).toBeUndefined();
    expect(JSON.parse(textOf(con)).angles).toBeDefined();
  });

  it('spiega che mezzo luogo non è un luogo, e che se ne può fare a meno', async () => {
    const result = await client.callTool({
      name: 'compute_sky',
      arguments: { date: '2026-08-01', latitude: 41.9 },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/omettile entrambe/);
  });

  it('parte da adesso quando la data non è indicata', async () => {
    const result = await client.callTool({
      name: 'compute_sky',
      arguments: { timezone: 'Europe/Rome', format: 'json' },
    });

    const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
    expect(JSON.parse(textOf(result)).input.date).toBe(oggi);
  });
});

describe('find_sky_events', () => {
  it('elenca incontri, ingressi e stazioni di un arco', async () => {
    const result = await client.callTool({
      name: 'find_sky_events',
      arguments: {
        from: '2026-01-01',
        to: '2026-12-31',
        timezone: 'Europe/Rome',
        bodies: ['saturno', 'nettuno'],
      },
    });

    const testo = textOf(result);
    expect(testo).toContain('INCONTRI IN CIELO');
    expect(testo).toContain('EVENTI DEL CIELO');
    // La congiunzione fra Saturno e Nettuno del 20 febbraio 2026, e l'ingresso
    // di entrambi in Ariete: tre righe che descrivono lo stesso periodo.
    expect(testo).toMatch(/2026-02-20 .*Saturno .*congiunzione .*Nettuno/);
    expect(testo).toMatch(/Nettuno .*pesci → ariete/);
  });

  it('restringe l elenco a quel che è stato chiesto', async () => {
    const result = await client.callTool({
      name: 'find_sky_events',
      arguments: { from: '2026-01-01', to: '2026-06-30', include: ['stazioni'] },
    });

    const testo = textOf(result);
    expect(testo).toContain('STAZIONI');
    expect(testo).not.toContain('INCONTRI IN CIELO');
  });

  it('trova le lunazioni quando la Luna è chiesta per nome', async () => {
    const result = await client.callTool({
      name: 'find_sky_events',
      arguments: {
        from: '2026-01-01',
        to: '2026-01-31',
        bodies: ['sole', 'luna'],
        include: ['incontri'],
        format: 'json',
      },
    });

    const { passages } = JSON.parse(textOf(result));
    const noviluni = passages.filter(
      (p: { aspect: string }) => p.aspect === 'congiunzione',
    );
    expect(noviluni[0].exact).toBe('2026-01-18T19:52Z');
  });

  it('parte da oggi quando l arco non è indicato', async () => {
    const result = await client.callTool({
      name: 'find_sky_events',
      arguments: { include: ['ingressi'], bodies: ['plutone'], format: 'json' },
    });

    const { range } = JSON.parse(textOf(result));
    expect(range.from).toBe(new Date().toISOString().slice(0, 10));
  });

  it('rifiuta un arco oltre i tre anni suggerendo come rimediare', async () => {
    const result = await client.callTool({
      name: 'find_sky_events',
      arguments: { from: '2026-01-01', to: '2036-01-01' },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/tre anni/);
  });
});

describe('find_transit_passages', () => {
  const NASCITA = { date: '1968-03-12', time: '14:30', location_id: ROMA_ID };

  it('trova i passaggi ripetuti di un pianeta lento sullo stesso punto', async () => {
    // Il ritorno di Saturno passa tre volte fra il 2026 e il 2027: è la
    // ragione per cui questo tool esiste accanto a compute_transits.
    const result = await client.callTool({
      name: 'find_transit_passages',
      arguments: {
        ...NASCITA,
        from: '2026-01-01',
        to: '2027-12-31',
        bodies: ['saturno'],
        targets: ['saturno'],
        format: 'json',
      },
    });

    const { passages } = JSON.parse(textOf(result));
    expect(passages).toHaveLength(3);
    expect(passages.map((p: { retrograde: boolean }) => p.retrograde)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('parte da oggi quando l arco non è indicato', async () => {
    const result = await client.callTool({
      name: 'find_transit_passages',
      arguments: { ...NASCITA, bodies: ['giove'], format: 'json' },
    });

    const { range } = JSON.parse(textOf(result));
    const oggi = new Date().toISOString().slice(0, 10);
    expect(Math.abs(Date.parse(range.from) - Date.parse(oggi))).toBeLessThanOrEqual(86_400_000);
    // Un anno dopo: il tempo in cui un pianeta lento chiude l'andirivieni.
    expect(Number(range.to.slice(0, 4)) - Number(range.from.slice(0, 4))).toBe(1);
  });

  it('rifiuta un arco troppo lungo spiegando come restringerlo', async () => {
    const result = await client.callTool({
      name: 'find_transit_passages',
      arguments: { ...NASCITA, from: '2026-01-01', to: '2050-01-01' },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/bodies/);
  });

  it('dice all agente che tre righe uguali sono un periodo solo', async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === 'find_transit_passages');

    expect(tool?.description).toMatch(/retrogradazione/i);
    expect(tool?.description).toMatch(/previsione/i);
  });
});

describe('find_election_hours', () => {
  it('elenca le ore planetarie di un luogo e i vuoti di corso', async () => {
    const result = await client.callTool({
      name: 'find_election_hours',
      arguments: { latitude: 38.1166, longitude: 13.3636, timezone: 'Europe/Rome', from: '2029-08-24' },
    });

    const testo = textOf(result);
    expect(testo).toContain('ELEZIONE');
    expect(testo).toContain('ORE PLANETARIE');
    expect(testo).toContain('LUNA VUOTA DI CORSO');
    // Il 24 agosto 2029 è un venerdì: la prima ora dopo l'alba è di Venere.
    expect(testo).toMatch(/06:34-07:40 Venere\s+d 1/);
  });

  it('rifiuta un arco più lungo di un mese', async () => {
    const result = await client.callTool({
      name: 'find_election_hours',
      arguments: {
        latitude: 38.1166,
        longitude: 13.3636,
        timezone: 'Europe/Rome',
        from: '2029-08-01',
        to: '2029-12-31',
      },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/massimo è 31/);
  });

  it('restringe le ore al reggitore chiesto e lo dichiara', async () => {
    const result = await client.callTool({
      name: 'find_election_hours',
      arguments: {
        latitude: 44.69825,
        longitude: 10.63125,
        timezone: 'Europe/Rome',
        from: '2026-08-01',
        to: '2026-08-31',
        rulers: ['giove'],
        skip_moon_void: true,
      },
    });

    const testo = textOf(result);
    expect(testo).toContain('Elenco filtrato: solo le ore di Giove');
    expect(testo).toContain('escluse quelle con la Luna vuota di corso');
    // Un mese intero sarebbe di ottocento righe: è la ragione del filtro.
    expect(testo.split('\n').length).toBeLessThan(200);
    expect(testo).not.toMatch(/^\d\d:\d\d-\d\d:\d\d (Sole|Luna|Marte|Mercurio|Venere|Saturno)/m);
  });

  it('non calcola niente senza un luogo', async () => {
    const result = await client.callTool({
      name: 'find_election_hours',
      arguments: { from: '2029-08-24' },
    });

    // Un luogo predefinito darebbe ore planetarie plausibili e di un'altra
    // città: meglio un errore.
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/luogo/i);
  });
});
