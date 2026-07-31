/**
 * Formattazione dei valori angolari a schermo.
 *
 * Sta qui e non in un componente perché ogni tabella di posizioni la usa —
 * corpi, cuspidi, orbite degli aspetti — e le sezioni che verranno la useranno
 * allo stesso modo.
 */

/**
 * Gradi e primi, es. `22°03'`.
 *
 * L'arrotondamento dei primi può produrre 60: 22,9999° scriverebbe `22°60'`,
 * che non è una posizione. Il riporto va propagato al grado.
 */
export function formatDegrees(value: number): string {
  const degrees = Math.floor(value);
  const minutes = Math.round((value - degrees) * 60);
  return minutes === 60
    ? `${degrees + 1}°00'`
    : `${degrees}°${String(minutes).padStart(2, '0')}'`;
}
