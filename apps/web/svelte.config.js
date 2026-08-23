import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    /*
     * `src/service-worker.ts` viene compilato ma non registrato da qui: la
     * registrazione ha due condizioni da rispettare — non in sviluppo, e non
     * dentro Electron — e sta in `routes/+layout.svelte`, dove quelle
     * condizioni si possono scrivere. Il perché della seconda è là.
     */
    serviceWorker: { register: false },
  },
};
