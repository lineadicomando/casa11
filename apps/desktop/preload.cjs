// Espone allo splash dell'importazione la sola ricezione delle righe di
// avanzamento. CommonJS: è un preload sandboxed, l'ESM qui non arriva.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('importazione', {
  suRiga: (ascolta) => ipcRenderer.on('riga', (_evento, riga) => ascolta(riga)),
});
