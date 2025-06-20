// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    generate: (param) => ipcRenderer.invoke('generate', param),
    openFolder: (param) => ipcRenderer.invoke('open-folder', param),
    generatorLog: (callback) => {
        ipcRenderer.on('generatorLog', (event, data) => callback(data));
    },

    getUpdate: (param) => ipcRenderer.invoke('getUpdate', param),
    responseUpdate: (callback) => {
        ipcRenderer.on('responseUpdate', (event, data) => callback(data));
    },
    openLink: (param) => ipcRenderer.invoke('openLink', param),
});