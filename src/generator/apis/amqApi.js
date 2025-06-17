const { RateLimiter } = require('limiter');
const axios = require('axios');

import logger from '../logger';

class AmqApi {
    constructor() {
        this.limiter = new RateLimiter({ tokens: 5, interval: 'second' });
        this.baseUrl = 'https://animemusicquiz.com';
    }

    async getLibrary() {
        await this.limiter.removeTokens(1);

        try {
            const response = await axios.get(`${this.baseUrl}/libraryMasterList`);

            return response.data.animeMap;
        } catch (error) {
            logger.error('AMQ request failed', { error: error.message });

            throw error;
        }
    }
}

export default new AmqApi();