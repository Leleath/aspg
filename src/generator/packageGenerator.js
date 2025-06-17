const { shell } = require('electron');

const { getMainWindow } = require('../windowManager');

import getAnimes from './getAnimes';
import getSongs from './getSongs';
import generator from './generator';

import logger from './logger';
import shuffle from './shuffle';

class PackageGenerator {
    constructor() {
        this.settings;
        this.folder;
        this.stats = {
            totalRequests: 0,
            itemsReceived: 0,
            itemsFiltered: 0,
            startTime: null,
            endTime: null
        };
    }

    init(settings) {
        this.settings = settings;

        getAnimes.init(settings);
        getSongs.init(settings);
        generator.init(settings);
    }

    openFolder() {
        logger.info('Open Folder')

        shell.openPath(this.folder);
    }

    async start() {
        this.stats.startTime = new Date();

        logger.info('Starting package generation');

        try {
            getMainWindow().webContents.send('generatorLog', {
                type: 'startGenerator'
            });

            generator.init(this.settings);

            let animes = await getAnimes.getData();
            animes = shuffle(animes);

            let songs = await getSongs.getData(animes);
            songs = shuffle(songs);

            this.folder = await generator.createPackage(songs);

            getMainWindow().webContents.send('generatorLog', {
                type: 'endGenerator'
            });

            return this.folder;
        } catch (error) {
            logger.error('Package generation failed', { error: error.message });

            throw error;
        }
    }
}

export default new PackageGenerator();