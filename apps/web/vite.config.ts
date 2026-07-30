import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * I pacchetti del monorepo sono collegati via symlink, quindi Vite li tratta
 * come sorgente da impacchettare e ne segue le importazioni fino a `sweph`,
 * che è un modulo nativo (binding N-API) e non è impacchettabile.
 *
 * La soluzione è dichiararli esterni: `core` e `geo` sono già ESM compilato,
 * Node li carica direttamente a runtime. Da notare che NON si può usare
 * `build.rollupOptions.external`, perché sostituirebbe l'elenco di esterni
 * di SvelteKit — builtin di Node compresi.
 */
export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    external: ['sweph', '@temanatale/core', '@temanatale/geo'],
  },
});
