#!/usr/bin/env node
/**
 * Scarica i file di effemeridi Swiss Ephemeris necessari al modo `swisseph`.
 *
 * I file NON sono versionati (vedi .gitignore): sono dati binari di alcuni MB
 * ridistribuiti da Astrodienst. Senza di essi il motore ripiega automaticamente
 * sulle effemeridi Moshier, che non richiedono file esterni.
 *
 * Copertura dei file scaricati: 1800-2399 d.C.
 * Per intervalli più ampi vedi la cartella `ephe/` del repository ufficiale.
 */
import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

// Repository ufficiale Swiss Ephemeris (Astrodienst). Il vecchio percorso
// www.astro.com/ftp/swisseph/ephe/ restituisce 404.
const BASE_URL =
  process.env.SE_EPHE_BASE_URL ?? 'https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/';

const FILES = [
  { name: 'sepl_18.se1', description: 'pianeti principali, 1800-2399', required: true },
  { name: 'semo_18.se1', description: 'Luna, 1800-2399', required: true },
  { name: 'seas_18.se1', description: 'asteroidi (Chirone), 1800-2399', required: false },
];

const packageRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const targetDir = process.env.SE_EPHE_PATH ?? join(packageRoot, 'ephe');

async function alreadyPresent(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function download(file) {
  const target = join(targetDir, file.name);

  if (await alreadyPresent(target)) {
    console.log(`  ${file.name.padEnd(14)} già presente, salto`);
    return true;
  }

  const url = `${BASE_URL}${file.name}`;
  process.stdout.write(`  ${file.name.padEnd(14)} scarico da ${url} ... `);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`FALLITO (HTTP ${response.status})`);
      return false;
    }
    if (!response.body) {
      console.log('FALLITO (risposta senza corpo)');
      return false;
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
    const info = await stat(target);
    console.log(`ok (${(info.size / 1024 / 1024).toFixed(1)} MB)`);
    return true;
  } catch (error) {
    console.log(`FALLITO (${error.message})`);
    return false;
  }
}

await mkdir(targetDir, { recursive: true });
console.log(`Effemeridi Swiss Ephemeris → ${targetDir}\n`);

let missingRequired = false;
for (const file of FILES) {
  const ok = await download(file);
  if (!ok && file.required) missingRequired = true;
}

console.log('');
if (missingRequired) {
  console.error(
    'Alcuni file obbligatori non sono stati scaricati. Il motore userà le effemeridi\n' +
      'Moshier: funziona comunque, con precisione leggermente inferiore e senza Chirone.',
  );
  process.exitCode = 1;
} else {
  console.log('Fatto. Il motore userà le effemeridi Swiss Ephemeris.');
}
