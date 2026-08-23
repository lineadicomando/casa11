/**
 * Alba e tramonto: l'unico calcolo del motore che guarda l'orizzonte.
 *
 * Tutto il resto lavora su longitudini eclittiche, che non sanno niente di
 * dove si stia. Qui invece contano la latitudine e l'altezza del Sole sul
 * cerchio locale, ed è la ragione per cui l'elezione, sola fra le funzioni,
 * pretende un luogo e non se ne accontenta per gli assi.
 */

import sweph from 'sweph';
import type { EphemerisContext } from './ephemeris.js';
import type { Place } from './types.js';

/**
 * Il primo sorgere o tramontare del Sole a partire da `from`.
 *
 * `null` quando non ce n'è uno: oltre i circoli polari il Sole può restare
 * sopra o sotto l'orizzonte per settimane, e il calcolo che non trova nulla in
 * quarantotto ore dice il vero — non c'è un'alba, non è che sia andata persa.
 *
 * Centro del disco e nessuna rifrazione, invece del sorgere osservabile a
 * occhio. Sono i due scarti che separano l'alba dell'almanacco da quella
 * dell'astrologia: il lembo superiore si affaccia mezzo grado prima del centro,
 * e la rifrazione atmosferica ne anticipa altri trentaquattro primi. Presi
 * insieme spostano l'alba di quasi cinque minuti, e con essa ogni ora
 * planetaria del giorno.
 *
 * Qui interessa l'istante geometrico, quello in cui il Sole tocca l'orizzonte
 * locale e la sua longitudine coincide con l'Ascendente: è la definizione che
 * rende coerente il calendario elettivo con gli assi che riporta accanto.
 *
 * Con `visible` si chiede l'altra, che è quella degli almanacchi: il lembo
 * superiore, con la rifrazione. **La vuole il panchanga**, perché la vara è un
 * fatto di calendario e va confrontabile con i calendari stampati. A Delhi in
 * agosto le due definizioni distano quattro minuti — 05:58 contro 05:54 — e
 * sono i quattro minuti in cui un panchanga calcolato qui direbbe un giorno
 * della settimana diverso da quelli pubblicati.
 */

export interface RiseOptions {
  /**
   * L'alba osservabile invece di quella geometrica: primo lembo del disco,
   * con la rifrazione atmosferica. Default `false`.
   */
  visible?: boolean;
}

export function riseOrSet(
  which: 'rise' | 'set',
  from: number,
  place: Place,
  context: EphemerisContext,
  options: RiseOptions = {},
): number | null {
  const evento = which === 'rise' ? sweph.constants.SE_CALC_RISE : sweph.constants.SE_CALC_SET;
  // I due flag si tolgono insieme: lembo superiore e rifrazione sono le due
  // metà della stessa definizione, e prenderne una sola darebbe un'alba che
  // non è né quella dell'almanacco né quella della geometria.
  const flag = options.visible
    ? evento
    : evento | sweph.constants.SE_BIT_DISC_CENTER | sweph.constants.SE_BIT_NO_REFRACTION;

  const result = sweph.rise_trans(
    from,
    sweph.constants.SE_SUN,
    '',
    context.flags,
    flag,
    [place.longitude, place.latitude, place.altitude ?? 0],
    0,
    0,
  );

  if (result.flag < 0 || typeof result.data !== 'number') return null;
  return result.data;
}
