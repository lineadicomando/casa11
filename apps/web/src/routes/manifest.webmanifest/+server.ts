import { SECTIONS } from '$lib/navigation';
import type { RequestHandler } from './$types';

/**
 * `GET /manifest.webmanifest` — che cosa il sito è, quando lo si installa.
 *
 * È una rotta e non un file in `static/` per una ragione sola: le scorciatoie
 * sono le sezioni, e `SECTIONS` in `lib/navigation.ts` è dichiarato «un elenco
 * solo, invece di collegamenti scritti a mano». Un JSON accanto sarebbe la
 * seconda copia, e divergerebbe alla prossima sezione. Prerenderizzata, quindi
 * a build finita è un file statico come tutti gli altri — e finisce fra i
 * `prerendered` che il service worker precarica.
 */
export const prerender = true;

/**
 * Un colore, dove la pagina ne ha due.
 *
 * `app.html` dichiara due `theme-color` con una media query, perché la barra
 * del browser sta sopra una pagina che ha due fondi. Il manifesto le media
 * query non le ha, e i suoi due colori non servono a quello: governano la
 * schermata di avvio e il riquadro nel commutatore di applicazioni, cioè
 * momenti in cui sullo schermo c'è l'icona e non la pagina. Il fondo
 * dell'icona è scuro in tutti e due gli aspetti — è il riquadro del favicon,
 * che non ha temi — quindi il colore giusto qui è quello, ed è uno.
 */
const FONDO = '#1a1917';

export const GET: RequestHandler = () => {
  const manifesto = {
    id: '/',
    name: 'undicesimacasa',
    // L'abbreviazione che il marchio usa già: sotto un'icona ci stanno sette
    // caratteri, e «undicesimacasa» verrebbe troncato a metà parola.
    short_name: 'XI casa',
    description:
      'Temi natali, transiti e ore planetarie calcolati con le effemeridi Swiss Ephemeris.',
    lang: 'it',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: FONDO,
    background_color: FONDO,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Ritagliabile: la piattaforma le applica la forma che preferisce. Sta
      // in un file suo perché il disegno è diverso, non solo la dichiarazione —
      // vedi `scripts/build-icons.mjs`.
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: SECTIONS.map((section) => ({
      name: section.label,
      url: section.href,
    })),
  };

  // `json()` scriverebbe `application/json`, che i browser accettano ma che non
  // è il tipo di questo documento. In produzione il file è prerenderizzato e il
  // tipo glielo dà l'estensione; questo vale in sviluppo.
  return new Response(JSON.stringify(manifesto, null, 2), {
    headers: { 'content-type': 'application/manifest+json' },
  });
};
