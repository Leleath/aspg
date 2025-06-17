import anisongApi from './apis/anisongApi';
import shikimoriApi from './apis/shikimoriApi';

import asyncQueue from './asyncQueue';
import generator from './generator';

import logger from './logger';
import shuffle from './shuffle';

class GetSongs {
    constructor() {
        this.settings;
    }

    init(settings) {
        this.settings = settings;
    }

    filterSongs = (song) => {
        if (![
            song.audio,
            song.songLength,
            song.songType,
            song.animeType,
            song.linked_ids,
            song.linked_ids.myanimelist,
            !(!this.settings.songs.rebroadcast && song.isRebroadcast === 1),
            !(!this.settings.songs.dub && song.isDub === 1),
            // (!settings.random && !settings.animeTypes[song.animeType.toLowerCase()]),
            (song.songCategory && this.settings.songs.category[song.songCategory.toLowerCase()]),
            (song.songDifficulty && (song.songDifficulty >= this.settings.songs.difficulty.min && song.songDifficulty <= this.settings.songs.difficulty.max)),
        ].every(Boolean)) return false;

        return true;
    }

    filterAnimes = (anime) => {
        const hasExcludedGenre = this.settings.animes.genres.some(g => !g.include && anime.genres.some(ag => ag.name.toLowerCase() === g.name.toLowerCase()));
        const requiredGenres = this.settings.animes.genres.filter(g => g.include);
        const hasRequiredGenres = requiredGenres.some(g => anime.genres.some(ag => ag.name.toLowerCase() === g.name.toLowerCase()));
        const allRequiredGenres = requiredGenres.every(g => anime.genres.some(ag => ag.name.toLowerCase() === g.name.toLowerCase()));

        if (![
            anime.poster,
            anime.screenshots.length > 4,
            anime.malId,
            this.settings.animes.kind[anime.kind.toLowerCase()],
            (anime.airedOn.year >= this.settings.animes.vintage.from && anime.airedOn.year <= this.settings.animes.vintage.to),
            (anime.score >= this.settings.animes.score.from && anime.score <= this.settings.animes.score.to),
            (!hasExcludedGenre && (this.settings.animes.genresPartialMatch ? hasRequiredGenres : allRequiredGenres))
        ].every(Boolean)) return false;

        return true;
    }

    checkSongsMap(data) {
        const sumSongs = data.openings.length + data.endings.length + data.inserts.length;
        const sumQuestions = this.settings.pack.content.rounds * this.settings.pack.content.themes * this.settings.pack.content.questions;

        if (
            data.openings.length >= this.settings.songs.types.openings &&
            data.endings.length >= this.settings.songs.types.endings &&
            data.inserts.length >= this.settings.songs.types.inserts
        ) {
            if (
                sumSongs >= sumQuestions
            ) return true

            return false
        }

        if (
            sumSongs >= sumQuestions
        ) return true

        return false;
    }

    async getData(data) {
        logger.info('Getting Songs From Anisong');

        const animes = data;
        const animesIds = animes.map(anime => anime.animeId);

        const franchisesDuplicate = [];
        const animesDuplicate = []

        const songsMap = {
            openings: [],
            endings: [],
            inserts: [],
        };

        let offset = 0;
        while (offset < animesIds.length) {
            if (this.checkSongsMap(songsMap)) break;

            let responseTempSongs = [];

            while ([...new Set(responseTempSongs.map(rts => rts.linked_ids.myanimelist))].length <= 50) {
                logger.info(`Getting Batch`);

                const batch = animesIds.slice(offset, offset + 300)

                let responseSongs = [];

                if (this.settings.lists.random) {
                    responseSongs = await anisongApi.getSongsByAnnIds(batch)
                } else {
                    responseSongs = await anisongApi.getSongsByMalIds(batch)
                }

                if (responseSongs.length == 0) break;

                const responseFilteredSongs = responseSongs.filter(song => this.filterSongs(song));

                responseTempSongs = [...responseTempSongs, ...responseFilteredSongs];

                offset = offset + 300;
            }

            logger.info(`Watching Batch`);

            const tempSongs = shuffle(responseTempSongs);

            const tempAnimes = [...new Set(tempSongs.map(song => song.linked_ids.myanimelist))];

            for (let i = 0; i < tempAnimes.length; i += 50) {
                if (this.checkSongsMap(songsMap)) break;

                const animeIds = tempAnimes.slice(i, i + 50).map(k => k.toString());

                const shikimoriAnimes = await shikimoriApi.getAnimes(animeIds);

                const filteredShikimoriAnimes = shikimoriAnimes.filter(shikimoriAnime => this.filterAnimes(shikimoriAnime));

                for (const shikimoriAnime of filteredShikimoriAnimes) {
                    if (this.checkSongsMap(songsMap)) break;

                    let tempSong = tempSongs.find(song => song.linked_ids.myanimelist == shikimoriAnime.malId);

                    if (!tempSong ||
                        (!this.settings.other.duplicateFranchise && franchisesDuplicate.includes(shikimoriAnime.franchise)) ||
                        (!this.settings.other.duplicateAnime && franchisesDuplicate.includes(shikimoriAnime.malId))
                    ) continue;

                    tempSong.russian = shikimoriAnime.russian || '';
                    tempSong.poster = shikimoriAnime.poster;
                    tempSong.images = (shuffle(shikimoriAnime.screenshots)).slice(0, 4);
                    tempSong.trim_start = Math.floor(Math.random() * (Math.floor(tempSong.songLength) - Math.ceil(this.settings.other.audioCut)));

                    if (!this.settings.lists.random) {
                        tempSong.users = (animes.find(anime => anime.animeId == shikimoriAnime.malId)).users;
                    }

                    switch (tempSong.songType.split(' ')[0]) {
                        case 'Opening':
                            if (songsMap.openings.length < this.settings.songs.types.openings) {
                                songsMap.openings.push(tempSong);
                                if (this.settings.other.asyncDownload && songsMap.openings.length <= this.settings.songs.types.openings) {
                                    asyncQueue.add(() => generator.downloadSong(tempSong));
                                    asyncQueue.add(() => generator.downloadImages(tempSong));
                                }
                            }
                            break;
                        case 'Ending':
                            if (songsMap.endings.length < this.settings.songs.types.endings) {
                                songsMap.endings.push(tempSong);
                                if (this.settings.other.asyncDownload && songsMap.endings.length <= this.settings.songs.types.endings) {
                                    asyncQueue.add(() => generator.downloadSong(tempSong));
                                    asyncQueue.add(() => generator.downloadImages(tempSong));
                                }
                            }
                            break;
                        case 'Insert':
                            if (songsMap.inserts.length < this.settings.songs.types.inserts) {
                                songsMap.inserts.push(tempSong);
                                if (this.settings.other.asyncDownload && songsMap.inserts.length <= this.settings.songs.types.inserts) {
                                    asyncQueue.add(() => generator.downloadSong(tempSong));
                                    asyncQueue.add(() => generator.downloadImages(tempSong));
                                }
                            }
                            break;
                    }

                    franchisesDuplicate.push(shikimoriAnime.franchise)
                    animesDuplicate.push(shikimoriAnime.malId)
                };
            }
        }

        const songsArray = [...songsMap.openings, ...songsMap.endings, ...songsMap.inserts]
        const responseSongArray = shuffle(songsArray);

        logger.info(`Songs from Anisong successfully Received / Total Songs: ${responseSongArray.length}`);

        return responseSongArray;
    }
}

export default new GetSongs();