#!/usr/bin/env node
/**
 * Prepara `bundle/` per electron-builder: il server SvelteKit compilato, i
 * pacchetti del monorepo disposti come in un `node_modules`, e le sole
 * dipendenze che il server carica a runtime — quelle dichiarate esterne in
 * `apps/web/vite.config.ts`, più `node-gyp-build` che risolve il binario
 * nativo di `sweph`. electron-builder copia `bundle/` in `resources/` fuori
 * dall'asar, così il modulo nativo resta un file caricabile.
 *
 * Rasterizza anche l'icona da `graphics/favicon.svg`, per non tenere a mano
 * una copia che prima o poi divergerebbe dall'originale.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const desktopRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(desktopRoot, '..', '..');
const bundle = join(desktopRoot, 'bundle');

function richiedi(percorso) {
  if (!existsSync(percorso)) {
    console.error(`Manca ${percorso}: eseguire prima \`npm run build\` alla radice.`);
    process.exit(1);
  }
}

const webBuild = join(repoRoot, 'apps', 'web', 'build');
const corePkg = join(repoRoot, 'packages', 'core');
const geoPkg = join(repoRoot, 'packages', 'geo');
const ruotaPkg = join(repoRoot, 'packages', 'ruota');
richiedi(webBuild);
richiedi(join(corePkg, 'dist'));
richiedi(join(geoPkg, 'dist'));
richiedi(join(ruotaPkg, 'dist'));

rmSync(bundle, { recursive: true, force: true });

// Il server compilato. Il package.json accanto fissa il tipo di modulo:
// fuori dal repo nessun package.json padre dichiarerebbe `"type": "module"`.
cpSync(webBuild, join(bundle, 'server'), { recursive: true });
writeFileSync(join(bundle, 'server', 'package.json'), '{ "type": "module" }\n');

const moduli = join(bundle, 'node_modules');

const core = join(moduli, '@undicesimacasa', 'core');
cpSync(join(corePkg, 'package.json'), join(core, 'package.json'));
cpSync(join(corePkg, 'dist'), join(core, 'dist'), { recursive: true });
// Le effemeridi nella posizione di default del pacchetto: nessuna variabile
// d'ambiente da impostare. Senza, l'app impacchettata userebbe Moshier.
if (existsSync(join(corePkg, 'ephe'))) {
  cpSync(join(corePkg, 'ephe'), join(core, 'ephe'), { recursive: true });
} else {
  console.warn(
    'Effemeridi .se1 assenti: il pacchetto userà Moshier. ' +
      'Per includerle: `npm run ephe:download -w @undicesimacasa/core`.',
  );
}

const geo = join(moduli, '@undicesimacasa', 'geo');
cpSync(join(geoPkg, 'package.json'), join(geo, 'package.json'));
cpSync(join(geoPkg, 'dist'), join(geo, 'dist'), { recursive: true });
cpSync(join(geoPkg, 'schema.sql'), join(geo, 'schema.sql'));
// Lo script di importazione: l'app lo lancia al primo avvio.
cpSync(join(geoPkg, 'scripts'), join(geo, 'scripts'), { recursive: true });

const ruota = join(moduli, '@undicesimacasa', 'ruota');
cpSync(join(ruotaPkg, 'package.json'), join(ruota, 'package.json'));
cpSync(join(ruotaPkg, 'dist'), join(ruota, 'dist'), { recursive: true });

for (const nome of ['luxon', 'node-gyp-build']) {
  cpSync(join(repoRoot, 'node_modules', nome), join(moduli, nome), { recursive: true });
}

// La rasterizzazione PNG: il wrapper più il pacchetto di piattaforma che npm
// ha installato per questa macchina — è così che ogni piattaforma di build
// imbarca il proprio binario.
cpSync(join(repoRoot, 'node_modules', '@resvg'), join(moduli, '@resvg'), { recursive: true });
const sweph = join(moduli, 'sweph');
mkdirSync(sweph, { recursive: true });
for (const file of ['package.json', 'index.js', 'index.mjs', 'constants.js']) {
  cpSync(join(repoRoot, 'node_modules', 'sweph', file), join(sweph, file));
}
cpSync(join(repoRoot, 'node_modules', 'sweph', 'prebuilds'), join(sweph, 'prebuilds'), {
  recursive: true,
});

const risorse = join(desktopRoot, 'buildResources');
mkdirSync(risorse, { recursive: true });
const svg = readFileSync(join(repoRoot, 'graphics', 'favicon.svg'));
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } }).render().asPng();
writeFileSync(join(risorse, 'icon.png'), png);

console.log(`Bundle pronto in ${bundle}`);
