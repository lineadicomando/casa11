import { ChartError } from '@undicesimacasa/core';
import { GeoError } from '@undicesimacasa/geo';
import { error } from '@sveltejs/kit';

/**
 * Traduce gli errori del dominio in risposte HTTP.
 *
 * I codici dei pacchetti `core` e `geo` sono progettati proprio per questo:
 * il chiamante riceve un identificatore stabile su cui ramificare, non una
 * stringa da confrontare.
 */
export function toHttpError(cause: unknown): never {
  if (cause instanceof ChartError) {
    // Sono tutti errori d'input tranne il fallimento delle effemeridi,
    // che è una condizione del server.
    const status = cause.code === 'ERRORE_EFFEMERIDI' ? 500 : 400;
    throw error(status, { message: cause.message, code: cause.code });
  }

  if (cause instanceof GeoError) {
    // Un database assente è un problema di installazione, non della richiesta.
    const status = cause.code === 'QUERY_VUOTA' ? 400 : 503;
    throw error(status, { message: cause.message, code: cause.code });
  }

  throw error(500, {
    message: cause instanceof Error ? cause.message : 'Errore interno.',
    code: 'ERRORE_INTERNO',
  });
}
