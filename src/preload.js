// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pinAndFocus: () => ipcRenderer.invoke('pin-and-focus'),
});
