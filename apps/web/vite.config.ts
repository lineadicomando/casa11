import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * I pacchetti del monorepo sono collegati via symlink, quindi Vite li tratta
 * come sorgente da impacchettare e ne segue le importazioni fino ai moduli
 * nativi — `sweph` per il calcolo, `@resvg/resvg-js` per la rasterizzazione —
 * che sono binding N-API e non sono impacchettabili: Rollup ci si imbatte in
 * un file `.node` e prova a leggerlo come JavaScript.
 *
 * La soluzione è dichiararli esterni: `core`, `geo` e `ruota` sono già ESM
 * compilato, Node li carica direttamente a runtime. Da notare che NON si può
 * usare `build.rollupOptions.external`, perché sostituirebbe l'elenco di
 * esterni di SvelteKit — builtin di Node compresi.
 *
 * `@dodicisegni/ruota` è esterno anche se il *client* ne importa davvero
 * dei valori — glifi, colori, geometria. Non è una contraddizione: nel client
 * la regola non si applica, perché `ssr.external` riguarda il solo bundle del
 * server. Quello che il browser non deve mai vedere è `ruota/png`, e a
 * tenerlo fuori è il fatto che lo importi solo `lib/server`.
 */
export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    external: [
      'sweph',
      '@resvg/resvg-js',
      '@dodicisegni/core',
      '@dodicisegni/geo',
      '@dodicisegni/ruota',
    ],
  },
});
