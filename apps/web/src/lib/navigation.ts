/**
 * Le sezioni dell'applicazione, in ordine di comparsa nella navigazione.
 *
 * Un elenco solo, invece di collegamenti scritti a mano nel guscio: una
 * sezione nuova — i transiti — è una riga qui, e la voce attiva si ricava dal
 * percorso senza che ogni pagina debba dichiararsi.
 */
export interface Section {
  href: string;
  label: string;
}

export const SECTIONS: readonly Section[] = [
  { href: '/', label: 'Tema natale' },
  { href: '/transiti', label: 'Transiti' },
];

/**
 * `/` combacia solo con sé stessa: con un confronto per prefisso resterebbe
 * evidenziata su ogni pagina del sito, informativa compresa.
 */
export function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
