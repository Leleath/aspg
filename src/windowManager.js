const { BrowserWindow } = require('electron');

let mainWindow;

module.exports = {
    createMainWindow: () => {
        mainWindow = new BrowserWindow({
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
        // mainWindow.webContents.openDevTools();

        return mainWindow;
    },

    getMainWindow: () => mainWindow,

    sendToMainWindow: (channel, data) => {
        if (mainWindow) {
            mainWindow.webContents.send(channel, data);
        }
    }
};