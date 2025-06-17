const { RateLimiter } = require('limiter');
const axios = require('axios');

import logger from '../logger';

class AnisongApi {
    constructor() {
        this.baseUrl = 'https://anisongdb.com/api';
        this.limiter = new RateLimiter({ tokens: 2, interval: 'second' });
    }

    async getSongsByAnnIds(batch) {
        await this.limiter.removeTokens(1);

        try {
            const url = `${this.baseUrl}/annIdList_request`;

            const response = await axios.post(
                url,
                { annIds: batch }
            );

            return response.data;
        } catch (error) {
            logger.error('Anisong request failed', { error: error.message });

            throw error;
        }
    }

    async getSongsByMalIds(batch) {
        await this.limiter.removeTokens(1);

        try {
            const url = `${this.baseUrl}/malIDs_request`;

            const response = await axios.post(
                url,
                { malIds: batch }
            );

            return response.data;
        } catch (error) {
            logger.error('Anisong request failed', { error: error.message });

            throw error;
        }
    }
}

export default new AnisongApi();