const { RateLimiter } = require('limiter');
const axios = require('axios');

import logger from '../logger';

class MalApi {
    constructor() {
        this.baseUrl = 'https://myanimelist.net';
        this.limiter = new RateLimiter({ tokens: 2, interval: 'second' });
    }

    async getUserAnimeList(username, offset = 0) {
        await this.limiter.removeTokens(1);

        try {
            const url = `${this.baseUrl}/animelist/${username}/load.json?offset=${offset}&status=7`;

            const response = await axios.get(url);

            return response.data;
        } catch (error) {
            logger.error('MAL request failed', { username, offset, error: error.message });

            throw error;
        }
    }
}

export default new MalApi();