import {
  quadroSvg,
  ruotaSvg,
  type OpzioniDisegno,
  type OpzioniQuadro,
  type SquareChart,
  type WheelChart,
} from '@dodicisegni/ruota';
import { quadroPng, ruotaPng } from '@dodicisegni/ruota/png';
import type { WheelOptions } from './wheel';

/**
 * Il disegno come risposta HTTP.
 *
 * Sta a parte perché è l'unico punto in cui `@dodicisegni/ruota/png` viene
 * importato dall'applicazione, e quell'import porta con sé un modulo nativo:
 * tenerlo in un file di `lib/server` lo mette fuori dalla portata del bundle
 * del browser per costruzione, non per attenzione.
 */
export function disegnoResponse(
  chart: WheelChart,
  { formato, palette, larghezza }: WheelOptions,
  extra: OpzioniDisegno = {},
): Response {
  const disegno: OpzioniDisegno = { ...extra, palette };

  if (formato === 'png') {
    const png = ruotaPng(chart, { ...disegno, ...(larghezza ? { larghezza } : {}) });
    // `Uint8Array` e non il `Buffer`: il corpo di una `Response` vuole un
    // BodyInit, e un Buffer ci arriva solo perché ne è una sottoclasse.
    return new Response(new Uint8Array(png), {
      headers: { 'content-type': 'image/png' },
    });
  }

  return new Response(ruotaSvg(chart, disegno), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
  });
}

/**
 * Il quadro vedico come risposta HTTP.
 *
 * Sta accanto alla ruota e non in un file suo per la ragione scritta sopra:
 * questo è **l'unico punto** in cui l'applicazione importa il modulo nativo
 * del PNG, e vale la pena che resti uno.
 */
export function quadroResponse(
  chart: SquareChart,
  { formato, palette, larghezza }: WheelOptions,
  extra: Omit<OpzioniQuadro, 'palette'> = {},
): Response {
  const disegno: OpzioniQuadro = { ...extra, palette };

  if (formato === 'png') {
    const png = quadroPng(chart, { ...disegno, ...(larghezza ? { larghezza } : {}) });
    return new Response(new Uint8Array(png), {
      headers: { 'content-type': 'image/png' },
    });
  }

  return new Response(quadroSvg(chart, disegno), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
  });
}
