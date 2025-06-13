const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const { updateElectronApp } = require('update-electron-app')
updateElectronApp()

import Generator from './generator';

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 650,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenu(null)
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  const generator = new Generator(mainWindow);

  ipcMain.handle('generate', (event, settings) => {
    return generator.gen(settings);
  });
  ipcMain.handle('open-folder', (event, settings) => {
    return generator.openFolder();
  });

  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});