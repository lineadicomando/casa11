/**
 * L'aspetto della pagina: chiaro, scuro, o quello che dice il sistema.
 *
 * In inglese, e non «tema», perché qui `tema` è già la carta natale: un
 * `themeStore` accanto a un `NatalChart` sarebbe una trappola per chi legge.
 *
 * `auto` non è un terzo colore ma l'assenza di scelta: nessun attributo sulla
 * pagina, nessuna chiave salvata, e i colori tornano a seguire
 * `prefers-color-scheme`. Chi non tocca il pulsante non lascia scritto nulla
 * sul dispositivo, e chi torna ad `auto` cancella quel che aveva lasciato.
 */

export type ColorScheme = 'auto' | 'light' | 'dark';

/** Il ciclo del pulsante, nell'ordine in cui gli scatti si susseguono. */
export const COLOR_SCHEMES: readonly ColorScheme[] = ['auto', 'light', 'dark'];

/**
 * La chiave nella `localStorage`, dichiarata nell'informativa privacy: se
 * cambia qui deve cambiare anche là.
 */
export const COLOR_SCHEME_KEY = 'undicesimacasa:color-scheme';

/** L'attributo che il CSS guarda su `<html>`. Lo scrive anche `app.html`. */
export const COLOR_SCHEME_ATTRIBUTE = 'data-color-scheme';

export function nextColorScheme(current: ColorScheme): ColorScheme {
  const index = COLOR_SCHEMES.indexOf(current);
  return COLOR_SCHEMES[(index + 1) % COLOR_SCHEMES.length] ?? 'auto';
}

/**
 * Qualunque cosa ci sia scritta nella memoria del browser diventa una delle
 * tre: la chiave la può aver messa una versione precedente del sito, o
 * l'utente stesso dagli strumenti di sviluppo.
 */
export function parseColorScheme(value: string | null | undefined): ColorScheme {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

/**
 * Quale delle due luci è accesa adesso: `auto` diventa quella che dice il
 * sistema.
 *
 * Il CSS questa domanda non la fa mai — `light-dark()` e `prefers-color-scheme`
 * gli rispondono da soli — ma chi dipinge su un `canvas` deve scegliere dei
 * colori a mano, e `auto` non è un colore. Prende la preferenza di sistema come
 * argomento invece di andarsela a leggere: è l'unica parte che non si potrebbe
 * provare, e sta fuori.
 */
export function resolveColorScheme(
  scheme: ColorScheme,
  systemPrefersDark: boolean,
): 'light' | 'dark' {
  if (scheme !== 'auto') return scheme;
  return systemPrefersDark ? 'dark' : 'light';
}

/** Fuori dal browser — durante il rendering sul server — vale `auto`. */
export function readColorScheme(): ColorScheme {
  if (typeof document === 'undefined') return 'auto';

  const attributo = document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE);
  if (attributo) return parseColorScheme(attributo);

  try {
    return parseColorScheme(localStorage.getItem(COLOR_SCHEME_KEY));
  } catch {
    // Memoria negata dalle impostazioni del browser: si resta su `auto`.
    return 'auto';
  }
}

export function applyColorScheme(scheme: ColorScheme): void {
  if (typeof document === 'undefined') return;

  if (scheme === 'auto') {
    document.documentElement.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
  } else {
    document.documentElement.setAttribute(COLOR_SCHEME_ATTRIBUTE, scheme);
  }

  try {
    if (scheme === 'auto') localStorage.removeItem(COLOR_SCHEME_KEY);
    else localStorage.setItem(COLOR_SCHEME_KEY, scheme);
  } catch {
    // La scelta vale comunque per questa pagina: non poterla ricordare non è
    // un motivo per non applicarla.
  }
}
