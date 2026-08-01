import { ChartError } from './errors.js';
import type { Place } from './types.js';

/**
 * Verifica che le coordinate cadano nel dominio delle formule.
 *
 * Fuori intervallo il calcolo non fallisce: restituisce un risultato
 * plausibile e sbagliato, che è la specie di errore peggiore. Una latitudine
 * di 400° non è un luogo, ma le funzioni trigonometriche non se ne accorgono.
 */
export function validatePlace(place: Place): void {
  if (!Number.isFinite(place.latitude) || place.latitude < -90 || place.latitude > 90) {
    throw new ChartError(
      'COORDINATE_NON_VALIDE',
      `Latitudine ${place.latitude} fuori intervallo: attesa fra -90 e 90.`,
    );
  }
  if (!Number.isFinite(place.longitude) || place.longitude < -180 || place.longitude > 180) {
    throw new ChartError(
      'COORDINATE_NON_VALIDE',
      `Longitudine ${place.longitude} fuori intervallo: attesa fra -180 e 180.`,
    );
  }
}
