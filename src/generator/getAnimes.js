import amqApi from './apis/amqApi';
import malApi from './apis/malApi';
import shikimoriApi from './apis/shikimoriApi';

import logger from './logger';

class GetAnimes {
    constructor() {
        this.settings;
    }

    init(settings) {
        this.settings = settings;
    }

    async getAmqData() {
        const tempAnimes = await amqApi.getLibrary();

        const filteredTempAnimes = Object.keys(
            Object.fromEntries(
                Object.entries(tempAnimes).filter(([key, value]) => {
                    return (
                        value.year &&
                        (
                            value.year >= this.settings.animes.vintage.from &&
                            value.year <= this.settings.animes.vintage.to
                        )
                    )
                })
            )
        ).reduce((acc, key) => {
            acc[key] = { animeId: parseInt(key) };
            return acc;
        }, {});

        return filteredTempAnimes;
    }

    async getMalData(user) {
        let tempAnimesIds = [];

        let offset = 0;
        while (true) {
            logger.info(`Geting ${offset}`);

            const tempAnimes = await malApi.getUserAnimeList(user.username, offset);

            if (!tempAnimes || tempAnimes.length === 0) break;

            const listType = {
                1: 'watching',
                2: 'completed',
                3: 'onhold',
                4: 'dropped',
                6: 'ptw'
            };

            const filteredTempAnimes = tempAnimes.filter(anime => user.status[listType[anime.status]]);

            const filteredTempAnimesIds = filteredTempAnimes.map(a => a.anime_id);

            tempAnimesIds = [...tempAnimesIds, ...filteredTempAnimesIds]

            offset = offset + 300;
        }

        return tempAnimesIds;
    }

    async getShikimoriData(user) {
        const userId = await shikimoriApi.getUser(user.username);
        const userAnimes = await shikimoriApi.getUserAnimes(userId);

        const listType = {
            'watching': 'watching',
            'completed': 'completed',
            'on_hold': 'onhold',
            'dropped': 'dropped',
            'planned': 'ptw'
        };

        const filteredTempAnimes = userAnimes.filter(anime => user.status[listType[anime.status]]);

        const tempAnimesIds = filteredTempAnimes.map(anime => anime.target_id)

        return tempAnimesIds;
    }

    async getData() {
        let tempAnimes = {};

        if (this.settings.lists.random) {
            logger.info('Getting Animes From AMQ');

            tempAnimes = await this.getAmqData();

            logger.info(`Animes from AMQ successfully Received / Total Animes: ${Object.keys(tempAnimes).length}`);
        } else {
            logger.info('Getting users Animes');

            for (const user of this.settings.lists.users) {
                logger.info(`Getting Animes of user ${user.username} from ${user.list}`);

                let tempAnimesIds = {}

                switch (user.list) {
                    case 'myanimelist': tempAnimesIds = await this.getMalData(user); break;
                    case 'shikimori': tempAnimesIds = await this.getShikimoriData(user); break;
                }

                for (const tempAnime of tempAnimesIds) {
                    if (!tempAnimes[tempAnime]) tempAnimes[tempAnime] = { animeId: tempAnime, users: [user.username] };
                    else tempAnimes[tempAnime].users.push(user.username);
                }

                logger.info(`Animes of user ${user.username} from ${user.list} successfully Received / Total Animes: ${Object.keys(tempAnimesIds).length}`);
            }
        }

        const animes = Object.values(tempAnimes);

        return animes;
    }
}

export default new GetAnimes();