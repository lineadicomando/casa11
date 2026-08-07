// electron-builder scarta le cartelle `node_modules` dalle extraResources,
// qualunque filtro si dichiari — e il bundle È un node_modules disposto a
// mano da stage.mjs. Questo hook le copia a impacchettamento avvenuto, prima
// che l'AppImage (o l'installer) venga composto. CommonJS: electron-builder
// carica gli hook con require.
const { cpSync } = require('node:fs');
const { join } = require('node:path');

module.exports = async function copiaModuli(context) {
  const bundle = join(__dirname, '..', 'bundle');
  const risorse = context.packager.getResourcesDir(context.appOutDir);
  cpSync(join(bundle, 'node_modules'), join(risorse, 'bundle', 'node_modules'), {
    recursive: true,
  });
};
