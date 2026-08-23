/**
 * I prompt del server: il tema già impaginato insieme alle istruzioni per
 * leggerlo.
 *
 * Un prompt e non un tool, ed è la differenza che conta. I tool li chiama il
 * modello quando gli servono; **i prompt li sceglie chi usa il client**, per
 * nome, dal suo menu. Il server continua quindi a non chiedere a nessuno di
 * interpretare niente: offre le istruzioni a chi le domanda, e finché nessuno
 * le domanda non occupano un token.
 *
 * È la stessa cosa che il sito mette sotto il pulsante che copia negli
 * appunti, e viene dallo stesso posto — `@undicesimacasa/lettura` — perché due
 * copie di quel testo divergerebbero, e quel testo è il riferimento unico per
 * la lettura.
 *
 * La differenza è che qui non si incolla: il tema lo calcola il server dentro
 * al prompt. Chiedere all'agente di chiamare prima `compute_natal_chart` e poi
 * di appiccicarci le istruzioni gli lascerebbe due modi di sbagliare — la
 * tabella riscritta a mano, e le istruzioni riassunte.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { computeNatalChart, formatChartCompact, type BirthData } from '@undicesimacasa/core';
import { letturaDaIncollare, SISTEMI, type Sistema } from '@undicesimacasa/lettura';
import { z } from 'zod';
import { describeError, resolvePlace, type ToolContext } from './tools.js';

/** Il sistema predefinito, e l'unico finché non ce ne sarà un altro. */
const SISTEMA_PREDEFINITO: Sistema = 'tropicale';

export function registerLetturaDelTema(server: McpServer, context: ToolContext = {}): void {
  server.registerPrompt(
    'lettura_del_tema',
    {
      title: 'Leggi un tema natale',
      description:
        'Calcola un tema natale e lo consegna insieme alle istruzioni per interpretarlo. ' +
        'Da usare quando chi scrive vuole una lettura del tema, non i suoi numeri: per i ' +
        'soli dati basta il tool compute_natal_chart. Le istruzioni che arrivano con il ' +
        'tema sono vincolanti e vanno seguite come sono, non riassunte: dicono anche che ' +
        'cosa non fare. Data e ora vanno indicate COME SONO SEGNATE sul documento di ' +
        "nascita, in ora locale. Se l'ora è ignota ometti il parametro: la lettura ne terrà " +
        'conto, mentre un orario inventato produce case e assi falsi senza dirlo.',
      argsSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato atteso: YYYY-MM-DD.')
          .describe('Data di nascita locale, formato YYYY-MM-DD.'),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato atteso: HH:mm.')
          .optional()
          .describe("Ora di nascita locale, formato HH:mm. Ometti se ignota — non indovinarla."),
        location_id: z
          .string()
          .optional()
          .describe('Identificatore GeoNames da search_location. Alternativo alla terna.'),
        latitude: z.string().optional().describe('Latitudine in gradi decimali, positiva a Nord.'),
        longitude: z.string().optional().describe('Longitudine in gradi decimali, positiva a Est.'),
        timezone: z
          .string()
          .optional()
          .describe('Fuso orario IANA, es. "Europe/Rome". Obbligatorio senza location_id.'),
        sistema: z
          .string()
          .optional()
          .describe(
            `Sistema astrologico della lettura. Ammessi: ${SISTEMI.join(', ')}. ` +
              `Default: ${SISTEMA_PREDEFINITO}.`,
          ),
      },
    },
    (args) => {
      const testo = componi(args, context);
      return {
        messages: [{ role: 'user', content: { type: 'text', text: testo } }],
      };
    },
  );
}

/**
 * Il testo del prompt, o il motivo per cui non c'è.
 *
 * Un fallimento torna come messaggio invece che come eccezione: chi ha
 * invocato il prompt dal menu del client si aspetta di vedere qualcosa nella
 * conversazione, e un errore di protocollo lì sparisce senza dire che cosa
 * correggere.
 */
function componi(
  args: {
    date: string;
    time?: string | undefined;
    location_id?: string | undefined;
    latitude?: string | undefined;
    longitude?: string | undefined;
    timezone?: string | undefined;
    sistema?: string | undefined;
  },
  context: ToolContext,
): string {
  const sistema = args.sistema ?? SISTEMA_PREDEFINITO;
  if (!SISTEMI.includes(sistema as Sistema)) {
    // Rifiutato invece che ricondotto al predefinito: chi scrive un sistema
    // che non esiste deve saperlo, non ricevere una lettura di un altro.
    return `Sistema "${sistema}" non riconosciuto. Ammessi: ${SISTEMI.join(', ')}.`;
  }

  const numero = (valore: string | undefined): number | undefined => {
    if (valore === undefined || valore.trim() === '') return undefined;
    const n = Number(valore);
    return Number.isFinite(n) ? n : Number.NaN;
  };

  const location_id = numero(args.location_id);
  const latitude = numero(args.latitude);
  const longitude = numero(args.longitude);
  if ([location_id, latitude, longitude].some((v) => v !== undefined && Number.isNaN(v))) {
    return 'location_id, latitude e longitude devono essere numeri.';
  }

  const place = resolvePlace(
    {
      ...(location_id !== undefined ? { location_id } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(args.timezone !== undefined ? { timezone: args.timezone } : {}),
    },
    context,
  );
  if ('error' in place) return place.error;

  try {
    const birth: BirthData = {
      date: args.date,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    };
    if (args.time !== undefined) birth.time = args.time;

    const chart = computeNatalChart(
      birth,
      context.ephemerisPath ? { ephemerisPath: context.ephemerisPath } : {},
    );

    // Il luogo in testa alla tabella come nel tool: nel JSON sta in un campo a
    // parte, e qui un campo a parte non c'è.
    const intestazione = place.label ? `Luogo di nascita: ${place.label}\n` : '';
    return letturaDaIncollare(intestazione + formatChartCompact(chart), {
      sistema: sistema as Sistema,
    });
  } catch (error) {
    return describeError(error);
  }
}
