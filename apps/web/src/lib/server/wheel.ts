import { error } from '@sveltejs/kit';
import { paletteDi, type Palette } from '@undicesimacasa/ruota';

/**
 * I parametri del disegno, comuni al tema e ai transiti.
 *
 * Stanno qui e non nell'endpoint per la stessa ragione degli altri lettori di
 * `lib/server`: due copie della stessa validazione divergono, e a divergere
 * sarebbe il messaggio d'errore — la parte che chi sbaglia legge davvero.
 */
export interface WheelOptions {
  formato: 'svg' | 'png';
  palette: Palette;
  /** Solo per il PNG: l'SVG è vettoriale e si scala da sé. */
  larghezza: number | undefined;
}

/**
 * Un valore non riconosciuto viene **rifiutato**, non ricondotto al
 * predefinito: chi scrive `theme=dark` deve sapere di aver sbagliato, invece
 * di ricevere un disegno chiaro e credere che il parametro non funzioni.
 */
export function readWheelOptions(parameters: URLSearchParams): WheelOptions {
  const formato = parameters.get('format') ?? 'svg';
  if (formato !== 'svg' && formato !== 'png') {
    throw error(400, {
      message: `Formato "${formato}" non riconosciuto: attesi "svg" oppure "png".`,
      code: 'FORMATO_NON_VALIDO',
    });
  }

  const tema = parameters.get('theme') ?? 'chiaro';
  if (tema !== 'chiaro' && tema !== 'scuro') {
    throw error(400, {
      message: `Tema "${tema}" non riconosciuto: attesi "chiaro" oppure "scuro".`,
      code: 'TEMA_NON_VALIDO',
    });
  }

  return { formato, palette: paletteDi(tema), larghezza: readLarghezza(parameters, formato) };
}

function readLarghezza(
  parameters: URLSearchParams,
  formato: 'svg' | 'png',
): number | undefined {
  const grezza = parameters.get('width');
  if (grezza === null) return undefined;

  if (formato === 'svg') {
    throw error(400, {
      message: 'Il parametro "width" vale solo con format=png: un SVG si scala da sé.',
      code: 'LARGHEZZA_SENZA_PNG',
    });
  }

  const larghezza = Number(grezza);
  // Il tetto non è un capriccio: la rasterizzazione costa, e chiedere
  // diecimila punti sarebbe un modo economico di tenere occupato il server.
  if (!Number.isFinite(larghezza) || larghezza < 200 || larghezza > 4000) {
    throw error(400, {
      message: 'Valore di "width" non valido: attesi fra 200 e 4000 punti.',
      code: 'LARGHEZZA_NON_VALIDA',
    });
  }

  return larghezza;
}
