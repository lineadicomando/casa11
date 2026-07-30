import { arcForward, degreeInSign, normalize360, signOf } from './math.js';
import type { ChartPoint, Sect } from './types.js';

/**
 * Stabilisce se il tema è diurno o notturno, cioè se il Sole si trovava sopra
 * l'orizzonte alla nascita.
 *
 * Il confronto è geometrico e non usa il numero di casa: nei segni interi la
 * settima casa non comincia al Discendente, quindi "casa ≥ 7" darebbe la
 * risposta sbagliata. L'emisfero sopra l'orizzonte è invece sempre l'arco che
 * va dal Discendente all'Ascendente in senso zodiacale.
 */
export function chartSect(sunLongitude: number, descendant: number): Sect {
  return arcForward(descendant, sunLongitude) < 180 ? 'diurna' : 'notturna';
}

/**
 * Parte di Fortuna, la più usata delle sorti arabe.
 *
 * Proietta sull'Ascendente la distanza fra Sole e Luna: indica dove
 * l'equilibrio fra i due luminari tocca terra nel tema.
 *
 * Nella tradizione ellenistica e medievale la formula si **inverte** nei temi
 * notturni. Parte dei programmi moderni usa sempre la forma diurna, e su un
 * tema notturno le due convenzioni danno risultati diversi — a volte di oltre
 * cento gradi. Da qui il parametro `formula`, che serve a riprodurre il
 * risultato di un altro programma quando lo si sta confrontando.
 */
export function computePartOfFortune(
  ascendant: number,
  sunLongitude: number,
  moonLongitude: number,
  sect: Sect,
  formula: 'settore' | 'diurna' = 'settore',
): ChartPoint {
  const nocturnal = formula === 'settore' && sect === 'notturna';

  const longitude = normalize360(
    nocturnal
      ? ascendant + sunLongitude - moonLongitude
      : ascendant + moonLongitude - sunLongitude,
  );

  return {
    longitude,
    sign: signOf(longitude),
    signDegree: degreeInSign(longitude),
  };
}
