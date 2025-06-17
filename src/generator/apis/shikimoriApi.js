const { RateLimiter } = require('limiter');
const axios = require('axios');

import logger from '../logger';

class ShikimoriApi {
    constructor() {
        this.baseUrl = 'https://shikimori.one/api';
        this.limiter = new RateLimiter({ tokens: 2, interval: 'second' });
    }

    async getUser(username) {
        await this.limiter.removeTokens(1);

        try {
            const response = await axios.get(`${this.baseUrl}/users?search=${encodeURIComponent(username)}`);

            return response.data[0]?.id || null;
        } catch (error) {
            logger.error('Shikimori user search failed', { username, error: error.message });

            throw error;
        }
    }

    async getUserAnimes(userId) {
        await this.limiter.removeTokens(1);

        try {
            const response = await axios.get(`${this.baseUrl}/v2/user_rates?user_id=${userId}&target_type=Anime`);

            return response.data;
        } catch (error) {
            logger.error('Shikimori rates request failed', { userId, error: error.message });

            throw error;
        }
    }

    async getAnimes(animesIds) {
        await this.limiter.removeTokens(1);

        try {
            const query = `
                {
                    animes(ids: "${animesIds.join(',')}", limit: 50) {
                        id malId name russian franchise score origin rating kind
                        genres { id name russian kind }
                        poster { id originalUrl mainUrl }
                        screenshots { id originalUrl x166Url x332Url }
                        airedOn { year month day date }
                        releasedOn { year month day date }
                    }
                }
            `;

            const response = await axios.post(`${this.baseUrl}/graphql`,
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
                    }
                }
            );

            return response.data.data.animes;
        } catch (error) {
            logger.error('Shikimori rates request failed', { userId, error: error.message });

            throw error;
        }
    }
}

export default new ShikimoriApi();