const { app, BrowserWindow, ipcMain, net, shell } = require('electron');
const compareVersions = require('compare-versions')
const path = require('node:path');

const { createMainWindow, getMainWindow } = require('./windowManager');

import packageGenerator from './generator/packageGenerator';

const current_version = "v0.5.0";

if (require('electron-squirrel-startup')) {
    app.quit();
}

async function checkForUpdates(currentVersion) {
    try {
        const owner = 'Leleath'
        const repo = 'aspg'
        const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`

        const request = net.request({
            method: 'GET',
            url: url,
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        return new Promise((resolve) => {
            let data = ''

            request.on('response', (response) => {
                response.on('data', (chunk) => { data += chunk })
                response.on('end', () => {
                    if (response.statusCode === 200) {
                        const release = JSON.parse(data)
                        const latestVersion = release.tag_name.replace(/^v/, '')
                        const current = currentVersion.replace(/^v/, '')

                        resolve({
                            updateAvailable: current !== latestVersion,
                            latestVersion: release.tag_name,
                            releaseNotes: release.body,
                            downloadUrl: release.assets[0]?.browser_download_url || release.html_url
                        })
                    } else {
                        resolve({ error: `GitHub API error: ${response.statusCode}` })
                    }
                })
            })

            request.on('error', (error) => {
                resolve({ error: error.message })
            })

            request.end()
        })
    } catch (error) {
        return { error: error.message }
    }
}

const createWindow = () => {
    createMainWindow();

    ipcMain.handle('getUpdate', (event, settings) => {
        (async () => {
            const updateInfo = await checkForUpdates(current_version);

            if (updateInfo.updateAvailable) {
                getMainWindow().webContents.send('responseUpdate', {
                    oldVersion: current_version,
                    newVersion: updateInfo.latestVersion,
                    downloadUrl: updateInfo.downloadUrl
                });
            }
        })();
    });
    ipcMain.handle('generate', (event, settings) => {
        packageGenerator.init(settings);

        return packageGenerator.start();
    });
    ipcMain.handle('openLink', (event, link) => {
        return shell.openExternal(link)
    });
    ipcMain.handle('open-folder', (event, settings) => {
        return packageGenerator.openFolder();
    });
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